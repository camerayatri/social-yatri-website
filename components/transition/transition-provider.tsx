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
import { usePathname, useRouter } from "next/navigation";

import { gsap, ScrollTrigger } from "@/lib/gsap";
import { getLenis } from "@/components/effects/smooth-scroll";
import { useLoaded } from "@/components/loader";
import { TAXI_CLIP } from "./taxi-clip";

type TransitionContextValue = {
  /** Cover the screen with the clip, navigate, then fade it away. Falls back to a plain push. */
  navigate: (href: string) => void;
  isBusy: boolean;
};

const TransitionContext = createContext<TransitionContextValue | null>(null);

export function useTransition() {
  const ctx = useContext(TransitionContext);
  if (!ctx) {
    throw new Error("useTransition must be used inside <TransitionProvider>");
  }
  return ctx;
}

/**
 * How long to wait for a phase before continuing without it. Longer than
 * either phase (the sheet is up in 0.15s; the wait for the wash and the fade
 * after it come to 1.4s) with room for a slow route.
 */
const GUARD_MS = 3000;

/*
 * The transition is the clip. Nothing slides. A white sheet carrying the taxi
 * comes up over the page, the taxi drives at the camera, the headlamp washes
 * the frame white, and the new page comes out of the wash. The whole thing is
 * held under two seconds, 1.68s by the clip's numbers, and only the two fades
 * are timed rather than read off the clip.
 *
 * The sheet fades up rather than cutting in because a hard cut from paper to
 * white pops. The clip's first three frames are blank, 0.125s of white, so a
 * fade of that length is over before the taxi appears and never blends the
 * car with the page.
 *
 * When the sheet goes is read off the video's own clock (`exitAt`), so the
 * sheet and the picture cannot drift apart. `EXIT_S` is the one tween on the
 * way out.
 */
const COVER_S = 0.15;
const EXIT_S = 0.35;
/**
 * When the route is pushed, on the cover's clock. The sheet is opaque from
 * 0.15s and the swap under it cannot be seen after that; the rest is a head
 * start for the prefetch, and it keeps the render of the new page off the
 * frames where the taxi is coming over the bottom edge.
 */
const PUSH_AT_S = 0.3;
/*
 * The way out when the clip's clock cannot be trusted (not decoded, a tab
 * throttled to a stop). The sheet comes up a touch slower, since there is no
 * picture for the fade to hand over to, holds long enough to read as a page
 * turning rather than a flicker, and fades out at the same rate as the real
 * thing. The hold is measured from the sheet becoming opaque, not from the
 * route committing, so a quick route does not shorten it.
 */
const FALLBACK_COVER_S = 0.2;
const FALLBACK_HOLD_S = 0.5;
/**
 * How long to wait on the wash before leaving regardless. It is due within
 * 1.1s of the route committing; a clip that has not got there in 1.5s has
 * stalled, and the reader gets the page anyway.
 */
const EXIT_WAIT_MS = 1500;

/**
 * Scroll to the element a hash names, with its top sat just under the fixed
 * nav so a sticky section header lands exactly where it sticks. Returns false
 * if there is no such element, so the caller can fall back to the top.
 */
function scrollToHash(hash: string, immediate: boolean): boolean {
  if (!hash || hash.length < 2) return false;
  const el = document.getElementById(decodeURIComponent(hash.slice(1)));
  if (!el) return false;
  // `--nav-height` is a calc(), so it has to be resolved by an element rather
  // than parsed off the string.
  const probe = document.createElement("div");
  probe.style.cssText = "position:absolute;visibility:hidden;pointer-events:none;height:var(--nav-height)";
  document.body.appendChild(probe);
  const nav = probe.offsetHeight;
  probe.remove();
  const top = el.getBoundingClientRect().top + window.scrollY - nav;
  const lenis = getLenis();
  if (lenis) lenis.scrollTo(top, { immediate, force: true, duration: immediate ? 0 : 1.1 });
  else window.scrollTo({ top, behavior: immediate ? "auto" : "smooth" });
  return true;
}

