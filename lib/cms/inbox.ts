import "server-only";
import { audit, type Actor } from "./audit";
import { sql } from "./db";

/**
 * The contact form's submissions: storing them, and the admin's inbox.
 *
 * A submission arrives as `new`, becomes `read` when someone opens it, and can
 * be archived out of the way or deleted for good. Nothing else changes it: the
 * text is exactly what the visitor sent. The sender's IP is never stored, only
 * a salted hash of it (see `hashIp`), which is enough to rate-limit and to
 * notice one sender writing many times.
 */

export const STATUSES = ["new", "read", "archived"] as const;
export type SubmissionStatus = (typeof STATUSES)[number];

export type Submission = {
  id: number;
  name: string;
  company: string | null;
  phone: string | null;
  email: string;
  need: string | null;
  message: string | null;
  status: SubmissionStatus;
  createdAt: string;
};

type Row = {
  id: string;
  name: string;
  company: string | null;
  phone: string | null;
  email: string;
  need: string | null;
  message: string | null;
  status: SubmissionStatus;
  created_at: Date;
};

const COLUMNS = `id, name, company, phone, email, need, message, status, created_at`;

function toSubmission(r: Row): Submission {
  return {
    id: Number(r.id),
    name: r.name,
    company: r.company,
    phone: r.phone,
    email: r.email,
    need: r.need,
    message: r.message,
    status: r.status,
    createdAt: new Date(r.created_at).toISOString(),
  };
}

export type NewSubmission = {
  name: string;
  company: string | null;
  phone: string | null;
  email: string;
  need: string | null;
  message: string | null;
  ipHash: string;
};

/** Stores a submission and returns it with its id. */
export async function insertSubmission(input: NewSubmission): Promise<Submission> {
  const rows = (await sql().query(
    `INSERT INTO contact_submissions (name, company, phone, email, need, message, ip_hash)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING ${COLUMNS}`,
    [input.name, input.company, input.phone, input.email, input.need, input.message, input.ipHash],
  )) as Row[];
  return toSubmission(rows[0]);
}

/**
 * What a list shows. `inbox` is everything not archived, which is what the
 * page opens on: reading a message should not make it vanish from view.
 */
export type InboxView = "inbox" | SubmissionStatus | "all";

export const INBOX_VIEWS: InboxView[] = ["inbox", "new", "read", "archived", "all"];

export function isInboxView(value: unknown): value is InboxView {
  return typeof value === "string" && (INBOX_VIEWS as string[]).includes(value);
}

function viewFilter(view: InboxView) {
  if (view === "all") return { where: "TRUE", params: [] as string[] };
  if (view === "inbox") return { where: "status <> 'archived'", params: [] as string[] };
  return { where: "status = $1", params: [view] };
}

/** Submissions in a view, newest first. */
export async function listSubmissions(view: InboxView, limit = 500): Promise<Submission[]> {
  const { where, params } = viewFilter(view);
  const rows = (await sql().query(
    `SELECT ${COLUMNS} FROM contact_submissions WHERE ${where}
      ORDER BY created_at DESC, id DESC LIMIT ${Math.max(1, Math.floor(limit))}`,
    params,
  )) as Row[];
  return rows.map(toSubmission);
}

/** How many submissions are in each status. */
export async function countSubmissions(): Promise<Record<SubmissionStatus, number>> {
  const rows = (await sql().query(
    `SELECT status, count(*)::int AS n FROM contact_submissions GROUP BY status`,
  )) as { status: SubmissionStatus; n: number }[];
  const out: Record<SubmissionStatus, number> = { new: 0, read: 0, archived: 0 };
  for (const r of rows) out[r.status] = r.n;
  return out;
}

/**
 * How many submissions nobody has opened yet, for the badge on the menu. One
 * count over a small table on each admin page; the menu re-reads it whenever
 * the inbox refreshes the page.
 */
export async function countNewSubmissions(): Promise<number> {
  const rows = (await sql().query(`SELECT count(*)::int AS n FROM contact_submissions WHERE status = 'new'`)) as { n: number }[];
  return Number(rows[0]?.n ?? 0);
}

export async function getSubmission(id: number): Promise<Submission | null> {
  if (!Number.isSafeInteger(id) || id < 1) return null;
  const rows = (await sql().query(`SELECT ${COLUMNS} FROM contact_submissions WHERE id = $1`, [id])) as Row[];
  return rows[0] ? toSubmission(rows[0]) : null;
}

/**
 * Moves a submission to `status`. Opening a message calls this with `read`
 * only while it is still `new`, so opening an archived one leaves it archived.
 * Status changes are routine and not audited; deleting is.
 */
export async function setSubmissionStatus(id: number, status: SubmissionStatus, onlyIf?: SubmissionStatus) {
  const rows = (await sql().query(
    `UPDATE contact_submissions SET status = $2 WHERE id = $1 AND ($3::text IS NULL OR status = $3) RETURNING ${COLUMNS}`,
    [id, status, onlyIf ?? null],
  )) as Row[];
  return rows[0] ? toSubmission(rows[0]) : null;
}

/** Removes a submission for good. The audit keeps who and when, not what it said. */
export async function deleteSubmission(id: number, actor: Actor): Promise<boolean> {
  const rows = (await sql().query(`DELETE FROM contact_submissions WHERE id = $1 RETURNING id`, [id])) as { id: string }[];
  if (!rows[0]) return false;
  await audit(actor, "inbox.delete", String(id));
  return true;
}
