"use client";

import { track as send } from "@vercel/analytics";

/**
 * The events the site reports, by name. One list, so a dashboard filter and
 * the code that sends it cannot drift apart.
 */
export type EventName = "contact_submitted";

/**
 * Report that something worth counting happened, e.g.
 * `track("contact_submitted")` once an enquiry has been stored.
 *
 * Call it from the browser, after the thing has actually happened (after
 * the server action resolved, not on the click). It never throws and never
 * waits: analytics must not be able to break a form. Nothing personal goes
 * with it, only the name; Vercel attaches the page it was sent from.
 *
 * Custom events are counted on Vercel's Pro plan; on Hobby the call is
 * accepted and simply not recorded, so it is safe to wire up now.
 */
export function track(name: EventName): void {
  try {
    send(name);
  } catch {
    /* analytics is never worth an error in the visitor's way */
  }
}
