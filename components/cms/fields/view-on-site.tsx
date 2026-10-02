import type { ReactNode } from "react";

/**
 * A link from an editor section to the public page it changes, opened in a
 * new tab so the form, and anything typed into it, stays where it was.
 *
 * Saved changes show there straight away; unsaved ones do not, which the
 * screen-reader text says so nobody goes looking for an edit not yet saved.
 */
export function ViewOnSite({ href, children = "View on site" }: { href: string; children?: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 whitespace-nowrap underline decoration-ink/30 underline-offset-[3px] hover:decoration-ink"
    >
      {children}
      <span aria-hidden>↗</span>
      <span className="sr-only"> (opens in a new tab; shows saved changes only)</span>
    </a>
  );
}
