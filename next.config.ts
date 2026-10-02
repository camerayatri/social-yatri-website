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

/** The Blob store the client's media is served from (see `lib/media.ts`). */
const MEDIA_STORE = "https://7fbuzjgryviydeeh.public.blob.vercel-storage.com";

/**
 * Sent with every response. Vercel adds Strict-Transport-Security itself.
 *
 * - nosniff: a file is only ever run or styled as the type it was served as.
 * - strict-origin-when-cross-origin: another site the reader follows a link
 *   to (the Maps link, Instagram) learns the reader came from this domain,
 *   never which page.
 * - Permissions-Policy: the site uses none of these, so nothing embedded in
 *   it can ask for them either.
 *
 * The admin sends stricter values of its own from `proxy.ts` (no referrer at
 * all, no framing, no caching). Those are set on the response after these,
 * so on admin routes the admin's win; checked with `next start`.
 */
const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  },
  /*
   * A Content Security Policy, in report-only form: browsers check every
   * page against it and print what it would have blocked in the console, and
   * block nothing. It is not enforced yet because the pages are static, which
   * rules out per-request nonces, so Next's inline bootstrap scripts need
   * 'unsafe-inline'; and because Vercel's preview toolbar loads scripts of its
   * own on preview deployments. Checked clean on every public page under
   * `next start`. To enforce it, rename the header once a production
   * deployment has run a while with no reports.
   */
  {
    key: "Content-Security-Policy-Report-Only",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      `img-src 'self' data: blob: ${MEDIA_STORE}`,
      `media-src 'self' blob: ${MEDIA_STORE}`,
      "font-src 'self'",
      "connect-src 'self' https://*.public.blob.vercel-storage.com https://blob.vercel-storage.com https://vercel.com",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; "),
  },
];

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

  // Says nothing a visitor needs, and names the framework to anyone probing.
  poweredByHeader: false,

  async headers() {
    return [
      { source: "/:path*", headers: SECURITY_HEADERS },
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
