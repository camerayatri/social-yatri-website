"use server";

import { del, head } from "@vercel/blob";
import { updateTag } from "next/cache";
import { z } from "zod";
import { requireMaintainer } from "../auth/dal";
import { sql } from "../db";
import { CONTENT_TAG } from "../get-content";
import { findReferences } from "../media";
import { isBlobUrl } from "../media-src";
import { getDocs, saveDoc } from "../repo";
import {
  SCHEMAS,
  crossValidate,
  photo,
  reel,
  slug as slugSchema,
  type ContentDocs,
  type ContentKey,
  type ReelDoc,
  type WorkDoc,
} from "../schema";

/**
 * The work editors' Server Actions: the changes that touch more than one
 * document.
 *
 * A category of work and its clips live in two documents, `works` and
 * `reels`, and a home cover is keyed to the category's slug in a third. The
 * repository saves one document per transaction, so these actions save
 * several in an order that never leaves the site pointing at something
 * missing:
 *
 * - Creating a video category writes its reel list first and the category
 *   second. If the second save fails, what is left is a reel list nothing
 *   plays, which the site never reads (and which is rolled back if it can be).
 * - Deleting writes the category list first, so nothing plays the reel list
 *   any more, and only then removes the reel list and the home cover. If a
 *   later save fails, the leftovers are unused and harmless, and the answer
 *   says so.
 *
 * Every document is validated (its own schema and the cross-document rules)
 * before the first write, so a change that would be refused is refused whole.
 * Each save is versioned as usual: if anyone saved a document in between, the
 * action stops and asks to try again rather than overwrite them.
 */

export type WorkActionResult =
  | { ok: true; slug: string; notes: string[] }
  | { fieldErrors: Record<string, string[]> }
  | { error: string };

const CONFLICT = "Someone else saved the work pages a moment ago. Reload the page and try again.";

type Docs = Awaited<ReturnType<typeof getDocs>>;

function dataOf(docs: Docs): ContentDocs {
  return Object.fromEntries(Object.entries(docs).map(([k, v]) => [k, v.data])) as ContentDocs;
}

/** The schema's and the cross-document rules' first complaint about `data` as `key`, or null. */
function problem<K extends ContentKey>(key: K, data: ContentDocs[K], all: ContentDocs): string | null {
  const parsed = SCHEMAS[key].safeParse(data);
  if (!parsed.success) return parsed.error.issues[0]?.message ?? "That change doesn't fit.";
  const cross = crossValidate(key, data, all);
  return cross[0]?.message ?? null;
}

function without<T>(record: Record<string, T>, key: string): Record<string, T> {
  const { [key]: _gone, ...rest } = record;
  void _gone;
  return rest;
}

const createInput = z.object({
  title: z.string(),
  slug: z.string(),
  clip: z.unknown().optional(),
  frame: z.unknown().optional(),
});

/**
 * Adds a category at the end of the list: a video category starting with one
 * clip (`clip`, which becomes the cover clip), or a photography category with
 * a single still (`frame`).
 */
