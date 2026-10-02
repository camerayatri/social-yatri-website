"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Image from "next/image";

import Carousel from "./carousel";
import { useMediaViewer, type ViewerItem } from "@/components/effects/media-viewer";
import type { Shoot } from "@/lib/gallery";

/**
 * The shoot: one frame held large, with the rest of the set as a strip beneath
 * it. Clicking a frame in the strip promotes it to the display.
 *
 * The strip sits directly under the display on purpose. It used to be further
 * down the page with the reels in between, which meant choosing a frame changed
 * something the reader could no longer see.
 *
 * The display holds a constant HEIGHT and lets the width follow the frame. A
 * fixed 16:9 box was the obvious thing and it was wrong: this set is mostly
 * portrait, so `object-contain` put a wall of ink down either side of nearly
 * every frame, and `object-cover` would have cropped the tops off people. A
 * fixed height keeps every frame whole at its own proportions while the page
 * below stays exactly where it was, which is the only thing the fixed box was
 * really buying.
 */
export default function ShootViewer({
  shoot,
  /**
   * The piece's own frame, which opens the display. It is always one of the
   * shoot's own photos, so it is passed by source and resolved to an index
   * here: that way the strip can mark the opening frame from the start instead
   * of showing nothing as current.
   */
  openingSrc,
}: {
  shoot: Shoot;
  openingSrc: string;
}) {
  const photos = [...shoot.photos];
  const opening = Math.max(
    0,
    photos.findIndex((photo) => photo.src === openingSrc),
  );
  const [active, setActive] = useState(opening);
  const viewer = useMediaViewer();
  const root = useRef<HTMLElement>(null);
  const headingId = useId();

  const shown = photos[active];
  const count = photos.length;
  const step = useCallback(
    (direction: 1 | -1) => setActive((i) => (i + direction + count) % count),
    [count],
  );

  /*
   * The arrow keys turn the frames whenever this section is the thing on
   * screen. Scoped by visibility rather than by focus, because nobody focuses a
   * photograph before pressing a key; and stood down while the full-screen
   * viewer is open, which owns the same keys, or while a field has focus.
   */
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let inView = false;
    const io = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
    }, { threshold: 0.35 });
    io.observe(el);
    const onKey = (event: KeyboardEvent) => {
      if (!inView) return;
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      if (document.querySelector(".viewer")) return;
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      event.preventDefault();
      step(event.key === "ArrowRight" ? 1 : -1);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      io.disconnect();
      window.removeEventListener("keydown", onKey);
    };
  }, [step]);

  return (
    <section ref={root} aria-labelledby={headingId}>
      {/*
        The section's heading, for the outline and for anyone moving through
        the page by headings. Hidden, because the design already names the set
        in the caption under the display and a second visible title would
        repeat it; the reel strip above has its own h2, so this is its peer.
      */}
      <h2 id={headingId} className="sr-only">
        {shoot.label}
      </h2>
      {/*
        The display's height is the constant and its width follows the frame,
        but the width is capped at the column too. Without that cap a landscape
        frame at 72vh on a phone comes out wider than the screen and the whole
        page scrolls sideways; with it, the box takes the smaller of the two
        fits and keeps the frame's own proportions either way. `--display-h`
        is the height budget the width is derived from.
      */}
      <div className="flex h-[var(--display-h)] items-center justify-center px-[var(--gutter)] [--display-h:min(72vh,680px)] max-mobile:h-auto max-mobile:[--display-h:min(62vh,520px)]">
        {/*
          Keyed on the source so a new frame mounts fresh and runs the fade in.
          A CSS animation rather than a transition on state, so there is no
          second render to schedule and nothing to reset between frames.
        */}
        {/*
          The display opens the frame full screen, and the strip below chooses
          which frame that is. One action each: the strip changes what is on
          show, the show itself enlarges. Both on one click would be a guess.
        */}
        {/*
          The frame, with its own previous and next on it. They used to be the
          strip's arrows, a screen further down on the right, which is nowhere
          near the thing they turn. These sit on the picture's edges, where a
          hand goes, and the keyboard's arrows do the same while the section is
          on screen.
        */}
        <div
          className="relative w-[min(100%,calc(var(--display-h)*var(--ar)))] max-h-full"
          style={{ aspectRatio: "var(--ar)", ["--ar" as string]: shown.w / shown.h }}
        >
          <button
            type="button"
            onClick={() =>
              viewer.open(
                photos.map<ViewerItem>((photo) => ({
                  kind: "photo",
                  src: photo.src,
                  alt: photo.alt,
                  w: photo.w,
                  h: photo.h,
                })),
                active,
                shoot.label,
              )
            }
            aria-label={`Open full screen: ${shown.alt}`}
            className="absolute inset-0 cursor-pointer"
          >
            <Image
              key={shown.src}
              src={shown.src}
              alt={shown.alt}
              fill
              sizes="(max-width: 768px) 100vw, 72vh"
              priority
              className="animate-[frame-in_0.5s_var(--ease-brand)] object-cover"
            />
          </button>

          {count > 1 ? (
            <>
              <button
                type="button"
                onClick={() => step(-1)}
                aria-label="Previous frame"
                className="carousel-btn carousel-btn--float absolute top-1/2 left-[10px] -translate-y-1/2"
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => step(1)}
                aria-label="Next frame"
                className="carousel-btn carousel-btn--float absolute top-1/2 right-[10px] -translate-y-1/2"
              >
                →
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div className="px-[var(--gutter)]">
        <p className="rule label mt-[1.1em] flex items-baseline justify-between gap-[1.5em] border-t pt-[1.1em] opacity-60">
          <span>{shoot.label}</span>
          <span aria-live="polite">
            {String(active + 1).padStart(2, "0")} / {String(photos.length).padStart(2, "0")}
          </span>
        </p>
      </div>

      <div className="mt-[1.5em]">
        <Carousel
          photos={photos}
          label={shoot.label}
          activeIndex={active}
          onSelect={setActive}
          compact
        />
      </div>
    </section>
  );
}
