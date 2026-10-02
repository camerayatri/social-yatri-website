"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { adminHref } from "../admin-path";
import { audit } from "../audit";
import { requireMaintainer } from "../auth/dal";
import { dummyHash, hashPassword, passwordProblem, verifyPassword } from "../auth/password";
import { createSession, destroyCurrentSession, destroyOtherSessions } from "../auth/session";
import { hasDatabase, sql } from "../db";
import { clearHits, takeHit } from "../rate-limit";
import { requestInfo, senderKey } from "../request";

/**
 * Signing in and out, and changing a password.
 *
 * Sign-in failures all read the same, whether the email exists or not, and
 * take about the same time: an unknown email is checked against a dummy hash,
 * and every failure waits out a short pause. Five failures for one email or
 * twenty from one address in fifteen minutes lock that out for the rest of
 * the window.
 */

export type FormState = { error?: string; ok?: string; fieldErrors?: Record<string, string> } | undefined;

const EMAIL_LIMIT = 5;
const IP_LIMIT = 20;
const GENERIC = "That email and password don't match an account.";
const LOCKED = "Too many attempts. Wait fifteen minutes and try again.";

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

const loginInput = z.object({
  email: z.email().max(200),
  password: z.string().min(1).max(200),
  next: z.string().max(200).optional(),
});

/** A post-login destination inside the admin, never an absolute or protocol-relative URL. */
function safeNext(next: string | undefined) {
  if (!next || !/^\/[A-Za-z0-9/_-]*$/.test(next) || next.startsWith("//") || next === "/login") return "";
  return next;
}

export async function login(_prev: FormState, form: FormData): Promise<FormState> {
  if (!hasDatabase()) return { error: "The admin isn't connected to its database yet." };
  const started = Date.now();
  const parsed = loginInput.safeParse({
    email: String(form.get("email") ?? "").trim().toLowerCase(),
    password: String(form.get("password") ?? ""),
    next: form.get("next") ? String(form.get("next")) : undefined,
  });
  if (!parsed.success) return { error: "Enter your email and password." };
  const { email, password, next } = parsed.data;
  const { ip, ua } = await requestInfo();
  const emailBucket = `login:email:${email}`;
  const ipBucket = `login:ip:${senderKey(ip)}`;

  /*
   * Every attempt takes its hit before the password is checked, and the
   * decision is made on the count that comes back. Counting first and adding
   * only after a failure let a burst of guesses sent at once all read the
   * same count and all get through. A good sign-in clears the email's window
   * below; the address keeps its count, which twenty per window easily allows.
   */
  const [byEmail, byIp] = await Promise.all([takeHit(emailBucket), takeHit(ipBucket)]);
  if (byEmail > EMAIL_LIMIT || byIp > IP_LIMIT) {
    await pause(500);
    await audit(null, "auth.locked", email, { ip });
    return { error: LOCKED };
  }

  const rows = (await sql().query(
    `SELECT id, email, password_hash FROM maintainers WHERE email = $1 AND NOT disabled`,
    [email],
  )) as { id: number; email: string; password_hash: string }[];
  const account = rows[0];
  const valid = await verifyPassword(password, account?.password_hash ?? (await dummyHash()));

  if (!account || !valid) {
    await audit(null, "auth.fail", email, { ip });
    await pause(Math.max(0, 500 - (Date.now() - started)) + Math.floor(Math.random() * 150));
    return { error: GENERIC };
  }

  await clearHits(emailBucket);
  await sql().query(`UPDATE maintainers SET last_login_at = now() WHERE id = $1`, [account.id]);
  await createSession(account.id, { ip, ua });
  await audit({ id: account.id, email: account.email }, "auth.login", account.email, { ip });
  redirect(adminHref(safeNext(next)));
}

/** Signs this browser out. A POST from a form, never a link, so it cannot be triggered cross-site. */
export async function logout() {
  const maintainer = await requireMaintainer();
  await destroyCurrentSession();
  await audit({ id: maintainer.id, email: maintainer.email }, "auth.logout", maintainer.email);
  redirect(adminHref("login"));
}

export async function signOutOtherSessions(): Promise<FormState> {
  const maintainer = await requireMaintainer();
  const ended = await destroyOtherSessions(maintainer.id);
  await audit({ id: maintainer.id, email: maintainer.email }, "auth.logout-others", maintainer.email, { ended });
  return { ok: ended === 1 ? "Signed out of 1 other session." : `Signed out of ${ended} other sessions.` };
}

export async function changePassword(_prev: FormState, form: FormData): Promise<FormState> {
  const maintainer = await requireMaintainer();
  const current = String(form.get("current") ?? "");
  const next = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");

  const rows = (await sql().query(`SELECT password_hash FROM maintainers WHERE id = $1`, [maintainer.id])) as {
    password_hash: string;
  }[];
  if (!rows[0] || !(await verifyPassword(current, rows[0].password_hash))) {
    await pause(400);
    return { fieldErrors: { current: "That isn't your current password." } };
  }
  const problem = passwordProblem(next, maintainer.email);
  if (problem) return { fieldErrors: { password: problem } };
  if (next !== confirm) return { fieldErrors: { confirm: "The two new passwords don't match." } };
  if (next === current) return { fieldErrors: { password: "Choose a password you haven't used here." } };

  await sql().query(`UPDATE maintainers SET password_hash = $2, must_change_password = false WHERE id = $1`, [
    maintainer.id,
    await hashPassword(next),
  ]);
  // A changed password should lock out anyone who had the old one.
  const ended = await destroyOtherSessions(maintainer.id);
  await audit({ id: maintainer.id, email: maintainer.email }, "auth.password", maintainer.email, { ended });
  return { ok: "Password changed. Any other signed-in browsers have been signed out." };
}
