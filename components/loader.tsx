"use client";

import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useGSAP } from "@gsap/react";

import { Flip, ScrollTrigger, gsap } from "@/lib/gsap";
import SocialYatriLogo from "@/components/logo/social-yatri-logo";

const LoadingContext = createContext(false);

/**
 * The opening film. A cel animation on pure white (#ffffff on every corner of
 * its first frame, measured) that ends with the camera flying through the
 * black arch of the Victoria Memorial: the arch's interior grows until it is
 * the whole frame. The frame is fully black from frame 130 of 144 (5.417s at
 * 24fps) and holds black to the end at 6.0s.
 *
 * Everything here is in frame numbers, and the film's clock is rounded to
 * the nearest frame before any comparison. The browser reports a frame's
 * time to the microsecond, so frame 128 comes back as 5.333333, which is
 * less than 128 / 24, and a comparison in seconds missed the very frame it
 * was written for.
 */
const FILM_SRC = "/video/entry.mp4";
/**
 * The same film in AV1, offered first: 1.0MB against the H.264 file's 1.6MB,
 * and the film is on the critical path of every first visit. Encoded from
 * that file with SVT-AV1 at CRF 34, frame for frame (144 frames at 24fps, so
 * every frame number below holds for both), with the first frame's white and
 * the last frames' black measured identical (#ffffff, #000000) and an SSIM of
 * 0.997 against it. The codecs string is what lets a browser without an AV1
 * decoder (older Safari, most notably) skip straight to the H.264 file
 * without fetching a byte of this one. Both stay in /public: the film is the
 * site's, not the client's, and is timed against this code.
 */
const FILM_AV1_SRC = "/video/entry-av1.mp4";
const FILM_AV1_TYPE = 'video/mp4; codecs="av01.0.05M.08"';
const FILM_FPS = 24;
const FILM_BLACK_FRAME = 130;

/**
 * What the surround should be as the film goes black, keyed on the film's
 * own clock. The film covers the panel on every viewport (see the markup),
 * so while it plays the surround is never seen and cannot fight it; this is
 * kept so that a bar, should a browser ever leave one, follows the frame
 * rather than sitting on it as a border. The frame's edges stay white far
 * longer than its mean does: the arch's black reaches the top edge at frame
 * 124 but the bottom edge and the corners only at frame 129, so until then a
 * white surround matches most of the seam and anything darker would make the
 * frame's last white slivers read as a border. Once the edges go, the top
 * and bottom edge rows average 27 on frame 129 and 0 on frame 130. The
 * surround takes the 27 one frame early, on frame 128. A style written from
 * the frame callback reaches the screen with its frame when the main thread
 * is free and a composite or two later when it is busy, and frame 128's thin
 * white slivers on a near-black surround for one frame are a far smaller
 * mismatch than frame 129, all but black, sitting on white for two
 * composites. Held per frame rather than interpolated, because the frame
 * itself holds for 1/24s.
 */
const FILM_LETTERBOX: ReadonlyArray<readonly [frame: number, grey: number]> = [
  [128, 27],
  [FILM_BLACK_FRAME, 0],
];

/**
 * How long the film's clock may sit still before the film is given up on.
 * Covers autoplay being refused, a decode that never starts and a stall
 * mid-way, all of which look the same from here: `currentTime` stops moving.
 */
const FILM_STALL_MS = 1500;

/**
 * How long to let the intro run before finishing it without animation. The
 * film runs to black at 5.42s and the trace after it is 6.05s; this leaves
 * headroom for a slow first paint while still bounding how long the page can
 * be held.
 */
const INTRO_BACKSTOP_MS = 15000;

/** Where the develop beat sits in the trace timeline. */
const DEVELOP_AT = 3.5;

const WHITE = "#ffffff";
const BLACK = "#000000";
const PAPER = "#f2efe9";
const INK = "#141414";
const ACCENT = "#ffc72c";

/** True once the intro has finished and the page below is interactive. */
export function useLoaded() {
  return useContext(LoadingContext);
}

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <LoadingContext.Provider value={loaded}>
      <Loader onDone={() => setLoaded(true)} />
      {children}
    </LoadingContext.Provider>
  );
}

