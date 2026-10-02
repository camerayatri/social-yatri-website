/**
 * The shape of every piece of editable content, one zod schema per key.
 *
 * Each schema mirrors the type of the constant it replaces in `lib/content.ts`,
 * `lib/reels.ts` and `lib/gallery.ts`, so a document that passes here can be
 * handed to the existing components unchanged. Objects are strict on purpose:
 * a field added to a constant without a matching field here fails the
 * round-trip check (`npm run cms:check`) instead of being silently dropped.
 *
 * Where a component's animation depends on a shape, the schema says so. The
 * hero's headline and lede are masked line by line and read as exactly two
 * entries; the clients' closing title likewise; covers carry real pixel sizes;
 * a focus is two percentages. Nothing here transforms a value: what is saved
 * is what was typed, which is what makes the defaults round-trip exactly.
 *
 * No server imports, so client editors can run the same validation.
 */

import { z } from "zod";
import { isAllowedMediaSrc, mediaKindFromSrc } from "./media-src";

/** Bumped when a schema changes shape, so cached content from the old shape is not reused. */
export const SCHEMA_VERSION = 1;

/* ---------------------------------------------------------------------------
 * Building blocks
 * ------------------------------------------------------------------------- */

const REQUIRED = "This can't be empty.";

/** Any copy that must say something. Whitespace alone does not count. */
export const text = () => z.string().max(4000).refine((s) => s.trim().length > 0, REQUIRED);

/** Copy that may be left empty (an optional social handle, a suffix). */
export const optionalText = () => z.string().max(4000);

/** Exactly two lines, for headings the animations mask line by line. */
export const twoLines = () => z.tuple([text(), text()]);

/** One or more lines. */
export const lines = (min = 1, max = 40) =>
  z.array(text()).min(min, `Add at least ${min}.`).max(max, `No more than ${max}.`);

export const positiveInt = () => z.number().int("Whole pixels only.").positive("Must be above zero.");

/** CSS `object-position` as two percentages, which is all the FocusPicker writes. */
export const focus = () => z.string().regex(/^\d+(\.\d+)?% \d+(\.\d+)?%$/, "Use two percentages, like 50% 40%.");

export const hexColor = () => z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a six-digit hex colour, like #ffc72c.");

export const mediaSrc = () =>
  z.string().refine(isAllowedMediaSrc, "Pick a file from the media library.");

export const imageSrc = () =>
  mediaSrc().refine((s) => mediaKindFromSrc(s) !== "video", "This slot takes an image, not a video.");

export const videoSrc = () =>
  mediaSrc().refine((s) => mediaKindFromSrc(s) !== "image", "This slot takes a video, not an image.");

/** A URL slug: lower case, digits and single hyphens. */
export const slug = () =>
  z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Lower case letters, numbers and hyphens only.");

/** An Instagram or LinkedIn handle without the @ or the URL. Empty hides the row. */
const handle = () =>
  z.string().regex(/^[A-Za-z0-9._-]*$/, "Just the handle: no @, no spaces, no link.");

export const photo = () =>
  z.strictObject({
    src: imageSrc(),
    alt: text(),
    focus: focus().optional(),
  });

/** A photo that carries its own pixel size, so a card can take its shape. */
export const sizedPhoto = () =>
  z.strictObject({
    src: imageSrc(),
    alt: text(),
    focus: focus().optional(),
    w: positiveInt(),
    h: positiveInt(),
  });

export const reel = () =>
  z.strictObject({
    src: videoSrc(),
    poster: imageSrc(),
    alt: text(),
    w: positiveInt(),
    h: positiveInt(),
  });

/** Flags the second and later entries whose `pick` repeats an earlier one. */
function unique<T>(pick: (item: T) => string, message: string, field?: string) {
  return (items: T[], ctx: z.RefinementCtx) => {
    const seen = new Set<string>();
    items.forEach((item, i) => {
      const value = pick(item);
      if (seen.has(value)) ctx.addIssue({ code: "custom", message, path: field ? [i, field] : [i] });
      seen.add(value);
    });
  };
}

/* ---------------------------------------------------------------------------
 * Site, navigation, contact
 * ------------------------------------------------------------------------- */

export const siteSchema = z.strictObject({
  name: text(),
  tagline: text(),
  description: text(),
  city: text(),
  email: z.email("Enter a valid email address."),
  phone: text(),
  phoneHref: z.string().regex(/^tel:\+?[0-9]{6,15}$/, "Use tel: followed by the number, like tel:+919707344375."),
  address: text(),
  instagram: handle(),
  linkedin: handle(),
  madeIn: text(),
  copyright: text(),
});

