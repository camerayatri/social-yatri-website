import { audit } from "@/lib/cms/audit";
import { requireMaintainer } from "@/lib/cms/auth/dal";
import { isInboxView, listSubmissions, type InboxView, type Submission } from "@/lib/cms/inbox";

/**
 * The inbox as a CSV file, for a spreadsheet or a CRM import.
 *
 * Every cell is quoted, with quotes doubled, so commas and line breaks in a
 * message stay inside their cell. Every cell that starts with a character a
 * spreadsheet reads as the start of a formula (= + - @, tab, carriage
 * return) is prefixed with an apostrophe: the text comes from strangers on
 * the internet, and "=HYPERLINK(...)" typed into the form must open in Excel
 * as text, not as a live link or a command. A byte order mark up front makes
 * Excel read the file as UTF-8, so names in other scripts survive.
 */

const HEADERS = ["Received (India time)", "Received (UTC)", "Status", "Name", "Company", "Email", "Phone", "Needs help with", "Message", "ID"];

const ist = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function istStamp(iso: string) {
  const p = Object.fromEntries(ist.formatToParts(new Date(iso)).map((part) => [part.type, part.value]));
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;
}

/** One cell, safe for a spreadsheet: quoted, quotes doubled, formulas defused. */
function csvCell(value: string | number | null): string {
  let text = value === null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function row(item: Submission) {
  return [
    istStamp(item.createdAt),
    item.createdAt,
    item.status,
    item.name,
    item.company,
    item.email,
    item.phone,
    item.need,
    item.message,
    item.id,
  ];
}

export async function GET(request: Request) {
  const me = await requireMaintainer();
  const requested = new URL(request.url).searchParams.get("view");
  const view: InboxView = isInboxView(requested) ? requested : "all";
  const items = await listSubmissions(view, 100_000);

  const lines = [HEADERS, ...items.map(row)].map((cells) => cells.map(csvCell).join(","));
  const body = `﻿${lines.join("\r\n")}\r\n`;
  await audit({ id: me.id, email: me.email }, "inbox.export", view, { rows: items.length });

  const date = new Date().toISOString().slice(0, 10);
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="social-yatri-enquiries-${view}-${date}.csv"`,
      "Cache-Control": "no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
