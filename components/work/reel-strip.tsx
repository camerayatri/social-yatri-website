"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import Reel from "./reel";
import type { Reel as ReelData } from "@/lib/reels";
import { useMediaViewer, type ViewerItem } from "@/components/effects/media-viewer";
import { setClipSound, warmClips } from "@/lib/clip";

/**
 * Cards whose poster is in the server's markup: enough to fill the first
 * screen of the strip on a wide monitor, where a card is about 260px wide.
 */
const POSTERS_UP_FRONT = 6;

/**
 * The cut, not a still of it.
 *
 * These were shot vertically for a feed and they are shown vertically. A 9:16
 * clip dropped into the page's 16:9 hero would lose most of the frame, which is
 * the whole reason this is a shelf of its own rather than a swap.
 *
 * It borrows the shoot carousel's track so the scrolling, snapping and gutter
 * behave identically; with only a handful of clips it simply does not overflow.
 *
 * Nothing plays or makes a noise on its own. A clip you point at plays
 * silently (its light preview, see `lib/clip.ts`) until the switch in the
 * corner is turned on; from then on each one comes up with its audio, from the
 * full file, because these were cut for a feed and half of them are somebody
 * talking. The switch is the only thing on the strip that persists between
 * clips.
 *
 * A click opens the clip full screen, with the rest of the strip to move
 * through: a card this size is a thumbnail of something cut to fill a phone.
 */
export default function ReelStrip({
  reels,
  title = "The reels",
}: {
  reels: ReelData[];
  title?: string;
}) {
  const viewer = useMediaViewer();
  const trackRef = useRef<HTMLDivElement>(null);
  /*
   * Two copies of one fact. The ref is what each card reads at the moment it
   * starts playing, and the state is only there to re-render the label: a card
   * re-rendered mid-clip can drop its playback position.
   */
  // Off until asked for: nothing on the page makes a sound of its own.
  const soundRef = useRef(false);
  const [sound, setSound] = useState(false);

  /*
   * Which cards have earned their poster. The wedding strip is twenty-one
   * clips, and every poster in the markup is fetched on load whether or not
   * the strip is ever scrolled; that was 2.4MB before the reader had done
   * anything. The first few, which fill the screen, are in the server's
   * markup as before. The rest are given theirs as they come within a
   * track's width of the visible part of the strip, and keep it once they
   * have it. The observer's root is the track itself, because the track
   * clips its own overflow and a margin on the viewport would never reach a
   * card hidden off its right edge.
   */
  const [near, setNear] = useState<ReadonlySet<number>>(
    () => new Set(reels.slice(0, POSTERS_UP_FRONT).map((_, i) => i)),
  );
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const slides = Array.from(track.children);
    const observer = new IntersectionObserver(
      (entries) => {
        const hits = entries
          .filter((entry) => entry.isIntersecting)
          .map((entry) => slides.indexOf(entry.target));
        if (!hits.length) return;
        setNear((prev) => {
          if (hits.every((i) => prev.has(i))) return prev;
          const next = new Set(prev);
          hits.forEach((i) => next.add(i));
          return next;
        });
      },
      { root: track, rootMargin: "0px 100%" },
    );
    slides.forEach((slide) => observer.observe(slide));
    return () => observer.disconnect();
  }, [reels]);

  /*
   * Applied straight to the elements as well as to the ref, so a clip that is
   * already running changes at once instead of at its next play: one playing
   * its silent preview moves to the full file at the same moment, with sound.
   */
  const toggle = useCallback(() => {
    const on = !soundRef.current;
    soundRef.current = on;
    setSound(on);
    trackRef.current?.querySelectorAll("video").forEach((video) => setClipSound(video, on));
  }, []);

  const openAt = useCallback(
    (index: number) =>
      viewer.open(
        reels.map<ViewerItem>((reel) => ({
          kind: "video",
          src: reel.src,
          poster: reel.poster,
          alt: reel.alt,
          w: reel.w,
          h: reel.h,
        })),
        index,
        title,
        soundRef.current,
      ),
    [reels, title, viewer],
  );

  if (!reels.length) return null;

  return (
    <section className="pt-[3.5em]">
      <div className="px-[var(--gutter)]">
        <div className="rule mb-[1.5em] flex items-baseline justify-between gap-[1.5em] border-t pt-[1.1em]">
          <h2 className="statement text-[clamp(18px,2vw,28px)]">{title}</h2>

          <div className="label flex shrink-0 items-baseline gap-[0.75em] opacity-60">
            <span>
              {reels.length} {reels.length === 1 ? "clip" : "clips"}
            </span>
            <span aria-hidden>·</span>
            <button
              type="button"
              onClick={toggle}
              aria-pressed={sound}
              // A 44px tap target without moving the label: the padding is
              // pulled back by the same margin.
              className="py-[11px] -my-[11px] underline decoration-transparent decoration-1 underline-offset-[5px] transition-[text-decoration-color,opacity] duration-300 hover:decoration-current hover:opacity-100"
            >
              Sound {sound ? "on" : "off"}
            </button>
          </div>
        </div>
      </div>

      {/*
        The pointer coming onto the strip is the first sign a clip is about to
        be wanted, so that is when the connection to the media store is
        opened.
      */}
      <div
        ref={trackRef}
        onPointerEnter={warmClips}
        className="carousel-track flex gap-[1.5vw] overflow-x-auto px-[var(--gutter)]"
      >
        {reels.map((reel, i) => (
          <figure key={reel.src} className="carousel-slide relative m-0 shrink-0">
            <Reel
              reel={reel}
              soundRef={soundRef}
              showPoster={near.has(i)}
              onOpen={() => openAt(i)}
              className="bg-ink h-full w-auto max-w-none"
            />
          </figure>
        ))}
      </div>
    </section>
  );
}
