import "server-only";
import { unstable_cache } from "next/cache";
import { media } from "@/lib/media";
import { hasDatabase, sql } from "./db";
import { DEFAULTS } from "./defaults";
import { isLocalMedia } from "./media-src";
import { CONTENT_KEYS, SCHEMAS, SCHEMA_VERSION, type ContentDocs, type ContentKey } from "./schema";

/**
 * The content the public site renders.
 *
 * One query reads every document; each is checked against its schema and a
 * row that fails (hand-edited, or from before a schema change) is replaced by
 * the shipped default for that key alone, so one bad document cannot take a
 * page down. The result is cached under the tag "content" until a save calls
 * `updateTag("content")`.
 *
 * Without a DATABASE_URL the site runs on the defaults, which is how a fresh
 * checkout and the build work. With one, a database error in production is
 * thrown rather than answered with defaults: caching the shipped copy over the
 * client's edits would quietly undo their work until the next save.
 *
 * How a save reaches the public pages, which are prerendered (static, and the
 * work pages through `generateStaticParams`). A page that calls this during
 * its render carries the cache's "content" tag on its own prerendered entry as
 * well as on the data, so invalidating the tag invalidates the page too: there
 * is no route segment config to set and nothing is frozen until a redeploy.
 * Checked against a production build (`next build && next start`) with a
 * static page reading an `unstable_cache` tagged "content" that returns
 * `Date.now()`:
 *
 * - `updateTag("content")` from a Server Action (what `saveContent` and
 *   `restoreContent` call): the page the action ran on re-renders with the
 *   new data at once, and the next plain request for the static page is a
 *   MISS that regenerates it from that data; later requests HIT the new copy.
 * - `revalidateTag("content", { expire: 0 })` from a route handler: the next
 *   request is a blocking MISS with fresh data.
 * - `revalidateTag("content", "max")`: the next request is served the old
 *   copy (STALE) while it regenerates; the one after is fresh.
 *
 * Every public page reads this in its layout (the header and footer), so one
 * save refreshes them all, each on its next visit. Without a DATABASE_URL the
 * cache is never consulted and no tag is attached, which is right: with no
 * database there is nothing to save.
 */

export const CONTENT_TAG = "content";

/**
 * Every media path in the content, resolved to where the file is served.
 *
 * A document can name a file two ways: as a site path (`/img/...`), which is
 * how the seed writes the shipped media when it runs without
 * `NEXT_PUBLIC_MEDIA_BASE`, or as a full Blob URL, which is what an upload
 * stores and what the shipped constants already carry once `media()` has run
 * over them. The components draw whatever they are given, so the public copy
 * is put through `media()` here, once, as it is read and before it is cached: a site
 * path becomes its Blob URL and a full URL passes through unchanged, which
 * makes running it over already-resolved defaults harmless.
 *
 * Only strings that are media paths are touched (`isLocalMedia`, the same test
 * the schemas save against), so copy and the menu's `/services` hrefs never
 * are. The editors read the database directly (`lib/cms/repo.ts`), not this,
 * so what they load and save back is exactly what was stored.
 */
function resolveMedia<T>(value: T): T {
  if (typeof value === "string") return (isLocalMedia(value) ? media(value) : value) as T;
  if (Array.isArray(value)) return value.map(resolveMedia) as T;
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolveMedia(v)])) as T;
  }
  return value;
}

/** The shipped content as the site draws it, resolved once at start-up. */
const PUBLIC_DEFAULTS = resolveMedia(DEFAULTS);

async function loadAll(): Promise<ContentDocs> {
  return resolveMedia(await readAll());
}

async function readAll(): Promise<ContentDocs> {
  if (!hasDatabase()) return DEFAULTS;
  let rows: { key: string; data: unknown }[];
  try {
    rows = (await sql().query(`SELECT key, data FROM content_docs`)) as { key: string; data: unknown }[];
  } catch (error) {
    if (process.env.NODE_ENV === "production") throw error;
    console.warn("[cms] Content could not be read; using the shipped defaults.", error);
    return DEFAULTS;
  }
  const byKey = new Map(rows.map((r) => [r.key, r.data]));
  const out = {} as Record<ContentKey, unknown>;
  for (const key of CONTENT_KEYS) {
    if (!byKey.has(key)) {
      out[key] = DEFAULTS[key];
      continue;
    }
    const parsed = SCHEMAS[key].safeParse(byKey.get(key));
    if (parsed.success) out[key] = parsed.data;
    else {
      console.warn(`[cms] Stored "${key}" does not match its schema; using the default.`);
      out[key] = DEFAULTS[key];
    }
  }
  return out as ContentDocs;
}

const cached = unstable_cache(loadAll, ["cms-content", String(SCHEMA_VERSION)], { tags: [CONTENT_TAG] });

/** Every content document, cached. */
export function getContent(): Promise<ContentDocs> {
  return hasDatabase() ? cached() : Promise.resolve(PUBLIC_DEFAULTS);
}

/** One document, from the same cached read. */
export async function getContentDoc<K extends ContentKey>(key: K): Promise<ContentDocs[K]> {
  return (await getContent())[key];
}
