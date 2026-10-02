import type { MetadataRoute } from "next";

import { getContent } from "@/lib/cms/get-content";
import { DEFAULT_DESCRIPTION } from "@/lib/seo";

/**
 * The web app manifest.
 *
 * This is a website, not an app, so `display` stays `browser`: "Add to Home
 * Screen" makes a bookmark that opens in the browser with its address bar,
 * rather than a standalone window with no way back or to share a link.
 * The colours are the paper the site is printed on, and the icons are the
 * same files `app/icon.png` and `app/apple-icon.png` serve as the favicon.
 *
 * The name is the one set in the admin. Like the sitemap, this reads the
 * cached content, so a rename shows here on the next request after the save;
 * the description is the site-wide one the root layout's metadata uses.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { site } = await getContent();
  return {
    name: site.name,
    short_name: site.name,
    description: DEFAULT_DESCRIPTION,
    start_url: "/",
    display: "browser",
    background_color: "#f2efe9",
    theme_color: "#f2efe9",
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
