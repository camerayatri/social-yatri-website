"use server";

import { updateTag } from "next/cache";
import { requireMaintainer } from "../auth/dal";
import { CONTENT_TAG } from "../get-content";
import { getAllData, getDoc, listRevisions, restoreRevision, saveDoc, type DocState, type RevisionSummary } from "../repo";
import { SCHEMAS, crossValidate, isContentKey, issuesToFieldErrors, type ContentKey, type FieldErrors } from "../schema";

/**
 * The editors' Server Actions.
 *
 * Every editor saves through `saveContent(key, json, version)`: the key says
 * which document, the JSON is the whole document as the form holds it, and the
 * version is the one the editor loaded. The answer is one of:
 *
 * - `{ ok: true, version }`: saved; keep editing on top of the new version.
 * - `{ fieldErrors }`: refused; messages keyed by dotted path (`headline.1`),
 *   `""` for the document as a whole.
 * - `{ conflict: true, version }`: someone saved first; reload to see theirs.
 * - `{ error }`: anything else, already worded for the person at the screen.
 *
 * Each action authorizes itself; being reachable only from an admin page is
 * not a security boundary.
 */

export type SaveContentResult =
  | { ok: true; version: number }
  | { fieldErrors: FieldErrors }
  | { conflict: true; version: number }
  | { error: string };

export async function saveContent(key: string, json: unknown, version: number): Promise<SaveContentResult> {
  const maintainer = await requireMaintainer();
  if (!isContentKey(key)) return { error: "Unknown content." };
  if (!Number.isInteger(version) || version < 0) return { error: "This editor is out of date. Reload the page." };

  const parsed = SCHEMAS[key].safeParse(json);
  if (!parsed.success) return { fieldErrors: issuesToFieldErrors(parsed.error.issues) };

  try {
    const docs = await getAllData();
    const crossIssues = crossValidate(key, parsed.data as never, docs);
    if (crossIssues.length) return { fieldErrors: issuesToFieldErrors(crossIssues) };

    const result = await saveDoc(key, parsed.data as never, version, { id: maintainer.id, email: maintainer.email });
    if ("ok" in result) updateTag(CONTENT_TAG);
    return result;
  } catch (error) {
    console.error("[cms] save failed", error);
    return { error: "The save didn't go through. Check your connection and try again." };
  }
}

/** The document as stored now, for an editor reloading after a conflict. */
export async function loadContent(key: string): Promise<DocState | { error: string }> {
  await requireMaintainer();
  if (!isContentKey(key)) return { error: "Unknown content." };
  return getDoc(key as ContentKey);
}

export async function contentRevisions(key: string): Promise<RevisionSummary[] | { error: string }> {
  await requireMaintainer();
  if (!isContentKey(key)) return { error: "Unknown content." };
  return listRevisions(key);
}

export type RestoreContentResult = SaveContentResult | { missing: true };

/** Puts an earlier revision back, as a new save on top of `version`. */
export async function restoreContent(key: string, revisionId: number, version: number): Promise<RestoreContentResult> {
  const maintainer = await requireMaintainer();
  if (!isContentKey(key)) return { error: "Unknown content." };
  if (!Number.isInteger(revisionId) || !Number.isInteger(version)) return { error: "Unknown revision." };
  try {
    const result = await restoreRevision(key, revisionId, version, { id: maintainer.id, email: maintainer.email });
    if ("ok" in result) updateTag(CONTENT_TAG);
    return result;
  } catch (error) {
    console.error("[cms] restore failed", error);
    return { error: "The restore didn't go through. Try again." };
  }
}
