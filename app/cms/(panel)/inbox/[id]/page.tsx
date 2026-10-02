import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { adminHref } from "@/lib/cms/admin-path";
import { requireMaintainer } from "@/lib/cms/auth/dal";
import { getContentDoc } from "@/lib/cms/get-content";
import { getSubmission } from "@/lib/cms/inbox";
import { phoneHref } from "@/lib/cms/derive";
import { EnquiryActions } from "@/components/cms/inbox/enquiry-actions";
import { StatusPill } from "@/components/cms/inbox/status";
import { Card, formatWhen } from "@/components/cms/ui";

export const metadata: Metadata = { title: "Enquiry" };

/**
 * One enquiry in full. The reply button opens the maintainer's own email
 * program with the sender, a subject and their message quoted, so the answer
 * goes out from a real mailbox and the conversation carries on there.
 */

/** Long enough to quote most messages; mail programs cap how long a mailto link may be. */
const QUOTE_LIMIT = 1200;

function replyLink(to: string, studio: string, message: string | null, sentAt: string) {
  const quoted = message
    ? `\n\n\nOn ${sentAt} you wrote:\n${message
        .slice(0, QUOTE_LIMIT)
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n")}${message.length > QUOTE_LIMIT ? "\n> …" : ""}`
    : "";
  const params = `subject=${encodeURIComponent(`Re: Your enquiry to ${studio}`)}&body=${encodeURIComponent(quoted)}`;
  return `mailto:${to}?${params}`;
}

export default async function EnquiryPage({ params }: { params: Promise<{ id: string }> }) {
  await requireMaintainer();
  const { id } = await params;
  if (!/^\d{1,15}$/.test(id)) notFound();
  const [item, site] = await Promise.all([getSubmission(Number(id)), getContentDoc("site")]);
  if (!item) notFound();
  const when = formatWhen(item.createdAt);

  const rows: { label: string; value: React.ReactNode }[] = [
    {
      label: "Email",
      value: (
        <a href={`mailto:${item.email}`} className="underline underline-offset-2 break-all">
          {item.email}
        </a>
      ),
    },
    {
      label: "Phone",
      value: item.phone ? (
        <a href={phoneHref(item.phone)} className="underline underline-offset-2">
          {item.phone}
        </a>
      ) : null,
    },
    { label: "Company", value: item.company },
    { label: "Needs help with", value: item.need },
  ];

  return (
    <>
      <p className="mb-4 text-[14px]">
        <Link href={adminHref("inbox")} className="underline underline-offset-2 hover:no-underline">
          ← Back to the inbox
        </Link>
      </p>

      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="statement text-[30px] break-words max-mobile:text-[26px]">{item.name}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-[14px] opacity-80">
            <span>Sent {when}</span>
            <StatusPill status={item.status} />
          </p>
        </div>
      </header>

      <div className="flex flex-col gap-4">
        <Card>
          <dl className="grid grid-cols-[minmax(0,10em)_1fr] gap-x-6 gap-y-3 text-[15px] max-mobile:grid-cols-1 max-mobile:gap-y-1">
            {rows.map((row) => (
              <div key={row.label} className="contents">
                <dt className="cms-label pt-[3px] opacity-60 max-mobile:pt-2">{row.label}</dt>
                <dd className="min-w-0 break-words">{row.value || <span className="opacity-65">Not given</span>}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card title="Message">
          {item.message ? (
            <p className="text-[16px] leading-[1.55] break-words whitespace-pre-wrap">{item.message}</p>
          ) : (
            <p className="opacity-65">They didn&apos;t write a message.</p>
          )}
        </Card>

        <EnquiryActions
          id={item.id}
          status={item.status}
          name={item.name}
          replyHref={replyLink(item.email, site.name, item.message, when)}
        />
      </div>
    </>
  );
}
