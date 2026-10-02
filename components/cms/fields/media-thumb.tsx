"use client";

import { useEffect, useRef, useState } from "react";
import { media } from "@/lib/media";

/**
 * Small pictures of media for the editors, so nobody has to pick a clip or a
 * photograph by its file name.
 *
 * Thumbnails load lazily and decode off the main thread: a shoot can hold
 * forty photographs and the reel lists run to a dozen posters, and only the
 * ones on screen should cost anything. Paths are passed through `media()`, so
 * a shipped `/img/...` file shows from the media store the site uses.
 */

export function Thumb({
  src,
  ratio,
  className = "",
  fit = "cover",
}: {
  src: string | null | undefined;
  /** Width over height. Without it the box is square. */
  ratio?: number;
  className?: string;
  fit?: "cover" | "contain";
}) {
  const [failed, setFailed] = useState<string | null>(null);
  const broken = !!src && failed === src;
  return (
    <span
      className={`bg-ink/6 relative block w-full overflow-hidden rounded-[6px] ${className}`}
      style={{ aspectRatio: ratio ? String(ratio) : "1" }}
    >
      {src && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={media(src)}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(src)}
          className={`absolute inset-0 size-full ${fit === "contain" ? "object-contain" : "object-cover"}`}
        />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center p-2 text-center text-[12px] opacity-55">
          {broken ? "Can't load the preview" : "No preview"}
        </span>
      )}
    </span>
  );
}

/** Durations already read in this tab, so a reorder or a revisit doesn't fetch them again. */
const durations = new Map<string, number>();

/**
 * A clip's length as `0:42`. The library knows it for uploads; for clips that
 * shipped with the site it is read from the file's header, and only once the
 * card scrolls into view (a metadata request is a few kilobytes, not the clip).
 */
export function Duration({ src, known, className = "" }: { src: string; known?: number | null; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [read, setRead] = useState<number | null>(() => durations.get(src) ?? null);
  const seconds = known ?? read;

  useEffect(() => {
    if (known || durations.has(src) || !ref.current) return;
    const el = ref.current;
    let video: HTMLVideoElement | null = null;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      observer.disconnect();
      video = document.createElement("video");
      video.preload = "metadata";
      video.muted = true;
      video.onloadedmetadata = () => {
        if (video && Number.isFinite(video.duration)) {
          durations.set(src, video.duration);
          setRead(video.duration);
        }
        video?.removeAttribute("src");
        video?.load();
      };
      video.src = media(src);
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
      if (video) {
        video.onloadedmetadata = null;
        video.removeAttribute("src");
      }
    };
  }, [src, known]);

  return (
    <span ref={ref} className={className}>
      {seconds ? formatDuration(seconds) : "video"}
    </span>
  );
}

export function formatDuration(seconds: number) {
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
