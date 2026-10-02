import "server-only";
import { sql } from "./db";

/** The people who can sign in, for the maintainers page. Never includes password hashes. */

export type MaintainerSummary = {
  id: number;
  email: string;
  name: string;
  disabled: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  activeSessions: number;
};

export async function listMaintainers(): Promise<MaintainerSummary[]> {
  const rows = (await sql().query(
    `SELECT m.id, m.email, m.name, m.disabled, m.must_change_password, m.created_at, m.last_login_at,
            (SELECT count(*)::int FROM sessions s WHERE s.maintainer_id = m.id AND s.expires_at > now()) AS sessions
       FROM maintainers m ORDER BY m.disabled, m.name, m.email`,
  )) as {
    id: number;
    email: string;
    name: string;
    disabled: boolean;
    must_change_password: boolean;
    created_at: Date;
    last_login_at: Date | null;
    sessions: number;
  }[];
  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    name: r.name,
    disabled: r.disabled,
    mustChangePassword: r.must_change_password,
    createdAt: new Date(r.created_at).toISOString(),
    lastLoginAt: r.last_login_at ? new Date(r.last_login_at).toISOString() : null,
    activeSessions: r.sessions,
  }));
}
