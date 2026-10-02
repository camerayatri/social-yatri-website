/**
 * The database connection, opened lazily.
 *
 * Two ways in, both from Neon's serverless driver:
 *
 * - `sql()` is the HTTP query function. One round trip per query, no
 *   connection to hold open, which suits every read and every single-statement
 *   write.
 * - `withTransaction()` opens a WebSocket `Pool` for the length of one
 *   interactive transaction (BEGIN, read, decide, write, COMMIT) and closes it
 *   again. Saves need this: they check a version, copy the old row into the
 *   revisions and trim them, and must do all of it or none.
 *
 * Nothing connects at import time, so the site builds and runs without a
 * `DATABASE_URL`; callers ask `hasDatabase()` first and fall back to the
 * defaults. No `server-only` import here, because the scripts use this file
 * outside Next; the modules that use it from the app carry that guard.
 */

import { neon, Pool, type NeonQueryFunction, type PoolClient } from "@neondatabase/serverless";

let cached: NeonQueryFunction<false, false> | null = null;

export function databaseUrl() {
  return process.env.DATABASE_URL || null;
}

export function hasDatabase() {
  return databaseUrl() !== null;
}

export function sql(): NeonQueryFunction<false, false> {
  const url = databaseUrl();
  if (!url) throw new Error("DATABASE_URL is not set.");
  cached ??= neon(url);
  return cached;
}

export type Tx = PoolClient;

/**
 * Runs `fn` inside one transaction on a short-lived pool. Commits when `fn`
 * resolves, rolls back when it throws, and always closes the pool, which is
 * what the driver asks for in serverless functions.
 */
export async function withTransaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  const url = databaseUrl();
  if (!url) throw new Error("DATABASE_URL is not set.");
  const pool = new Pool({ connectionString: url });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}
