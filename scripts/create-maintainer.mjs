/**
 * Creates a maintainer from the command line: how the first account is made,
 * before there is anyone to add people from the admin.
 *
 *   npm run admin:create -- --email you@example.com --name "Your Name"
 *
 * The password is never taken from the command line, where it would land in
 * shell history and the process list. It is read from ADMIN_PASSWORD when set,
 * otherwise from stdin: typed at a hidden prompt in a terminal, or piped in
 * (`printf %s "$PW" | npm run admin:create -- ...`).
 *
 * Add --reset to set a new password for an existing account instead, which also
 * re-enables it and signs out its sessions.
 */

import { parseArgs } from "node:util";
import { Pool } from "@neondatabase/serverless";
import { hashPassword, passwordProblem } from "../lib/cms/auth/password.ts";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Add it to .env.local and run again.");
  process.exit(1);
}

const { values } = parseArgs({
  options: { email: { type: "string" }, name: { type: "string" }, reset: { type: "boolean", default: false } },
});

async function readLine(prompt, hidden) {
  if (!process.stdin.isTTY) {
    let data = "";
    for await (const chunk of process.stdin) data += chunk;
    return data.replace(/\r?\n$/, "");
  }
  process.stdout.write(prompt);
  return new Promise((resolve) => {
    let input = "";
    process.stdin.setRawMode(hidden);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");
    const onData = (ch) => {
      if (ch === "\r" || ch === "\n" || ch === "\u0004") {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.off("data", onData);
        process.stdout.write("\n");
        resolve(input);
      } else if (ch === "\u0003") {
        process.exit(130);
      } else if (ch === "\u007f") {
        input = input.slice(0, -1);
      } else {
        input += ch;
        if (!hidden) process.stdout.write(ch);
      }
    };
    process.stdin.on("data", onData);
  });
}

const email = (values.email ?? (await readLine("Email: ", false))).trim().toLowerCase();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("That doesn't look like an email address.");
  process.exit(1);
}
const name = (values.name ?? (values.reset ? "" : email.split("@")[0])).trim();

let password = process.env.ADMIN_PASSWORD;
if (!password) {
  password = await readLine("Password (hidden): ", true);
  if (process.stdin.isTTY) {
    const again = await readLine("Again: ", true);
    if (again !== password) {
      console.error("The two passwords don't match.");
      process.exit(1);
    }
  }
}
const problem = passwordProblem(password, email);
if (problem) {
  console.error(problem);
  process.exit(1);
}

const pool = new Pool({ connectionString: url });
try {
  const hash = await hashPassword(password);
  if (values.reset) {
    const res = await pool.query(
      `UPDATE maintainers SET password_hash = $2, disabled = false, must_change_password = false WHERE email = $1 RETURNING id`,
      [email, hash],
    );
    if (!res.rowCount) throw new Error(`No maintainer with the email ${email}.`);
    await pool.query(`DELETE FROM sessions WHERE maintainer_id = $1`, [res.rows[0].id]);
    await pool.query(`INSERT INTO audit_log (action, target, detail) VALUES ('maintainer.reset', $1, '{"via":"cli"}')`, [email]);
    console.log(`Password reset for ${email}.`);
  } else {
    const res = await pool.query(
      `INSERT INTO maintainers (email, name, password_hash) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING RETURNING id`,
      [email, name, hash],
    );
    if (!res.rowCount) throw new Error(`${email} is already a maintainer. Use --reset to set a new password.`);
    await pool.query(`INSERT INTO audit_log (action, target, detail) VALUES ('maintainer.add', $1, '{"via":"cli"}')`, [email]);
    console.log(`Created maintainer ${email}.`);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
