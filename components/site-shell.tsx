import type { ReactNode } from "react";
import { LoadingProvider } from "@/components/loader";
import TransitionProvider from "@/components/transition/transition-provider";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import SmoothScroll from "@/components/effects/smooth-scroll";
import Cursor from "@/components/effects/cursor";
import MediaViewerProvider from "@/components/effects/media-viewer";

/**
 * The public site's chrome: smooth scrolling, the cursor, the grain, the
 * loader, the media viewer and the page transition with the header and footer
 * it carries.
 *
 * It used to live in the root layout. It moved here so the admin, which shares
 * the root layout for its fonts and palette, can sit outside all of it: no
 * loader, no Lenis, no custom cursor in a place people fill in forms. The
 * public pages get it from `app/(site)/layout.tsx`, and the 404 wraps itself in
 * it because the root not-found renders outside every route group.
 */
export default function SiteShell({ children }: { children: ReactNode }) {
  return (
    <>
      <a
        href="#main"
        className="label focus:bg-accent focus:text-ink sr-only focus:not-sr-only focus:fixed focus:top-[var(--gutter)] focus:left-[var(--gutter)] focus:z-[500] focus:px-[12px] focus:py-[8px]"
      >
        Skip to content
      </a>
      <SmoothScroll />
      <Cursor />
      <div className="grain" aria-hidden />

      <LoadingProvider>
        <MediaViewerProvider>
          <TransitionProvider chrome={<SiteHeader />}>
            {children}
            <SiteFooter />
          </TransitionProvider>
        </MediaViewerProvider>
      </LoadingProvider>
    </>
  );
}
