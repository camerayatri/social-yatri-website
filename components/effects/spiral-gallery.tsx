"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type RefObject } from "react";
import { useGSAP } from "@gsap/react";

import { getImageProps } from "next/image";

import type { ShowreelClip } from "@/lib/reels";
import { gsap } from "@/lib/gsap";
import { pauseClip, playClip, useClip, warmClips } from "@/lib/clip";
import { useMediaViewer, type ViewerItem } from "@/components/effects/media-viewer";
import Buffering from "@/components/work/buffering";
import Veil from "@/components/work/veil";

/**
 * How wide a card is drawn, for the cover's srcset: the card's own width
 * rule (`w-[min(19.5vw,300px)]`, 29vw below the tablet breakpoint, 40vw on a
 * phone) written out for the browser.
 */
const CARD_SIZES = "(max-width: 767px) 40vw, (max-width: 991px) 29vw, min(19.5vw, 300px)";

/**
 * The spiral.
 *
 * Every poster sits on a helix: card `i` is `i` steps around the axis and `i`
 * steps down it. Scrolling advances the whole helix by `N - 1` steps, so each
 * card in turn arrives at the front, flat to the viewer, while the ones either
 * side are turned away like pages of a carousel. The section is pinned for the
 * duration and the motion is scrubbed, so the helix is exactly as far along as
 * the reader is.
 *
 * It also turns on its own. The helix wraps modulo the card count, which makes
 * it endless, and a looping tween walks it forward whenever the section is on
 * screen (so the spiral is alive before anybody touches the page, and scroll
 * steers something already in motion rather than starting it.
 *
 * The scene is translated back by the helix radius so the front card sits at
 * z = 0) at the perspective's natural size: rather than being blown up by
 * being nearer the camera than the page.
 */

/** Degrees between neighbouring cards around the axis. */
const STEP_DEG = 45;
/** Vertical distance between neighbouring cards, in viewport-height units. */
const PITCH_VH = 22;
const PITCH_VH_MOBILE = 30;
/** Radius of the helix, as a fraction of the viewport width. */
const RADIUS_VW = 0.34;
const RADIUS_VW_MOBILE = 0.62;
/**
 * The gap the helix keeps between neighbouring cards, as a multiple of a card's
 * width. The radius is raised until the chord between two neighbours clears
 * this, so a card that is wide relative to its viewport (which is every card
 * on a phone) pushes the helix open instead of overlapping the cards beside it.
 */
const CLEARANCE = 1.08;
/** Cards this far round the back are hidden rather than drawn mirrored. */
const HIDE_BEYOND_DEG = 118;
const HIDE_BEYOND_DEG_MOBILE = 96;
/** How much scroll the pinned section consumes, per card. */
const SCROLL_PER_CARD_VH = 55;
/**
 * Seconds a card takes to hand its place to the next one while nobody is
 * scrolling. Slow enough to read as drift rather than as a carousel advancing.
 */
const SECONDS_PER_CARD = 4.5;

