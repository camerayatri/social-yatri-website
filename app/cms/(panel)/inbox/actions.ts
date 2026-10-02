"use server";

import { requireMaintainer } from "@/lib/cms/auth/dal";
import { STATUSES, deleteSubmission, setSubmissionStatus, type SubmissionStatus } from "@/lib/cms/inbox";

/**
 * The inbox's Server Actions. Each one authorizes itself first: a Server
 * Action is a public endpoint whether or not a page shows its button.
 */

export type InboxResult = { ok: true } | { error: string };

const GONE = "That enquiry is no longer here. Someone may have deleted it.";

function toId(id: unknown) {
  const n = Number(id);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

/** Opening a new enquiry marks it read. Leaves read and archived ones as they are. */
export async function markOpened(id: number): Promise<InboxResult> {
  await requireMaintainer();
  const n = toId(id);
  if (!n) return { error: GONE };
  await setSubmissionStatus(n, "read", "new");
  return { ok: true };
}

export async function changeStatus(id: number, status: SubmissionStatus): Promise<InboxResult> {
  await requireMaintainer();
  const n = toId(id);
  if (!n) return { error: GONE };
  if (!(STATUSES as readonly string[]).includes(status)) return { error: "That isn't a status an enquiry can have." };
  return (await setSubmissionStatus(n, status)) ? { ok: true } : { error: GONE };
}

export async function removeEnquiry(id: number): Promise<InboxResult> {
  const me = await requireMaintainer();
  const n = toId(id);
  if (!n) return { error: GONE };
  return (await deleteSubmission(n, { id: me.id, email: me.email })) ? { ok: true } : { error: GONE };
}
