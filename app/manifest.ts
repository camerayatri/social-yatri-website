import type { MetadataRoute } from "next";

import { SITE } from "@/lib/content";
import { DEFAULT_DESCRIPTION } from "@/lib/seo";

/**
 * The web app manifest.
 *
 * This is a website, not an app, so `display` stays `browser`: "Add to Home
 * Screen" makes a bookmark that opens in the browser with its address bar,
 * rather than a standalone window with no way back or to share a link.
 * The colours are the paper the site is printed on, and the icons are the
 * same files `app/icon.png` and `app/apple-icon.png` serve as the favicon.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE.name,
    short_name: SITE.name,
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
