"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { changeStatus, markOpened, removeEnquiry, type InboxResult } from "@/app/cms/(panel)/inbox/actions";
import type { SubmissionStatus } from "@/lib/cms/inbox";
import { useAdmin } from "../admin-context";
import { Button, Notice, buttonClass } from "../ui";

/**
 * What can be done with one enquiry: reply, mark it unread again, archive or
 * bring it back, delete it. Opening a new one marks it read, from here rather
 * than from the page's render, so a link that is merely prefetched never
 * marks anything.
 */
export function EnquiryActions({
  id,
  status,
  name,
  replyHref,
}: {
  id: number;
  status: SubmissionStatus;
  name: string;
  replyHref: string;
}) {
  const router = useRouter();
  const { base } = useAdmin();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "new") return;
    markOpened(id)
      .then(() => router.refresh())
      .catch(() => {});
    // Only on first open of a new enquiry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const run = async (fn: () => Promise<InboxResult>, after?: () => void) => {
    setBusy(true);
    setError(null);
    try {
      const result = await fn();
      if ("error" in result) setError(result.error);
      else if (after) after();
      else router.refresh();
    } catch {
      setError("That didn't work. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const remove = () => {
    if (!window.confirm(`Delete the enquiry from ${name} for good? This can't be undone. Archive it instead to keep it out of the way.`)) return;
    run(
      () => removeEnquiry(id),
      () => {
        router.push(`${base}/inbox`);
        router.refresh();
      },
    );
  };

  return (
    <div className="flex flex-col gap-3">
      {error ? <Notice tone="error">{error}</Notice> : null}
      <div className="flex flex-wrap gap-2">
        <a href={replyHref} className={buttonClass("primary")}>
          Reply by email
        </a>
        {status === "archived" ? (
          <Button onClick={() => run(() => changeStatus(id, "read"))} disabled={busy}>
            Move back to inbox
          </Button>
        ) : (
          <>
            <Button onClick={() => run(() => changeStatus(id, "new"))} disabled={busy || status === "new"}>
              Mark as unread
            </Button>
            <Button onClick={() => run(() => changeStatus(id, "archived"))} disabled={busy}>
              Archive
            </Button>
          </>
        )}
        <Button variant="danger" onClick={remove} disabled={busy}>
          Delete
        </Button>
      </div>
    </div>
  );
}
