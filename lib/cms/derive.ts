/**
 * Values the site computes from content rather than stores.
 *
 * These are the CMS-shaped twins of the helpers in `lib/content.ts`
 * (`DIRECT`, `serviceId`, `workCover`): the same logic, taking the documents
 * as arguments instead of reading the constants, so a page rendered from the
 * database derives exactly what the constants would have. Server pages call
 * these and pass the small results to client components.
 */

import type { ContentDocs, PhotoDoc, ReelDoc, SiteDoc, WorkDoc } from "./schema";

export type DirectRow = { label: string; value: string; href: string | null };

/** The direct contact list the footer and the contact page share. Empty rows are left out. */
export function direct(site: SiteDoc): DirectRow[] {
  const rows: DirectRow[] = [
    { label: "Instagram", value: site.instagram, href: site.instagram ? `https://instagram.com/${site.instagram}` : null },
    { label: "LinkedIn", value: site.linkedin, href: site.linkedin ? `https://www.linkedin.com/company/${site.linkedin}` : null },
    { label: "Email", value: site.email, href: `mailto:${site.email}` },
    { label: "Phone", value: site.phone, href: site.phoneHref },
    {
      label: "Address",
      value: site.address,
      href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${site.address}, India`)}`,
    },
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
