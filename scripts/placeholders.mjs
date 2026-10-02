#!/usr/bin/env node
/**
 * Writes `lib/placeholders.json`: two colours for every still the site ships,
 * the average of its top half and of its bottom half.
 *
 * A frame that has not arrived yet is drawn as a vertical blend of those two
 * (see `placeholderStyle` in `lib/media.ts`), and the photograph fades in over
 * it. Two colours rather than one because most of this work is a sky or a
 * ceiling over a floor, a lawn or a stage, and a single average of the two is
 * a grey that matches neither. Twelve hex digits a frame keeps the whole
 * table at a few kilobytes in the browser, where a blurred thumbnail for each
 * of the site's two hundred stills would be tens.
 *
 * Covers what the content names in `lib/` (the seeded media). A still the
 * admin uploads later is not in the table and gets a tiny copy through the
 * image optimizer instead, so nothing here has to run for an upload to look
 * right. Run it again after replacing seeded media:
 *
 *   node --env-file=.env.local scripts/placeholders.mjs
 *
 * Reads the files from the store (`NEXT_PUBLIC_MEDIA_BASE`), or from /public
 * when that is unset.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCES = ["lib/reels.ts", "lib/gallery.ts", "lib/content.ts"];
const OUT = path.join(root, "lib/placeholders.json");
const CONCURRENCY = 6;
const base = (process.env.NEXT_PUBLIC_MEDIA_BASE ?? "").replace(/\/+$/, "");

async function stills() {
  const found = new Set();
  for (const file of SOURCES) {
    const text = await readFile(path.join(root, file), "utf8");
    for (const match of text.matchAll(/"\/((?:img|video\/posters)\/[^"]+\.(?:jpe?g|png|webp|avif))"/g)) {
      found.add(match[1]);
    }
  }
  // The paper grain is the site's own texture, not a frame.
  found.delete("img/noise.avif");
  return [...found].sort();
}

async function load(p) {
  if (!base) return readFile(path.join(root, "public", p));
  const response = await fetch(`${base}/${p}`, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`${response.status} for ${p}`);
  return Buffer.from(await response.arrayBuffer());
}

const hex = (r, g, b) => [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");

async function tones(p) {
  const { data } = await sharp(await load(p))
    .rotate()
    .removeAlpha()
    .resize(1, 2, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });
  return hex(data[0], data[1], data[2]) + hex(data[3], data[4], data[5]);
}

const all = await stills();
const table = {};
let next = 0;
let failed = 0;
async function worker() {
  while (next < all.length) {
    const p = all[next++];
    try {
      table[p] = await tones(p);
    } catch (error) {
      failed++;
      console.log(`  failed ${p} (${error instanceof Error ? error.message : error})`);
    }
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

const sorted = Object.fromEntries(Object.entries(table).sort(([a], [b]) => a.localeCompare(b)));
await writeFile(OUT, `${JSON.stringify(sorted, null, 0).replace(/","/g, '",\n"').replace(/^\{/, "{\n").replace(/\}$/, "\n}")}\n`);
console.log(`${Object.keys(sorted).length} stills written to lib/placeholders.json${failed ? `, ${failed} failed` : ""}`);
if (failed) process.exit(1);
