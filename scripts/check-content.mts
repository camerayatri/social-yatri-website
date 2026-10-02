/**
 * Proves the shipped content and the CMS schemas agree.
 *
 * For every key: the default parses, comes back deep-equal to what went in
 * (no field silently dropped, nothing rewritten), survives a JSON round trip
 * (which is how it is stored), and passes the cross-document rules. Then a few
 * deliberate breakages make sure the rules actually bite.
 *
 *   npm run cms:check
 *
 * Exits non-zero on the first failure, so it can sit in CI.
 */

import assert from "node:assert/strict";
import { DEFAULTS } from "../lib/cms/defaults";
import { homeCards, workCover } from "../lib/cms/derive";
import { CONTENT_KEYS, SCHEMAS, crossValidate, issuesToFieldErrors, type ContentDocs } from "../lib/cms/schema";

let failures = 0;
function check(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ok  ${name}`);
  } catch (error) {
    failures++;
    console.error(`  FAIL ${name}\n       ${(error as Error).message.split("\n").join("\n       ")}`);
  }
}

console.log("Defaults round-trip through their schemas");
for (const key of CONTENT_KEYS) {
  check(key, () => {
    const value = DEFAULTS[key];
    const stored = JSON.parse(JSON.stringify(value));
    const parsed = SCHEMAS[key].safeParse(stored);
    assert.ok(parsed.success, JSON.stringify(parsed.success ? null : issuesToFieldErrors(parsed.error.issues)));
    assert.deepEqual(parsed.data, stored, "parsed value differs from the stored value");
    assert.deepEqual(stored, JSON.parse(JSON.stringify(parsed.data)));
    assert.deepEqual(crossValidate(key, value as never, DEFAULTS), []);
  });
}

const clone = (): ContentDocs => structuredClone(DEFAULTS);

console.log("Rules reject what they should");
check("hero headline must be two lines", () => {
  const hero = { ...clone().hero, headline: ["Only one line"] };
  assert.equal(SCHEMAS.hero.safeParse(hero).success, false);
});
check("empty copy is refused", () => {
  const hero = { ...clone().hero, eyebrow: "   " };
  const result = SCHEMAS.hero.safeParse(hero);
  assert.equal(result.success, false);
  assert.ok(!result.success && "eyebrow" in issuesToFieldErrors(result.error.issues));
});
check("unknown fields are refused", () => {
  assert.equal(SCHEMAS.site.safeParse({ ...clone().site, extra: "x" }).success, false);
});
check("nav hrefs are locked", () => {
  const nav = clone().nav;
  (nav[1] as { href: string }).href = "/somewhere";
  assert.equal(SCHEMAS.nav.safeParse(nav).success, false);
});
check("contact field names are locked", () => {
  const connect = clone().connect;
  (connect.fields[0] as { name: string }).name = "fullname";
  assert.equal(SCHEMAS.connect.safeParse(connect).success, false);
});
check("media must be local or on Blob", () => {
  const photos = clone().photos;
  photos.showreel.src = "https://example.com/x.jpg";
  assert.equal(SCHEMAS.photos.safeParse(photos).success, false);
  photos.showreel.src = "https://abc123.public.blob.vercel-storage.com/media/x-a1b2.jpg";
  assert.equal(SCHEMAS.photos.safeParse(photos).success, true);
  photos.showreel.src = "/img/../secret.jpg";
  assert.equal(SCHEMAS.photos.safeParse(photos).success, false);
});
check("focus must be two percentages", () => {
  const photos = clone().photos;
  photos.showreel.focus = "center";
  assert.equal(SCHEMAS.photos.safeParse(photos).success, false);
});
check("showreel holds six to twelve clips", () => {
  assert.equal(SCHEMAS.showreel.safeParse(clone().showreel.slice(0, 5)).success, false);
});
check("duplicate work slugs are refused", () => {
  const works = clone().works;
  works[1].slug = works[0].slug;
  assert.equal(SCHEMAS.works.safeParse(works).success, false);
});
check("a work names a reel list that exists", () => {
  const docs = clone();
  docs.works[0].reels = "nope";
  const issues = crossValidate("works", docs.works, DEFAULTS);
  assert.equal(issues.length, 1);
  assert.deepEqual(issues[0].path, [0, "reels"]);
});
check("removing a reel list a work uses is refused", () => {
  const reels = clone().reels;
  delete reels.clothing;
  assert.ok(crossValidate("reels", reels, DEFAULTS).length > 0);
});
check("a picture put on a home card must match its shape within 2%", () => {
  const covers = clone().homeCovers;
  covers.clothing = { ...covers.clothing, w: 900, h: 1200 };
  assert.equal(crossValidate("homeCovers", covers, DEFAULTS).length, 1);
});
check("home covers are keyed to real works", () => {
  const covers = clone().homeCovers;
  covers["not-a-work"] = { ...covers.clothing };
  assert.equal(crossValidate("homeCovers", covers, DEFAULTS).length, 1);
});
check("reordering or deleting works never waits on a home cover", () => {
  const docs = clone();
  // Swap the first two (4:3 and 3:4 cards): both covers now sit on the wrong shape.
  const swapped = [docs.works[1], docs.works[0], ...docs.works.slice(2)];
  assert.deepEqual(crossValidate("works", swapped, DEFAULTS), []);
  assert.deepEqual(crossValidate("works", docs.works.slice(1), DEFAULTS), []);
});
check("a home cover on a card of another shape is not used; the card falls back", () => {
  const docs = clone();
  const swapped = { ...docs, works: [docs.works[1], docs.works[0], ...docs.works.slice(2)] };
  const cards = homeCards(swapped);
  for (const card of cards.slice(0, 2)) {
    const wall = workCover(swapped.works.find((w) => w.slug === card.slug)!, swapped.reels);
    assert.equal(card.cover.src, wall.src);
  }
  assert.equal(cards[0].aspect, String(4 / 3));
  assert.equal(cards[2].cover.src, docs.homeCovers[docs.works[2].slug]!.src);
  // As stored, every default card wears its own home cover at its own size.
  assert.deepEqual(
    homeCards(docs).map((c) => c.cover.src),
    docs.works.slice(0, 6).map((w) => docs.homeCovers[w.slug]!.src),
  );
});
check("saving the covers again leaves a stale one alone, but refuses a new wrong one", () => {
  const docs = clone();
  const swapped = { ...docs, works: [docs.works[1], docs.works[0], ...docs.works.slice(2)] };
  const covers = clone().homeCovers;
  covers[docs.works[2].slug] = { ...covers[docs.works[2].slug]!, alt: "Changed description" };
  assert.deepEqual(crossValidate("homeCovers", covers, swapped), []);
  covers[docs.works[3].slug] = { ...covers[docs.works[1].slug]! };
  assert.equal(crossValidate("homeCovers", covers, swapped).length, 1);
});
check("shoot order names real shoots", () => {
  const shoots = clone().shoots;
  shoots.order.push("nope");
  assert.equal(SCHEMAS.shoots.safeParse(shoots).success, false);
});

if (failures) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nAll content checks passed.");
