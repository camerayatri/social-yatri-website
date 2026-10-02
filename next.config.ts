import type { NextConfig } from "next";

/**
 * How long the browser may keep what still ships in /public: the opening
 * film, the transition clip, the paper grain, and the client's media when it
 * is served locally (no `NEXT_PUBLIC_MEDIA_BASE`). Next serves /public with
 * `max-age=0` because it cannot know a file will not change; these change only
 * with a deploy, so a week fresh and a day of stale-while-revalidate on top.
 * Not `immutable`: the names carry no hash, so a replaced file has to be able
 * to reach a returning visitor within the week.
 *
 * Fonts are not listed. `next/font` serves them from `/_next/static` with a
 * hashed name and an immutable year already, which this cannot override.
 */
const PUBLIC_MEDIA_CACHE = "public, max-age=604800, stale-while-revalidate=86400";

const nextConfig: NextConfig = {
  images: {
    /*
     * The Blob store the client's media lives in (see `lib/media.ts`). Only
     * this store, and only https, so the optimizer cannot be pointed at
     * anybody else's images.
     */
    remotePatterns: [new URL("https://7fbuzjgryviydeeh.public.blob.vercel-storage.com/**")],
    // AVIF first for the browsers that take it, which is nearly all of them,
    // and WebP for the rest.
    formats: ["image/avif", "image/webp"],
    /*
     * The one quality the site asks for: every frame, cover and poster is at
     * 75, and the viewer's prefetch has to match what it will show or it
     * fetches a file nobody looks at. Next 16 requires the list, so a request
     * for any other quality is refused rather than encoded.
     */
    qualities: [75],
    /*
     * A month. An optimized image is cached for the larger of this and the
     * source's own max-age, and the sources never change under the same name
     * (a new photograph is a new file), so re-encoding every four hours, the
     * default, was work for nothing.
     */
    minimumCacheTTL: 2678400,
  },

  async headers() {
    return [
      {
        source: "/video/:path*",
        headers: [{ key: "Cache-Control", value: PUBLIC_MEDIA_CACHE }],
      },
      {
        source: "/img/:path*",
        headers: [{ key: "Cache-Control", value: PUBLIC_MEDIA_CACHE }],
      },
    ];
  },
};

export default nextConfig;
