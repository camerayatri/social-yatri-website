"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type RefObject,
} from "react";
import { getImageProps } from "next/image";

import type { Reel as ReelData } from "@/lib/reels";
import { pauseClip, playClip, useClip, warmClips } from "@/lib/clip";
import { slideSizes } from "./carousel";
import Buffering from "./buffering";
import Veil from "./veil";

/**
 * One of the client's clips. Nothing plays, and nothing makes a sound, until it
 * is asked for.
 *
 * Hovering starts it, muted unless the strip's switch is on; leaving stops it.
 * A click opens it full screen in the viewer, which is also the whole story
 * on a touch screen, where there is no hover to give.
 *
 * Click used to latch the clip playing in place. It was the wrong thing for a
 * card 200px wide holding footage cut for a phone: the reader had asked to
 * watch it, and the answer was to keep it small. Opening it is the answer to
 * the same question.
 *
 * Nothing is fetched until it is wanted either. The `<video>` has no source
 * until the first hover (`lib/clip.ts` attaches one: the silent preview while
 * the sound is off, the full file once it is on) and lets it go again when
 * the card leaves the screen. A touch never starts it: a tap is a click, and
 * the click opens the viewer, so playing the card under the finger as well
 * would download the same clip twice.
 *
 * What shows before then is the clip's poster, a real frame cut from its first
 * second, as an image over the video rather than the video's `poster`: an
 * image can carry a srcset, so a card drawn 260px wide on a desktop is sent a
 * 384px frame instead of the 750px one a phone needs. It lifts once footage is
 * painting and stays lifted, so a card left mid-clip keeps the frame it stopped
 * on, as it always did; it comes back only when the card has been let go. A
 * strip holds it back (`showPoster`) for a card nowhere near the screen, and
 * the veil draws the frame's own colours in the meantime. The declared aspect
 * ratio keeps the box its size either way.
 *
 * It is a button, not a bare video, because it does something when you click
 * it: that gets keyboard operation and a screen-reader label for free.
 */
export default function Reel({
  reel,
  className,
  /**
   * What a click opens. Given the whole strip and this card's place in it, so
   * the viewer can move between clips; without it the card opens just itself.
   */
  onOpen,
  /**
   * The strip's master switch, held as a ref rather than a prop value so
   * flipping it does not re-render every card. A re-rendered `<video>` can drop
   * its playback position, and the switch only needs to be read at the moment
   * playback starts.
   */
  soundRef,
  /**
   * Whether to give the card its poster yet. A strip of twenty clips turns
   * this on as each card comes near the screen, rather than fetching twenty
   * frames for a row the reader may never scroll along.
   */
  showPoster = true,
}: {
  reel: ReelData;
  className?: string;
  onOpen?: () => void;
  soundRef?: RefObject<boolean>;
  showPoster?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const stalled = useClip(ref, reel.src);

  /*
   * Whether footage has painted since the clip was last attached: the poster
   * lifts on the first frame and returns when the card is let go.
   */
  const [shown, setShown] = useState(false);

  /*
   * Subscribed rather than sampled once: a reader who turns reduced motion on
   * while the page is open should have the loops stop, not have to reload. It
   * reports false during server rendering, which is the only honest answer
   * before there is a window to ask.
   */
  const reduced = useSyncExternalStore(
    useCallback((notify: () => void) => {
      const query = window.matchMedia("(prefers-reduced-motion: reduce)");
      query.addEventListener("change", notify);
      return () => query.removeEventListener("change", notify);
    }, []),
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );

  useEffect(() => {
    if (reduced && ref.current) pauseClip(ref.current);
  }, [reduced]);

  const start = () => {
    if (reduced || !ref.current) return;
    void playClip(ref.current, soundRef?.current ?? false);
  };
  const stop = () => {
    if (ref.current) pauseClip(ref.current);
  };
  const onOpenClick = () => {
    // Stop the card's own copy before handing over: two of the same clip
    // playing at once, one of them behind a scrim, is audible.
    stop();
    onOpen?.();
  };

  const poster = showPoster
    ? getImageProps({
        src: reel.poster,
        alt: "",
        width: reel.w,
        height: reel.h,
        sizes: slideSizes(reel.w / reel.h),
        quality: 75,
      }).props
    : null;

  return (
    <button
      type="button"
      onClick={onOpenClick}
      onPointerEnter={(event) => {
        if (event.pointerType !== "touch") start();
      }}
      onPointerLeave={(event) => {
        if (event.pointerType !== "touch") stop();
      }}
      onPointerDown={warmClips}
      // The keyboard's hover. A tap focuses the button too, and must not
      // start the card under the finger, so only a visible focus counts.
      onFocus={(event) => {
        if (event.currentTarget.matches(":focus-visible")) start();
      }}
      onBlur={stop}
      aria-label={`Open full screen: ${reel.alt}`}
      /*
       * The aspect ratio has to be declared. With no source attached the
       * video never reports its intrinsic size, so a width derived from the
       * element would collapse to the 300x150 default until somebody pressed
       * play.
       */
      style={{ aspectRatio: `${reel.w} / ${reel.h}` }}
      className={`group relative block cursor-pointer overflow-hidden ${className ?? ""}`}
    >
      <video
        ref={ref}
        // `muted` is the honest starting state and is what makes the first
        // `play()` permissible at all; `playClip` raises it when asked.
        muted
        loop
        playsInline
        preload="none"
        tabIndex={-1}
        aria-hidden
        onPlaying={() => setShown(true)}
        // Only a card that has been let go gets its poster back; a source
        // swapped mid-play (the sound switch) empties the element too.
        onEmptied={(event) => {
          if (!event.currentTarget.hasAttribute("src")) setShown(false);
        }}
        className="h-full w-full object-cover"
      />

      {poster ? (
        /* eslint-disable-next-line @next/next/no-img-element -- the props are next/image's own, from getImageProps */
        <img
          {...poster}
          alt=""
          aria-hidden
          loading="lazy"
          decoding="async"
          draggable={false}
          // Inline, because the strip's slide rule (`.carousel-slide img`,
          // unlayered) would otherwise size it as a frame of its own.
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            maxWidth: "none",
            objectFit: "cover",
            opacity: shown ? 0 : 1,
          }}
          className="pointer-events-none"
        />
      ) : null}
      <Veil key={`${reel.poster}:${showPoster}`} src={reel.poster} />

      {/*
        A poster with no affordance reads as a broken image, so the card says
        what it is. It clears on hover, because by then the motion is the
        affordance and the word is in the way of the frame.
      */}
      <span
        aria-hidden
        className="label-xs text-paper bg-ink/55 pointer-events-none absolute bottom-[0.9em] left-[0.9em] flex items-center gap-[0.5em] rounded-full py-[0.35em] pr-[0.8em] pl-[0.4em] opacity-90 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-0"
      >
        <span className="border-paper/70 flex h-[22px] w-[22px] items-center justify-center rounded-full border text-[9px] leading-none">
          ▶
        </span>
        Watch
      </span>
      <Buffering show={stalled} />
    </button>
  );
}
