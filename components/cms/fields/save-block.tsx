"use client";

import type { ReactNode } from "react";

/**
 * Turning an editor's Save button off, with the reason beside it.
 *
 * `EditorForm` owns its save bar and only disables Save when nothing has
 * changed. Some lists have rules that are plain before a save is tried: the
 * showreel's spiral holds six to twelve clips, and a photograph without alt
 * text can't go on the site. For those the button should be visibly off with
 * the reason in view, rather than on and then refusing.
 *
 * Wrap the EditorForm in `SaveBlocker`, and render `<BlockSave reason=...>`
 * inside the form's fields whenever saving should be off. The marker dims and
 * disarms the form's submit button (by pointer, Enter and Cmd/Ctrl+S alike),
 * and shows the reason pinned just above the save bar while the form is on
 * screen, so it is next to the button wherever the page is scrolled.
 */
export function SaveBlocker({ children }: { children: ReactNode }) {
  const blocked = (el: HTMLElement) => el.querySelector("[data-block-save]") !== null;
  return (
    <div
      className="[&:has([data-block-save])_button[type=submit]]:pointer-events-none [&:has([data-block-save])_button[type=submit]]:opacity-40"
      onSubmitCapture={(e) => {
        if (!blocked(e.currentTarget)) return;
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.querySelector<HTMLElement>("[data-block-save]")?.focus();
      }}
      onKeyDownCapture={(e) => {
        if (!((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") || !blocked(e.currentTarget)) return;
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {children}
    </div>
  );
}

export function BlockSave({ reason }: { reason: ReactNode }) {
  return (
    <div
      data-block-save=""
      tabIndex={-1}
      role="status"
      className="sticky bottom-[76px] z-[11] rounded-[10px] border border-[#b88a00]/45 bg-[#fff3cc] px-4 py-2.5 text-[14px] text-[#5a4300] shadow-[0_6px_20px_-12px_rgba(0,0,0,0.35)] outline-none"
    >
      <span className="font-medium">Save is off: </span>
      {reason}
    </div>
  );
}