/**
 * The intro, in three movements.
 *
 * First the film: the client's opening animation fills a white panel edge to
 * edge, cropped around its centre to whatever shape the viewport is, and the
 * panel darkens with the frame as the film ends on black.
 *
 * Then the trace, on that black. The wordmark is drawn rather than faded in:
 * every shape in the logo is a closed outline, so DrawSVGPlugin can stroke
 * them one after another: the road first as a single continuous pen stroke,
 * then the lane markings, then the letters left to right, then the pin. Only
 * once a group is fully drawn does its fill flood in and its outline drop
 * away, which is what gives the "being inked" feel rather than a plain reveal.
 * It is drawn in paper on black, a negative.
 *
 * Then the develop: the black surface lightens to paper and the mark inverts
 * to ink, so it becomes the positive the header mark is. The intro ends by
 * handing the mark over to the header: `Flip.fit` measures the small logo in
 * the nav and animates the big one onto that exact box, so the two never both
 * exist on screen and there is no jump at the swap.
 */
function Loader({ onDone }: { onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  /**
   * Held in a ref, not a local, so React's Strict Mode double-invoke in
   * development cannot reset it and mark the app loaded twice.
   */
  const finishedRef = useRef(false);
  /**
   * A teardown lands the page (reveals the header mark, lifts the scroll
   * lock) on a zero-delay timer rather than at once, and a re-run of the
   * effect cancels that timer. In development React's Strict Mode tears the
   * effect down and runs it again on purpose, and Fast Refresh does the
   * same; neither is an interruption, and React runs the pair back to back,
   * so the timer cannot fire between them. Only a real unmount lets it.
   */
  const pendingLandRef = useRef<number | null>(null);
  const [hidden, setHidden] = useState(false);
  /** Drives the scroll lock. See the layout effect below. */
  const [locked, setLocked] = useState(true);

  /*
   * The scroll lock.
   *
   * This has to be a *layout* effect, and it has to be driven by state rather
   * than written imperatively from the timeline. `useGSAP` runs inside a layout
   * effect, which React fires before every passive `useEffect`, so when the
   * intro is skipped and the timeline finishes synchronously during mount (the
   * `prefers-reduced-motion` path), an imperative `removeAttribute` there ran
   * *before* a passive effect had added the attribute. The lock was then set
   * with nothing left to lift it, and the page could never be scrolled again.
   *
   * Keyed on `locked`, the ordering cannot invert: whatever runs first, the
   * last write always reflects the current state.
   */
  useLayoutEffect(() => {
    const root = document.documentElement;
    if (!locked) {
      root.removeAttribute("data-loading");
      return;
    }
    root.setAttribute("data-loading", "");
    return () => root.removeAttribute("data-loading");
  }, [locked]);

  useGSAP(
    () => {
      const scope = root.current;
      const panel = scope?.querySelector<HTMLElement>("[data-loader-panel]");
      if (!scope || !panel) return;
      const video = videoRef.current;

      // This run follows a teardown that was not an interruption.
      if (pendingLandRef.current !== null) {
        window.clearTimeout(pendingLandRef.current);
        pendingLandRef.current = null;
      }

      /**
       * The header mark is outside this component's GSAP scope, and a scoped
       * `gsap.set` on it is dropped with an "invalid scope" warning. Write the
       * styles directly instead: `autoAlpha` is only visibility plus opacity.
       */
      const revealHeaderLogo = () => {
        document
          .querySelectorAll<HTMLElement>("[data-header-logo]")
          .forEach((el) => {
            el.style.visibility = "visible";
            el.style.opacity = "1";
          });
      };

      /** Idempotent: the timeline calls it, and so does teardown. */
      const finish = () => {
        if (finishedRef.current) return;
        finishedRef.current = true;
        setLocked(false);
        ScrollTrigger.refresh();
        onDone();
      };

      // The intro plays on every load: it is the site's front door, and the
      // client asked for it every time. Only reduced motion skips it.
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setHidden(true);
        revealHeaderLogo();
        finish();
        return;
      }

      const q = gsap.utils.selector(scope);
      const road = q("[data-logo-road] path");
      const dashes = q("[data-logo-dashes] path");
      const letters = q("[data-logo-letter]");
      const letterPaths = q("[data-logo-letter] path");
      const pin = q("[data-logo-pin] path");
      const groups = q("[data-logo-road], [data-logo-dashes], [data-logo-pin-body], [data-logo-pin-ink]");
      /** The shapes that carry the mark's ink: everything but the yellow pin body. */
      const inked = [...q("[data-logo-road]"), ...q("[data-logo-pin-ink]"), ...letters];

      // A clean slate, so a remount in development does not inherit a panel
      // the film's clock left mid-grey or a video the trace had hidden.
      gsap.set(panel, { backgroundColor: WHITE });
      if (video) video.style.opacity = "";

      // Everything starts undrawn and unfilled.
      gsap.set([...groups, ...letters], { fillOpacity: 0, strokeOpacity: 1 });
      gsap.set([...road, ...dashes, ...letterPaths, ...pin], { drawSVG: "0%" });
      gsap.set(q("[data-logo-pin]"), { transformOrigin: "50% 100%", scale: 0.7, opacity: 0 });

      const counter = { value: 0 };

      /** The trace. Built paused; the film's clock starts it. */
      const tl = gsap.timeline({
        paused: true,
        onUpdate: () => {
          if (countRef.current) {
            countRef.current.textContent = String(Math.round(counter.value)).padStart(3, "0");
          }
        },
      });

      // The number tracks the trace up to the develop, where the chrome goes,
      // so it reads 100 as it leaves and can't finish early or late.
      tl.to(counter, { value: 100, duration: DEVELOP_AT, ease: "power1.inOut" }, 0);

      // Left to right, matching the panel's own exit and every reveal on the
      // pages underneath. A clip rather than a slide, because the two meta
      // labels sit at opposite ends of a `justify-between` row: sliding both
      // in from the left would walk the right-hand one across the header.
      tl.fromTo(
        q("[data-loader-meta]"),
        { clipPath: "inset(-0.35em 100% -0.35em 0)", xPercent: -6, opacity: 0 },
        {
          clipPath: "inset(-0.35em 0% -0.35em 0)",
          xPercent: 0,
          opacity: 1,
          duration: 0.9,
          stagger: 0.08,
          ease: "expo.out",
        },
      );

      // 1. The road draws as one continuous stroke.
      tl.to(road, { drawSVG: "100%", duration: 1.7, ease: "power2.inOut" }, 0.15);

      // 2. Lane markings pop in along it, trailing the pen.
      tl.to(
        dashes,
        { drawSVG: "100%", duration: 0.5, stagger: { amount: 0.7 }, ease: "power1.out" },
        0.9,
      );

      // 3. Letters draw left to right.
      tl.to(
        letterPaths,
        { drawSVG: "100%", duration: 0.7, stagger: { amount: 0.7 }, ease: "power2.out" },
        1.5,
      );

      // 4. The pin drops onto the road.
      tl.to(q("[data-logo-pin]"), { scale: 1, opacity: 1, duration: 0.8, ease: "back.out(2)" }, 2.1);
      tl.to(pin, { drawSVG: "100%", duration: 0.6, ease: "power2.out" }, 2.1);

      // 5. Ink floods the outlines and the pen lines drop away.
      tl.to(q("[data-logo-road]"), { fillOpacity: 1, duration: 0.7 }, 2.0);
      tl.to(q("[data-logo-dashes]"), { fillOpacity: 1, duration: 0.5 }, 2.2);
      tl.to(letters, { fillOpacity: 1, duration: 0.5, stagger: { amount: 0.4 } }, 2.4);
      tl.to(q("[data-logo-pin-body], [data-logo-pin-ink]"), { fillOpacity: 1, duration: 0.5 }, 2.6);
      tl.to([...groups, ...letters], { strokeOpacity: 0, duration: 0.6 }, 2.9);

      tl.to(q("[data-loader-tagline]"), { opacity: 1, duration: 0.6 }, 2.5);

      // 6. The develop: the negative becomes a positive.
      //
      // The surface goes black to paper and the mark paper to ink. Run as two
      // plain crossfades those curves have to cross, and at the crossing the
      // mark and its surface are the same grey and the mark is gone. So the
      // pen lines come back first, in ink: invisible on black, they take over
      // as the surface lightens past the mark's own tone, and then the fills
      // flood ink through them exactly as they flooded paper a moment ago.
      // The chrome goes here too, into the developing print: small text has
      // no outline to carry it through that crossing.
      tl.to(panel, { backgroundColor: PAPER, duration: 0.5, ease: "power2.inOut" }, DEVELOP_AT);
      tl.to(q("[data-loader-print]"), { opacity: 1, duration: 0.5, ease: "power2.inOut" }, DEVELOP_AT);
      tl.to(
        q("[data-loader-meta], [data-loader-tagline]"),
        { opacity: 0, duration: 0.5, ease: "power2.in" },
        DEVELOP_AT,
      );
      tl.set(inked, { color: INK }, DEVELOP_AT + 0.05);
      tl.to(inked, { strokeOpacity: 1, duration: 0.25, ease: "power1.out" }, DEVELOP_AT + 0.05);
      tl.to(
        [...q("[data-logo-road]"), ...q("[data-logo-word]"), ...q("[data-logo-pin-ink]")],
        { fill: INK, duration: 0.35, ease: "power2.inOut" },
        DEVELOP_AT + 0.35,
      );
      // The lane markings are holes: they have to match the surface again.
      tl.to(q("[data-logo-dashes]"), { fill: PAPER, duration: 0.35, ease: "power2.inOut" }, DEVELOP_AT + 0.35);
      tl.to(inked, { strokeOpacity: 0, duration: 0.3 }, DEVELOP_AT + 0.5);

      // 7. Hand the mark to the header and pull the panel off the page.
      tl.add(() => {
        const target = document.querySelector<HTMLElement>("[data-header-logo]");
        const source = scope.querySelector<HTMLElement>("[data-loader-logo]");
        if (!target || !source) return;

        Flip.fit(source, target, {
          duration: 1.15,
          ease: "brand",
          scale: true,
          absolute: true,
          onComplete: () => {
            revealHeaderLogo();
            source.style.opacity = "0";
          },
        });
      }, 4.5);

      // Left to right, the axis every reveal on the site runs on: the panel's
      // visible region is squeezed off its own right edge, so the page beneath
      // is uncovered from the left. `inset(top right bottom left)`.
      tl.to(
        panel,
        {
          clipPath: "inset(0% 0% 0% 100%)",
          duration: 1.2,
          ease: "expo.inOut",
        },
        4.75,
      );

      tl.add(finish, 5.4);
      // After the wipe has fully cleared (4.75 + 1.2), not during it.
      tl.add(() => setHidden(true), 6.05);

      /*
       * The film, and the handover from it to the trace.
       *
       * `phase` is where the intro is. `disposed` stops the film's async
       * callbacks (a play() promise, a ticker frame) acting after teardown.
       */
      let phase: "film" | "trace" | "done" = "film";
      let disposed = false;
      let skipTween: gsap.core.Tween | null = null;
      let lastClock = -1;
      let lastAdvanceAt = performance.now();
      let lastGrey = -1;
      let frameRequest = 0;
      /**
       * `requestVideoFrameCallback` runs just before the rendering
       * opportunity that presents a given frame, with that frame's own time,
       * so a style written there reaches the screen with that frame
       * (measured: written 1ms after the callback, 16ms before the frame's
       * expected display). Where it is missing, the clock has to do.
       */
      const hasFrameCallback = !!video && typeof video.requestVideoFrameCallback === "function";

      const stopFilm = () => {
        gsap.ticker.remove(tick);
        if (!video) return;
        if (hasFrameCallback) video.cancelVideoFrameCallback(frameRequest);
        video.removeEventListener("error", onFilmError);
        video.removeEventListener("ended", onFilmEnded);
        video.pause();
      };

      /** The trace begins on the black the film ends on. */
      const startTrace = () => {
        if (disposed || phase !== "film") return;
        phase = "trace";
        stopFilm();
        // The film has nothing left to show, and the panel is that black now.
        if (video) video.style.opacity = "0";
        gsap.set(panel, { backgroundColor: BLACK });
        gsap.set(q("[data-loader-stage], [data-loader-chrome]"), { autoAlpha: 1 });
        tl.play();
      };

      /**
       * The film cannot carry the intro (autoplay refused, a decode error, a
       * clock that stopped): fade the panel to the black the film would have
       * ended on and run the trace there, so the intro never hangs on white.
       */
      const skipFilm = () => {
        if (disposed || phase !== "film") return;
        stopFilm();
        skipTween = gsap.to(panel, {
          backgroundColor: BLACK,
          duration: 0.3,
          ease: "power1.inOut",
          onComplete: startTrace,
        });
        if (video) gsap.to(video, { opacity: 0, duration: 0.3, ease: "power1.inOut" });
      };

      /**
       * Paints the surround for a point on the film's clock, and hands over
       * on the exact frame the film goes black rather than on `ended`, half
       * a second of black later.
       */
      const follow = (t: number) => {
        const frame = Math.round(t * FILM_FPS);
        if (frame >= FILM_BLACK_FRAME) {
          startTrace();
          return;
        }
        let grey = 255;
        for (const [from, value] of FILM_LETTERBOX) if (frame >= from) grey = value;
        if (grey !== lastGrey) {
          lastGrey = grey;
          panel.style.backgroundColor = `rgb(${grey} ${grey} ${grey})`;
        }
      };

      const onVideoFrame: VideoFrameRequestCallback = (_now, metadata) => {
        if (disposed || phase !== "film" || !video) return;
        follow(metadata.mediaTime);
        if (phase === "film") frameRequest = video.requestVideoFrameCallback(onVideoFrame);
      };

      /**
       * Runs every animation frame while the film plays. It is the stall
       * watchdog, off the film's own clock rather than `timeupdate`, which
       * fires only a few times a second; and without frame callbacks it also
       * drives the surround, from a clock that reads about 20ms behind the
       * frame on screen, so there the surround runs half a frame late.
       */
      const tick = () => {
        if (!video) return;
        const now = performance.now();
        const t = video.currentTime;
        if (t !== lastClock) {
          lastClock = t;
          lastAdvanceAt = now;
        } else if (now - lastAdvanceAt > FILM_STALL_MS) {
          skipFilm();
          return;
        }
        if (!hasFrameCallback) follow(t);
      };

      const onFilmError = () => skipFilm();
      // The film reached its end before a frame saw it go black: a background
      // tab suspends requestAnimationFrame but not playback.
      const onFilmEnded = () => startTrace();

      if (video) {
        video.addEventListener("error", onFilmError);
        video.addEventListener("ended", onFilmEnded);
        // The `autoplay` attribute lets the browser start the film before
        // hydration. Asking again here covers a browser that declined it, and
        // the remount that follows a teardown, which rewinds the film.
        video.muted = true;
        video.play().catch(() => {
          if (!disposed) skipFilm();
        });
        if (hasFrameCallback) frameRequest = video.requestVideoFrameCallback(onVideoFrame);
        gsap.ticker.add(tick);
      } else {
        skipFilm();
      }

      /*
       * Wall-clock backstop. GSAP advances on requestAnimationFrame, which a
       * browser suspends entirely while the tab is in the background, so a
       * page opened in a background tab can sit here with the intro frozen
       * part-way, the scroll still locked and the header mark still hidden.
       * Timers keep running (throttled, which is plenty at this scale), so if
       * the intro has not finished well past its own length, land it.
       */
      const backstop = window.setTimeout(() => {
        if (tl.progress() >= 1) return;
        phase = "done";
        stopFilm();
        skipTween?.kill();
        if (video) video.style.opacity = "0";
        tl.progress(1);
        revealHeaderLogo();
        finish();
        setHidden(true);
      }, INTRO_BACKSTOP_MS);

      return () => {
        disposed = true;
        window.clearTimeout(backstop);
        stopFilm();
        skipTween?.kill();
        // Rewound, so a remount (Strict Mode in development, Fast Refresh)
        // starts the film from its first frame rather than part-way through.
        if (video) video.currentTime = 0;
        // Whatever interrupts the intro (a fast reload, an unmount mid-Flip,
        // a killed timeline) the page must never be left without its logo or
        // with the scroll still locked. Deferred, and cancelled by a re-run:
        // see `pendingLandRef`.
        pendingLandRef.current = window.setTimeout(() => {
          pendingLandRef.current = null;
          revealHeaderLogo();
          finish();
        }, 0);
      };
    },
    { scope: root },
  );

  if (hidden) return null;

  return (
    <div
      ref={root}
      className="pointer-events-auto fixed inset-0 z-[400] overflow-hidden"
      aria-hidden
    >
      {/*
        The surface: the film's white, then the black the film ends on, then
        paper once the mark has developed. The film sits inside it so the wipe
        takes both. No grain during the film: the surround has to be the same
        flat white as the frame, so that until the first frame decodes there
        is nothing to mark where the film will be.

        The film covers the panel, centred, whatever shape the viewport is: a
        screen wider than 16:9 loses rows off the top and bottom of the frame
        (2560x1080 loses an eighth of each, the crown of the memorial's dome
        and the nearest stretch of road), a taller one loses columns off the
        sides (a phone keeps the middle quarter to a third: the road, the
        bridge deck, the tram until it passes the camera, and the arch, whose
        interior is the black the frame ends on). The frame is composed on
        its centre line, so either crop keeps the picture, and no viewport
        ever shows a bar on any edge. One rule rather than a breakpoint,
        because on a wide screen cover is exactly the old full-width rule,
        and a breakpoint would only add an edge to get wrong.
      */}
      <div
        data-loader-panel
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: "inset(0% 0% 0% 0%)", backgroundColor: WHITE }}
      >
        {/*
          The road is not on the frame's centre line: its dashed middle runs
          at 55 percent of the width (measured at 682 to 712 px of 1280 across
          the film), so a crop centred on the frame put the road a sixth of a
          phone screen to the right. 57 percent lands the road on the middle
          of every portrait window (390x844 wants 56.8, 375x667 57.3, an iPad
          58.2) and on a landscape screen, which crops only a sliver from the
          sides, it moves the picture by a few pixels.
        */}
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover [object-position:57%_50%]"
          muted
          playsInline
          autoPlay
          preload="auto"
          disablePictureInPicture
          tabIndex={-1}
        >
          <source src={FILM_AV1_SRC} type={FILM_AV1_TYPE} />
          <source src={FILM_SRC} type="video/mp4" />
        </video>
        {/* The developed print: paper with its grain, brought up over the black. */}
        <div data-loader-print className="surface-paper absolute inset-0 opacity-0" />
      </div>

      {/* Hidden until the trace, so nothing is drawn over the film, and so
          the server-rendered mark cannot show before the effect zeroes it. */}
      <div
        data-loader-stage
        className="absolute inset-0 flex items-center justify-center px-[var(--gutter)]"
        style={{ visibility: "hidden" }}
      >
        <div data-loader-logo className="w-[min(64vw,52em)]">
          <SocialYatriLogo drawable fg={PAPER} bg={BLACK} accent={ACCENT} />
        </div>
      </div>

      <div
        data-loader-chrome
        className="absolute inset-0 flex flex-col justify-between p-[var(--gutter)]"
        style={{ visibility: "hidden", color: PAPER }}
      >
        <div className="flex justify-between overflow-hidden">
          <span data-loader-meta className="label block opacity-65">
            Social Yatri
          </span>
          <span data-loader-meta className="label block opacity-65">
            Kolkata, India
          </span>
        </div>

        <div className="flex items-end justify-between">
          <span data-loader-tagline className="label opacity-0">
            Plotting the route
          </span>

          {/* The count sits on the baseline of the page. */}
          <div className="overflow-hidden">
            <span data-loader-meta className="label block text-[1em]">
              <span ref={countRef}>000</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
