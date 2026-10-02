import "server-only";
import { cookies } from "next/headers";
import { sql } from "../db";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  hashSessionId,
  newSessionId,
  sessionCookieOptions,
  signSession,
  verifySession,
} from "./cookie";

/**
 * Sessions: a row per signed-in browser, keyed by the hash of the id the
 * cookie carries. Creating and ending one sets or clears the cookie, which
 * Next only allows in a Server Function or Route Handler, so these are called
 * from the auth actions and never during render.
 */

export async function createSession(maintainerId: number, info: { ip: string; ua: string }) {
  const id = newSessionId();
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  // Sweep sessions that ran out, so the table does not grow with every sign-in.
  await sql().query(`DELETE FROM sessions WHERE expires_at < now()`);
  await sql().query(
    `INSERT INTO sessions (id_hash, maintainer_id, expires_at, ip, ua) VALUES ($1, $2, to_timestamp($3), $4, $5)`,
    [hashSessionId(id), maintainerId, exp, info.ip, info.ua],
  );
  const jar = await cookies();
  jar.set(SESSION_COOKIE, signSession(id, exp), sessionCookieOptions(exp));
}

/** The verified cookie of this request, or null. Signature and expiry only; no database. */
export async function currentSessionCookie() {
  const jar = await cookies();
  return verifySession(jar.get(SESSION_COOKIE)?.value);
}

/** Ends this browser's session: the row and the cookie. */
export async function destroyCurrentSession() {
  const session = await currentSessionCookie();
  if (session) await sql().query(`DELETE FROM sessions WHERE id_hash = $1`, [hashSessionId(session.id)]);
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

/** Ends every session of `maintainerId` except this browser's. Returns how many ended. */
export async function destroyOtherSessions(maintainerId: number) {
  const session = await currentSessionCookie();
  const keep = session ? hashSessionId(session.id) : "";
  const rows = await sql().query(
    `DELETE FROM sessions WHERE maintainer_id = $1 AND id_hash <> $2 RETURNING id_hash`,
    [maintainerId, keep],
  );
  return rows.length;
}
