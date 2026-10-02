/**
 * Fills a fresh database with the content the repository ships.
 *
 *   npm run db:seed
 *
 * Two jobs, both additive and safe to repeat:
 *
 * 1. Every content key with no row yet gets its default from lib/cms/defaults.ts.
 *    A key that already has a row is never touched, so running this after the
 *    client has edited something cannot undo their work.
 * 2. Every media file the defaults point at is registered in the library as
 *    source 'seed', with its alt text, its pixel size where the data files
 *    record one, and its byte size from public/. Already registered files are
 *    left alone.
 *
 * Run with tsx (the npm script does), because the defaults are TypeScript.
 */

import { stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "@neondatabase/serverless";
import { DEFAULTS } from "../lib/cms/defaults.ts";
import { CONTENT_KEYS } from "../lib/cms/schema.ts";
import { isLocalMedia, mediaKindFromSrc } from "../lib/cms/media-src.ts";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Add it to .env.local and run again.");
  process.exit(1);
}

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Collects every media file the content names, keyed by URL, keeping the first description found. */
function collect(value, out) {
  if (Array.isArray(value)) {
    value.forEach((v) => collect(v, out));
    return;
  }
  if (!value || typeof value !== "object") return;

  if (typeof value.src === "string") {
    const kind = mediaKindFromSrc(value.src);
    if (kind && !out.has(value.src)) {
      out.set(value.src, {
        kind,
        url: value.src,
        posterUrl: typeof value.poster === "string" ? value.poster : null,
        w: Number.isInteger(value.w) ? value.w : null,
        h: Number.isInteger(value.h) ? value.h : null,
        alt: typeof value.alt === "string" && value.alt ? value.alt : value.src,
      });
    }
  }
  // A case study names its still as a bare `frame` string beside its `alt`.
  if (typeof value.frame === "string" && !out.has(value.frame)) {
    out.set(value.frame, { kind: "image", url: value.frame, posterUrl: null, w: null, h: null, alt: value.alt ?? value.frame });
  }
  for (const v of Object.values(value)) collect(v, out);
}

async function bytesOf(src) {
  if (!isLocalMedia(src)) return null;
  try {
    return (await stat(path.join(root, "public", src))).size;
  } catch {
    return null;
  }
}

const pool = new Pool({ connectionString: url });
const client = await pool.connect();
try {
  let docs = 0;
  for (const key of CONTENT_KEYS) {
    const res = await client.query(
      `INSERT INTO content_docs (key, data, version) VALUES ($1, $2::jsonb, 1) ON CONFLICT (key) DO NOTHING RETURNING key`,
      [key, JSON.stringify(DEFAULTS[key])],
    );
    if (res.rowCount) docs++;
  }
  console.log(`Content: ${docs} new document(s), ${CONTENT_KEYS.length - docs} already present.`);

  const files = new Map();
  collect(DEFAULTS, files);
  let media = 0;
  let missing = 0;
  for (const file of files.values()) {
    const bytes = await bytesOf(file.url);
    if (bytes === null && isLocalMedia(file.url)) missing++;
    const res = await client.query(
      `INSERT INTO media (kind, url, pathname, poster_url, w, h, bytes, alt, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'seed') ON CONFLICT (url) DO NOTHING RETURNING id`,
      [file.kind, file.url, isLocalMedia(file.url) ? file.url.slice(1) : null, file.posterUrl, file.w, file.h, bytes, file.alt],
    );
    if (res.rowCount) media++;
  }
  console.log(`Media: ${media} new file(s) registered, ${files.size - media} already present.`);
  if (missing) console.warn(`Note: ${missing} local file(s) named in the content were not found under public/.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
