#!/usr/bin/env node
/**
 * Cuts a silent hover preview for every reel and puts it in the Blob store.
 *
 * A card plays its clip when the pointer is over it, and until the visitor
 * turns a sound switch on that playback is muted. Muted, the full file is the
 * wrong thing to fetch: it carries an audio track nobody hears, it is cut at
 * 720px for a card drawn about 260px wide, and the browser keeps buffering
 * ahead for as long as the pointer stays, so a hover over the longest wedding
 * reel pulled 6.7MB. The preview is the clip's first seven seconds at 540px,
 * with no audio, and loops.
 *
 * It is the same picture on the same clock: it starts where the clip starts,
 * so a card that is switched to the full file mid-play (the sound switch
 * turned on) carries on from the same moment. `lib/media.ts` finds it by
 * name: `video/reels/x.mp4` has its preview at `video/previews/x.mp4`. A clip
 * uploaded through the admin has no preview, and the card plays the full
 * file, which is what it did before.
 *
 * The bitrate follows the source. 540px is 56% of the pixels of 720, so the
 * preview is given 60% of the source's own bitrate (between 600k and 2M): a
 * quiet interior keeps every detail it had at about 0.8MB, and confetti under
 * stage lights, which the 720 file spends 6.5Mbps on, gets the 2M ceiling
 * rather than being smeared.
 *
 * Reads only the first seconds of each source: the files are faststart, so
 * ffmpeg's range requests stop once it has seven seconds. Safe to run again;
 * a preview that already exists is skipped unless `--force`. Needs ffmpeg and
 * ffprobe on the PATH, and the Blob token for uploading.
 *
 *   node --env-file=.env.local scripts/make-previews.mjs [--force] [--dry-run] [--only name]
 *
 * The token is read from the environment only. It is never printed.
 */
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { put, head, BlobNotFoundError } from "@vercel/blob";

const run = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCES = ["lib/reels.ts", "lib/content.ts", "lib/cms/defaults.ts"];
const SECONDS = 7;
const WIDTH = 540;
const MAX_AGE = 31536000;
const CONCURRENCY = 3;

process.env.VERCEL_BLOB_RETRIES ??= "0";

const force = process.argv.includes("--force");
const dryRun = process.argv.includes("--dry-run");
const onlyAt = process.argv.indexOf("--only");
const only = onlyAt === -1 ? null : process.argv[onlyAt + 1];
const base = (process.env.NEXT_PUBLIC_MEDIA_BASE ?? "").replace(/\/+$/, "");

if (!base) {
  console.error("NEXT_PUBLIC_MEDIA_BASE is not set: the sources are read from the store.");
  process.exit(1);
}
if (!dryRun && !process.env.BLOB_READ_WRITE_TOKEN) {
  console.error("BLOB_READ_WRITE_TOKEN is not set.");
  process.exit(1);
}

/** The reels the content names, as store paths ("video/reels/x.mp4"). */
async function reels() {
  const found = new Set();
  for (const file of SOURCES) {
    const text = await readFile(path.join(root, file), "utf8").catch(() => "");
    for (const match of text.matchAll(/"\/(video\/reels\/[a-z0-9-]+\.mp4)"/g)) found.add(match[1]);
  }
  return [...found].sort();
}

export function previewPath(reelPath) {
  return reelPath.replace(/^video\/reels\//, "video/previews/");
}

async function probe(url) {
  const { stdout } = await run("ffprobe", [
    "-v", "error",
    "-select_streams", "v:0",
    "-show_entries", "stream=bit_rate:format=duration,bit_rate",
    "-of", "json",
    url,
  ]);
  const info = JSON.parse(stdout);
  const rate = Number(info.streams?.[0]?.bit_rate ?? info.format?.bit_rate ?? 1_500_000);
  return { rate, duration: Number(info.format?.duration ?? SECONDS) };
}

async function makeOne(reelPath, dir) {
  const target = previewPath(reelPath);
  if (!force && !dryRun) {
    try {
      await head(target);
      return { reelPath, status: "skipped" };
    } catch (error) {
      if (!(error instanceof BlobNotFoundError)) throw error;
    }
  }

  const source = `${base}/${reelPath}`;
  const { rate } = await probe(source);
  const maxrate = Math.round(Math.min(2_000_000, Math.max(600_000, rate * 0.6)) / 1000);
  const out = path.join(dir, path.basename(reelPath));
  await run("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y",
    "-t", String(SECONDS),
    "-i", source,
    "-an",
    "-vf", `scale=${WIDTH}:-2:flags=lanczos:out_color_matrix=bt709:out_range=tv`,
    "-c:v", "libx264", "-preset", "slower", "-crf", "26",
    "-maxrate", `${maxrate}k`, "-bufsize", `${maxrate * 2}k`,
    "-profile:v", "high", "-level", "4.0", "-pix_fmt", "yuv420p", "-g", "60",
    "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
    "-movflags", "+faststart",
    out,
  ]);
  const size = (await stat(out)).size;
  if (dryRun) return { reelPath, status: "would upload", size, maxrate };

  await put(target, await readFile(out), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: MAX_AGE,
    contentType: "video/mp4",
  });
  return { reelPath, status: "uploaded", size, maxrate };
}

const dir = await mkdtemp(path.join(tmpdir(), "previews-"));
const all = (await reels()).filter((p) => !only || p.includes(only));
console.log(`${all.length} reels named in ${SOURCES.join(", ")}`);

const results = [];
let next = 0;
async function worker() {
  while (next < all.length) {
    const reelPath = all[next++];
    let result;
    try {
      result = await makeOne(reelPath, dir);
    } catch (error) {
      result = { reelPath, status: "failed", error: error instanceof Error ? error.message : String(error) };
    }
    results.push(result);
    const size = result.size ? ` ${(result.size / 1024).toFixed(0)}KB at <=${result.maxrate}k` : "";
    console.log(`  ${result.status.padEnd(12)} ${reelPath}${size}${result.error ? ` (${result.error})` : ""}`);
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));
await rm(dir, { recursive: true, force: true });

const made = results.filter((r) => r.size);
const total = made.reduce((sum, r) => sum + r.size, 0);
console.log(`\n${made.length} encoded, ${(total / 1024 / 1024).toFixed(1)}MB, mean ${made.length ? (total / made.length / 1024).toFixed(0) : 0}KB`);
if (results.some((r) => r.status === "failed")) process.exit(1);