export default function SpiralGallery({
  clips,
  onProgress,
  soundRef,
}: {
  clips: ShowreelClip[];
  /** Called with the scrub position, 0 at the top of the pin, 1 at release. */
  onProgress?: (p: number) => void;
  /**
   * The hero's sound switch, read by each card at the moment it starts. A ref
   * rather than a value so flipping it does not re-render nine videos.
   */
  soundRef?: RefObject<boolean>;
}) {
  const viewer = useMediaViewer();
  // The whole reel goes to the viewer, so the arrows there move through it.
  const items = clips.map<ViewerItem>((clip) => ({
    kind: "video",
    src: clip.src,
    poster: clip.poster,
    alt: clip.alt,
    w: clip.w,
    h: clip.h,
  }));
  // Kept in a ref so the scrub's onUpdate always calls the latest callback
  // without the timeline having to be rebuilt; synced in an effect rather than
  // during render, which React's ref rules forbid.
  const progressRef = useRef(onProgress);
  useEffect(() => {
    progressRef.current = onProgress;
  }, [onProgress]);
  const root = useRef<HTMLDivElement>(null);
  const scene = useRef<HTMLDivElement>(null);
  /*
   * The helix holds still while a card is being watched. Without it the clip
   * you pointed at rotates away mid-shot, which makes the hover feel like a
   * mistake rather than a control.
   */
  const loopRef = useRef<gsap.core.Tween | null>(null);

  useGSAP(
    () => {
      const wrap = root.current;
      const stage = scene.current;
      if (!wrap || !stage) return;

      const cards = gsap.utils.toArray<HTMLElement>(stage.querySelectorAll("[data-spiral-card]"));
      const count = cards.length;
      if (!count) return;

      // Two independent contributions to the same helix: `p` is how far the
      // reader has scrolled through the pin, `drift` is the loop that runs on
      // its own. They are summed, so scrolling steers a spiral that is already
      // turning instead of fighting it.
      const state = { p: 0 };
      const drift = { v: 0 };

      const layout = () => {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const mobile = vw < 768;

        // The card's rendered width is an input, not an assumption: the chord
        // between two neighbours has to clear it or the spiral collides.
        const cardW = cards[0].offsetWidth || vw * 0.3;
        const minRadius =
          (cardW * CLEARANCE) / (2 * Math.sin((STEP_DEG * Math.PI) / 360));
        const radius = Math.max(vw * (mobile ? RADIUS_VW_MOBILE : RADIUS_VW), minRadius);
        const pitch = (vh * (mobile ? PITCH_VH_MOBILE : PITCH_VH)) / 100;
        const hideBeyond = mobile ? HIDE_BEYOND_DEG_MOBILE : HIDE_BEYOND_DEG;

        stage.style.transform = `translateZ(${-radius}px)`;

        cards.forEach((card, i) => {
          /*
           * Position along the helix, in card-steps, relative to the front,
           * wrapped into a window centred on zero so the spiral has no ends.
           *
           * The wrap is what makes the loop possible: without it `drift` would
           * march every card off the bottom of the helix and never bring one
           * back. A card crosses the seam at +/- count/2 steps, which at 45
           * degrees a step is far beyond the angle at which cards are already
           * hidden, so the recycling is never seen.
           */
          let t = i - state.p * (count - 1) - drift.v;
          t = ((t % count) + count) % count;
          if (t > count / 2) t -= count;
          const angle = t * STEP_DEG;
          const y = t * pitch;
          const visible = Math.abs(angle) < hideBeyond;

          // Cards further round the helix recede in opacity as well as depth,
          // which is what stops the back of the spiral reading as clutter.
          const fade = 1 - Math.min(1, Math.abs(angle) / hideBeyond) * 0.75;

          card.style.transform =
            `translate(-50%, -50%) translateY(${y.toFixed(1)}px) ` +
            `rotateY(${angle.toFixed(2)}deg) translateZ(${radius.toFixed(1)}px) ` +
            `rotate(${(t * 1.6).toFixed(2)}deg)`;
          card.style.opacity = visible ? fade.toFixed(3) : "0";
          card.style.visibility = visible ? "visible" : "hidden";
          card.style.zIndex = String(Math.round(1000 - Math.abs(angle) * 10));
        });

        progressRef.current?.(state.p);
      };

      layout();

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) return;

      // The loop. One full cycle is `count` steps, and because the wrap above
      // is modulo `count`, the tween restarting at zero lands on exactly the
      // position it left, so the repeat is seamless.
      const loop = gsap.to(drift, {
        v: count,
        duration: count * SECONDS_PER_CARD,
        ease: "none",
        repeat: -1,
        onUpdate: layout,
      });
      loopRef.current = loop;

      // Pin the hero section itself when there is one, so the corner
      // furniture and the blur that sit around the spiral hold with it.
      const pinEl = wrap.closest<HTMLElement>("[data-hero]") ?? wrap;

      gsap.to(state, {
        p: 1,
        ease: "none",
        scrollTrigger: {
          trigger: pinEl,
          pin: pinEl,
          start: "top top",
          // ScrollTrigger reads a bare number as px and has no vh unit, so the
          // distance is resolved here; `invalidateOnRefresh` re-resolves it.
          end: () => `+=${(count * SCROLL_PER_CARD_VH * window.innerHeight) / 100}`,
          scrub: 0.6,
          invalidateOnRefresh: true,
          // The loop only runs while the spiral is on screen: a helix turning
          // in a section nobody is looking at is a rAF callback and nine style
          // writes a frame, for nothing.
          onToggle: (self) => {
            if (self.isActive) loop.play();
            else loop.pause();
          },
        },
        onUpdate: layout,
      });

      let timer: number | undefined;
      const onResize = () => {
        window.clearTimeout(timer);
        timer = window.setTimeout(layout, 100);
      };
      window.addEventListener("resize", onResize);
      return () => {
        window.clearTimeout(timer);
        window.removeEventListener("resize", onResize);
        loop.kill();
      };
    },
    { scope: root },
  );

  return (
    // The pointer arriving on the spiral opens the connection to the media
    // store, ahead of the hover that will want a clip from it.
    <div ref={root} onPointerEnter={warmClips} className="relative h-dvh w-full overflow-hidden">
      <div
        className="absolute inset-0"
        style={{ perspective: "1400px", perspectiveOrigin: "50% 50%" }}
      >
        <div
          ref={scene}
          className="absolute top-1/2 left-1/2 h-0 w-0"
          style={{ transformStyle: "preserve-3d" }}
        >
          {clips.map((clip, i) => (
            <ShowreelCard
              key={clip.src}
              clip={clip}
              index={i}
              total={clips.length}
              soundRef={soundRef}
              onOpen={() => viewer.open(items, i, "Showreel", soundRef?.current ?? false)}
              onWatch={(watching) => {
                if (watching) loopRef.current?.pause();
                else loopRef.current?.play();
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * One card on the helix: the clip, and the furniture that names it.
 *
 * Hovering plays it in place, with the sound the hero's switch says. A click
 * opens it full screen in the viewer with the rest of the reel behind the
 * arrows, which is also the whole story on a touch screen, where there is no
 * hover. A click used to latch the clip playing inside the card; for footage
 * cut to fill a phone, a 300px card was the wrong place to leave it.
 *
 * `onWatch` tells the helix to hold still while this card is being watched.
 */
function ShowreelCard({
  clip,
  index,
  total,
  soundRef,
  onOpen,
  onWatch,
}: {
  clip: ShowreelClip;
  index: number;
  total: number;
  soundRef?: RefObject<boolean>;
  onOpen: () => void;
  onWatch: (watching: boolean) => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  /*
   * Whether footage is actually on screen, which is what the cover keys off.
   * Set from the video's own events rather than from the hover, so the cover
   * lifts only once a frame is painting under it and comes back whenever the
   * clip stops, whoever stopped it.
   */
  const [playing, setPlaying] = useState(false);

  /*
   * The clip's file is attached on the first hover and let go when the card
   * leaves the screen (`lib/clip.ts`): the silent preview while the hero's
   * switch is off, the full file once it is on.
   */
  const stalled = useClip(video, clip.src);

  /*
   * The cover and the video's poster are one file. The cover carries a
   * srcset, so a 280px card on a desktop is sent a 384px frame rather than
   * the 750 a phone's 3x screen needs, and whichever file the browser chose
   * (`currentSrc`) is handed to the video as its poster once it has loaded,
   * so the two never fetch different files. Set on the element rather than
   * rendered, because a `poster` in the markup is fetched the moment the
   * video exists, lazy cover or not. The effect catches a cover that
   * finished before hydration, whose load event fired with nobody listening.
   */
  const { props: cover } = getImageProps({
    src: clip.poster,
    alt: "",
    width: clip.w,
    height: clip.h,
    sizes: CARD_SIZES,
    quality: 75,
  });
  const coverRef = useRef<HTMLImageElement>(null);
  const lendPoster = useCallback(() => {
    const img = coverRef.current;
    if (video.current && img?.currentSrc) video.current.poster = img.currentSrc;
  }, []);
  useEffect(() => {
    if (coverRef.current?.complete && coverRef.current.naturalWidth) lendPoster();
  }, [lendPoster]);

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
    if (reduced && video.current) pauseClip(video.current);
  }, [reduced]);

  /*
   * Plays with the sound the switch asks for, which is off until the reader
   * turns it on, and falls back to muted when the browser refuses sound: a
   * hover is not a gesture, so before the first click it will.
   */
  const start = () => {
    if (reduced || !video.current) return;
    onWatch(true);
    void playClip(video.current, soundRef?.current ?? false);
  };
  const stop = () => {
    onWatch(false);
    if (video.current) pauseClip(video.current);
  };
  const open = () => {
    // The card's own copy stops before the viewer's starts, or the same clip
    // plays twice, one of them behind the scrim.
    if (video.current) pauseClip(video.current);
    onOpen();
  };

  return (
    <button
      type="button"
      data-spiral-card
      onClick={open}
      // A mouse or a pen. A tap is the click that opens the viewer, and
      // starting the card under the finger first would fetch the clip twice.
      onPointerEnter={(event) => {
        if (event.pointerType !== "touch") start();
      }}
      onPointerLeave={(event) => {
        if (event.pointerType !== "touch") stop();
      }}
      onPointerDown={warmClips}
      // The keyboard's hover; a tap's focus is not visible and does not count.
      onFocus={(event) => {
        if (event.currentTarget.matches(":focus-visible")) start();
      }}
      onBlur={stop}
      aria-label={`${clip.title}. Open full screen: ${clip.alt}`}
      /*
       * 9:16, the shape the footage was cut in, so nothing is cropped off a
       * frame built for a phone. The width is three quarters of what the old
       * 3:4 card had, which keeps the card the same height on the helix.
       */
      className="group bg-ink absolute top-0 left-0 block aspect-[9/16] w-[min(19.5vw,300px)] cursor-pointer overflow-hidden will-change-transform select-none max-tablet:w-[29vw] max-mobile:w-[40vw]"
      style={{ backfaceVisibility: "hidden" }}
    >
      {/*
       * One child for the whole picture. The hero's intro fades the card's
       * children in with a tween on their opacity, so the cover's own opacity
       * transition has to live a level below it or the two fight over the same
       * property. The hover scale sits here too, so cover and footage grow as
       * one.
       */}
      <span
        className="absolute inset-0 block transition-transform duration-[900ms] group-hover:scale-[1.04]"
        style={{ transitionTimingFunction: "var(--ease-brand)" }}
      >
        <video
          ref={video}
          muted
          loop
          playsInline
          preload="none"
          tabIndex={-1}
          aria-hidden
          onPlaying={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          className="h-full w-full object-cover"
        />

        {/*
         * The client's designed cover, laid over the footage rather than left
         * to the video's poster slot alone. A poster is gone for good once a
         * frame has played, so a card that had been hovered would otherwise
         * drift round the helix showing whichever frame it stopped on, beside
         * eight designed covers. This one fades once the footage is painting
         * and returns when the clip pauses.
         *
         * Through the optimizer at quality 75, as AVIF where the browser takes
         * it, with a srcset sized to the card: a 280px card on a 1x desktop
         * takes the 384 frame (about a third of the 750 it used to be sent),
         * a phone's 40vw card at 3x the 640. The video's poster is pointed at
         * whichever file the browser chose, only once it is here (see the
         * effect above), so it is a cache hit, never a second request, and
         * never the thing that pulls a lazy card's cover in early.
         *
         * Only the front card loads at once, at high priority, with the next
         * one in line behind it; the rest wait for the browser's lazy loading.
         * All nine used to be fetched eagerly while the opening film, which is
         * the only thing on screen at that point, was still loading.
         */}
        {/* eslint-disable-next-line @next/next/no-img-element -- the props are next/image's own, from getImageProps; a plain img keeps the ref and the load handler this needs. */}
        <img
          ref={coverRef}
          src={cover.src}
          srcSet={cover.srcSet}
          sizes={cover.sizes}
          alt=""
          width={clip.w}
          height={clip.h}
          loading={index < 2 ? "eager" : "lazy"}
          fetchPriority={index === 0 ? "high" : "auto"}
          decoding="async"
          onLoad={lendPoster}
          draggable={false}
          aria-hidden
          className={`pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${playing ? "opacity-0" : "opacity-100"}`}
        />
        <Veil key={clip.poster} src={clip.poster} />
        <Buffering show={stalled} />
      </span>

      {/* No furniture on the card: the footage is the card. The name and the
          position stay in the accessible name and the sr-only count below. */}
      <span className="sr-only">{`${index + 1} of ${total}`}</span>
    </button>
  );
}
