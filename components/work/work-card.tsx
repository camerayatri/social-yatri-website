"use client";

import { useCallback, useRef } from "react";
import Image from "next/image";

import type { Photo } from "@/lib/content";
import type { Reel } from "@/lib/reels";
import { pauseClip, playClip, useClip } from "@/lib/clip";
import Buffering from "./buffering";
import Veil from "./veil";

/**
 * A category's cover on the work wall.
 *
 * The still is the client's designed cover, or the clip's own first second
 * where they sent none, so the card is never empty and never jumps; pointing
 * at it starts the clip over the top, and leaving stops it and puts the still
 * back. The clip is 9:16 and the card takes the cover's shape, so on hover the
 * clip is cropped to the card: the still is the thing being framed, the clip
 * is what moves behind it.
 *
 * It is a plain div and not a button the way `Reel` is. This card sits inside
 * the link to the category, and a button inside a link is neither one thing
 * nor the other for a keyboard or a screen reader. So the clip here is
 * decoration on a link: hovering plays it, the keyboard gets the link, and the
 * clip itself is never the only way to reach anything.
 *
 * Sound is left off: there is no switch here, six covers share a screen and
 * any one of them could be crossed on the way to another. So the clip is the
 * reel's silent preview where it has one (`lib/clip.ts`), a fraction of the
 * full file, and it is let go when the card leaves the screen.
 *
 * While the still is loading, the veil holds its colours in the frame.
 */
export default function WorkCard({
  cover,
  sizes = "(max-width: 768px) 100vw, 33vw",
  preload = false,
}: {
  cover: Photo & { reel?: Reel };
  sizes?: string;
  preload?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const stalled = useClip(ref, cover.reel?.src ?? "");

  /*
   * A mouse or a pen only. A tap is the link's click, which turns the page
   * over; starting the clip under the finger on the way would only fetch it.
   */
  const onEnter = useCallback((event: React.PointerEvent) => {
    if (event.pointerType === "touch") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (ref.current) void playClip(ref.current, false);
  }, []);

  const onLeave = useCallback((event: React.PointerEvent) => {
    if (event.pointerType === "touch") return;
    const video = ref.current;
    if (!video) return;
    pauseClip(video);
    // Back to the first frame, so the next hover starts where the still did
    // rather than part-way through.
    if (video.hasAttribute("src")) video.currentTime = 0;
  }, []);

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      onPointerEnter={cover.reel ? onEnter : undefined}
      onPointerLeave={cover.reel ? onLeave : undefined}
    >
      <Image
        src={cover.src}
        alt={cover.alt}
        fill
        sizes={sizes}
        preload={preload}
        className="object-cover transition-transform duration-[900ms] group-hover:scale-[1.03]"
        style={{
          transitionTimingFunction: "var(--ease-brand)",
          objectPosition: cover.focus,
        }}
      />
      <Veil key={cover.src} src={cover.src} />

      {cover.reel ? (
        <>
          <video
            ref={ref}
            muted
            loop
            playsInline
            preload="none"
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          />

          {/* Says the card is footage before anyone points at it. */}
          <span
            aria-hidden
            className="label-xs text-paper bg-ink/55 pointer-events-none absolute bottom-[0.9em] left-[0.9em] flex items-center gap-[0.5em] rounded-full py-[0.35em] pr-[0.8em] pl-[0.4em] opacity-90 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-0"
          >
            <span className="border-paper/70 flex h-[22px] w-[22px] items-center justify-center rounded-full border text-[9px] leading-none">
              ▶
            </span>
            Play
          </span>
          <Buffering show={stalled} />
        </>
      ) : null}
    </div>
  );
}
