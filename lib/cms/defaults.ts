/**
 * The content as it ships in the repository, in the CMS's shape.
 *
 * Built straight from the constants in `lib/content.ts`, `lib/reels.ts` and
 * `lib/gallery.ts`, which stay the source of truth for a fresh database: the
 * seed writes these, and the site falls back to them when there is no database
 * at all (a local checkout, a preview without credentials, the build).
 *
 * Every default must pass its own schema. The type annotation below catches a
 * shape mismatch at compile time; `scripts/check-content.mts` (`npm run
 * cms:check`) parses each one at run time and proves it comes back unchanged.
 *
 * No server imports: the seed script loads this file outside Next.
 */

import {
  ABOUT,
  CLIENTS,
  CONNECT,
  GROWTH,
  HERO,
  HOME_COVERS,
  KOLKATA,
  MARQUEE,
  NAV,
  PHOTOS,
  PHOTOSHOOT,
  PROCESS,
  SERVICES,
  SERVICES_INTRO,
  SITE,
  WHY,
  WORKS,
  WORK_INTRO,
} from "@/lib/content";
import { REELS, SHOWREEL } from "@/lib/reels";
import { GALLERY, SHOOTS } from "@/lib/gallery";
import type { ContentDocs } from "./schema";

/** Strips `readonly` all the way down, so `as const` data can stand in for a mutable document. */
type DeepWritable<T> = T extends object ? { -readonly [K in keyof T]: DeepWritable<T[K]> } : T;

/** A deep copy, so nothing that edits a default can reach back into the constants. */
function copy<T>(value: T): DeepWritable<T> {
  return structuredClone(value) as DeepWritable<T>;
}

/** Drops keys whose value is `undefined`, which `Partial<Record>` allows and JSON cannot carry. */
function defined<T>(record: Partial<Record<string, T>>): Record<string, T> {
  return Object.fromEntries(Object.entries(record).filter(([, v]) => v !== undefined)) as Record<string, T>;
}

export const DEFAULTS: ContentDocs = {
  site: copy(SITE),
  nav: copy(NAV),
  hero: copy(HERO),
  about: copy(ABOUT),
  servicesIntro: copy(SERVICES_INTRO),
  services: copy(SERVICES),
  why: copy(WHY),
  workIntro: copy(WORK_INTRO),
  works: copy(WORKS),
  homeCovers: copy(defined(HOME_COVERS)),
  photoshoot: copy(PHOTOSHOOT),
  growth: copy(GROWTH),
  process: copy(PROCESS),
  kolkata: copy(KOLKATA),
  clients: copy(CLIENTS),
  photos: copy(PHOTOS),
  connect: copy(CONNECT),
  marquee: copy(MARQUEE),
  reels: copy(defined(REELS)),
  showreel: copy(SHOWREEL),
  shoots: { order: [...SHOOTS], gallery: copy(GALLERY) },
};
