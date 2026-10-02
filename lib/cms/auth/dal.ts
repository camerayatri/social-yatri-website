import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { adminHref, adminSegment } from "../admin-path";
import { hasDatabase, sql } from "../db";
import { SESSION_TTL_SECONDS, SLIDE_WHEN_BELOW_SECONDS, hashSessionId } from "./cookie";
import { currentSessionCookie } from "./session";

/**
 * The data access layer's one question: who is asking?
 *
 * `requireMaintainer()` is the first line of every admin page, Server Action
 * and Route Handler. The proxy only checks that a cookie is well signed; this
 * looks the session up in the database and refuses it when it has expired,
 * been signed out, or belongs to an account that was disabled or removed.
 * Wrapped in React's `cache`, so a page and its layout share one lookup per
 * request.
 */

export type Maintainer = {
  id: number;
  email: string;
  name: string;
  mustChangePassword: boolean;
};

type Row = {
  id: number;
  email: string;
  name: string;
  must_change_password: boolean;
  seconds_left: number;
};

export const getMaintainer = cache(async (): Promise<Maintainer | null> => {
  if (!hasDatabase()) return null;
  const session = await currentSessionCookie();
  if (!session) return null;
  const idHash = hashSessionId(session.id);
  const rows = (await sql().query(
    `SELECT m.id, m.email, m.name, m.must_change_password,
            extract(epoch FROM s.expires_at - now())::int AS seconds_left
       FROM sessions s JOIN maintainers m ON m.id = s.maintainer_id
      WHERE s.id_hash = $1 AND s.expires_at > now() AND NOT m.disabled`,
    [idHash],
  )) as Row[];
  const row = rows[0];
  if (!row) return null;
  // Sliding expiry, matched by the proxy re-signing the cookie.
  if (row.seconds_left < SLIDE_WHEN_BELOW_SECONDS) {
    await sql().query(`UPDATE sessions SET expires_at = now() + make_interval(secs => $2) WHERE id_hash = $1`, [
      idHash,
      SESSION_TTL_SECONDS,
    ]);
  }
  return { id: row.id, email: row.email, name: row.name, mustChangePassword: row.must_change_password };
});

/** The signed-in maintainer, or a redirect to the sign-in page. */
export async function requireMaintainer(): Promise<Maintainer> {
  // Without ADMIN_PATH there is no admin to send anyone to.
  if (!adminSegment()) notFound();
  const maintainer = await getMaintainer();
  if (!maintainer) redirect(adminHref("login"));
  return maintainer;
}