export default function TransitionProvider({
  children,
  chrome,
}: {
  children: ReactNode;
  /**
   * Fixed furniture: the header, the progress rail. Rendered outside the
   * page wrapper, so the header is never inside anything the transition
   * hides or shows, and never below the sheet.
   */
  chrome?: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const loaded = useLoaded();

  const wrapRef = useRef<HTMLDivElement>(null);
  /** The sheet: a white, full-viewport panel with the clip inside it. */
  const panelRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  /** Set while the screen is covered and we are waiting on the new route. */
  const pendingRef = useRef<string | null>(null);
  /**
   * When the sheet is due to be fully opaque, on `performance.now()`'s clock.
   * The fallback's hold is measured from here, so a route that commits early
   * does not shorten it and one that commits late does not lengthen it.
   */
  const opaqueAtRef = useRef(0);
  /**
   * The reveal currently playing, and the function that finishes it. A second
   * navigation started mid-reveal has to stop the first one before it runs its
   * own cover: otherwise the stale fade's terminal `set` would hide the sheet
   * halfway through the new cover and show the reader the page swap.
   */
  const revealRef = useRef<gsap.core.Timeline | null>(null);
  /** Stops whatever is driving the current reveal off the video's clock. */
  const revealStopRef = useRef<(() => void) | null>(null);
  const settleRef = useRef<(() => void) | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const reducedMotion = useRef(false);
  useEffect(() => {
    reducedMotion.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
  }, []);

  /*
   * The clip is only wanted once someone can actually click a link, so it
   * stays unfetched until the intro has finished rather than competing with it
   * for bandwidth. It is 431 KB; by the time a first navigation happens it is
   * buffered, which is why the sheet is never seen bare in practice.
   */
  useEffect(() => {
    // With reduced motion a link simply navigates and the clip never plays,
    // so it is never fetched either.
    if (!loaded || reducedMotion.current) return;
    const video = videoRef.current;
    if (!video) return;
    video.preload = "auto";
    video.load();
  }, [loaded]);

  /** Start the clip from its first frame, at its rate. */
  const rollFilm = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = TAXI_CLIP.rate;
    // Seeded on every navigation, not only the first: after a run the clip is
    // sat on its last frame with `ended` set, and the seek is what clears it.
    video.currentTime = TAXI_CLIP.start;
    // Muted and inline, and this is downstream of a click, so the play
    // promise resolves, but a rejected one must not break the navigation.
    void video.play().catch(() => {});
  }, []);

  const stopFilm = useCallback(() => {
    videoRef.current?.pause();
  }, []);

  /* ---------------------------------------------------------------------
   * Cover. The clip starts and the sheet fades up over it. The clip's blank
   * opening frames and the sheet are the same white, so what the reader sees
   * is the page going to white and the taxi arriving on it.
   *
   * `from` is where the sheet's opacity already is: a navigation that cuts
   * into a fade out picks the sheet up from there instead of dropping it to
   * nothing for a frame and showing the page in full.
   * ------------------------------------------------------------------- */
  const cover = useCallback(
    (from: number) => {
      const tl = gsap.timeline();
      const panel = panelRef.current;
      if (!panel) return tl;

      // Nothing decoded means nothing will play under the fade, so it gets
      // the fallback's slightly longer rise. Read before the clip is seeded:
      // the seek to frame 0 drops `readyState` to metadata until it lands,
      // and a buffered clip would otherwise be taken for a bare one.
      const video = videoRef.current;
      const bare = !video || video.readyState < 2;
      const rise = bare ? FALLBACK_COVER_S : COVER_S;

      rollFilm();
      const duration = rise * (1 - from);
      opaqueAtRef.current = performance.now() + duration * 1000;

      // A fade out still running from an interrupted reveal would, when it
      // completed, park the sheet hidden in the middle of this cover.
      gsap.killTweensOf(panel);
      tl.fromTo(panel, { autoAlpha: from }, { autoAlpha: 1, duration, ease: "none" }, 0);

      return tl;
    },
    [rollFilm],
  );

  /* ---------------------------------------------------------------------
   * Leave. The sheet holds while the taxi drives at the camera and fades out
   * the moment the headlamp has washed the frame white, so the new page comes
   * out of the wash rather than out from behind anything.
   *
   * When it goes is read off the video's own clock rather than timed to match
   * it. If the clip is not actually playing (not decoded, a tab throttled to
   * a stop) its clock cannot be trusted, and the sheet leaves after a plain
   * hold instead. The reader gets the page either way.
   * ------------------------------------------------------------------- */
  const reveal = useCallback((): { tl: gsap.core.Timeline; stop: () => void } => {
    const tl = gsap.timeline({ paused: true });
    let stop = () => {};
    const panel = panelRef.current;
    const wrap = wrapRef.current;
    if (!panel) return { tl, stop };

    // Reveal the incoming page. Done synchronously rather than as a timeline
    // step: if the ticker is asleep (a backgrounded tab throttles rAF to
    // nothing) a queued `set` would leave the page invisible until the reader
    // came back.
    if (wrap) gsap.set(wrap, { autoAlpha: 1 });

    const video = videoRef.current;
    const decoded = !!video && video.readyState >= 2;
    const live = decoded && !video.paused && !video.ended;
    const held = decoded && video.ended;

    // The incoming page's h1 wipes in from the left as the sheet goes, on the
    // same left-to-right gesture every reveal on the site runs: see
    // `components/effects/reveal.tsx`. The vertical inset keeps ascenders and
    // descenders outside the clip.
    const heading = wrap?.querySelector("h1, [data-page-heading]");
    const bringHeading = (duration: number) => {
      if (!heading) return;
      gsap.fromTo(
        heading,
        { clipPath: "inset(-0.35em 100% -0.35em 0)", xPercent: -6 },
        { clipPath: "inset(-0.35em 0% -0.35em 0)", xPercent: 0, ease: "power3.out", duration },
      );
    };

    // The last steps, shared by every way out.
    const finish = () => {
      stop();
      gsap.set(panel, { autoAlpha: 0 });
      stopFilm();
      tl.play();
    };
    tl.call(() => {});

    // The way out: the sheet fades and the heading wipes in under it. The
    // frames the fade runs over are the wash plateau and, once the clip ends
    // at 1.417s, its held last frame: flat white, the same as the sheet, so
    // the picture cannot cut back to the car mid-fade.
    const fade = () => {
      bringHeading(Math.max(0.8, EXIT_S));
      gsap.to(panel, { autoAlpha: 0, duration: EXIT_S, ease: "power2.inOut", onComplete: finish });
    };

    if (live) {
      // Hold until the wash has reached its plateau, then go. The wait is
      // capped in case the clock stops advancing.
      const began = performance.now();
      const tick = () => {
        if (video.currentTime >= TAXI_CLIP.exitAt || performance.now() - began > EXIT_WAIT_MS) {
          stop();
          fade();
        }
      };
      gsap.ticker.add(tick);
      stop = () => gsap.ticker.remove(tick);
    } else if (held) {
      // A slow route: the clip ran out under the sheet. What it is holding is
      // the wash, so there is nothing left to wait for.
      fade();
    } else {
      // No picture. Hold the white for as long as the fallback allows from
      // the moment the sheet was opaque, then go.
      const elapsed = (performance.now() - opaqueAtRef.current) / 1000;
      const call = gsap.delayedCall(Math.max(0, FALLBACK_HOLD_S - elapsed), fade);
      stop = () => {
        call.kill();
      };
    }

    return { tl, stop };
  }, [stopFilm]);

  const navigate = useCallback(
    (href: string) => {
      if (pendingRef.current) return;

      // A hash or query on the current path does not change `pathname`, so the
      // reveal effect would never fire and the sheet would sit there forever.
      // Those navigations go straight through: a hash on this page is a
      // smooth scroll to its section, and the address follows.
      const target = href.split("#")[0].split("?")[0];
      if (target === pathname) {
        const hash = href.includes("#") ? href.slice(href.indexOf("#")) : "";
        if (hash && scrollToHash(hash, false)) {
          window.history.pushState(null, "", href);
          return;
        }
        router.push(href);
        return;
      }

      if (reducedMotion.current) {
        router.push(href);
        return;
      }

      // Where the sheet is before the interrupted reveal below is settled,
      // which hides it; the new cover carries on from here.
      const panel = panelRef.current;
      const from = panel ? Number(gsap.getProperty(panel, "opacity")) : 0;

      // Interrupting a reveal is allowed; leaving it running is not.
      revealStopRef.current?.();
      revealStopRef.current = null;
      revealRef.current?.kill();
      revealRef.current = null;
      settleRef.current?.();
      settleRef.current = null;

      pendingRef.current = href;
      setIsBusy(true);
      document.documentElement.setAttribute("data-transitioning", "");

      // Prefetching under the sheet is free time: by the time the route is
      // pushed it is usually already in the client cache.
      router.prefetch(href);

      const tl = cover(Number.isFinite(from) ? from : 0);

      // The push happens at `PUSH_AT_S`, or when the guard fires, whichever
      // comes first. Without the guard a timeline that never gets there (a
      // tab backgrounded mid-transition suspends rAF, so GSAP stops
      // advancing) would leave `pendingRef` set forever and every later link
      // click would be swallowed.
      let committed = false;
      const commit = () => {
        if (committed) return;
        committed = true;
        window.clearTimeout(guard);
        tl.kill();

        // Hidden until the reveal shows it, so the new route cannot be
        // glimpsed through a sheet that has not reached full opacity before
        // its own intro runs.
        if (wrapRef.current) gsap.set(wrapRef.current, { autoAlpha: 0 });
        router.push(href);
      };

      const guard = window.setTimeout(commit, GUARD_MS);
      tl.call(commit, [], PUSH_AT_S);
    },
    [cover, pathname, router],
  );

  // The new route has committed. Reset the scroll position under the sheet,
  // then fade it away. `pathname` only changes once React has rendered the
  // new page, so there is nothing half-painted underneath when this runs.
  useEffect(() => {
    const pending = pendingRef.current;
    if (!pending || pending.split("#")[0] !== pathname) return;

    pendingRef.current = null;
    // Lenis may still be easing towards the old page's target; reset it too.
    // A hash on the new address lands the page on that section instead, done
    // under the sheet so it lifts on the section already in place.
    if (!scrollToHash(window.location.hash, true)) {
      getLenis()?.scrollTo(0, { immediate: true, force: true });
      window.scrollTo(0, 0);
    }
    ScrollTrigger.refresh();

    const { tl, stop } = reveal();
    revealRef.current = tl;
    revealStopRef.current = stop;

    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(guard);
      stop();
      revealRef.current = null;
      revealStopRef.current = null;
      settleRef.current = null;
      setIsBusy(false);
      document.documentElement.removeAttribute("data-transitioning");
      stopFilm();
      // Belt and braces: the page must be visible and the sheet gone whether
      // the reveal ran to completion or was cut short.
      if (wrapRef.current) {
        gsap.set(wrapRef.current, { autoAlpha: 1, clearProps: "transform" });
      }
      if (panelRef.current) gsap.set(panelRef.current, { autoAlpha: 0 });
      ScrollTrigger.refresh();
    };

    const guard = window.setTimeout(settle, GUARD_MS);
    settleRef.current = settle;
    tl.eventCallback("onComplete", settle);

    return () => {
      window.clearTimeout(guard);
      stop();
      tl.kill();
    };
  }, [pathname, reveal, stopFilm]);

  return (
    <TransitionContext.Provider value={{ navigate, isBusy }}>
      {chrome}

      {/*
        One stacking context for the whole page, so nothing inside it (however
        high its own z-index) can paint over the menu or the sheet. Isolation
        does not affect fixed positioning, so ScrollTrigger's pins are unmoved.
      */}
      <div ref={wrapRef} data-page-wrap id="main" className="relative z-[1] isolate">
        {children}
      </div>

      {/*
        The sheet. White underneath the footage, so a clip that fails to load
        still covers in the clip's own colour; faded up and down by GSAP and
        never moved.
      */}
      <div ref={panelRef} className="transition-overlay" aria-hidden>
        <video
          ref={videoRef}
          className="wipe__video"
          src={TAXI_CLIP.src}
          muted
          playsInline
          preload="none"
          aria-hidden
          tabIndex={-1}
        />
      </div>
    </TransitionContext.Provider>
  );
}
