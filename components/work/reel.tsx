"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useSyncExternalStore,
  type RefObject,
} from "react";

import type { Reel as ReelData } from "@/lib/reels";
import { posterSrc } from "@/lib/media";
import { claimPlayback } from "@/lib/solo-video";

/**
 * One of the client's clips. Nothing plays, and nothing makes a sound, until it
 * is asked for.
 *
 * Hovering starts it with the sound up; leaving stops it. A click opens it full
 * screen in the viewer, which is also the whole story on a touch screen, where
 * there is no hover to give.
 *
 * Click used to latch the clip playing in place. It was the wrong thing for a
 * card 200px wide holding footage cut for a phone: the reader had asked to
 * watch it, and the answer was to keep it small. Opening it is the answer to
 * the same question.
 *
 * Sound riding the hover is the reason `play()` has a fallback. A browser only
 * permits unmuted playback once the page has had a real user gesture, and a
 * hover is not one: before the visitor has clicked anything, an unmuted `play()`
 * is rejected outright. Rather than track gestures and guess, the call simply
 * tries with sound, and on rejection retries muted so the clip still plays. The
 * first click anywhere lifts the restriction and every hover after it has
 * audio.
 *
 * Nothing is fetched until it is wanted either: `preload="none"` means the only
 * thing on the wire is the poster, which is a real frame cut from the clip, so
 * the box is never empty and never jumps. The poster goes through the image
 * optimizer, and a strip can hold it back (`showPoster`) for a card that is
 * nowhere near the screen: the declared aspect ratio keeps the box its size
 * either way.
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
   * Whether to give the video its poster yet. A strip of twenty clips turns
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
    if (reduced) ref.current?.pause();
  }, [reduced]);

  const play = useCallback(async () => {
    const video = ref.current;
    if (!video) return;
    claimPlayback(video);
    video.muted = soundRef ? !soundRef.current : true;
    try {
      await video.play();
    } catch {
      // Unmuted playback refused for want of a gesture. Play it silently rather
      // than not at all; the next hover after any click will have sound.
      video.muted = true;
      try {
        await video.play();
      } catch {
        /* decode failure or a policy we did not anticipate: leave the poster. */
      }
    }
  }, [soundRef]);

  const onEnter = () => {
    if (reduced) return;
    void play();
  };
  const onLeave = () => {
    ref.current?.pause();
  };
  const onOpenClick = () => {
    // Stop the card's own copy before handing over: two of the same clip
    // playing at once, one of them behind a scrim, is audible.
    ref.current?.pause();
    onOpen?.();
  };

  return (
    <button
      type="button"
      onClick={onOpenClick}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={onEnter}
      onBlur={onLeave}
      aria-label={`Open full screen: ${reel.alt}`}
      /*
       * The aspect ratio has to be declared. With `preload="none"` the video
       * never reports its intrinsic size, so a width derived from the element
       * would collapse to the 300x150 default until somebody pressed play.
       */
      style={{ aspectRatio: `${reel.w} / ${reel.h}` }}
      className={`group relative block cursor-pointer overflow-hidden ${className ?? ""}`}
    >
      <video
        ref={ref}
        poster={showPoster ? posterSrc(reel.poster) : undefined}
        // `muted` is the honest starting state and is what makes the first
        // `play()` permissible at all; the call above raises it when asked.
        muted
        loop
        playsInline
        preload="none"
        tabIndex={-1}
        aria-hidden
        className="h-full w-full object-cover"
      >
        <source src={reel.src} type="video/mp4" />
      </video>

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
    </button>
  );
}
