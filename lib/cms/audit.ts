import "server-only";
import { sql, type Tx } from "./db";

/**
 * The audit trail: who did what, when.
 *
 * Actions are short dotted verbs (`content.save`, `media.delete`,
 * `auth.login`, `maintainer.add`), the target is what they acted on, and the
 * detail is whatever small JSON helps a reader later. The actor's email is
 * copied in so the entry still names someone after they are removed.
 */

export type Actor = { id: number; email: string } | null;

export type AuditEntry = {
  id: number;
  at: string;
  actorEmail: string | null;
  action: string;
  target: string | null;
  detail: unknown;
};

const INSERT = `INSERT INTO audit_log (actor, actor_email, action, target, detail) VALUES ($1, $2, $3, $4, $5)`;

function params(actor: Actor, action: string, target: string | null, detail?: unknown) {
  return [actor?.id ?? null, actor?.email ?? null, action, target, detail === undefined ? null : JSON.stringify(detail)];
}

/** Writes an entry, inside `tx` when given so it commits or rolls back with the change it records. */
export async function audit(actor: Actor, action: string, target: string | null = null, detail?: unknown, tx?: Tx) {
  if (tx) await tx.query(INSERT, params(actor, action, target, detail));
  else await sql().query(INSERT, params(actor, action, target, detail));
}

export async function recentAudit(limit = 20): Promise<AuditEntry[]> {
  const rows = (await sql().query(
    `SELECT id, at, actor_email, action, target, detail FROM audit_log ORDER BY at DESC, id DESC LIMIT $1`,
    [limit],
  )) as { id: string; at: Date; actor_email: string | null; action: string; target: string | null; detail: unknown }[];
  return rows.map((r) => ({
    id: Number(r.id),
    at: new Date(r.at).toISOString(),
    actorEmail: r.actor_email,
    action: r.action,
    target: r.target,
    detail: r.detail,
  }));
}