/** The routes are fixed by the code; only what the menu calls them is editable. */
const navItem = <H extends string>(href: H) => z.strictObject({ label: text(), href: z.literal(href) });

export const navSchema = z.tuple([
  navItem("/"),
  navItem("/services"),
  navItem("/work"),
  navItem("/photoshoot"),
  navItem("/studio"),
  navItem("/contact"),
]);

/**
 * The form's fields are wired to the submit handler by name, type and
 * requiredness, so those are locked. The labels and the placeholder are copy.
 */
const connectField = <N extends string, T extends string, R extends boolean>(name: N, type: T, required: R) =>
  z.strictObject({ name: z.literal(name), label: text(), type: z.literal(type), required: z.literal(required) });

export const connectSchema = z.strictObject({
  sign: text(),
  question: text(),
  sub: text(),
  fields: z.tuple([
    connectField("name", "text", true),
    connectField("company", "text", false),
    connectField("phone", "tel", false),
    connectField("email", "email", true),
    connectField("need", "text", false).extend({ placeholder: optionalText() }),
  ]),
  messageLabel: text(),
  submit: text(),
  submitHover: text(),
  confirmed: text(),
  confirmedSub: text(),
});

export const marqueeSchema = lines(1, 12);

/* ---------------------------------------------------------------------------
 * Home and about
 * ------------------------------------------------------------------------- */

export const heroSchema = z.strictObject({
  eyebrow: text(),
  headline: twoLines(),
  lede: twoLines(),
});

export const aboutSchema = z.strictObject({
  sign: text(),
  claim: text(),
  /* The studio note sets the first paragraph and the second in different places. */
  body: lines(2, 2),
  close: lines(1, 3),
});

/* ---------------------------------------------------------------------------
 * Services
 * ------------------------------------------------------------------------- */

export const serviceSchema = z.strictObject({
  no: text(),
  name: text(),
  desc: text(),
  tag: text(),
  body: lines(1, 10),
  detail: lines(1, 20),
  goal: text().optional(),
  cover: photo(),
});

export const servicesSchema = z
  .array(serviceSchema)
  .min(1, "Keep at least one service.")
  .superRefine(
    unique(
      (s) => s.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
      "Another service already has this name; the page anchors are built from it.",
      "name",
    ),
  );

export const servicesIntroSchema = z.strictObject({
  sign: text(),
  question: text(),
  sub: text(),
  body: lines(1, 10),
});

export const whySchema = z.strictObject({
  sign: text(),
  question: lines(1, 3),
  list: lines(1, 10),
  turn: text(),
  body: lines(1, 10),
  ask: text(),
  close: text(),
});

/* ---------------------------------------------------------------------------
 * Work
 * ------------------------------------------------------------------------- */

/**
 * A category of work. In `lib/content.ts` the type is a union: a category is
 * video-led (it names a reel list) or photography (it names a still). Here it
 * is one object with the rule as a refinement, so a missing still is reported
 * against the field that is missing rather than as an unreadable union error.
 * Reel and shoot keys are plain strings here; whether they exist is checked
 * against the other documents at save time (see `crossValidate`).
 */
export const workSchema = z
  .strictObject({
    slug: slug(),
    title: text(),
    shoot: z.string().min(1).optional(),
    cover: sizedPhoto().optional(),
    reels: z.string().min(1).optional(),
    frame: photo().optional(),
  })
  .refine((w) => w.reels !== undefined || w.frame !== undefined, {
    message: "A category needs either a reel list or a still.",
    path: ["frame"],
  });

export const worksSchema = z
  .array(workSchema)
  .min(1, "Keep at least one category.")
  .superRefine(unique((w) => w.slug, "Another category already uses this slug.", "slug"));

export const workIntroSchema = z.strictObject({ sign: text(), question: text(), sub: text() });

/** Keyed by work slug, so reordering the works cannot move a cover to the wrong card. */
export const homeCoversSchema = z.record(slug(), sizedPhoto());

export const photoshootSchema = z.strictObject({
  sign: text(),
  question: lines(1, 3),
  sub: text(),
  sets: text(),
});

/* ---------------------------------------------------------------------------
 * Numbers, process, studio, clients
 * ------------------------------------------------------------------------- */

const figure = () => z.strictObject({ label: text(), value: text(), unit: text() });

