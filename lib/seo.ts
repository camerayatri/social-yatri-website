/**
 * The facts a search engine needs that are not copy: where the site lives,
 * where the studio is, and how structured data is written into the page.
 *
 * Nothing here imports the copy. `lib/content.ts` reads the map link from this
 * file, and the structured data that needs both lives in
 * `lib/structured-data.ts`, so the two never import each other in a circle.
 */

/**
 * The one origin every canonical, sitemap entry and Open Graph URL is built
 * on. It is the www host on purpose: the apex domain answers with a 308 to
 * it, and a canonical that points at a redirect asks Google to pick between
 * two addresses for the same page, which it does not always do the way we
 * would. No trailing slash, so paths can be appended as they are written.
 */
export const SITE_URL = "https://www.socialyatri.in";

/**
 * The studio on Google Maps, as the client shares it. This is the link a
 * person taps: it opens the business listing in the Maps app on a phone and
 * the place page on a desktop. The `?g_st=ic` marker the share sheet adds is
 * dropped, since it only records that the link was shared from iOS.
 */
export const MAP_URL = "https://maps.app.goo.gl/xhdpjiVAs4BLt6tR9";

/**
 * The same place by its customer ID, the number Google files the business
 * listing under. The short link above is a redirect that Google could retire;
 * the CID form is the permanent address of the listing, which is why it is
 * the one structured data points at to tie the site to the Maps entry.
 */
export const MAP_CID_URL = "https://maps.google.com/?cid=2497474643187856927";

/** Where the pin on that listing sits, as Google has it. */
export const GEO = { latitude: 22.5249488, longitude: 88.3492109 } as const;

/**
 * Serialise structured data for a `<script type="application/ld+json">`.
 *
 * `JSON.stringify` alone is not safe inside a script element: a string that
 * contains `</script>` ends the element early and whatever follows is parsed
 * as HTML. Every `<` is written as its JSON unicode escape instead, which a
 * JSON parser reads back as the same character and an HTML parser never sees
 * as the start of a tag. This is the sanitising the Next.js JSON-LD guide
 * recommends.
 */
export function jsonLd(data: object): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
