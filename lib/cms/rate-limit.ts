import "server-only";
import { sql } from "./db";

/**
 * Fixed-window counters in the `rate_limits` table.
 *
 * A bucket names what is counted (`login:email:<email>`, `login:ip:<ip>`,
 * `contact:ip:<hash>`) and
 * each window is fifteen minutes long by default. Counting in Postgres rather
 * than in memory is deliberate: serverless instances do not share memory, so
 * an in-process counter would give each instance its own five guesses.
 */

const DEFAULT_WINDOW_MINUTES = 15;

/** The start of the current window, computed in the database so every instance agrees. */
const WINDOW = (minutes: number) =>
  `date_bin(interval '${minutes} minutes', now(), timestamptz '2000-01-01')`;

/** How many hits each bucket has in the current window. */
export async function countHits(buckets: string[], minutes = DEFAULT_WINDOW_MINUTES) {
  const rows = (await sql().query(
    `SELECT bucket, count FROM rate_limits WHERE bucket = ANY($1) AND window_start = ${WINDOW(minutes)}`,
    [buckets],
  )) as { bucket: string; count: number }[];
  const counts = Object.fromEntries(buckets.map((b) => [b, 0]));
  for (const row of rows) counts[row.bucket] = row.count;
  return counts;
}

/** Adds one hit to each bucket, and sweeps windows older than a day while it is there. */
export async function addHits(buckets: string[], minutes = DEFAULT_WINDOW_MINUTES) {
  await sql().transaction((tx) => [
    tx.query(
      `INSERT INTO rate_limits (bucket, window_start, count)
       SELECT b, ${WINDOW(minutes)}, 1 FROM unnest($1::text[]) AS b
       ON CONFLICT (bucket, window_start) DO UPDATE SET count = rate_limits.count + 1`,
      [buckets],
    ),
    tx.query(`DELETE FROM rate_limits WHERE window_start < now() - interval '1 day'`),
  ]);
}

/**
 * Adds one hit to a bucket and returns its count in the current window,
 * including this one, in a single statement.
 *
 * For a limit that has to hold under a burst. Counting first and adding
 * after the work is done leaves a gap: twenty requests sent at once all read
 * the same count, all pass, and all get through. Taking the hit first and
 * deciding on what comes back closes it, since Postgres serialises the
 * increments on the row. The price is that an attempt turned away still
 * counts, which only matters to whoever keeps knocking.
 */
export async function takeHit(bucket: string, minutes = DEFAULT_WINDOW_MINUTES): Promise<number> {
  const [rows] = (await sql().transaction((tx) => [
    tx.query(
      `INSERT INTO rate_limits (bucket, window_start, count) VALUES ($1, ${WINDOW(minutes)}, 1)
       ON CONFLICT (bucket, window_start) DO UPDATE SET count = rate_limits.count + 1
       RETURNING count`,
      [bucket],
    ),
    tx.query(`DELETE FROM rate_limits WHERE window_start < now() - interval '1 day'`),
  ])) as [{ count: number }[], unknown];
  return Number(rows[0]?.count ?? 0);
}

/** Forgets a bucket's current window, used to clear an email's failures on a good sign-in. */
export async function clearHits(bucket: string, minutes = DEFAULT_WINDOW_MINUTES) {
  await sql().query(`DELETE FROM rate_limits WHERE bucket = $1 AND window_start = ${WINDOW(minutes)}`, [bucket]);
}