export async function createWork(input: unknown): Promise<WorkActionResult> {
  const me = await requireMaintainer();
  const actor = { id: me.id, email: me.email };
  const parsed = createInput.safeParse(input);
  if (!parsed.success) return { error: "Check the details and try again." };
  const { title, slug, clip, frame } = parsed.data;

  const errors: Record<string, string[]> = {};
  if (!title.trim()) errors.title = ["Give the category a name."];
  const slugCheck = slugSchema().safeParse(slug);
  if (!slugCheck.success) errors.slug = [slugCheck.error.issues[0].message];
  if ((clip === undefined) === (frame === undefined)) errors[""] = ["Choose a first clip or a still."];
  const reelCheck = clip === undefined ? null : reel().safeParse(clip);
  if (reelCheck && !reelCheck.success) errors.clip = ["That clip is missing its poster, size or description."];
  const frameCheck = frame === undefined ? null : photo().safeParse(frame);
  if (frameCheck && !frameCheck.success) errors.frame = ["That still needs a description."];
  if (Object.keys(errors).length) return { fieldErrors: errors };

  try {
    const docs = await getDocs();
    const all = dataOf(docs);
    if (all.works.some((w) => w.slug === slug)) return { fieldErrors: { slug: ["Another category already has this address."] } };
    if (clip !== undefined && slug in all.reels) {
      return { fieldErrors: { slug: ["A reel list with this name already exists. Pick a different address."] } };
    }

    const work: WorkDoc =
      reelCheck?.success ? { slug, title: title.trim(), reels: slug } : { slug, title: title.trim(), frame: frameCheck!.data! };
    const nextReels = reelCheck?.success ? { ...all.reels, [slug]: [reelCheck.data as ReelDoc] } : all.reels;
    const nextWorks = [...all.works, work];
    const afterReels = { ...all, reels: nextReels };

    const reelsProblem = reelCheck?.success ? problem("reels", nextReels, all) : null;
    const worksProblem = problem("works", nextWorks, afterReels);
    if (reelsProblem || worksProblem) return { error: (reelsProblem ?? worksProblem)! };

    let reelsVersion: number | null = null;
    if (reelCheck?.success) {
      const saved = await saveDoc("reels", nextReels, docs.reels.version, actor, "work.create", { slug });
      if ("conflict" in saved) return { error: CONFLICT };
      reelsVersion = saved.version;
    }

    const savedWorks = await saveDoc("works", nextWorks, docs.works.version, actor, "work.create", { slug });
    if ("conflict" in savedWorks) {
      // Take the unused reel list back out, so a retry starts clean.
      if (reelsVersion !== null) {
        await saveDoc("reels", all.reels, reelsVersion, actor, "work.create.undo", { slug }).catch(() => null);
      }
      updateTag(CONTENT_TAG);
      return { error: CONFLICT };
    }

    updateTag(CONTENT_TAG);
    return { ok: true, slug, notes: [] };
  } catch (error) {
    console.error("[cms] create work failed", error);
    return { error: "The category wasn't added. Check your connection and try again." };
  }
}

/**
 * Removes a category, then its reel list (unless another category or a case
 * study plays the same list) and its home cover. The clips and photos stay
 * in the media library; only this category's use of them goes.
 */
export async function deleteWork(slug: string): Promise<WorkActionResult> {
  const me = await requireMaintainer();
  const actor = { id: me.id, email: me.email };
  if (typeof slug !== "string") return { error: "Unknown category." };

  try {
    const docs = await getDocs();
    const all = dataOf(docs);
    const work = all.works.find((w) => w.slug === slug);
    if (!work) return { error: "That category is already gone. Reload the page." };

    const nextWorks = all.works.filter((w) => w.slug !== slug);
    const worksProblem = problem("works", nextWorks, all);
    if (worksProblem) return { error: worksProblem };
    const afterWorks = { ...all, works: nextWorks };

    const reelKey = work.reels;
    const sharedWith = reelKey
      ? [
          ...nextWorks.filter((w) => w.reels === reelKey).map((w) => `the ${w.title} category`),
          ...all.clients.cases.filter((c) => c.reels === reelKey).map((c) => `the ${c.name} case study`),
        ]
      : [];
    const dropReels = reelKey !== undefined && reelKey in all.reels && sharedWith.length === 0;
    const nextReels = dropReels ? without(all.reels, reelKey!) : all.reels;
    const dropCover = slug in all.homeCovers;
    const nextCovers = dropCover ? without(all.homeCovers, slug) : all.homeCovers;

    const saved = await saveDoc("works", nextWorks, docs.works.version, actor, "work.delete", { slug });
    if ("conflict" in saved) return { error: CONFLICT };

    const notes: string[] = [];
    if (reelKey && sharedWith.length) notes.push(`Its clips were kept, because ${sharedWith.join(" and ")} plays the same list.`);

    // The site no longer reads these; tidy them, and say so if that fails.
    if (dropReels && !problem("reels", nextReels, afterWorks)) {
      const r = await saveDoc("reels", nextReels, docs.reels.version, actor, "work.delete", { slug }).catch(() => null);
      if (!r || "conflict" in r) notes.push("Its reel list couldn't be tidied away. It is unused and does no harm.");
    }
    if (dropCover && !problem("homeCovers", nextCovers, { ...afterWorks, reels: nextReels })) {
      const c = await saveDoc("homeCovers", nextCovers, docs.homeCovers.version, actor, "work.delete", { slug }).catch(() => null);
      if (!c || "conflict" in c) notes.push("Its home page cover couldn't be tidied away. It is unused and does no harm.");
    }

    updateTag(CONTENT_TAG);
    return { ok: true, slug, notes };
  } catch (error) {
    console.error("[cms] delete work failed", error);
    return { error: "The category wasn't deleted. Check your connection and try again." };
  }
}

