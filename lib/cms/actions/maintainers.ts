"use server";

import { z } from "zod";
import { audit } from "../audit";
import { requireMaintainer } from "../auth/dal";
import { hashPassword, temporaryPassword } from "../auth/password";
import { withTransaction } from "../db";

/**
 * Managing who can sign in.
 *
 * A new maintainer gets a temporary password, shown once to whoever added
 * them and passed on by hand; they are asked to choose their own on first
 * sign-in. Disabling or removing someone ends their sessions at once. Two
 * guards keep the admin from locking itself out: nobody can disable or remove
 * their own account from here, and the last active maintainer cannot be
 * disabled or removed at all.
 */

export type MaintainerResult =
  | { ok: true; email?: string; tempPassword?: string }
  | { error: string; fieldErrors?: Record<string, string> };

const addInput = z.object({
  email: z.email("Enter a valid email address.").max(200),
  name: z.string().trim().min(1, "Enter their name.").max(100),
});

export async function addMaintainer(_prev: MaintainerResult | undefined, form: FormData): Promise<MaintainerResult> {
  const me = await requireMaintainer();
  const parsed = addInput.safeParse({
    email: String(form.get("email") ?? "").trim().toLowerCase(),
    name: String(form.get("name") ?? ""),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { error: "Check the highlighted fields.", fieldErrors };
  }
  const { email, name } = parsed.data;
  const tempPassword = temporaryPassword();
  const hash = await hashPassword(tempPassword);

  const added = await withTransaction(async (tx) => {
    const res = await tx.query(
      `INSERT INTO maintainers (email, name, password_hash, must_change_password) VALUES ($1, $2, $3, true)
       ON CONFLICT (email) DO NOTHING RETURNING id`,
      [email, name, hash],
    );
    if (!res.rows[0]) return false;
    await audit({ id: me.id, email: me.email }, "maintainer.add", email, { name }, tx);
    return true;
  });
  if (!added) return { error: "Someone with that email can already sign in.", fieldErrors: { email: "Already a maintainer." } };
  return { ok: true, email, tempPassword };
}

type Change = "disable" | "enable" | "remove" | "reset";

/**
 * Disables, re-enables, removes, or issues a new temporary password for
 * maintainer `id`. One transaction locks the maintainers table's active rows so
 * two people cannot each remove the other and leave nobody.
 */
export async function changeMaintainer(id: number, change: Change): Promise<MaintainerResult> {
  const me = await requireMaintainer();
  if (!Number.isInteger(id) || !["disable", "enable", "remove", "reset"].includes(change)) {
    return { error: "Unknown request." };
  }
  if (id === me.id && change !== "reset") {
    return { error: "You can't disable or remove your own account. Ask another maintainer." };
  }
  if (id === me.id) return { error: "Change your own password on the Account page." };

  const tempPassword = change === "reset" ? temporaryPassword() : undefined;
  const hash = tempPassword ? await hashPassword(tempPassword) : undefined;

  const result = await withTransaction(async (tx): Promise<MaintainerResult> => {
    const active = await tx.query<{ id: number; email: string }>(
      `SELECT id, email FROM maintainers WHERE NOT disabled ORDER BY id FOR UPDATE`,
    );
    const target = await tx.query<{ id: number; email: string; disabled: boolean }>(
      `SELECT id, email, disabled FROM maintainers WHERE id = $1`,
      [id],
    );
    const row = target.rows[0];
    if (!row) return { error: "That maintainer no longer exists." };
    const leavesNobody = !row.disabled && active.rows.length <= 1;
    if ((change === "disable" || change === "remove") && leavesNobody) {
      return { error: "This is the last active maintainer, so it has to stay." };
    }

    if (change === "disable") {
      await tx.query(`UPDATE maintainers SET disabled = true WHERE id = $1`, [id]);
      await tx.query(`DELETE FROM sessions WHERE maintainer_id = $1`, [id]);
    } else if (change === "enable") {
      await tx.query(`UPDATE maintainers SET disabled = false WHERE id = $1`, [id]);
    } else if (change === "remove") {
      // Sessions go with the row (ON DELETE CASCADE); the audit keeps the email.
      await tx.query(`DELETE FROM maintainers WHERE id = $1`, [id]);
    } else {
      await tx.query(`UPDATE maintainers SET password_hash = $2, must_change_password = true WHERE id = $1`, [id, hash]);
      await tx.query(`DELETE FROM sessions WHERE maintainer_id = $1`, [id]);
    }
    await audit({ id: me.id, email: me.email }, `maintainer.${change}`, row.email, undefined, tx);
    return { ok: true, email: row.email, tempPassword };
  });
  return result;
}
