import type { MediaKind } from "@/lib/cms/media";

/**
 * The words around a picture's or clip's description (its `alt`), in one
 * place so every field says the same thing. "Alt text" is a term of the trade
 * that most people editing the site have never needed; what it is for is
 * plainer said than named.
 */
export const DESCRIBE = {
  image: {
    label: "Describe the picture",
    hint: "Read aloud to blind visitors and used by Google. Say what is in it.",
  },
  video: {
    label: "Describe the clip",
    hint: "Read aloud to blind visitors and used by Google. Say what is in it.",
  },
} satisfies Record<MediaKind, { label: string; hint: string }>;

/** Shown under an empty description box that must be filled before saving. */
export const DESCRIBE_MISSING = "Needs a description before saving.";

