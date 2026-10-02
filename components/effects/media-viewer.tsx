"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Image, { getImageProps } from "next/image";

import { getLenis } from "@/components/effects/smooth-scroll";
import { posterSrc } from "@/lib/media";
import { claimPlayback } from "@/lib/solo-video";

/**
 * One thing the viewer can show. Photos carry their own source; clips carry a
 * poster as well, so the frame is up before the file has decoded.
 */
export type ViewerItem = {
  kind: "photo" | "video";
  src: string;
  poster?: string;
  alt: string;
  w: number;
  h: number;
};

type ViewerContextValue = {
  /**
   * Open the viewer on `items`, starting at `index`. `label` names the set it
   * came from, which is the only caption shown: the frame is on screen, so
   * the reader does not need it described to them. `sound` is whether the
   * strip's switch was on: nothing plays with sound unless the reader has
   * asked for it, and the viewer's own controls can turn it on from there.
   */
  open: (items: ViewerItem[], index: number, label?: string, sound?: boolean) => void;
};

const ViewerContext = createContext<ViewerContextValue | null>(null);

/**
 * Opens the full-screen viewer. Safe to call from anywhere under the provider;
 * a component outside it gets a no-op rather than a crash, so a strip rendered
 * in isolation (a test, a story) still works.
 */
export function useMediaViewer(): ViewerContextValue {
  return useContext(ViewerContext) ?? { open: () => {} };
}

type State = { items: ViewerItem[]; index: number; label?: string; sound: boolean } | null;

/**
 * The full-screen viewer: one frame at a time, at its own proportions, over a
 * dimmed page.
 *
 * The behaviour people already know from a phone's photo app, because that is
 * what a reader expects the moment an image goes full screen: arrow keys and
 * on-screen chevrons to move, a swipe to move on touch, Escape or the
 * backdrop or the close button to leave, and a counter so the set has a size.
 *
 * Deliberately `contain` and never `cover`. Everywhere else on the site frames
 * are cropped to fit a layout; this is the one place whose whole purpose is to
 * show the photographer's actual frame, so nothing is cut off here.
 *
 * Three things that are easy to leave out and are the difference between a
 * modal and a trap: the page underneath does not scroll while it is open
 * (Lenis owns that scroll, so it has to be told, not just overflow-hidden),
 * focus moves into the dialog and returns to whatever opened it, and the
 * neighbours either side are prefetched so a press of the arrow key is
 * instant rather than a flash of empty.
 */
