"use client";

import { useId, useState, type ReactNode } from "react";

/**
 * A long entry folded down to one line until it is wanted.
 *
 * A service or a case study runs to a dozen fields; with all of them open the
 * list itself (what is there, in what order) disappears under them. Folded,
 * the list reads at a glance and reorders without scrolling.
 *
 * `forceOpen` unfolds it when something inside needs attention (a field that
 * is empty or refused), and it then stays open, so an entry never folds away
 * while someone is typing into it. The fields are only mounted while open,
 * which also lets the text areas measure their height when they are shown.
 */
export function Disclosure({
  summary,
  children,
  forceOpen = false,
  defaultOpen = false,
}: {
  summary: ReactNode;
  children: ReactNode;
  forceOpen?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen || forceOpen);
  const id = useId();
  if (forceOpen && !open) setOpen(true);

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
        className="-mx-1 flex items-start gap-2 rounded-[6px] px-1 py-1 text-left hover:bg-ink/5"
      >
        <span aria-hidden className="mt-[1px] w-3 shrink-0 text-[12px] opacity-60">
          {open ? "▾" : "▸"}
        </span>
        <span className="min-w-0 flex-1">{summary}</span>
        <span className="shrink-0 text-[13px] underline decoration-ink/30 underline-offset-[3px]">{open ? "Fold" : "Edit"}</span>
      </button>
      {open ? (
        <div id={id} className="flex flex-col gap-4">
          {children}
        </div>
      ) : null}
    </div>
  );
}
