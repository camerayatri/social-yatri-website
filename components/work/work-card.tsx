"use client";

import { useCallback, useRef } from "react";
import Image from "next/image";

import type { Photo } from "@/lib/content";
import type { Reel } from "@/lib/reels";
import { claimPlayback } from "@/lib/solo-video";

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
 * Sound is left off. On `Reel` the sound rides the hover because the clip is
 * the thing being looked at; here six covers share a screen and any one of
 * them could be crossed on the way to another.
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

  const onEnter = useCallback(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (ref.current) claimPlayback(ref.current);
    void ref.current?.play().catch(() => {
      /* nothing decoded: the still is already showing and stays. */
    });
  }, []);

  const onLeave = useCallback(() => {
    const video = ref.current;
    if (!video) return;
    video.pause();
    // Back to the first frame, so the next hover starts where the still did
    // rather than part-way through.
    video.currentTime = 0;
  }, []);

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      onMouseEnter={cover.reel ? onEnter : undefined}
      onMouseLeave={cover.reel ? onLeave : undefined}
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
          >
            <source src={cover.reel.src} type="video/mp4" />
          </video>

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
        </>
      ) : null}
    </div>
  );
}
