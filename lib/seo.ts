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

/**
 * The title and description the home page carries, and every page falls back
 * to when it sets none of its own.
 *
 * Written for the search a business owner in the city actually types rather
 * than as a slogan: the client's own line, "Kyunki, Joh dikhta hai wahi toh
 * bikta hai", is the best thing on the site and says nothing to a search
 * engine about what the studio does or where. The services named are the
 * ones on the services list, and nothing more.
 */
export const DEFAULT_TITLE = "Social Yatri · Social Media Marketing Agency in Kolkata";
export const DEFAULT_DESCRIPTION =
  "Social Yatri is a social media marketing and content creation agency in Kolkata: reels, UGC videos, branding, ad films, websites and performance marketing.";

/**
 * A hand-written sentence for as long as the facts it was written about still
 * stand, and one built from the content once they do not.
 *
 * Some descriptions summarise the content in words no template would choose
 * ("Koliving grew from 300 to 5,000+ followers"), and they are better for it.
 * But the content is edited in the admin now, and a description that states
 * last month's figures is worse than a plain one. So each such sentence is
 * filed with the facts it states, as they stood when it was written; while the
 * content still says the same, the sentence is used, and the moment an edit
 * changes one of those facts the description is rebuilt from the content.
 */
export function writtenFor(facts: unknown, writtenAgainst: unknown, written: string, rebuilt: () => string) {
  return JSON.stringify(facts) === JSON.stringify(writtenAgainst) ? written : rebuilt();
}

/**
 * A description made of the content's own sentences, in order, as many whole
 * ones as fit in `max` characters (about what a results page shows before it
 * cuts a snippet off). The first sentence is always kept, so a description is
 * never empty.
 *
 * The client writes in short punches followed by one long sentence ("People
 * trust people." and then the explanation), so stopping at the limit can leave
 * a description of forty characters that says nothing. One that short takes
 * the next sentence anyway while the whole stays under `soft`: a results page
 * then trims the end of the explanation, after the promise has been read,
 * which is a better snippet than the promise alone.
 */
export function sentencesWithin(paragraphs: string[], max = 160, soft = 200) {
  const sentences = paragraphs.flatMap((paragraph) => paragraph.split(/(?<=[.!?])\s+/)).filter(Boolean);
  let out = sentences[0] ?? "";
  for (const sentence of sentences.slice(1)) {
    const next = `${out} ${sentence}`;
    if (next.length > max && (out.length >= 120 || next.length > soft)) break;
    out = next;
  }
  return out;
}

/** "a, b and c", for the descriptions that list what the content holds. */
export function listOf(items: string[]) {
  return items.length < 2 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/**
 * A URL on this site from a path, or a full URL as it is. Media lives on the
 * Blob store and arrives as a full URL, which must not be prefixed again.
 */
export function absoluteUrl(path: string) {
  if (/^https?:\/\//.test(path)) return path;
  return `${SITE_URL}${path === "/" ? "" : path}`;
}

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
