/**
 * Password hashing with scrypt from node:crypto.
 *
 * Stored as `scrypt$N$r$p$salt$hash` (salt and hash in base64url), so the cost
 * can be raised later without breaking existing hashes: verification reads
 * the parameters from the string, not from these constants.
 *
 * N = 2^15, r = 8, p = 1 takes about 32MB and a few tens of milliseconds,
 * which is slow enough to make guessing expensive and fast enough that a
 * sign-in does not feel it. No server-only import: the create-maintainer
 * script hashes with this file too.
 */

import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

const N = 2 ** 15;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

export const MIN_PASSWORD_LENGTH = 12;

function derive(password: string, salt: Buffer, n: number, r: number, p: number, length: number) {
  // maxmem must clear 128 * N * r, which the default 32MB only just misses.
  const options: ScryptOptions = { N: n, r, p, maxmem: 256 * n * r };
  return new Promise<Buffer>((resolve, reject) =>
    scrypt(password.normalize("NFKC"), salt, length, options, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

export async function hashPassword(password: string) {
  const salt = randomBytes(SALT_LENGTH);
  const key = await derive(password, salt, N, R, P, KEY_LENGTH);
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [n, r, p] = parts.slice(1, 4).map(Number);
  if (![n, r, p].every((v) => Number.isInteger(v) && v > 0) || n > 2 ** 20) return false;
  const salt = Buffer.from(parts[4], "base64url");
  const expected = Buffer.from(parts[5], "base64url");
  if (expected.length === 0) return false;
  const actual = await derive(password, salt, n, r, p, expected.length);
  return timingSafeEqual(actual, expected);
}

/**
 * A real hash of nothing anyone knows, checked against when the email is not
 * found, so an unknown address costs the same time as a wrong password and the
 * response time does not reveal which emails have accounts.
 */
let dummy: Promise<string> | null = null;
export function dummyHash() {
  dummy ??= hashPassword(randomBytes(32).toString("base64url"));
  return dummy;
}

/** Why a new password is refused, or null when it is fine. */
export function passwordProblem(password: string, email?: string) {
  if (password.length < MIN_PASSWORD_LENGTH) return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  if (password.length > 200) return "That is longer than it needs to be (200 characters at most).";
  if (email && password.toLowerCase().includes(email.split("@")[0].toLowerCase())) {
    return "Don't build the password from your email address.";
  }
  if (/^(.)\1+$/.test(password)) return "Use more than one repeated character.";
  return null;
}

/** A readable temporary password: four groups of five, no look-alike characters. */
export function temporaryPassword() {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(20);
  const chars = [...bytes].map((b) => alphabet[b % alphabet.length]);
  return [0, 5, 10, 15].map((i) => chars.slice(i, i + 5).join("")).join("-");
}
