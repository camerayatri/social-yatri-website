/**
 * Where a piece of media is allowed to live.
 *
 * Content may only point at files this site serves itself (`/img/...` and
 * `/video/...` under `public/`) or at the project's public Blob store. Anything
 * else, a hotlinked image from somebody else's server or a `javascript:` URL
 * pasted into a field, is refused at save time rather than shipped.
 *
 * Plain functions with no server imports, so the admin's client components can
 * run the same check before a save leaves the browser.
 */

/** Any Vercel Blob public store: `https://<store id>.public.blob.vercel-storage.com/...`. */
const BLOB_URL = /^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\/[^\s]+$/i;

/** A path into `public/`, with no `..` segment and no query or fragment. */
const LOCAL_PATH = /^\/(img|video)\/(?!.*\.\.)[A-Za-z0-9._\-/]+$/;

export function isBlobUrl(src: string) {
  return BLOB_URL.test(src);
}

export function isLocalMedia(src: string) {
  return LOCAL_PATH.test(src);
}

export function isAllowedMediaSrc(src: string) {
  return isLocalMedia(src) || isBlobUrl(src);
}

const VIDEO_EXT = /\.(mp4|webm|mov|m4v)$/i;
const IMAGE_EXT = /\.(jpe?g|png|webp|avif|gif)$/i;

/** Best guess at a file's kind from its path, for files registered without a MIME type. */
export function mediaKindFromSrc(src: string): "image" | "video" | null {
  const path = src.split("?")[0];
  if (VIDEO_EXT.test(path)) return "video";
  if (IMAGE_EXT.test(path)) return "image";
  return null;
}
