import "server-only";
import { unstable_cache } from "next/cache";
import { hasDatabase, sql } from "./db";
import { DEFAULTS } from "./defaults";
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
 */

export const CONTENT_TAG = "content";

async function loadAll(): Promise<ContentDocs> {
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
  return hasDatabase() ? cached() : Promise.resolve(DEFAULTS);
}

/** One document, from the same cached read. */
export async function getContentDoc<K extends ContentKey>(key: K): Promise<ContentDocs[K]> {
  return (await getContent())[key];
}
