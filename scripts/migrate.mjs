/**
 * Applies the SQL files in db/migrations that have not run yet.
 *
 *   npm run db:migrate
 *
 * Files run in name order (0001_..., 0002_...). Each one runs inside its own
 * transaction together with the row that records it in schema_migrations, so
 * a file either applies completely and is remembered, or not at all. Already
 * applied files are skipped, which makes this safe to run on every deploy.
 *
 * Reads DATABASE_URL from the environment; the npm script loads .env.local.
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Add it to .env.local (vercel env pull) and run again.");
  process.exit(1);
}

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "db", "migrations");
const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();

const pool = new Pool({ connectionString: url });
const client = await pool.connect();
try {
  await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name       text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`);
  const { rows } = await client.query("SELECT name FROM schema_migrations");
  const applied = new Set(rows.map((r) => r.name));

  let ran = 0;
  for (const file of files) {
    if (applied.has(file)) continue;
    const body = await readFile(path.join(dir, file), "utf8");
    process.stdout.write(`Applying ${file}... `);
    try {
      await client.query("BEGIN");
      await client.query(body);
      await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
      await client.query("COMMIT");
      console.log("done");
      ran++;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      console.log("failed");
      throw error;
    }
  }
  console.log(ran ? `${ran} migration(s) applied.` : "Database is up to date.");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
