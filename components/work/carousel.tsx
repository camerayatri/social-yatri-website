"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";

import type { GalleryPhoto } from "@/lib/gallery";
import { useMediaViewer, type ViewerItem } from "@/components/effects/media-viewer";

/**
 * The width a frame is drawn at, for the browser to pick a file by.
 *
 * Slides are bound by height, not width (see `.carousel-slide` in
 * `globals.css`): the height is `min(clamp(260px, 52vh, 620px), two thirds of
 * the column)`, and the width is that times the frame's aspect, capped at the
 * column. The old figure, 46vw, was the width of the widest landscape frame on
 * a wide screen, so a portrait frame drawn 310px wide fetched a file sized for
 * 660, and a 120px thumbnail under the shoot display did the same. This is the
 * same arithmetic as the stylesheet, per frame. The gutter is left out (it
 * is 16 to 20px), which errs a few pixels wide, never narrow.
 *
 * The vw figures are written with decimals on purpose: `next/image` scans
 * `sizes` for whole-number vw values and drops every width below the
 * smallest one it finds, which would cut the small files a thumbnail wants.
 * The last entry is a plain bound for a browser that cannot read the math
 * functions, which skips an entry it cannot parse rather than failing.
 */
function slideSizes(aspect: number, compact: boolean) {
  const n = (value: number) => value.toFixed(2);
  const width = (lo: number, vh: number, hi: number) =>
    `min(max(${n(aspect * lo)}px, min(${n(aspect * vh)}vh, ${n(aspect * hi)}px)), ${n((aspect * 200) / 3)}vw, 100.00vw)`;
  const normal = width(260, 52, 620);
  const fallback = `${Math.round(aspect * 620)}px`;
  return compact
    ? `(max-width: 991px) ${width(120, 22, 260)}, ${normal}, ${fallback}`
    : `${normal}, ${fallback}`;
}

/**
 * The full set of frames from one shoot, as a horizontal strip.
 *
 * A native overflow scroller with scroll snapping rather than a transformed
 * track, because native scrolling is the only thing that already understands
 * trackpad flicks, touch momentum, arrow keys, Home/End and the screen reader's
 * own navigation. The drag handler below only fills in the mouse, which is the
 * one input native scrolling leaves out.
 *
 * The wheel is deliberately NOT intercepted. Lenis owns vertical scrolling for
 * the page, and a strip that grabs the wheel to advance itself becomes a
 * full-width band you cannot scroll past on a phone: the same trap the option
 * wheel on /work had to be pulled out of.
 *
 * Slides are set to a common height with automatic width, so portrait and
 * landscape frames sit in one strip at their true proportions instead of being
 * cropped into a uniform box.
 */