export const growthSchema = z.strictObject({
  sign: text(),
  question: text(),
  sub: text(),
  before: figure(),
  after: figure(),
  deltaLabel: text(),
  delta: text(),
  cells: z
    .array(
      z.strictObject({
        target: z.number().nonnegative("Must be zero or more."),
        suffix: optionalText(),
        label: text(),
      }),
    )
    .min(1)
    .max(8),
});

export const processSchema = z.strictObject({
  sign: text(),
  question: text(),
  sub: text(),
  steps: z.array(z.strictObject({ no: text(), title: text(), body: text() })).min(1).max(12),
});

export const kolkataSchema = z.strictObject({
  sign: text(),
  question: lines(1, 3),
  cards: z.array(z.strictObject({ title: text(), body: text() })).min(1).max(8),
});

export const caseStudySchema = z.strictObject({
  name: text(),
  claim: z.union([text(), lines(1, 3)]),
  intro: lines(1, 10),
  metrics: z.array(z.strictObject({ value: text(), label: text(), note: text() })).min(1).max(6),
  did: lines(1, 20),
  result: lines(1, 10),
  frame: imageSrc(),
  alt: text(),
  focus: focus().optional(),
  logo: z
    .strictObject({ src: imageSrc(), alt: text(), focus: focus().optional(), bg: hexColor() })
    .optional(),
  reels: z.string().min(1).optional(),
});

export const clientsSchema = z.strictObject({
  sign: text(),
  question: text(),
  sub: text(),
  body: lines(1, 10),
  cases: z.array(caseStudySchema).min(1).max(8),
  closing: z.strictObject({
    title: twoLines(),
    body: lines(1, 10),
    goalsLead: text(),
    goals: lines(1, 12),
    goalsClose: text(),
  }),
});

export const photosSchema = z.strictObject({ showreel: photo(), studioNote: photo() });

/* ---------------------------------------------------------------------------
 * Video and photography sets
 * ------------------------------------------------------------------------- */

/** Every list needs a head: the pages take its first clip as the cover. */
export const reelsSchema = z.record(slug(), z.array(reel()).min(1, "A reel list needs at least one clip."));

/** The spiral is built for six to twelve cards. */
export const showreelSchema = z
  .array(reel().extend({ title: text() }))
  .min(6, "The spiral needs at least six clips.")
  .max(12, "The spiral holds at most twelve clips.");

export const galleryPhotoSchema = z.strictObject({
  src: imageSrc(),
  alt: text(),
  w: positiveInt(),
  h: positiveInt(),
});

export const shootSchema = z.strictObject({
  label: text(),
  photos: z.array(galleryPhotoSchema).min(1, "A shoot needs at least one photograph."),
});

/** `gallery` is `GALLERY`; `order` is `SHOOTS`, the order the archive shows them in. */
export const shootsSchema = z
  .strictObject({
    order: z.array(slug()).min(1),
    gallery: z.record(slug(), shootSchema),
  })
  .superRefine((doc, ctx) => {
    const seen = new Set<string>();
    doc.order.forEach((key, i) => {
      if (!(key in doc.gallery)) ctx.addIssue({ code: "custom", message: `There is no shoot called "${key}".`, path: ["order", i] });
      if (seen.has(key)) ctx.addIssue({ code: "custom", message: "This shoot is listed twice.", path: ["order", i] });
      seen.add(key);
    });
  });

/* ---------------------------------------------------------------------------
 * The registry
 * ------------------------------------------------------------------------- */

export const SCHEMAS = {
  site: siteSchema,
  nav: navSchema,
  hero: heroSchema,
  about: aboutSchema,
  servicesIntro: servicesIntroSchema,
  services: servicesSchema,
  why: whySchema,
  workIntro: workIntroSchema,
  works: worksSchema,
  homeCovers: homeCoversSchema,
  photoshoot: photoshootSchema,
  growth: growthSchema,
  process: processSchema,
  kolkata: kolkataSchema,
  clients: clientsSchema,
  photos: photosSchema,
  connect: connectSchema,
  marquee: marqueeSchema,
  reels: reelsSchema,
  showreel: showreelSchema,
  shoots: shootsSchema,
} as const;

export type ContentKey = keyof typeof SCHEMAS;
export type ContentDocs = { [K in ContentKey]: z.infer<(typeof SCHEMAS)[K]> };
export type ContentDoc<K extends ContentKey> = ContentDocs[K];

export const CONTENT_KEYS = Object.keys(SCHEMAS) as ContentKey[];

export function isContentKey(key: unknown): key is ContentKey {
  return typeof key === "string" && Object.hasOwn(SCHEMAS, key);
}