export default function MediaViewerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const open = useCallback((items: ViewerItem[], index: number, label?: string, sound = false) => {
    if (!items.length) return;
    returnTo.current = document.activeElement as HTMLElement | null;
    setState({ items, index: Math.min(Math.max(index, 0), items.length - 1), label, sound });
  }, []);

  const close = useCallback(() => {
    setState(null);
    // Back to the frame that opened it, so a keyboard reader does not land at
    // the top of the document having lost their place in a forty-frame strip.
    returnTo.current?.focus?.();
    returnTo.current = null;
  }, []);

  const step = useCallback((direction: 1 | -1) => {
    setState((current) => {
      if (!current) return current;
      const count = current.items.length;
      // Wraps. A set this size has no meaningful start or end, and stopping
      // dead at frame 40 of 40 reads as broken rather than as a boundary.
      return { ...current, index: (current.index + direction + count) % count };
    });
  }, []);

  /* Page scroll, keyboard, and the focus that belongs to the dialog. */
  useEffect(() => {
    if (!state) return;

    const lenis = getLenis();
    lenis?.stop();
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    closeRef.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        step(1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        step(-1);
      } else if (event.key === " " || event.key.toLowerCase() === "m") {
        // The clip's own controls are pointer-only (see the video below), so
        // the keyboard gets play and mute here. A focused button keeps Space
        // for itself.
        const video = dialogRef.current?.querySelector<HTMLVideoElement>("video");
        const onButton = document.activeElement instanceof HTMLButtonElement;
        if (!video || onButton) return;
        event.preventDefault();
        if (event.key === " ") {
          if (video.paused) void video.play().catch(() => {});
          else video.pause();
        } else {
          video.muted = !video.muted;
        }
      } else if (event.key === "Tab") {
        // A small, explicit trap. The dialog holds four controls at most, so
        // cycling them by hand is simpler and steadier than a generic
        // focusable-node sweep over arbitrary content.
        // The scrim is a button for pointer users only (tabindex -1), so it
        // must not become a dead stop in the cycle.
        const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]):not([tabindex="-1"])',
        );
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      lenis?.start();
    };
  }, [state, close, step]);

  /*
   * Start the clip, silent unless the switch it came from was on, and settle
   * for silence rather than nothing.
   *
   * A browser only allows unmuted playback off a trusted gesture. Opening the
   * viewer is one, so a requested sound usually succeeds; but the same viewer
   * is reachable from a keyboard press and from a restored session, where it
   * is not, and an outright rejection would leave a still frame and a play
   * button under a reader who has already said they want to watch it. So: on
   * refusal play it muted, which the controls let them undo.
   */
  const videoRef = useRef<HTMLVideoElement>(null);
  const shownSrc = state ? state.items[state.index]?.src : null;
  const shownKind = state ? state.items[state.index]?.kind : null;
  const shownSound = state ? state.sound : false;

  useEffect(() => {
    if (shownKind !== "video") return;
    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;
    const start = async () => {
      claimPlayback(video);
      video.muted = !shownSound;
      try {
        await video.play();
      } catch {
        if (cancelled) return;
        video.muted = true;
        try {
          await video.play();
        } catch {
          /* nothing decoded: the poster stays and the controls are there. */
        }
      }
    };
    void start();
    return () => {
      cancelled = true;
    };
  }, [shownSrc, shownKind, shownSound]);

  /*
   * The neighbours, fetched but not shown, so an arrow key lands on a decoded
   * frame instead of a gap. Photos only: a clip is several megabytes and is
   * not worth pulling down on the chance of a press.
   *
   * Detached images rather than hidden `<Image>`s. The hidden ones never
   * loaded at all: they were lazy, and a lazy image inside `display: none`
   * is never near the viewport, so the browser never asks for it. A detached
   * image fetches the moment it is given a source, and given the same srcset
   * and sizes as the frame it stands in for (from `getImageProps`, with the
   * props the stage passes) it picks the same file the stage will, so the
   * press finds it in the cache.
   */
  const items = state?.items;
  const at = state?.index ?? 0;
  const prefetched = useRef<HTMLImageElement[]>([]);
  useEffect(() => {
    if (!items || items.length < 2) return;
    prefetched.current = [-1, 1].flatMap((offset) => {
      const near = items[(at + offset + items.length) % items.length];
      if (!near || near.kind !== "photo") return [];
      const { props } = getImageProps({
        src: near.src,
        alt: "",
        width: near.w,
        height: near.h,
        sizes: "100vw",
      });
      const img = new window.Image();
      img.decoding = "async";
      if (props.sizes) img.sizes = props.sizes;
      if (props.srcSet) img.srcset = props.srcSet;
      img.src = props.src;
      return [img];
    });
  }, [items, at]);

  /*
   * Swipe. Only a decisive, mostly-horizontal gesture counts: a vertical drag
   * is somebody trying to scroll the page they can see behind the frame, and a
   * short one is a tap that wobbled.
   */
  const touch = useRef({ x: 0, y: 0 });
  const onTouchStart = (event: React.TouchEvent) => {
    touch.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
  };
  const onTouchEnd = (event: React.TouchEvent) => {
    const dx = event.changedTouches[0].clientX - touch.current.x;
    const dy = event.changedTouches[0].clientY - touch.current.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1);
  };

  const shown = state ? state.items[state.index] : null;
  const many = (state?.items.length ?? 0) > 1;

  return (
    <ViewerContext.Provider value={{ open }}>
      {children}

      {state && shown ? (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={`${shown.alt}. ${state.index + 1} of ${state.items.length}`}
          className="viewer"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {/*
            The backdrop is its own element rather than a click handler on the
            dialog: that way a click that starts on the frame and ends outside
            it (a fumbled drag) cannot close the viewer by accident.
          */}
          <button
            type="button"
            className="viewer__scrim"
            aria-label="Close viewer"
            tabIndex={-1}
            onClick={close}
          />

          <div className="viewer__bar">
            {/*
              The set and the position in it. Not the alt text: that is written
              for somebody who cannot see the frame, and printing it under the
              frame tells a reader who can see it what they are already looking
              at. It stays on the element, where it belongs.
            */}
            <p className="label-xs flex items-baseline gap-[0.75em] opacity-70">
              {state.label ? <span>{state.label}</span> : null}
              {state.label ? <span aria-hidden>·</span> : null}
              <span aria-live="polite">
                {String(state.index + 1).padStart(2, "0")} /{" "}
                {String(state.items.length).padStart(2, "0")}
              </span>
            </p>
            <button
              ref={closeRef}
              type="button"
              onClick={close}
              aria-label="Close"
              className="viewer__btn"
            >
              ✕
            </button>
          </div>

          <div className="viewer__stage">
            {shown.kind === "video" ? (
              <video
                // Keyed on the source so moving between clips mounts a fresh
                // element rather than re-pointing a playing one, which leaves
                // the old frame on screen until the new file decodes.
                key={shown.src}
                ref={videoRef}
                src={shown.src}
                poster={shown.poster ? posterSrc(shown.poster) : undefined}
                controls
                // Not a tab stop: once focus is inside Chrome's native media
                // controls no key event reaches the page, so Escape and the
                // arrows would die there. The controls stay for the pointer;
                // the keyboard gets Space and M from the handler above.
                tabIndex={-1}
                loop
                playsInline
                aria-label={shown.alt}
                className="viewer__media"
                style={{ aspectRatio: `${shown.w} / ${shown.h}` }}
              />
            ) : (
              <Image
                key={shown.src}
                src={shown.src}
                alt={shown.alt}
                width={shown.w}
                height={shown.h}
                sizes="100vw"
                // Wanted now, ahead of anything else: the reader just asked
                // for it. Not `preload`, which adds a <link> to the head and
                // is for an image on the page as it loads, not one opened
                // later.
                loading="eager"
                fetchPriority="high"
                className="viewer__media"
              />
            )}
          </div>

          {many ? (
            <>
              <button
                type="button"
                onClick={() => step(-1)}
                aria-label="Previous"
                className="viewer__btn viewer__nav viewer__nav--prev"
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => step(1)}
                aria-label="Next"
                className="viewer__btn viewer__nav viewer__nav--next"
              >
                →
              </button>
            </>
          ) : null}

        </div>
      ) : null}
    </ViewerContext.Provider>
  );
}
