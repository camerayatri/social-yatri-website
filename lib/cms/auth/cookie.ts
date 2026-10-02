/**
 * The session cookie's format, shared by the proxy and the server.
 *
 * Value: `<id>.<exp>.<mac>`, where `id` is 32 random bytes (base64url), `exp`
 * the expiry in Unix seconds, and `mac` an HMAC-SHA256 of `id.exp` under
 * SESSION_SECRET. The proxy checks the MAC and the expiry without touching the
 * database, which is enough to turn away a stranger cheaply. It is only a
 * filter: every admin page, action and route then calls `requireMaintainer()`,
 * which looks the session up by `sha256(id)` and checks the account.
 *
 * `__Host-` pins the cookie to this exact host, path `/`, and Secure; browsers
 * accept Secure cookies on http://localhost, so it works in development too.
 */

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "__Host-sy_admin";

/** Seven days, extended on use (see `SLIDE_WHEN_BELOW_SECONDS`). */
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

/** A session with less than this left is pushed back out to the full TTL. */
export const SLIDE_WHEN_BELOW_SECONDS = 6 * 24 * 60 * 60;

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) return null;
  return value;
}

export function hasSessionSecret() {
  return secret() !== null;
}

function mac(payload: string, key: string) {
  return createHmac("sha256", key).update(payload).digest("base64url");
}

export function newSessionId() {
  return randomBytes(32).toString("base64url");
}

/** What the database stores in place of the id. */
export function hashSessionId(id: string) {
  return createHash("sha256").update(id).digest("hex");
}

export function signSession(id: string, exp: number) {
  const key = secret();
  if (!key) throw new Error("SESSION_SECRET is missing or shorter than 32 characters.");
  return `${id}.${exp}.${mac(`${id}.${exp}`, key)}`;
}

/** The id and expiry of a well-signed, unexpired cookie, or null. */
export function verifySession(value: string | undefined, now = Date.now()): { id: string; exp: number } | null {
  const key = secret();
  if (!key || !value) return null;
  const parts = value.split(".");
  if (parts.length !== 3) return null;
  const [id, expText, given] = parts;
  if (!/^[A-Za-z0-9_-]{43}$/.test(id) || !/^\d{9,11}$/.test(expText)) return null;
  const expected = Buffer.from(mac(`${id}.${expText}`, key));
  const actual = Buffer.from(given);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  const exp = Number(expText);
  if (exp * 1000 <= now) return null;
  return { id, exp };
}

export const sessionCookieOptions = (exp: number) => ({
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  path: "/",
  expires: new Date(exp * 1000),
});

/**
 * Removes the cookie. A plain `cookies.delete()` sends the expired cookie
 * without `Secure`, and a browser refuses any `__Host-` cookie without it, so
 * the old cookie stayed put after signing out. Expiring it with the same
 * attributes it was set with is what actually clears it.
 */
export const clearedSessionCookie = {
  name: SESSION_COOKIE,
  value: "",
  ...sessionCookieOptions(0),
  maxAge: 0,
};
