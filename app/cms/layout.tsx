import type { Metadata } from "next";
import "./cms.css";

/**
 * The admin's outermost layout. It shares the root layout's fonts and paper
 * background but none of the site's chrome: no loader, no smooth scrolling,
 * no custom cursor, no page transition. Type is set in plain pixels here
 * instead of the site's viewport-scaled em, because forms should not grow and
 * shrink with the window.
 *
 * Never indexed: the proxy sends X-Robots-Tag on every admin response, and
 * this says the same in the page head.
 */

/* Always rendered per request: every admin page depends on who is asking. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin" },
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  referrer: "no-referrer",
};

export default function CmsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-cms className="text-ink min-h-dvh text-[15px] leading-[1.45]">
      {children}
    </div>
  );
}
