"use server";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { after } from "next/server";
import { z } from "zod";
import { MAX_LENGTH, HONEYPOT, MIN_FILL_MS, REQUIRED, TOKEN, tooLong } from "../contact-rules";
import { hasDatabase, sql } from "../db";
import { DEFAULTS } from "../defaults";
import { getContent } from "../get-content";
import { insertSubmission, type Submission } from "../inbox";
import { takeHit } from "../rate-limit";
import { hashIp, requestInfo, senderKey } from "../request";

/**
 * The public contact form's backend.
 *
 * Enquiries are the business, so the order of operations is chosen to never
 * lose one that a person sent, and to cost a bot as little as possible:
 *
 * 1. A signed timestamp, issued when the form mounts (`startContactForm`),
 *    must come back at least a few seconds old. Scripts that post straight
 *    at the action have none; ones that fill the form instantly are too
 *    quick. Either way the answer is "retry", with a fresh timestamp when
 *    the one sent was missing or refused, and the form waits out the rest of
 *    the few seconds and sends again by itself (see the form), so a person
 *    is never the one asked to do anything about it.
 * 2. A honeypot field people never see. Anything in it gets the ordinary
 *    "thank you" and is dropped without touching the database, so the bot
 *    has nothing to learn from and nothing to retry.
 * 3. The fields are validated with the same rules the form shows.
 * 4. The same enquiry again from the same person within half an hour is
 *    answered "sent" and not stored twice: a reply lost on a bad connection
 *    looks like a failure, and the natural response is to press send again.
 * 5. Ten stored submissions per hour per sender (an IPv4 address, or an IPv6
 *    /64), counted before the work so a burst cannot slip through together.
 * 6. The row is written, and only then is the email sent, after the
 *    response, so a slow or failing mail provider can never cost the row.
 *
 * Anything that goes wrong on our side answers with a failure that keeps the
 * visitor's text on screen and offers the studio's email and phone instead.
 */

const FIELDS = ["name", "company", "phone", "email", "need", "message"] as const;
export type ContactField = (typeof FIELDS)[number];

/** The studio's direct details, offered whenever the form cannot take a message. */
export type ContactFallback = { email: string; phone: string; phoneHref: string };

export type ContactState =
  | { status: "idle" }
  | { status: "sent" }
  | { status: "invalid"; fieldErrors: Partial<Record<ContactField, string>> }
  /** Too quick, or the form's timestamp was missing or refused. A fresh one rides along when needed. */
  | { status: "retry"; token?: string }
  | { status: "limited"; fallback: ContactFallback }
  | { status: "failed"; fallback: ContactFallback };

/**
 * A day. The form fetches a new timestamp whenever it comes back into view
 * more than an hour after the last one, so only a request that bypasses it
 * ever arrives with one this old, and even that is answered with a fresh
 * timestamp rather than turned away.
 */
const MAX_TOKEN_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * Per sender, per hour. Ten rather than a tighter number because a sender is
 * an address, and an address can be a whole office behind one router, or,
 * on Indian mobile networks, thousands of phones behind one carrier gateway.
 * Ten real enquiries an hour from one of those is unlikely; ten is still far
 * too few for a spammer to bother with. Whoever does hit it is shown the
 * email and phone, so nobody is ever left without a way through.
 */
const PER_HOUR = 10;

/** How far back a resubmission of the same enquiry counts as the same one. */
const DUPLICATE_MINUTES = 30;

/* ---------------------------------------------------------------------------
 * The signed timestamp
 * ------------------------------------------------------------------------- */

let devKey: string | null = null;

/**
 * The key the timestamp is signed with. SESSION_SECRET is always set where
 * the admin runs; the message signed is prefixed so a form token can never
 * pass for a session cookie or the other way round. A machine with neither
 * secret (a fresh checkout) signs with a key that lives as long as the
 * process, which is all local development needs.
 */
function signingKey() {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.IP_HASH_SALT) return process.env.IP_HASH_SALT;
  if (!devKey) {
    devKey = randomBytes(32).toString("base64url");
    if (process.env.NODE_ENV === "production") {
      console.warn("[contact] SESSION_SECRET is not set; form timestamps only verify on the instance that issued them.");
    }
  }
  return devKey;
}

function sign(issuedAt: number) {
  return createHmac("sha256", signingKey()).update(`contact-form:${issuedAt}`).digest("base64url");
}

function issueToken(now = Date.now()) {
  return `${now}.${sign(now)}`;
}

/** How old a token is, or null when it is missing, malformed, forged or from the future. */
function tokenAge(token: string, now = Date.now()): number | null {
  const match = /^(\d{13})\.([A-Za-z0-9_-]{43})$/.exec(token);
  if (!match) return null;
  const issuedAt = Number(match[1]);
  const expected = Buffer.from(sign(issuedAt));
  const given = Buffer.from(match[2]);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  const age = now - issuedAt;
  return age < 0 ? null : age;
}

