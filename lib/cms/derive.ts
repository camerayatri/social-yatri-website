/**
 * Values the site computes from content rather than stores.
 *
 * These are the CMS-shaped twins of the helpers in `lib/content.ts`
 * (`DIRECT`, `serviceId`, `workCover`): the same logic, taking the documents
 * as arguments instead of reading the constants, so a page rendered from the
 * database derives exactly what the constants would have. Server pages call
 * these and pass the small results to client components.
 */

import type { DirectIcon } from "../content";
import type { ContentDocs, PhotoDoc, ReelDoc, SiteDoc, WorkDoc } from "./schema";

export type DirectRow = { label: string; value: string; href: string | null; icon: DirectIcon };

/** The direct contact list the footer and the contact page share. Empty rows are left out. */
export function direct(site: SiteDoc): DirectRow[] {
  const rows: DirectRow[] = [
    { label: "Instagram", icon: "instagram", value: site.instagram, href: site.instagram ? `https://instagram.com/${site.instagram}` : null },
    { label: "LinkedIn", icon: "linkedin", value: site.linkedin, href: site.linkedin ? `https://www.linkedin.com/company/${site.linkedin}` : null },
    { label: "Email", icon: "mail", value: site.email, href: `mailto:${site.email}` },
    { label: "Phone", icon: "phone", value: site.phone, href: site.phoneHref },
    { label: "Address", icon: "map-pin", value: site.address, href: site.mapUrl },
  ];
  return rows.filter((row) => row.value !== "");
}

/** The anchor a service's section carries on /services. Built from the name. */
export function serviceId(service: { name: string }) {
  return service.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/** `tel:` plus the digits of a displayed number, keeping a leading +. */
export function phoneHref(phone: string) {
  const digits = phone.replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
  return `tel:${digits}`;
}

export type WorkCover = PhotoDoc & { reel?: ReelDoc; w?: number; h?: number };

/**
 * What the wall shows for a piece: the designed cover when there is one,
 * otherwise the poster of the head of its reel list, otherwise its still. The
 * head clip rides along for the hover either way. Throws for a video-led work
 * whose list is empty, which the schema should already have refused.
 */
export function workCover(work: WorkDoc, reels: ContentDocs["reels"]): WorkCover {
  const reel = work.reels ? reels[work.reels]?.[0] : undefined;
  if (work.cover) return { ...work.cover, reel };
  if (reel) return { src: reel.poster, alt: reel.alt, reel };
  if (work.frame) return work.frame;
  throw new Error(`Work "${work.slug}" names reels "${work.reels}", which has no clips.`);
}

/** Total frames across the shoots in archive order. */
export function shootTotal(shoots: ContentDocs["shoots"]) {
  return shoots.order.reduce((n, key) => n + (shoots.gallery[key]?.photos.length ?? 0), 0);
}

/**
 * The shapes (width / height) the six home cards are cut to, in the order the
 * first six works run: 4:3 against 3:4 against 1:1, so the two columns never
 * line up.
 */
export const HOME_SLOTS = [4 / 3, 3 / 4, 1, 4 / 3, 3 / 4, 4 / 3] as const;

/** Whether a picture is cut to home card `index`'s shape, within 2%. Past the sixth card there is no shape to match. */
export function fitsHomeSlot(picture: { w: number; h: number }, index: number) {
  const slot = HOME_SLOTS[index];
  if (slot === undefined) return true;
  return Math.abs(picture.w / picture.h - slot) / slot <= 0.02;
}

/**
 * The cards on the home page's work section: the first six works, each in the
 * home cover cut for its slot where there is one. The clip that plays on hover
 * is always the wall's, so /work is not changed by what the home page wears.
 *
 * Home covers are keyed by work, but the shapes belong to the positions, so
 * reordering the works can land a cover on a card of another shape. Such a
 * cover is simply not used: the card shows the wall's cover instead, cut to
 * the card's shape around its focus point, exactly as a work without a home
 * cover does, and the editor says which card it is. `aspect` is the card's
 * CSS aspect ratio: the home cover's own pixel size (within 2% of the slot,
 * so the whole artwork shows), or the slot's shape for a fallback.
 */
export function homeCards(docs: Pick<ContentDocs, "works" | "homeCovers" | "reels">) {
  return docs.works.slice(0, HOME_SLOTS.length).map((work, i) => {
    const wall = workCover(work, docs.reels);
    const home = docs.homeCovers[work.slug];
    if (home && fitsHomeSlot(home, i)) {
      return { slug: work.slug, title: work.title, cover: { ...home, reel: wall.reel }, aspect: `${home.w} / ${home.h}` };
    }
    return { slug: work.slug, title: work.title, cover: wall, aspect: String(HOME_SLOTS[i]) };
  });
}

/** The cards on the /work wall, one per work, in order. */
export function wallCards(docs: Pick<ContentDocs, "works" | "reels">) {
  return docs.works.map((work) => ({ slug: work.slug, title: work.title, cover: workCover(work, docs.reels) }));
}

/** A work's clips, its shoot and how many of each, as the page and its metadata both count them. */
export function workSet(work: WorkDoc, docs: Pick<ContentDocs, "reels" | "shoots">) {
  const reels = work.reels ? (docs.reels[work.reels] ?? []) : [];
  const shoot = work.shoot ? (docs.shoots.gallery[work.shoot] ?? null) : null;
  return { reels, shoot, films: reels.length, photos: shoot?.photos.length ?? 0 };
}

/** The work after this one, wrapping round to the first. */
export function nextWork(works: WorkDoc[], slug: string) {
  const index = works.findIndex((work) => work.slug === slug);
  return works[(index + 1) % works.length];
}

/** The shoots in archive order, each with its key. Keys the order names but the gallery lacks are skipped. */
export function orderedShoots(shoots: ContentDocs["shoots"]) {
  return shoots.order.flatMap((key) => {
    const shoot = shoots.gallery[key];
    return shoot ? [{ key, ...shoot }] : [];
  });
}

/** The service whose page lives at /services/<slug>, by the same id its anchor on /services carries. */
export function findService<S extends { name: string }>(services: S[], slug: string) {
  return services.find((service) => serviceId(service) === slug);
}

/**
 * The services either side of one, wrapping round at both ends, for the way
 * on at the foot of a service page. Null for a list of one, where the only
 * neighbour would be the page itself.
 */
export function serviceNeighbours<S extends { name: string }>(services: S[], slug: string) {
  const index = services.findIndex((service) => serviceId(service) === slug);
  if (index < 0 || services.length < 2) return null;
  return {
    prev: services[(index - 1 + services.length) % services.length],
    next: services[(index + 1) % services.length],
  };
}

/**
 * The work categories that are plainly the same thing as a service: a
 * category whose slug is the service's own id, which is to say one with the
 * same name. Nothing in the content ties a service to work any other way, so
 * nothing else is guessed at: "Branding" is not matched to "Clothing" because
 * a clothing brand was branded.
 */
export function relatedWorks(service: { name: string }, works: WorkDoc[]) {
  const id = serviceId(service);
  return works.filter((work) => work.slug === id);
}
