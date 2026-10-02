import type { MetadataRoute } from "next";

import { getContent } from "@/lib/cms/get-content";
import { orderedShoots, serviceId, workCover } from "@/lib/cms/derive";
import { absoluteUrl } from "@/lib/seo";

/*
 * When the content last changed, written down rather than taken from the
 * clock. `new Date()` would stamp every page as changed on every build, and a
 * crawler that learns the date means nothing stops reading it. Move this
 * forward when the copy, the work or the photography changes.
 */
const LAST_MODIFIED = "2026-10-02";

/**
 * Every page, with the pictures on it.
 *
 * The static pages are the navigation's own list, so a page added to the menu
 * is added here too. The service and work pages carry their designed covers
 * and the photoshoot page carries every frame on it: an image sitemap is how
 * a photograph that is only ever loaded lazily, inside a carousel, gets found
 * by image search at all.
 *
 * Read from the content, so a category or a photograph added in the admin is
 * listed as soon as it is saved. The media is on the Blob store and comes as
 * full URLs, which are listed as they are rather than prefixed with the site.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { nav, services, works, reels, shoots } = await getContent();

  const pages: MetadataRoute.Sitemap = nav.map((item) => ({
    url: absoluteUrl(item.href),
    lastModified: LAST_MODIFIED,
    ...(item.href === "/photoshoot"
      ? { images: orderedShoots(shoots).flatMap((shoot) => shoot.photos.map((photo) => absoluteUrl(photo.src))) }
      : null),
  }));

  const workPages: MetadataRoute.Sitemap = works.map((work) => ({
    url: absoluteUrl(`/work/${work.slug}`),
    lastModified: LAST_MODIFIED,
    images: [absoluteUrl(workCover(work, reels).src)],
  }));

  // Each service's own page, with the cover it opens on.
  const servicePages: MetadataRoute.Sitemap = services.map((service) => ({
    url: absoluteUrl(`/services/${serviceId(service)}`),
    lastModified: LAST_MODIFIED,
    images: [absoluteUrl(service.cover.src)],
  }));

  return [...pages, ...servicePages, ...workPages];
}
