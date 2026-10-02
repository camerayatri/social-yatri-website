"use server";

import { head } from "@vercel/blob";
import { z } from "zod";
import { requireMaintainer } from "../auth/dal";
import {
  UPLOAD_RULES,
  findReferences,
  getMedia,
  listMedia,
  registerMedia,
  softDeleteMedia,
  updateMediaDetails,
  type MediaItem,
  type MediaKind,
  type Reference,
} from "../media";
import { isBlobUrl } from "../media-src";

/**
 * The media library's Server Actions.
 *
 * Files go straight from the browser to Blob (see `app/cms/api/upload`), so
 * the server never holds the bytes. What it does hold is the say on what gets
 * into the library: `registerUpload` asks Blob for the file's real size and
 * type rather than believing the browser, and refuses anything off the store,
 * over the limit, of the wrong type, or without alt text.
 */

const registerInput = z.object({
  kind: z.enum(["image", "video"]),
  url: z.url().refine(isBlobUrl, "Not a file on the media store."),
  posterUrl: z.url().refine(isBlobUrl, "Not a file on the media store.").nullish(),
  w: z.number().int().positive().max(20000).nullish(),
  h: z.number().int().positive().max(20000).nullish(),
  duration: z.number().nonnegative().max(60 * 60).nullish(),
  alt: z.string().trim().min(1, "Describe what's in it: alt text is required.").max(500),
});

export async function registerUpload(input: unknown): Promise<{ ok: true; item: MediaItem } | { error: string }> {
  const me = await requireMaintainer();
  const parsed = registerInput.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the details and try again." };
  const data = parsed.data;
  const rules = UPLOAD_RULES[data.kind];

  let blob;
  try {
    blob = await head(data.url);
  } catch {
    return { error: "The upload can't be found on the media store. Try uploading again." };
  }
  if (!(rules.types as readonly string[]).includes(blob.contentType)) {
    return { error: `That file is ${blob.contentType}, which this library doesn't take for ${data.kind}s.` };
  }
  if (blob.size > rules.maxBytes) return { error: "That file is over the size limit." };

  if (data.posterUrl) {
    try {
      const poster = await head(data.posterUrl);
      if (!(UPLOAD_RULES.image.types as readonly string[]).includes(poster.contentType)) {
        return { error: "The poster has to be an image." };
      }
    } catch {
      return { error: "The poster can't be found on the media store." };
    }
  }

  const item = await registerMedia(
    {
      kind: data.kind,
      url: data.url,
      pathname: blob.pathname,
      posterUrl: data.posterUrl ?? null,
      w: data.w ?? null,
      h: data.h ?? null,
      duration: data.duration ?? null,
      bytes: blob.size,
      mime: blob.contentType,
      alt: data.alt,
      source: "blob",
    },
    { id: me.id, email: me.email },
  );
  return { ok: true, item };
}

/** The library, for the picker modal. */
export async function mediaList(kind?: MediaKind): Promise<MediaItem[]> {
  await requireMaintainer();
  return listMedia({ kind: kind === "image" || kind === "video" ? kind : undefined });
}

/** Where a file is used. */
export async function mediaUsage(id: string): Promise<Reference[] | { error: string }> {
  await requireMaintainer();
  const item = await getMedia(String(id));
  if (!item) return { error: "That file is no longer in the library." };
  return findReferences(item.url, item.posterUrl);
}

export async function updateMediaAlt(id: string, alt: string): Promise<{ ok: true; item: MediaItem } | { error: string }> {
  const me = await requireMaintainer();
  const clean = String(alt ?? "").trim();
  if (!clean) return { error: "Alt text can't be empty." };
  if (clean.length > 500) return { error: "Keep alt text under 500 characters." };
  const item = await updateMediaDetails(String(id), { alt: clean }, { id: me.id, email: me.email });
  return item ? { ok: true, item } : { error: "That file is no longer in the library." };
}

export async function deleteMedia(id: string): Promise<{ ok: true } | { inUse: Reference[] } | { error: string }> {
  const me = await requireMaintainer();
  const result = await softDeleteMedia(String(id), { id: me.id, email: me.email });
  if ("missing" in result) return { error: "That file is no longer in the library." };
  return result;
}
