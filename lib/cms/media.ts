import "server-only";
import { audit, type Actor } from "./audit";
import { sql } from "./db";
import { getAllData } from "./repo";
import { CONTENT_KEYS, type ContentKey } from "./schema";

/**
 * The media library: every file content can point at, uploaded or shipped.
 *
 * A file is registered once, with its kind, pixel size, duration and the alt
 * text that travels with it into content. Deleting is soft: the row is marked
 * and hidden, and the file stays on Blob so an older revision that names it
 * can still be restored. A file that current content still uses cannot be
 * deleted at all; `findReferences` says where it is used instead.
 */

export const UPLOAD_RULES = {
  image: { types: ["image/jpeg", "image/png", "image/webp", "image/avif"], maxBytes: 20 * 1024 * 1024 },
  video: { types: ["video/mp4", "video/webm", "video/quicktime"], maxBytes: 300 * 1024 * 1024 },
} as const;

export type MediaKind = "image" | "video";

export type MediaItem = {
  id: string;
  kind: MediaKind;
  url: string;
  pathname: string | null;
  posterUrl: string | null;
  w: number | null;
  h: number | null;
  duration: number | null;
  bytes: number | null;
  mime: string | null;
  alt: string;
  source: "blob" | "seed";
  createdAt: string;
  deletedAt: string | null;
};

type Row = {
  id: string;
  kind: MediaKind;
  url: string;
  pathname: string | null;
  poster_url: string | null;
  w: number | null;
  h: number | null;
  duration: number | null;
  bytes: string | null;
  mime: string | null;
  alt: string;
  source: "blob" | "seed";
  created_at: Date;
  deleted_at: Date | null;
};

function toItem(r: Row): MediaItem {
  return {
    id: r.id,
    kind: r.kind,
    url: r.url,
    pathname: r.pathname,
    posterUrl: r.poster_url,
    w: r.w,
    h: r.h,
    duration: r.duration,
    bytes: r.bytes === null ? null : Number(r.bytes),
    mime: r.mime,
    alt: r.alt,
    source: r.source,
    createdAt: new Date(r.created_at).toISOString(),
    deletedAt: r.deleted_at ? new Date(r.deleted_at).toISOString() : null,
  };
}

export type RegisterInput = {
  kind: MediaKind;
  url: string;
  pathname?: string | null;
  posterUrl?: string | null;
  w?: number | null;
  h?: number | null;
  duration?: number | null;
  bytes?: number | null;
  mime?: string | null;
  alt: string;
  source: "blob" | "seed";
};

/**
 * Adds a file to the library, or brings a soft-deleted one back with the new
 * details. Callers have already checked the file itself (see the media
 * action, which asks Blob for its real size and type).
 */
export async function registerMedia(input: RegisterInput, actor: Actor): Promise<MediaItem> {
  const rows = (await sql().query(
    `INSERT INTO media (kind, url, pathname, poster_url, w, h, duration, bytes, mime, alt, source, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     ON CONFLICT (url) DO UPDATE SET
       kind = EXCLUDED.kind, poster_url = COALESCE(EXCLUDED.poster_url, media.poster_url),
       w = COALESCE(EXCLUDED.w, media.w), h = COALESCE(EXCLUDED.h, media.h),
       duration = COALESCE(EXCLUDED.duration, media.duration), bytes = COALESCE(EXCLUDED.bytes, media.bytes),
       mime = COALESCE(EXCLUDED.mime, media.mime), alt = EXCLUDED.alt, deleted_at = NULL
     RETURNING *`,
    [
      input.kind,
      input.url,
      input.pathname ?? null,
      input.posterUrl ?? null,
      input.w ?? null,
      input.h ?? null,
      input.duration ?? null,
      input.bytes ?? null,
      input.mime ?? null,
      input.alt,
      input.source,
      actor?.id ?? null,
    ],
  )) as Row[];
  const item = toItem(rows[0]);
  if (input.source === "blob") await audit(actor, "media.upload", item.url, { kind: item.kind, bytes: item.bytes });
  return item;
}

export async function listMedia(options: { kind?: MediaKind; includeDeleted?: boolean } = {}): Promise<MediaItem[]> {
  const rows = (await sql().query(
    `SELECT * FROM media
      WHERE ($1::text IS NULL OR kind = $1) AND ($2 OR deleted_at IS NULL)
      ORDER BY created_at DESC, url`,
    [options.kind ?? null, options.includeDeleted ?? false],
  )) as Row[];
  return rows.map(toItem);
}

export async function getMedia(id: string): Promise<MediaItem | null> {
  const rows = (await sql().query(`SELECT * FROM media WHERE id = $1`, [id])) as Row[];
  return rows[0] ? toItem(rows[0]) : null;
}

export async function countMedia(): Promise<{ image: number; video: number }> {
  const rows = (await sql().query(
    `SELECT kind, count(*)::int AS n FROM media WHERE deleted_at IS NULL GROUP BY kind`,
  )) as { kind: MediaKind; n: number }[];
  const out = { image: 0, video: 0 };
  for (const r of rows) out[r.kind] = r.n;
  return out;
}

export async function updateMediaDetails(id: string, details: { alt?: string; posterUrl?: string | null }, actor: Actor) {
  const rows = (await sql().query(
    `UPDATE media SET alt = COALESCE($2, alt), poster_url = CASE WHEN $3 THEN $4 ELSE poster_url END
      WHERE id = $1 RETURNING *`,
    [id, details.alt ?? null, details.posterUrl !== undefined, details.posterUrl ?? null],
  )) as Row[];
  if (!rows[0]) return null;
  await audit(actor, "media.update", rows[0].url, { alt: details.alt !== undefined, poster: details.posterUrl !== undefined });
  return toItem(rows[0]);
}

export type Reference = {
  key: ContentKey;
  /** Dotted path inside the document, like `works.3.cover.src` without the key. */
  path: string;
};

/** Every place in a value where `url` appears as a whole string. */
function walk(value: unknown, url: string, path: (string | number)[], out: (string | number)[][]) {
  if (typeof value === "string") {
    if (value === url) out.push(path);
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => walk(v, url, [...path, i], out));
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) walk(v, url, [...path, k], out);
  }
}

/**
 * Where the live content uses `url` (and, for a video, its poster). Reads the
 * documents as the site would render them, defaults included, so a shipped
 * file that no one has edited yet still counts as in use.
 */
export async function findReferences(url: string, posterUrl?: string | null): Promise<Reference[]> {
  const docs = await getAllData();
  const refs: Reference[] = [];
  for (const key of CONTENT_KEYS) {
    for (const target of [url, posterUrl].filter(Boolean) as string[]) {
      const found: (string | number)[][] = [];
      walk(docs[key], target, [], found);
      for (const p of found) refs.push({ key, path: p.join(".") });
    }
  }
  return refs;
}

export type DeleteResult = { ok: true } | { inUse: Reference[] } | { missing: true };

/** Hides a file from the library unless current content still uses it. */
export async function softDeleteMedia(id: string, actor: Actor): Promise<DeleteResult> {
  const item = await getMedia(id);
  if (!item || item.deletedAt) return { missing: true };
  const refs = await findReferences(item.url, item.posterUrl);
  if (refs.length) return { inUse: refs };
  await sql().query(`UPDATE media SET deleted_at = now() WHERE id = $1`, [id]);
  await audit(actor, "media.delete", item.url, { kind: item.kind });
  return { ok: true };
}
