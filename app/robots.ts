import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/seo";

/**
 * Everything is open except the admin.
 *
 * The admin is served from a secret path that is rewritten to `/cms`
 * internally, so `/cms` is the only address of it that is safe to name. The
 * secret path itself must never be written here: robots.txt is public, and
 * listing a path in it is the quickest way to tell everybody where it is.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/cms" },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