/**
 * Gives a photography category (one with only a still) a reel list of its
 * own, starting with `clip`. Like creating, the list is written before the
 * category names it.
 */
export async function startReelList(slug: string, clip: unknown): Promise<WorkActionResult> {
  const me = await requireMaintainer();
  const actor = { id: me.id, email: me.email };
  const reelCheck = reel().safeParse(clip);
  if (!reelCheck.success) return { error: "That clip is missing its poster, size or description." };

  try {
    const docs = await getDocs();
    const all = dataOf(docs);
    const index = all.works.findIndex((w) => w.slug === slug);
    if (index === -1) return { error: "That category is gone. Reload the page." };
    if (all.works[index].reels) return { error: "This category already has clips. Reload the page." };
    if (slug in all.reels) return { error: `A reel list called "${slug}" already exists, so this one can't be started here.` };

    const nextReels = { ...all.reels, [slug]: [reelCheck.data] };
    const nextWorks = all.works.map((w, i) => (i === index ? { ...w, reels: slug } : w));
    const blocked = problem("reels", nextReels, all) ?? problem("works", nextWorks, { ...all, reels: nextReels });
    if (blocked) return { error: blocked };

    const r = await saveDoc("reels", nextReels, docs.reels.version, actor, "work.reels", { slug });
    if ("conflict" in r) return { error: CONFLICT };
    const w = await saveDoc("works", nextWorks, docs.works.version, actor, "work.reels", { slug });
    if ("conflict" in w) {
      await saveDoc("reels", all.reels, r.version, actor, "work.reels.undo", { slug }).catch(() => null);
      updateTag(CONTENT_TAG);
      return { error: CONFLICT };
    }
    updateTag(CONTENT_TAG);
    return { ok: true, slug, notes: [] };
  } catch (error) {
    console.error("[cms] start reel list failed", error);
    return { error: "The clips weren't added. Check your connection and try again." };
  }
}

/**
 * Deletes files that were uploaded and then abandoned before they reached
 * the library (a batch of photos cancelled half way). Only files this admin
 * uploads (under `media/`), only ones the library has no row for, and only
 * ones no content uses; anything else is left alone.
 */
export async function discardUploads(urls: unknown): Promise<{ removed: number }> {
  await requireMaintainer();
  const list = Array.isArray(urls) ? urls.filter((u): u is string => typeof u === "string" && isBlobUrl(u)).slice(0, 50) : [];
  let removed = 0;
  for (const url of list) {
    try {
      const pathname = new URL(url).pathname.replace(/^\//, "");
      if (!pathname.startsWith("media/")) continue;
      const rows = (await sql().query(`SELECT 1 FROM media WHERE url = $1 OR poster_url = $1 LIMIT 1`, [url])) as unknown[];
      if (rows.length) continue;
      if ((await findReferences(url)).length) continue;
      await head(url);
      await del(url);
      removed += 1;
    } catch {
      // Already gone, or the store is unreachable: nothing to undo either way.
    }
  }
  return { removed };
}
