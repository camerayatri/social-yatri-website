#!/usr/bin/env node
/**
 * Copies the client's media from /public up to the Blob store.
 *
 * Every content file the site names in `lib/reels.ts`, `lib/gallery.ts` and
 * `lib/content.ts` (the reels, their posters, the gallery, the root frames,
 * the covers, the service and work covers, the client logos) goes up under
 * the path it has here, minus the leading slash, so `media()` in
 * `lib/media.ts` only has to put the store's origin in front of it. The list
 * is read out of those files rather than out of the folders, so a file
 * nobody names is not uploaded and a file somebody names but nobody saved is
 * reported instead of quietly 404ing in production.
 *
 * The chrome stays out: the opening film, the transition clip and the paper
 * grain are named in components, not in lib/, and ship with the deployment.
 *
 * Safe to run again. A file whose blob already exists at the same size is
 * skipped, so a second run uploads only what changed. Same-size edits are
 * the one thing that check misses; pass `--force` to upload everything.
 * `--limit N` stops after the first N files.
 *
 *   BLOB_READ_WRITE_TOKEN=... node scripts/upload-media.mjs [--force] [--dry-run]
 *
 * The token is read from the environment only. It is never printed.
 */
import { readFile, stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { put, head, BlobNotFoundError } from "@vercel/blob";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCES = ["lib/reels.ts", "lib/gallery.ts", "lib/content.ts"];
const CONCURRENCY = 4;
/** Over this, the upload is split into parts that go up and retry separately. */
const MULTIPART_OVER = 100 * 1024 * 1024;
/** A year: a file under a given name never changes, a new one gets a new name. */
const MAX_AGE = 31536000;

const TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".mp4": "video/mp4",
};

const force = process.argv.includes("--force");
const dryRun = process.argv.includes("--dry-run");

if (!dryRun && !process.env.BLOB_READ_WRITE_TOKEN) {
  console.error("BLOB_READ_WRITE_TOKEN is not set.");
  process.exit(1);
}

/** Every site path the content files name, once each. */
async function referencedPaths() {
  const found = new Set();
  for (const file of SOURCES) {
    const text = await readFile(path.join(root, file), "utf8");
    for (const match of text.matchAll(/"(\/(?:img|video)\/[^"]+)"/g)) found.add(match[1]);
  }
  return [...found].sort();
}

async function uploadOne(sitePath) {
  const pathname = sitePath.slice(1);
  const local = path.join(root, "public", pathname);
  const contentType = TYPES[path.extname(local).toLowerCase()];
  if (!contentType) return { sitePath, status: "failed", error: "unknown file type" };

  let size;
  try {
    size = (await stat(local)).size;
  } catch {
    return { sitePath, status: "missing" };
  }

  if (!force && !dryRun) {
    try {
      const existing = await head(pathname);
      if (existing.size === size) return { sitePath, status: "skipped", size };
    } catch (error) {
      if (!(error instanceof BlobNotFoundError)) throw error;
    }
  }
  if (dryRun) return { sitePath, status: "would upload", size };

  // A buffer, not a stream: every file here is a few megabytes, and a
  // streamed body stalled the request indefinitely in testing.
  await put(pathname, size > MULTIPART_OVER ? createReadStream(local) : await readFile(local), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: MAX_AGE,
    contentType,
    multipart: size > MULTIPART_OVER,
  });
  return { sitePath, status: "uploaded", size };
}

const limitAt = process.argv.indexOf("--limit");
const all = await referencedPaths();
// `--limit N` takes the first N, for trying the script against the store.
const paths = limitAt === -1 ? all : all.slice(0, Number(process.argv[limitAt + 1]));
console.log(`${all.length} files named in ${SOURCES.join(", ")}`);

const results = [];
let next = 0;
async function worker() {
  while (next < paths.length) {
    const sitePath = paths[next++];
    let result;
    try {
      result = await uploadOne(sitePath);
    } catch (error) {
      result = { sitePath, status: "failed", error: error instanceof Error ? error.message : String(error) };
    }
    results.push(result);
    const extra = result.error ? ` (${result.error})` : "";
    console.log(`  ${result.status.padEnd(12)} ${sitePath}${extra}`);
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

const tally = {};
let bytes = 0;
for (const result of results) {
  tally[result.status] = (tally[result.status] ?? 0) + 1;
  if (result.status === "uploaded" || result.status === "would upload") bytes += result.size;
}
console.log("\nSummary");
for (const [status, count] of Object.entries(tally)) console.log(`  ${status}: ${count}`);
console.log(`  bytes sent: ${(bytes / 1024 / 1024).toFixed(1)} MB`);

if (tally.missing || tally.failed) process.exit(1);
