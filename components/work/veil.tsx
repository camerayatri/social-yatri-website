"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { hasPlaceholder, placeholderStyle } from "@/lib/media";

/**
 * Where a frame-in-waiting is drawn: a box over the picture in its own
 * colours, which fades away once the picture has arrived.
 *
 * Laid over the image rather than under it, so the image itself is never
 * touched: its opacity, its transitions and its hover scale stay exactly as
 * the component that draws it wrote them. Put it straight after the image (or
 * the video and its cover) inside the same positioned box; it covers that box
 * and lets every pointer through.
 *
 * It only ever appears for a picture that is still loading once the page is
 * live. In the server's markup it is transparent, and on hydration it stays
 * transparent for any image the browser already finished, so a page that
 * loaded fast looks exactly as it did and the largest paint is never held
 * behind it. A frame still on its way is covered at once (no fade in: it was
 * empty a moment ago) and uncovered over half a second when it lands. That
 * includes the lazy frames further down a strip: their veils wait in place,
 * and each one lifts as its frame arrives.
 *
 * The colours come from `placeholderStyle`. For a seeded still they are in
 * the page already; for an upload they are a 16px copy from the optimizer,
 * asked for only once the box is within a screen or so of being seen, so a
 * strip of forty uploads does not fetch forty of them on load.
 */
export default function Veil({ src, className = "" }: { src: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [state, setState] = useState<"clear" | "waiting" | "done">("clear");
  const [near, setNear] = useState(false);
  const tiny = !hasPlaceholder(src);

  // A layout effect, so a frame that is still loading is covered in the same
  // paint the page goes live in, never shown bare for a frame first.
  useLayoutEffect(() => {
    const img = ref.current?.parentElement?.querySelector("img");
    if (img && img.complete && img.naturalWidth > 0) return;
    // The image is still on its way, or is being held back until its box
    // comes near the screen (a strip's far cards): cover it until it lands.
    // Set from the effect on purpose, because only the live page can know.
    setState("waiting");
    if (!img) return;
    const done = () => setState("done");
    img.addEventListener("load", done);
    img.addEventListener("error", done);
    // It may have finished between the render and this effect.
    if (img.complete && img.naturalWidth > 0) done();
    return () => {
      img.removeEventListener("load", done);
      img.removeEventListener("error", done);
    };
  }, [src]);

  useEffect(() => {
    if (!tiny || state !== "waiting" || near) return;
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setNear(true);
      },
      { rootMargin: "100% 100%" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [tiny, state, near]);

  return (
    <span
      ref={ref}
      aria-hidden
      className={`pointer-events-none absolute inset-0 block transition-opacity duration-500 motion-reduce:transition-none ${className}`}
      style={{
        ...placeholderStyle(src, near),
        opacity: state === "waiting" ? 1 : 0,
        // Covering is instant; only the reveal is a fade.
        transitionDuration: state === "waiting" ? "0ms" : undefined,
        transitionTimingFunction: "var(--ease-brand)",
      }}
    />
  );
}
