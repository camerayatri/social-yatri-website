"use server";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { after } from "next/server";
import { z } from "zod";
import { hasDatabase } from "../db";
import { DEFAULTS } from "../defaults";
import { getContent } from "../get-content";
import { insertSubmission, type Submission } from "../inbox";
import { addHits, countHits } from "../rate-limit";
import { hashIp, requestInfo } from "../request";

/**
 * The public contact form's backend.
 *
 * Enquiries are the business, so the order of operations is chosen to never
 * lose one that a person sent, and to cost a bot as little as possible:
 *
 * 1. A signed timestamp, issued when the form mounts (`startContactForm`),
 *    must come back at least a few seconds old. Scripts that post straight
 *    at the action have none; ones that fill the form instantly are too
 *    quick. A person who is that quick (autofill, then Enter) is asked to
 *    press send again rather than turned away, and their typing is kept.
 * 2. A honeypot field people never see. Anything in it gets the ordinary
 *    "thank you" and is dropped without touching the database, so the bot
 *    has nothing to learn from and nothing to retry.
 * 3. The fields are validated with the same rules the form shows.
 * 4. Five stored submissions per hour per (hashed) address.
 * 5. The row is written, and only then is the email sent, after the
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
  /** Too quick, or the form's timestamp was missing or stale. A fresh one rides along when needed. */
  | { status: "retry"; token?: string }
  | { status: "limited"; fallback: ContactFallback }
  | { status: "failed"; fallback: ContactFallback };

/** The honeypot's and the timestamp's field names. Neither is a word autofill recognises. */
const HONEYPOT = "sy_extra";
const TOKEN = "sy_t";

const MIN_FILL_MS = 3000;
const MAX_TOKEN_AGE_MS = 24 * 60 * 60 * 1000;
const PER_HOUR = 5;

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

const REQUIRED = "This can't be empty.";
const tooLong = (max: number) => `Keep this under ${max} characters.`;

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, tooLong(max))
    .transform((s) => s || null);

const input = z.object({
  name: z.string().trim().min(1, REQUIRED).max(200, tooLong(200)),
  company: optional(200),
  phone: optional(40).refine((s) => s === null || s.replace(/\D/g, "").length >= 6, "Enter a phone number, or leave this empty."),
  email: z.string().trim().min(1, REQUIRED).max(254, tooLong(254)).pipe(z.email("Enter a valid email address.")),
  need: optional(300),
  message: optional(5000),
});

/**
 * A field's text as posted. Postgres text cannot hold NUL, so it is dropped
 * rather than failing the insert, and a textarea's CRLF line breaks become
 * plain ones for the inbox, the email and the CSV.
 */
function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.replace(/\u0000/g, "").replace(/\r\n?/g, "\n") : "";
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

/**
 * Tells the studio by email, through Resend's HTTP API, when it is set up
 * (RESEND_API_KEY, CONTACT_TO, CONTACT_FROM). Runs after the response has
 * gone and the row is already stored, so every failure here is logged and
 * nothing more: the enquiry is in the inbox either way. The submission id is
 * the idempotency key, so a retried call cannot send the same email twice.
 */
async function notify(submission: Submission) {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO?.split(",").map((s) => s.trim()).filter(Boolean);
  const from = process.env.CONTACT_FROM?.trim();
  if (!key || !to?.length || !from) return;

  const lines = [
    `Name: ${submission.name}`,
    submission.company ? `Company: ${submission.company}` : null,
    `Email: ${submission.email}`,
    submission.phone ? `Phone: ${submission.phone}` : null,
    submission.need ? `Needs help with: ${submission.need}` : null,
    "",
    submission.message ?? "(no message)",
    "",
    "Reply to this email to answer them directly. Every enquiry is also kept in the admin's inbox.",
  ].filter((line) => line !== null);

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `contact-submission-${submission.id}`,
      },
      body: JSON.stringify({
        from,
        to,
        reply_to: submission.email,
        subject: oneLine(`New enquiry from ${submission.name}${submission.company ? `, ${submission.company}` : ""}`, 150),
        text: lines.join("\n"),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      const detail = (await response.text().catch(() => "")).slice(0, 300);
      console.error(`[contact] Email for enquiry ${submission.id} failed: HTTP ${response.status} ${detail}`);
    }
  } catch (error) {
    console.error(`[contact] Email for enquiry ${submission.id} failed:`, error);
  }
}

/* ---------------------------------------------------------------------------
 * The actions
 * ------------------------------------------------------------------------- */

/**
 * Called by the form when it mounts: the signed timestamp the submission
 * must carry back, and the details to offer if sending fails. The page
 * itself is cached, so the timestamp cannot be rendered into it.
 */
export async function startContactForm(): Promise<{ token: string; fallback: ContactFallback }> {
  return { token: issueToken(), fallback: await fallback() };
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
    // 4. Five an hour from one address.
    const { ip } = await requestInfo();
    const ipHash = hashIp(ip);
    const bucket = `contact:ip:${ipHash}`;
    const hits = await countHits([bucket], 60);
    if (hits[bucket] >= PER_HOUR) return { status: "limited", fallback: await fallback() };

    // 5. Keep it, then tell someone.
    const submission = await insertSubmission({ ...parsed.data, ipHash });
    await addHits([bucket], 60).catch((error) => console.error("[contact] Could not count the submission:", error));
    after(() => notify(submission));
    return { status: "sent" };
  } catch (error) {
    console.error("[contact] The enquiry could not be stored:", error);
    return { status: "failed", fallback: await fallback() };
  }
}
