/**
 * What the contact form and its server action have to agree on.
 *
 * A module of its own because the action's file is `"use server"`, which may
 * export nothing but async functions, and the form needs these numbers and
 * names too: the field caps (so a pasted novel is turned back in the browser
 * before it is ever sent), the minimum time to fill (so the form can wait it
 * out itself instead of asking the visitor to press again), and the names of
 * the two fields nobody types into.
 */

/** The honeypot's and the timestamp's field names. Neither is a word autofill recognises. */
export const HONEYPOT = "sy_extra";
export const TOKEN = "sy_t";

/** A submission must come back at least this long after its timestamp was issued. */
export const MIN_FILL_MS = 3000;

/** The longest each field may be, in characters. The database has no limits of its own. */
export const MAX_LENGTH = {
  name: 200,
  company: 200,
  phone: 40,
  email: 254,
  need: 300,
  message: 5000,
} as const;

export const REQUIRED = "This can't be empty.";
export const tooLong = (max: number) => `Keep this under ${max} characters.`;
