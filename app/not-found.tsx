import type { Metadata } from "next";

import BubbleButton from "@/components/effects/bubble-button";
import { Marker } from "@/components/ui/section-head";

/*
 * Without this the tab and the history entry read as the home page, because
 * the layout's default title is all there is to inherit.
 *
 * Exported as metadata rather than rendered as a `<title>` in the tree. The
 * docs only describe a metadata export for `global-not-found.js`, but Next
 * resolves one from `not-found.js` too, for unmatched URLs and for
 * `notFound()` alike. A rendered `<title>` was tried first: it is hoisted into
 * the head after the layout's own, and a browser shows the first of the two.
 * Next adds `noindex` to the 404 on its own.
 */
export const metadata: Metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <main className="gradient-paper text-ink flex min-h-dvh flex-col justify-end px-[var(--gutter)] pb-[3em]">
      <Marker>404 · wrong turn</Marker>
      <h1 className="display mt-[0.4em] text-[clamp(64px,18vw,300px)]">Not found</h1>
      <p className="mt-[1.5em] max-w-[24em] text-[1.0625em] opacity-70">
        This stop isn&apos;t on the route.
      </p>
      {/* A row, so the bubble button keeps its own width instead of the page's. */}
      <div className="mt-[2em] flex">
        <BubbleButton href="/">Back to the start</BubbleButton>
      </div>
    </main>
  );
}