/* Named types for editors and, later, the public components. */
export type SiteDoc = ContentDocs["site"];
export type NavDoc = ContentDocs["nav"];
export type ConnectDoc = ContentDocs["connect"];
export type WorkDoc = z.infer<typeof workSchema>;
export type ReelDoc = z.infer<ReturnType<typeof reel>>;
export type PhotoDoc = z.infer<ReturnType<typeof photo>>;
export type SizedPhotoDoc = z.infer<ReturnType<typeof sizedPhoto>>;
export type ServiceDoc = z.infer<typeof serviceSchema>;
export type CaseStudyDoc = z.infer<typeof caseStudySchema>;

/* ---------------------------------------------------------------------------
 * Errors
 * ------------------------------------------------------------------------- */

/**
 * Field errors keyed by dotted path inside the document, `""` for the document
 * as a whole: `{ "headline.1": ["This can't be empty."] }`. This is the shape
 * `saveContent` returns and `EditorForm` reads.
 */
export type FieldErrors = Record<string, string[]>;

export type Issue = { path: (string | number)[]; message: string };

export function issuesToFieldErrors(issues: readonly { path: PropertyKey[]; message: string }[]): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join(".");
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

/* ---------------------------------------------------------------------------
 * Cross-document rules
 * ------------------------------------------------------------------------- */

/**
 * The six home cards are cut to these shapes, in the order the first six works
 * run. A home cover must match its slot within 2%, or the card would crop the
 * client's artwork.
 */
export const HOME_SLOTS = [4 / 3, 3 / 4, 1, 4 / 3, 3 / 4, 4 / 3] as const;

function slotIssue(cover: { w: number; h: number }, index: number) {
  const slot = HOME_SLOTS[index];
  if (slot === undefined) return null;
  const ratio = cover.w / cover.h;
  if (Math.abs(ratio - slot) / slot <= 0.02) return null;
  const names: Record<number, string> = { [4 / 3]: "4:3 landscape", [3 / 4]: "3:4 portrait", 1: "1:1 square" };
  return `Card ${index + 1} on the home page is ${names[slot]}; this cover is ${cover.w}×${cover.h}.`;
}

/**
 * Rules that span documents: a work naming a reel list that exists, a home
 * cover keyed to a real work, and so on. Run on save against the other
 * documents as they stand, with `data` standing in for `key`'s own. Returns
 * issues with paths relative to `key`'s document.
 */
export function crossValidate<K extends ContentKey>(key: K, data: ContentDocs[K], docs: ContentDocs): Issue[] {
  const all = { ...docs, [key]: data } as ContentDocs;
  const issues: Issue[] = [];
  const reelKeys = new Set(Object.keys(all.reels));
  const shootKeys = new Set(Object.keys(all.shoots.gallery));
  const slugs = all.works.map((w) => w.slug);

  // Each rule reports against whichever document is being saved, so the
  // editor shows the message beside the field that can fix it.
  if (key === "works" || key === "reels" || key === "shoots") {
    all.works.forEach((work, i) => {
      if (work.reels !== undefined && !reelKeys.has(work.reels)) {
        issues.push({
          path: key === "works" ? [i, "reels"] : [],
          message: `"${work.title}" plays the reel list "${work.reels}", which does not exist.`,
        });
      }
      if (work.shoot !== undefined && !shootKeys.has(work.shoot)) {
        issues.push({
          path: key === "works" ? [i, "shoot"] : [],
          message: `"${work.title}" shows the shoot "${work.shoot}", which does not exist.`,
        });
      }
    });
  }

  if (key === "clients" || key === "reels") {
    all.clients.cases.forEach((c, i) => {
      if (c.reels !== undefined && !reelKeys.has(c.reels)) {
        issues.push({
          path: key === "clients" ? ["cases", i, "reels"] : [],
          message: `The ${c.name} case study plays the reel list "${c.reels}", which does not exist.`,
        });
      }
    });
  }

  if (key === "homeCovers" || key === "works") {
    for (const [slugKey, cover] of Object.entries(all.homeCovers)) {
      const index = slugs.indexOf(slugKey);
      if (index === -1) {
        if (key === "homeCovers") issues.push({ path: [slugKey], message: `There is no work called "${slugKey}".` });
        continue;
      }
      const problem = slotIssue(cover, index);
      if (problem) issues.push({ path: key === "homeCovers" ? [slugKey] : [index], message: problem });
    }
  }

  return issues;
}
