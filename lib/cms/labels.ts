import type { ContentKey } from "./schema";

/**
 * What each content document is called in the admin, in the words of the
 * people editing it rather than the code's. Client-safe.
 */
export const CONTENT_LABELS: Record<ContentKey, string> = {
  site: "Site details",
  nav: "Menu labels",
  hero: "Home: opening",
  about: "Home: studio note",
  servicesIntro: "Services: intro",
  services: "Services",
  why: "Services: why us",
  workIntro: "Work: intro",
  works: "Work categories",
  homeCovers: "Home: work covers",
  photoshoot: "Photoshoot: intro",
  growth: "Growth numbers",
  process: "Process",
  kolkata: "Studio: home turf",
  clients: "Clients",
  photos: "Studio photos",
  connect: "Contact form",
  marquee: "Scrolling strip",
  reels: "Reels",
  showreel: "Showreel spiral",
  shoots: "Photo shoots",
};

/** "works.3.cover.src" as something a person can follow: "Work categories, item 4, cover". */
export function describePath(key: ContentKey, path: string) {
  const parts = path
    .split(".")
    .filter(Boolean)
    .filter((p) => !["src", "url"].includes(p))
    .map((p) => (/^\d+$/.test(p) ? `item ${Number(p) + 1}` : p === "alt" ? "description" : p));
  return [CONTENT_LABELS[key], ...parts].join(", ");
}
