import BubbleButton from "@/components/effects/bubble-button";
import { Marker } from "@/components/ui/section-head";
import SiteShell from "@/components/site-shell";

/**
 * The root not-found handles every unmatched URL, and it renders inside the
 * root layout only, outside the (site) group, so it brings the site's chrome
 * with it.
 */
export default function NotFound() {
  return (
    <SiteShell>
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
    </SiteShell>
  );
}
