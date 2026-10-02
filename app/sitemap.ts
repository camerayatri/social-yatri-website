import type { MetadataRoute } from "next";

import { NAV, WORKS, workCover } from "@/lib/content";
import { GALLERY, SHOOTS } from "@/lib/gallery";
import { SITE_URL } from "@/lib/seo";

/*
 * When the content last changed, written down rather than taken from the
 * clock. `new Date()` would stamp every page as changed on every build, and a
 * crawler that learns the date means nothing stops reading it. Move this
 * forward when the copy, the work or the photography changes.
 */
const LAST_MODIFIED = "2026-10-02";

const url = (path: string) => `${SITE_URL}${path === "/" ? "" : path}`;

/**
 * Every page, with the pictures on it.
 *
 * The static pages are the navigation's own list, so a page added to the menu
 * is added here too. The work pages carry their designed cover and the
 * photoshoot page carries every frame on it: an image sitemap is how a
 * photograph that is only ever loaded lazily, inside a carousel, gets found
 * by image search at all.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const pages: MetadataRoute.Sitemap = NAV.map((item) => ({
    url: url(item.href),
    lastModified: LAST_MODIFIED,
    ...(item.href === "/photoshoot"
      ? { images: SHOOTS.flatMap((key) => GALLERY[key].photos.map((photo) => url(photo.src))) }
      : null),
  }));

  const works: MetadataRoute.Sitemap = WORKS.map((work) => ({
    url: url(`/work/${work.slug}`),
    lastModified: LAST_MODIFIED,
    images: [url(workCover(work).src)],
  }));

  return [...pages, ...works];
}
