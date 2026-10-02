import type { CSSProperties } from "react";
import { getImageProps } from "next/image";

import PLACEHOLDERS from "./placeholders.json";

/**
 * Where the client's media is served from.
 *
 * The photographs, the reels and their posters live in a Vercel Blob store
 * rather than in the deployment. They are a quarter of a gigabyte, they change
 * on a different clock from the code, and from /public every one of them went
 * out with `max-age=0`, so each visit asked again for files that never change.
 * `scripts/upload-media.mjs` copies them up under the same path they have here,
 * so `/video/reels/cafe-01.mp4` becomes `<store>/video/reels/cafe-01.mp4`.
 *
 * Applied where the content is written down (`lib/reels.ts`, `lib/gallery.ts`
 * and the media fields of `lib/content.ts`) rather than where it is drawn.
 * There is no single place it is drawn: a path reaches the page through a
 * dozen `<Image>`s, four `<video>`s and the viewer, and a component that
 * forgot to wrap one would quietly serve that file from the deployment, where
 * it no longer is. The data has one way in, so every caller gets the resolved
 * URL without knowing there is anything to resolve. It is also where the CMS
 * will plug in: what it stores are absolute Blob URLs, which pass through
 * unchanged.
 *
 * `NEXT_PUBLIC_MEDIA_BASE` is the store's origin with no trailing slash, and
 * is inlined into the client bundle at build. Left unset, every path stays
 * site-relative and is served from /public, which is how local development
 * works without a network connection to the store.
 *
 * What stays in the deployment, and is never passed through here: the chrome,
 * the media that is part of the site rather than the client's work. That is
 * the opening film (`/video/entry.mp4` and its AV1 twin), the page
 * transition's taxi clip (`/video/taxi.mp4`), the paper grain
 * (`/img/noise.avif`), the fonts (bundled by `next/font`) and the icons in
 * `app/`. They ship with the code they are timed against, they are small, and
 * `next.config.ts` gives them a proper cache lifetime.
 */
const BASE = process.env.NEXT_PUBLIC_MEDIA_BASE?.replace(/\/+$/, "") ?? "";

export function media(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  if (!BASE || !path.startsWith("/")) return path;
  return `${BASE}${path}`;
}

/** The store path of a media URL ("img/covers/home-04.jpg"), as the placeholder table keys it. */
function storePath(src: string): string {
  const rest = BASE && src.startsWith(`${BASE}/`) ? src.slice(BASE.length) : src;
  return rest.replace(/^\/+/, "");
}

/** Whether a still has its colours in the table (a seeded one) or needs the optimizer's tiny copy. */
export function hasPlaceholder(src: string): boolean {
  return storePath(src) in PLACEHOLDERS;
}

/**
 * The paper the site is printed on, a step darker: what a frame with no
 * placeholder of its own shows while it loads. Close enough to the page to
 * read as an empty frame rather than a hole.
 */
const BLANK = "#e4dfd6";

/**
 * What a still looks like before it has arrived: the background for the veil
 * laid over it while it loads (`components/work/veil.tsx`).
 *
 * The seeded stills have two colours each in `lib/placeholders.json`, the
 * averages of their top and bottom halves, drawn as a vertical blend; that
 * costs no request and is in the page from its first paint. A still the
 * admin uploaded after the table was made is not in it, so it is drawn from a
 * 16px copy through the image optimizer instead, which the browser stretches
 * into a soft version of the frame. That copy is a request of about 300
 * bytes, made only for a frame that is still loading when it comes near the
 * screen (`tiny` is false until then), and it is one optimizer variant per
 * upload, not one per width.
 */
export function placeholderStyle(src: string, tiny: boolean): CSSProperties {
  const tones = (PLACEHOLDERS as Record<string, string>)[storePath(src)];
  if (tones) {
    return { backgroundImage: `linear-gradient(#${tones.slice(0, 6)}, #${tones.slice(6, 12)})` };
  }
  if (!tiny || !/^https?:\/\//.test(src)) return { backgroundColor: BLANK };
  const { props } = getImageProps({ src, alt: "", width: 16, height: 16, quality: 75 });
  const url = props.srcSet?.split(", ")[0]?.split(" ")[0] ?? props.src;
  return { backgroundColor: BLANK, backgroundImage: `url("${url}")`, backgroundSize: "cover", backgroundPosition: "center" };
}

/**
 * The URL a `<video poster>` should carry: the frame through the image
 * optimizer rather than the raw JPEG.
 *
 * A poster attribute is a plain URL, so `next/image` never sees it and it
 * would otherwise bypass the optimizer altogether, which on a strip of
 * twenty-one clips is twenty-one full-quality JPEGs. Every poster is cut at
 * 720x1280, so it asks for the 720 frame at its own size: the first width in
 * the optimizer's list that holds it (750, which is not enlarged past the
 * source), at quality 75. Taken from `getImageProps` rather than built by
 * hand, so the URL follows `next.config.ts` (the widths, the qualities, and
 * `unoptimized` should it ever be set) instead of guessing at it.
 */
export function posterSrc(src: string): string {
  const { props } = getImageProps({ src, alt: "", width: 720, height: 1280, quality: 75 });
  // The 1x candidate of the pair, "<url> 1x, <url> 2x"; with no srcSet
  // (unoptimized) the plain src is the file itself.
  return props.srcSet?.split(", ")[0]?.split(" ")[0] ?? props.src;
}