export default function Carousel({
  photos,
  label,
  eager = 0,
  onSelect,
  activeIndex,
  compact = false,
}: {
  photos: GalleryPhoto[];
  /** Names the set for assistive tech: "Wedding photography, 40 frames". */
  label: string;
  /**
   * Makes each frame promote itself to the display above instead of opening
   * the viewer. Used where there is a display above to promote it to; without
   * it, a frame opens full screen, which is the only sensible meaning a click
   * on a photo has when nothing else on the page would change.
   */
  onSelect?: (index: number) => void;
  /** Which frame is currently showing above, so the strip can mark it. */
  activeIndex?: number;
  /**
   * How many leading frames to load up front. Zero by default, which is right
   * wherever a strip sits below the fold: the archive stacks six of these, and
   * eager-loading even two apiece would put a dozen full-size images on the
   * critical path for a section nobody has scrolled to yet.
   */
  eager?: number;
  /** Thumbnail height below the tablet breakpoint, for a strip under a display. */
  compact?: boolean;
}) {
  const viewer = useMediaViewer();
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  /*
   * Which slide is nearest the left edge, and whether either end is reached.
   *
   * Every measurement is taken against the gutter, not the scrollport: the
   * track is padded so the strip starts on the page's own margin, and
   * `scroll-padding-inline` makes the browser snap to that same line. Measuring
   * from the raw scrollport would put every slide one gutter out.
   */
  const sync = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;

    const pad = parseFloat(getComputedStyle(track).paddingLeft) || 0;
    const slides = Array.from(track.children) as HTMLElement[];
    const left = track.scrollLeft;
    let nearest = 0;
    let best = Infinity;
    slides.forEach((slide, i) => {
      const d = Math.abs(slide.offsetLeft - track.offsetLeft - pad - left);
      if (d < best) {
        best = d;
        nearest = i;
      }
    });
    setIndex(nearest);
    setAtStart(left <= 1);
    // A fractional scrollWidth can leave a pixel on the clock at the far end.
    setAtEnd(left + track.clientWidth >= track.scrollWidth - 2);
  }, []);

  /*
   * When the display above changes frame by its own arrows or the keyboard,
   * the strip brings that frame into view, so the mark for "current" is never
   * off to one side of the strip where it cannot be seen.
   */
  useEffect(() => {
    const track = trackRef.current;
    if (!track || activeIndex === undefined) return;
    const slide = track.children[activeIndex] as HTMLElement | undefined;
    if (!slide) return;
    const pad = parseFloat(getComputedStyle(track).paddingLeft) || 0;
    const left = slide.offsetLeft - track.offsetLeft - pad;
    const right = left + slide.offsetWidth;
    const view = track.scrollLeft;
    if (left < view || right > view + track.clientWidth - pad) {
      track.scrollTo({ left, behavior: "smooth" });
    }
  }, [activeIndex]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    sync();
    track.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    return () => {
      track.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, [sync]);

  const step = useCallback((direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const pad = parseFloat(getComputedStyle(track).paddingLeft) || 0;
    const slides = Array.from(track.children) as HTMLElement[];
    const at = (slide: HTMLElement) => slide.offsetLeft - track.offsetLeft - pad;
    const here = track.scrollLeft;
    const target =
      direction === 1
        ? slides.find((slide) => at(slide) > here + 2)
        : [...slides].reverse().find((slide) => at(slide) < here - 2);
    track.scrollTo({
      left: target ? at(target) : direction === 1 ? track.scrollWidth : 0,
      behavior: "smooth",
    });
  }, []);

  /*
   * Mouse drag. Pointer capture keeps the gesture alive when the cursor leaves
   * the strip, and the threshold below is what separates a drag of the strip
   * from a click on a frame.
   *
   * Capture is taken only once a drag has actually begun, never on the press
   * itself. This is not a nicety. With capture held from pointerdown, the
   * browser delivers the click that follows pointerup to the capturing
   * element, the track, and the button under the cursor never hears it. Every
   * real mouse click on a frame was being swallowed that way; the automated
   * checks passed only because `element.click()` skips pointer events
   * altogether and so never saw the capture.
   */
  const drag = useRef({
    active: false,
    startX: 0,
    startLeft: 0,
    moved: false,
    pointerId: -1,
  });

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    const track = trackRef.current;
    if (!track) return;
    drag.current = {
      active: true,
      startX: event.clientX,
      startLeft: track.scrollLeft,
      moved: false,
      pointerId: event.pointerId,
    };
  };

  /*
   * A drag that ends over a frame must not also open it. The threshold set in
   * `onPointerMove` is what separates the two, and this is read on the click
   * that follows the drag.
   */
  const onSlideClick = (index: number) => {
    if (drag.current.moved) return;
    if (onSelect) {
      onSelect(index);
      return;
    }
    viewer.open(
      photos.map<ViewerItem>((photo) => ({
        kind: "photo",
        src: photo.src,
        alt: photo.alt,
        w: photo.w,
        h: photo.h,
      })),
      index,
      label,
    );
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const track = trackRef.current;
    if (!drag.current.active || !track) return;
    const dx = event.clientX - drag.current.startX;
    // 10px, not 4. A press-and-release on a trackpad routinely travels five or
    // six pixels, and at 4 those clicks were being thrown away as drags.
    if (!drag.current.moved && Math.abs(dx) > 10) {
      drag.current.moved = true;
      // Now it is a drag, and only now, take the pointer so the gesture
      // survives the cursor leaving the strip.
      track.setPointerCapture(event.pointerId);
    }
    if (drag.current.moved) track.scrollLeft = drag.current.startLeft - dx;
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const track = trackRef.current;
    if (!drag.current.active || !track) return;
    drag.current.active = false;
    if (track.hasPointerCapture(event.pointerId)) {
      track.releasePointerCapture(event.pointerId);
    }
  };

  if (!photos.length) return null;

  return (
    <section
      className={compact ? "carousel--compact relative" : "relative"}
      aria-roledescription="carousel"
      aria-label={`${label}, ${photos.length} frames`}
    >
      <div
        ref={trackRef}
        tabIndex={0}
        className="carousel-track flex gap-[1.5vw] overflow-x-auto px-[var(--gutter)] focus-visible:outline-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {photos.map((photo, i) => {
          const active = i === activeIndex;
          const frame = (
            <Image
              src={photo.src}
              alt={photo.alt}
              width={photo.w}
              height={photo.h}
              sizes={slideSizes(photo.w / photo.h, compact)}
              loading={i < eager ? "eager" : "lazy"}
              draggable={false}
              className="h-full w-auto max-w-none object-cover select-none"
            />
          );

          return (
            <figure
              key={photo.src}
              className="carousel-slide relative m-0 shrink-0"
              aria-label={`${i + 1} of ${photos.length}`}
            >
              <button
                type="button"
                onClick={() => onSlideClick(i)}
                aria-current={onSelect && active ? "true" : undefined}
                aria-label={
                  onSelect
                    ? `Show frame ${i + 1}: ${photo.alt}`
                    : `Open frame ${i + 1} full screen: ${photo.alt}`
                }
                className={`block h-full cursor-pointer transition-opacity duration-500 ${
                  onSelect && !active ? "opacity-55 hover:opacity-100" : "opacity-100"
                }`}
                style={{ transitionTimingFunction: "var(--ease-brand)" }}
              >
                {frame}
              </button>
            </figure>
          );
        })}
      </div>

      {/*
        Index and controls together on the right. They started on opposite ends
        of the row, but the fixed corner button owns the bottom-left of the
        viewport and sat straight on top of the index whenever this row happened
        to scroll past it.
      */}
      <div className="mt-[1.1em] flex items-center justify-end gap-[1.5em] px-[var(--gutter)]">
        <p className="label opacity-60" aria-live="polite">
          {String(index + 1).padStart(2, "0")} / {String(photos.length).padStart(2, "0")}
        </p>

        <div className="flex gap-[0.75em]">
          <button
            type="button"
            onClick={() => step(-1)}
            disabled={atStart}
            aria-label="Previous frame"
            className="carousel-btn"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => step(1)}
            disabled={atEnd}
            aria-label="Next frame"
            className="carousel-btn"
          >
            →
          </button>
        </div>
      </div>
    </section>
  );
}
