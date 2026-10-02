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
 * checkout and the build work. With one, what happens when the database does
 * not answer is set out at `getContent` below: in short, the build fails, a
 * page that already has a copy keeps serving it, and a page that has none is
 * served from the last content this server read (or the shipped copy) for a
 * minute at a time instead of failing.
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

/**
 * How long one read may take before it counts as a failure. A warm read from
 * here took under 100ms and one that woke the database about 450ms, but
 * Neon's free plan suspends an idle database after five minutes and a wake
 * can occasionally run to several seconds (a build once hit a 5s limit twice
 * in a row). Ten seconds lets a slow wake through; a query still unanswered
 * after that has met a real outage, and a render held on it would only hold
 * the visitor. The build has nobody waiting, so it waits longer.
 */
const QUERY_TIMEOUT_MS = process.env.NEXT_PHASE === "phase-production-build" ? 30_000 : 10_000;

/** The last content this server instance read successfully. */
let lastGood: ContentDocs | null = null;

/**
 * The read in flight, shared. Right after a save every page's copy is stale at
 * once, and the first visits to them regenerate side by side; on one server
 * instance they now share a single query instead of each sending its own.
 * Only the database read is shared, never the cache lookup around it, which
 * each render has to make for itself so its page carries the "content" tag.
 */
let inflight: Promise<ContentDocs> | null = null;

async function loadAll(): Promise<ContentDocs> {
  inflight ??= readAll()
    .then((docs) => {
      const resolved = resolveMedia(docs);
      lastGood = resolved;
      return resolved;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

async function query() {
  const rows = await sql().query(`SELECT key, data FROM content_docs`, [], {
    fetchOptions: { signal: AbortSignal.timeout(QUERY_TIMEOUT_MS) },
  });
  return rows as { key: string; data: unknown }[];
}

async function readAll(): Promise<ContentDocs> {
  if (!hasDatabase()) return DEFAULTS;
  let rows: { key: string; data: unknown }[];
  try {
    try {
      rows = await query();
    } catch {
      // Once more after a moment: a dropped connection or a database waking
      // from suspension usually answers the second time.
      await new Promise((resolve) => setTimeout(resolve, 300));
      rows = await query();
    }
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

/**
 * Marks the page being rendered to be regenerated in a minute. An
 * `unstable_cache` with a numeric `revalidate` shortens the revalidate of the
 * page that reads it, which is the one lever a static page has over its own
 * lifetime from inside a render.
 */
const retryInAMinute = unstable_cache(async () => true, ["cms-content-fallback"], { revalidate: 60 });

/**
 * Every content document, cached.
 *
 * When the database does not answer (after one retry and a five-second
 * timeout per attempt), checked against a production build:
 *
 * - During `next build` the error is thrown and the build fails, so a deploy
 *   cannot go out with the shipped copy in place of the client's; the
 *   previous deployment keeps serving.
 * - A page whose copy is only stale (time-based or `revalidateTag(tag,
 *   "max")`) never gets here: `unstable_cache` answers a failed refresh with
 *   the data it already had, and the page keeps its content.
 * - A page with no usable copy, which is every page right after a save
 *   (`updateTag` expires them, so the next visit renders while the visitor
 *   waits), used to answer that visit with a 500 for as long as the database
 *   was away. It is now rendered from the last content this server instance
 *   read, or the shipped copy if it has read none, the error is logged, and
 *   the page is marked to regenerate after a minute, so the stand-in is never
 *   held longer than that and the client's content returns by itself once
 *   the database does. It still carries the "content" tag, so a save
 *   replaces it at once as usual.
 */
export async function getContent(): Promise<ContentDocs> {
  if (!hasDatabase()) return PUBLIC_DEFAULTS;
  try {
    return await cached();
  } catch (error) {
    if (process.env.NEXT_PHASE === "phase-production-build") throw error;
    console.error(
      `[cms] Content could not be read; serving ${lastGood ? "the last content read" : "the shipped defaults"} for a minute.`,
      error,
    );
    await retryInAMinute();
    return lastGood ?? PUBLIC_DEFAULTS;
  }
}

/** One document, from the same cached read. */
export async function getContentDoc<K extends ContentKey>(key: K): Promise<ContentDocs[K]> {
  return (await getContent())[key];
}
