import { createHash, timingSafeEqual } from "node:crypto";
import { del } from "@vercel/blob";
import { audit } from "@/lib/cms/audit";
import { hasDatabase, sql } from "@/lib/cms/db";
import { findReferences } from "@/lib/cms/media";
import { isBlobUrl } from "@/lib/cms/media-src";

/**
 * Daily clean-up of media deleted from the library more than 30 days ago.
 *
 * Deleting in the library is soft: the row is hidden and the file stays on
 * Blob, so restoring an older revision that names it still works. After 30
 * days this removes the file for good, but only when nothing could still want
 * it: the live content (shipped defaults included, through `findReferences`),
 * any of the revisions still kept, and any other library row that shares the
 * file. Anything still wanted is left for a later run.
 *
 * Only uploads are purged. Seed rows point at the shipped `/img/...` files,
 * which the defaults in lib/content.ts fall back on, so they are never
 * removed from the store by this.
 *
 * Order makes it safe to run twice or to fail halfway: the file goes first,
 * then the row. A run that dies between the two leaves a row whose file is
 * already gone; the next run deletes the file again (a no-op) and then the
 * row. Called by Vercel Cron (vercel.json) with `Authorization: Bearer
 * $CRON_SECRET`; anything else is turned away, and with no CRON_SECRET set
 * nothing is accepted at all.
 */

export const maxDuration = 60;

const RETENTION_DAYS = 30;
/** Rows looked at per run. A backlog clears over the following days. */
const BATCH = 100;

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  // Hashing both sides first gives equal-length buffers, so the comparison
  // takes the same time whatever was sent.
  const given = createHash("sha256").update(request.headers.get("authorization") ?? "").digest();
  const expected = createHash("sha256").update(`Bearer ${secret}`).digest();
  return timingSafeEqual(given, expected);
}

type Candidate = { id: string; url: string; poster_url: string | null };

type Outcome = { url: string; result: "purged" | "kept"; reason?: string };

async function purge(item: Candidate): Promise<Outcome> {
  const refs = await findReferences(item.url, item.poster_url);
  if (refs.length) return { url: item.url, result: "kept", reason: `used by ${refs[0].key}.${refs[0].path}` };

  const revisions = (await sql().query(
    `SELECT key, version FROM content_revisions
      WHERE strpos(data::text, $1) > 0 OR ($2::text IS NOT NULL AND strpos(data::text, $2) > 0)
      LIMIT 1`,
    [item.url, item.poster_url],
  )) as { key: string; version: number }[];
  if (revisions[0]) {
    return { url: item.url, result: "kept", reason: `named by a kept revision of ${revisions[0].key} (v${revisions[0].version})` };
  }

  const files = [item.url, item.poster_url].filter((f): f is string => !!f && isBlobUrl(f));
  const shared = (await sql().query(
    `SELECT url, poster_url FROM media WHERE id <> $1 AND (url = ANY($2) OR poster_url = ANY($2))`,
    [item.id, files],
  )) as { url: string; poster_url: string | null }[];
  const inOtherRows = new Set(shared.flatMap((r) => [r.url, r.poster_url]));
  const doomed = files.filter((f) => !inOtherRows.has(f));

  if (doomed.length) await del(doomed);
  const removed = (await sql().query(
    `DELETE FROM media WHERE id = $1 AND deleted_at < now() - make_interval(days => $2) RETURNING id`,
    [item.id, RETENTION_DAYS],
  )) as { id: string }[];
  if (!removed[0]) return { url: item.url, result: "kept", reason: "restored while the clean-up ran" };
  await audit(null, "media.purge", item.url, { files: doomed.length });
  return { url: item.url, result: "purged" };
}

export async function GET(request: Request) {
  if (!authorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasDatabase()) return Response.json({ error: "DATABASE_URL is not set." }, { status: 503 });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return Response.json({ error: "BLOB_READ_WRITE_TOKEN is not set." }, { status: 503 });

  const candidates = (await sql().query(
    `SELECT id, url, poster_url FROM media
      WHERE source = 'blob' AND deleted_at < now() - make_interval(days => $1)
      ORDER BY deleted_at LIMIT $2`,
    [RETENTION_DAYS, BATCH],
  )) as Candidate[];

  const outcomes: Outcome[] = [];
  const failures: { url: string; error: string }[] = [];
  for (const item of candidates) {
    try {
      outcomes.push(await purge(item));
    } catch (error) {
      failures.push({ url: item.url, error: error instanceof Error ? error.message : String(error) });
    }
  }

  const summary = {
    checked: candidates.length,
    purged: outcomes.filter((o) => o.result === "purged").length,
    kept: outcomes.filter((o) => o.result === "kept"),
    failed: failures,
  };
  console.log(
    `[cron] purge-media: ${summary.checked} checked, ${summary.purged} purged, ${summary.kept.length} kept, ${failures.length} failed`,
    summary.kept.length || failures.length ? JSON.stringify({ kept: summary.kept, failed: failures }) : "",
  );
  return Response.json(summary, { status: failures.length ? 500 : 200 });
}
