import type { Metadata } from "next";
import Link from "next/link";
import { adminHref } from "@/lib/cms/admin-path";
import { requireMaintainer } from "@/lib/cms/auth/dal";
import { countSubmissions, isInboxView, listSubmissions, type InboxView } from "@/lib/cms/inbox";
import { StatusPill } from "@/components/cms/inbox/status";
import { Card, PageHeader, buttonClass, formatWhen } from "@/components/cms/ui";

export const metadata: Metadata = { title: "Inbox" };

/**
 * Everything sent through the contact form, newest first.
 *
 * Opens on "Inbox": new and read together, so a message does not vanish the
 * moment it is opened. Archive moves one out of the way without losing it.
 * The view lives in the address (?view=archived), so a filtered list can be
 * bookmarked and the browser's back button returns to it.
 */

const VIEWS: { view: InboxView; label: string }[] = [
  { view: "inbox", label: "Inbox" },
  { view: "new", label: "New" },
  { view: "read", label: "Read" },
  { view: "archived", label: "Archived" },
  { view: "all", label: "All" },
];

const EMPTY: Record<InboxView, string> = {
  inbox: "No enquiries yet. Anything sent through the contact form shows up here.",
  new: "Nothing new. You're all caught up.",
  read: "No read enquiries.",
  archived: "Nothing archived.",
  all: "No enquiries yet. Anything sent through the contact form shows up here.",
};

/** Rows the page lists; the CSV export has no limit. */
const LIST_LIMIT = 500;

/** The start of the message, on one line, for the list. */
function preview(text: string | null, max = 140) {
  if (!text) return "";
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max).trimEnd()}…` : flat;
}

export default async function InboxPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireMaintainer();
  const requested = (await searchParams).view;
  const view: InboxView = isInboxView(requested) ? requested : "inbox";
  const [items, counts] = await Promise.all([listSubmissions(view, LIST_LIMIT), countSubmissions()]);
  const total = counts.new + counts.read + counts.archived;
  const count: Record<InboxView, number> = { ...counts, inbox: counts.new + counts.read, all: total };

  return (
    <>
      <PageHeader
        title={counts.new ? `Inbox (${counts.new} new)` : "Inbox"}
        lead={
          counts.new
            ? `${counts.new} new ${counts.new === 1 ? "enquiry" : "enquiries"} from the contact form. Open one to read it and reply.`
            : "Enquiries from the contact form. Open one to read it and reply."
        }
        actions={
          total ? (
            // A plain link: the export is a file download, not a page to prefetch.
            <a href={`${adminHref("inbox/export")}?view=${view}`} className={buttonClass("secondary")} download>
              Download as spreadsheet (CSV)
            </a>
          ) : null
        }
      />

      <nav aria-label="Filter enquiries" className="mb-4 flex flex-wrap gap-2">
        {VIEWS.map(({ view: v, label }) => {
          const active = v === view;
          return (
            <Link
              key={v}
              href={v === "inbox" ? adminHref("inbox") : `${adminHref("inbox")}?view=${v}`}
              aria-current={active ? "page" : undefined}
              className={`inline-flex h-9 items-center gap-2 rounded-full border px-4 text-[14px] transition-colors ${
                active ? "border-ink bg-ink text-paper" : "border-ink/20 hover:border-ink"
              }`}
            >
              {label}
              <span className={`text-[12px] ${active ? "opacity-70" : "opacity-65"}`}>{count[v]}</span>
            </Link>
          );
        })}
      </nav>

      <Card>
        {items.length === 0 ? (
          <p className="py-6 text-center opacity-60">{EMPTY[view]}</p>
        ) : (
          <ul className="-my-2 flex flex-col divide-y divide-ink/10">
            {items.map((item) => {
              const unread = item.status === "new";
              const snippet = preview(item.message) || preview(item.need);
              return (
                <li key={item.id}>
                  <Link
                    href={adminHref(`inbox/${item.id}`)}
                    prefetch={false}
                    className="-mx-2 flex items-start justify-between gap-4 rounded-[8px] px-2 py-3 transition-colors hover:bg-ink/4 max-mobile:flex-col max-mobile:items-stretch max-mobile:gap-1"
                  >
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-[15px] ${unread ? "font-medium" : ""}`}>
                        {unread ? <span aria-hidden className="bg-accent mr-2 inline-block size-2 rounded-full align-middle" /> : null}
                        {item.name}
                        {item.company ? <span className="opacity-60"> · {item.company}</span> : null}
                      </p>
                      <p className="truncate text-[13px] opacity-60">
                        {item.email}
                        {item.need ? ` · ${preview(item.need, 60)}` : ""}
                      </p>
                      {snippet && snippet !== preview(item.need) ? (
                        <p className="mt-1 line-clamp-2 text-[14px] opacity-80">{snippet}</p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-3 text-[12px] max-mobile:order-first">
                      <span className="opacity-60">{formatWhen(item.createdAt)}</span>
                      <StatusPill status={item.status} />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      {items.length >= LIST_LIMIT ? (
        <p className="mt-3 text-[13px] opacity-60">
          Showing the newest {LIST_LIMIT}. The spreadsheet download has all of them.
        </p>
      ) : null}
    </>
  );
}
