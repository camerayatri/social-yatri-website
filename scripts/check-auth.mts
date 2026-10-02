/**
 * Checks the admin's sign-in primitives without a database.
 *
 *   npm run cms:check-auth
 *
 * Password hashes verify and refuse, session cookies verify and refuse when
 * tampered with, expired, or signed under another secret, and ADMIN_PATH
 * values that would collide with the site are rejected.
 */

import assert from "node:assert/strict";

process.env.SESSION_SECRET = "a".repeat(48);

const { hashPassword, verifyPassword, passwordProblem, temporaryPassword } = await import("../lib/cms/auth/password");
const { signSession, verifySession, newSessionId, hashSessionId } = await import("../lib/cms/auth/cookie");
const { adminSegment } = await import("../lib/cms/admin-path");

let failures = 0;
async function check(name: string, fn: () => unknown) {
  try {
    await fn();
    console.log(`  ok  ${name}`);
  } catch (error) {
    failures++;
    console.error(`  FAIL ${name}\n       ${(error as Error).message}`);
  }
}

console.log("Passwords");
const hash = await hashPassword("correct horse battery staple");
await check("stored format is scrypt$N$r$p$salt$hash", () => assert.match(hash, /^scrypt\$32768\$8\$1\$[\w-]{22}\$[\w-]{86}$/));
await check("right password verifies", async () => assert.equal(await verifyPassword("correct horse battery staple", hash), true));
await check("wrong password fails", async () => assert.equal(await verifyPassword("correct horse battery stapler", hash), false));
await check("same password hashes differently (salted)", async () => assert.notEqual(await hashPassword("x".repeat(12)), await hashPassword("x".repeat(12))));
await check("garbage hash fails closed", async () => assert.equal(await verifyPassword("anything", "scrypt$1$2$3$$"), false));
await check("short password refused", () => assert.ok(passwordProblem("short")));
await check("temporary passwords pass the rules", () => assert.equal(passwordProblem(temporaryPassword(), "someone@example.com"), null));

console.log("Session cookies");
const id = newSessionId();
const future = Math.floor(Date.now() / 1000) + 3600;
const cookie = signSession(id, future);
await check("valid cookie verifies", () => assert.deepEqual(verifySession(cookie), { id, exp: future }));
await check("tampered id fails", () => assert.equal(verifySession(`${newSessionId()}.${cookie.split(".").slice(1).join(".")}`), null));
await check("extended expiry fails", () => assert.equal(verifySession(cookie.replace(`.${future}.`, `.${future + 999999}.`)), null));
await check("expired cookie fails", () => assert.equal(verifySession(signSession(id, Math.floor(Date.now() / 1000) - 1)), null));
await check("other secret fails", () => {
  process.env.SESSION_SECRET = "b".repeat(48);
  try {
    assert.equal(verifySession(cookie), null);
  } finally {
    process.env.SESSION_SECRET = "a".repeat(48);
  }
});
await check("missing secret fails closed", () => {
  delete process.env.SESSION_SECRET;
  try {
    assert.equal(verifySession(cookie), null);
  } finally {
    process.env.SESSION_SECRET = "a".repeat(48);
  }
});
await check("database stores a hash, not the id", () => assert.match(hashSessionId(id), /^[0-9a-f]{64}$/));

console.log("Admin path");
for (const [value, expected] of [
  ["sy-desk-4f9k2", "sy-desk-4f9k2"],
  ["/sy-desk-4f9k2/", "sy-desk-4f9k2"],
  ["", null],
  ["short", null],
  ["services", null],
  ["cmscmscms", "cmscmscms"],
  ["has space here", null],
  ["../escape-here", null],
] as const) {
  await check(`ADMIN_PATH=${JSON.stringify(value)} -> ${expected}`, () => {
    process.env.ADMIN_PATH = value;
    assert.equal(adminSegment(), expected);
  });
}

if (failures) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nAll auth checks passed.");