/* ---------------------------------------------------------------------------
 * Validation
 * ------------------------------------------------------------------------- */

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, tooLong(max))
    .transform((s) => s || null);

const input = z.object({
  name: z.string().trim().min(1, REQUIRED).max(MAX_LENGTH.name, tooLong(MAX_LENGTH.name)),
  company: optional(MAX_LENGTH.company),
  phone: optional(MAX_LENGTH.phone).refine((s) => s === null || s.replace(/\D/g, "").length >= 6, "Enter a phone number, or leave this empty."),
  email: z
    .string()
    .trim()
    .min(1, REQUIRED)
    .max(MAX_LENGTH.email, tooLong(MAX_LENGTH.email))
    .pipe(z.email("Enter a valid email address.")),
  need: optional(MAX_LENGTH.need),
  message: optional(MAX_LENGTH.message),
});

/**
 * Characters that change how the text around them is drawn without being
 * text: the bidirectional overrides and isolates, which can make a name in
 * the inbox read backwards from what is stored (the trick spam uses to
 * disguise links), and the zero-width joiners and marks that make one name
 * look like another. Joiners inside emoji survive: U+200D is left alone.
 */
const INVISIBLE = /[​‎‏‪-‮⁠⁦-⁩﻿]/g;

/**
 * A field's text as posted. Postgres text cannot hold NUL, so it is dropped
 * rather than failing the insert, and a textarea's CRLF line breaks become
 * plain ones for the inbox, the email and the CSV. Every field but the
 * message is one line: any other control character in it (a line break
 * pasted into the name, a tab) becomes a space.
 */
function field(formData: FormData, name: string) {
  const value = formData.get(name);
  if (typeof value !== "string") return "";
  const text = value.replace(/\u0000/g, "").replace(/\r\n?/g, "\n").replace(INVISIBLE, "");
  return name === "message"
    ? text.replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    : text.replace(/[\u0001-\u001F\u007F]+/g, " ");
}

/* ---------------------------------------------------------------------------
 * The fallback contact details
 * ------------------------------------------------------------------------- */

async function fallback(): Promise<ContactFallback> {
  try {
    const { site } = await getContent();
    return { email: site.email, phone: site.phone, phoneHref: site.phoneHref };
  } catch {
    const site = DEFAULTS.site;
    return { email: site.email, phone: site.phone, phoneHref: site.phoneHref };
  }
}

/* ---------------------------------------------------------------------------
 * The email
 * ------------------------------------------------------------------------- */

/** One line, for a header: no line breaks, nothing absurdly long. */
const oneLine = (s: string, max = 120) => s.replace(/[\r\n\t]+/g, " ").slice(0, max);

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** India time, which is when the studio will read it. */
const received = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));

/**
 * The email itself: a subject that says who and what at a glance in a list
 * of mail, a plain-text body, and a plain HTML one with every value escaped,
 * since all of it was typed by a stranger.
 */
function emailFor(submission: Submission) {
  const rows: [string, string | null][] = [
    ["Name", submission.name],
    ["Company", submission.company],
    ["Email", submission.email],
    ["Phone", submission.phone],
    ["Needs help with", submission.need],
    ["Received", `${received(submission.createdAt)} (India time)`],
  ];
  const given = rows.filter((row): row is [string, string] => Boolean(row[1]));
  const message = submission.message ?? "(no message)";
  const footer = "Reply to this email to answer them directly. Every enquiry is also kept in the admin's inbox.";

  const who = `${submission.name}${submission.company ? `, ${submission.company}` : ""}`;
  const subject = oneLine(`New enquiry from ${who}${submission.need ? `: ${submission.need}` : ""}`, 150);

  const text = [...given.map(([k, v]) => `${k}: ${v}`), "", message, "", footer].join("\n");

  const cell = "padding:4px 16px 4px 0;vertical-align:top";
  const html = `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#111">
<table role="presentation" style="border-collapse:collapse">${given
    .map(([k, v]) => `<tr><td style="${cell};color:#666">${escapeHtml(k)}</td><td style="${cell}">${escapeHtml(v)}</td></tr>`)
    .join("")}</table>
<p style="white-space:pre-wrap;margin:20px 0">${escapeHtml(message)}</p>
<p style="color:#666;font-size:13px">${escapeHtml(footer)}</p>
</body></html>`;

  return { subject, text, html };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Tells the studio by email, through Resend's HTTP API, when it is set up
 * (RESEND_API_KEY, CONTACT_TO, CONTACT_FROM). Runs after the response has
 * gone and the row is already stored, so a failure here costs nothing but
 * the email: the enquiry is in the inbox either way.
 *
 * Three tries, a second and then four seconds apart, for the failures that
 * pass (no connection, a timeout, 429, a 5xx); a 4xx other than 429 is a
 * mistake in the setup, the same on every try, so it is not repeated. The
 * submission id is the idempotency key, so a try that did reach Resend but
 * whose answer was lost cannot send a second copy.
 *
 * A failure that sticks is logged as one line starting `[contact] ALERT`,
 * which is what a log alert or drain should match on.
 */
async function notify(submission: Submission) {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO?.split(",").map((s) => s.trim()).filter(Boolean);
  const from = process.env.CONTACT_FROM?.trim();
  if (!key || !to?.length || !from) {
    if (process.env.NODE_ENV === "production") {
      console.warn(`[contact] Email is not set up; enquiry ${submission.id} is in the admin inbox only.`);
    }
    return;
  }

  const { subject, text, html } = emailFor(submission);
  const body = JSON.stringify({ from, to, reply_to: submission.email, subject, text, html });

  let problem = "";
  for (const wait of [0, 1000, 4000]) {
    if (wait) await sleep(wait);
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          "Idempotency-Key": `contact-submission-${submission.id}`,
        },
        body,
        signal: AbortSignal.timeout(10_000),
      });
      if (response.ok) return;
      problem = `HTTP ${response.status} ${(await response.text().catch(() => "")).slice(0, 300)}`;
      if (response.status !== 429 && response.status < 500) break;
    } catch (error) {
      problem = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    }
  }
  console.error(`[contact] ALERT: the email for enquiry ${submission.id} was not sent (${problem}). The enquiry is in the admin inbox.`);
}

