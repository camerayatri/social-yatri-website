import type { SubmissionStatus } from "@/lib/cms/inbox";

/** How each status reads to staff. */
export const STATUS_LABELS: Record<SubmissionStatus, string> = {
  new: "New",
  read: "Read",
  archived: "Archived",
};

/**
 * A small status tag. New is the one that matters, so it alone gets the
 * brand yellow; read and archived stay quiet.
 */
export function StatusPill({ status }: { status: SubmissionStatus }) {
  const tone = {
    new: "bg-accent text-ink",
    read: "bg-ink/8 text-ink/70",
    archived: "bg-transparent text-ink/55 border border-ink/15",
  }[status];
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[12px] leading-[1.4] ${tone}`}>{STATUS_LABELS[status]}</span>;
}