/* ---------------------------------------------------------------------------
 * The actions
 * ------------------------------------------------------------------------- */

/**
 * Called by the form when it mounts, and again when it comes back into view
 * after a long time away: the signed timestamp the submission must carry
 * back. The page itself is cached, so the timestamp cannot be rendered into
 * it.
 */
export async function startContactForm(): Promise<{ token: string }> {
  return { token: issueToken() };
}

/** Whether this person sent this same enquiry a few minutes ago. */
async function alreadyReceived(data: z.infer<typeof input>) {
  const rows = (await sql().query(
    `SELECT id FROM contact_submissions
      WHERE lower(email) = lower($1) AND name = $2
        AND message IS NOT DISTINCT FROM $3 AND need IS NOT DISTINCT FROM $4
        AND created_at > now() - interval '${DUPLICATE_MINUTES} minutes'
      LIMIT 1`,
    [data.email, data.name, data.message, data.need],
  )) as { id: string }[];
  return rows.length > 0;
}

export async function submitContact(_previous: ContactState, formData: FormData): Promise<ContactState> {
  // 1. Time to fill.
  const age = tokenAge(field(formData, TOKEN));
  if (age === null || age > MAX_TOKEN_AGE_MS) return { status: "retry", token: issueToken() };
  if (age < MIN_FILL_MS) return { status: "retry" };

  // 2. The honeypot. Looks like success; nothing is kept.
  if (field(formData, HONEYPOT).trim() !== "") {
    console.info("[contact] Dropped a submission that filled the hidden field.");
    return { status: "sent" };
  }

  // 3. The fields.
  const parsed = input.safeParse(Object.fromEntries(FIELDS.map((name) => [name, field(formData, name)])));
  if (!parsed.success) {
    const fieldErrors: Partial<Record<ContactField, string>> = {};
    for (const issue of parsed.error.issues) {
      const name = issue.path[0] as ContactField;
      fieldErrors[name] ??= issue.message;
    }
    return { status: "invalid", fieldErrors };
  }

  if (!hasDatabase()) {
    console.warn("[contact] DATABASE_URL is not set; the enquiry could not be stored.");
    return { status: "failed", fallback: await fallback() };
  }

  try {
    // 4. Sent already; the answer just never arrived.
    if (await alreadyReceived(parsed.data)) return { status: "sent" };

    // 5. Ten an hour from one sender.
    const { ip } = await requestInfo();
    const ipHash = hashIp(senderKey(ip));
    if ((await takeHit(`contact:ip:${ipHash}`, 60)) > PER_HOUR) {
      console.info(`[contact] Sender ${ipHash.slice(0, 8)} is over ${PER_HOUR} an hour; shown the direct details.`);
      return { status: "limited", fallback: await fallback() };
    }

    // 6. Keep it, then tell someone.
    const submission = await insertSubmission({ ...parsed.data, ipHash });
    after(() => notify(submission));
    return { status: "sent" };
  } catch (error) {
    console.error("[contact] ALERT: an enquiry could not be stored; the visitor was shown the email and phone.", error);
    return { status: "failed", fallback: await fallback() };
  }
}
