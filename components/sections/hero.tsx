"use client";

import { useCallback, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";

import { HERO, SITE } from "@/lib/content";
import { SHOWREEL } from "@/lib/reels";
import { gsap } from "@/lib/gsap";
import { useLoaded } from "@/components/loader";
import ProgressiveBlur from "@/components/effects/progressive-blur";
import SpiralGallery from "@/components/effects/spiral-gallery";

/**
 * The hero.
 *
 * One viewport. The client's showreel spirals through the middle, driven by
 * scroll and by a slow loop of its own;
 * everything else is furniture pinned to the corners: the studio statement
 * bottom-left in mono and the numbers as a column on the right at mid-height.
 * Nothing decorative that looks like a control: the reference's play mark was
 * dropped rather than shipped as a button that does nothing.
 * There is no large headline here on purpose:
 * neither reference has one, so the page's h1 is the statement itself.
 */
export default function Hero() {
  const root = useRef<HTMLElement>(null);
  const loaded = useLoaded();

  /*
   * The sound switch. Two copies of one fact, as on the reel strips: the ref is
   * what a card reads the moment it starts, the state only re-renders the
   * label. Applied to the cards directly as well, so a clip already running
   * changes at once instead of at its next play.
   */
  // Off until asked for: nothing on the page makes a sound of its own.
  const soundRef = useRef(false);
  const [sound, setSound] = useState(false);
  const toggleSound = useCallback(() => {
    const on = !soundRef.current;
    soundRef.current = on;
    setSound(on);
    root.current?.querySelectorAll<HTMLVideoElement>("[data-spiral-card] video").forEach((v) => {
      v.muted = !on;
    });
  }, []);

  useGSAP(
    () => {
      if (!loaded) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      const q = gsap.utils.selector(root);
      const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
      // The scrub writes `opacity` on the furniture and the cards themselves,
      // so the intro animates their children and never fights it.
      tl.from(q("[data-hero-fade] > *"), { y: 14, opacity: 0, duration: 1, stagger: 0.06 });
      tl.from(q("[data-spiral-card] > *"), { opacity: 0, duration: 1.2, stagger: 0.05 }, 0);

      const backstop = window.setTimeout(() => {
        if (tl.progress() < 1) tl.progress(1);
      }, 6000);
      return () => window.clearTimeout(backstop);
    },
    { scope: root, dependencies: [loaded] },
  );

  return (
    <section ref={root} data-hero className="gradient-paper text-ink relative">
      <SpiralGallery
        clips={SHOWREEL}
        soundRef={soundRef}
        onProgress={(p) => {
          // The corner furniture belongs to the pinned screen. Take it out in
          // the last stretch of the scrub so nothing scrolls away over the mark.
          const fade = p < 0.86 ? 1 : Math.max(0, 1 - (p - 0.86) / 0.1);
          root.current
            ?.querySelectorAll<HTMLElement>("[data-hero-fade]")
            .forEach((el) => (el.style.opacity = fade.toFixed(3)));
        }}
      />

      {/*
        Progressive blur. The lowest cards of the helix dissolve into
        the foot of the viewport rather than being cut by it.
      */}
      <ProgressiveBlur edge="bottom" height="14em" />

      {/*
        Bottom-left statement, in three steps: marker, claim, signature.

        The claim is `.statement`, not `.display`. Display is tuned for the
        6.6vw page headings, and its 0.9 line-height and -0.035em tracking read
        as a cramped imitation of one at this size. Using the statement voice is
        what keeps this a corner block rather than a hero headline, which is the
        page's whole character: the work is the hero and the type is furniture.

        The cap is 56px, set against the cards rather than the viewport. The
        longer line sets around 478px there, which is why the block is capped at
        500px: the nearest card column begins about 540px from the left edge, so
        this is the largest the claim goes before the two start sharing space.

        The marker says what the agency does rather than announcing a stop. The
        four words are the client's own, from the line in their services section
        about combining content, strategy, branding, technology and performance.

        The break after "brands" is authored rather than left to the wrapper, so
        it sets as two lines at every width, and `<br />` keeps the accessible
        name one sentence.

        No accent anywhere in here. #ffc72c on paper is about 1.4:1 and would
        read as a printing fault, and the side nav's current-item tick is
        already accent on this same left rail: a second yellow mark a hundred
        pixels below it reads as two "you are here" flags.

        The 65% on the signature is near a hard floor rather than a taste call:
        ink at 60% on paper is 4.6:1 and passes AA at 14px, 55% is 4.0:1 and
        does not, and that line sits over the blur.

        The paper halo is phone-only. At 400px the spiral is 52vw wide and
        shares x-space with this block, so a card drifting low enough to pass
        behind line two gets a halo to separate against. It is invisible on
        paper at every other width.
      */}
      <div
        data-hero-fade
        /*
         * On a phone the block is lifted clear of the fixed corner control,
         * which sits in this same corner and was covering the first letters of
         * the tagline. On wider screens the two clear each other already.
         *
         * Ten pixels under the corner line at every width, at the client's
         * request: the block sat a touch high. The switch opposite moves with
         * it, so the two still share one bottom edge.
         */
        className="pointer-events-none absolute bottom-[calc(var(--corner)-10px)] left-[var(--corner)] z-[41] max-w-[min(500px,calc(100vw_-_2*var(--corner)))] max-mobile:bottom-[calc(var(--corner)+42px)] max-mobile:[text-shadow:0_0_16px_var(--paper)]"
      >
        {/*
          One line each on a phone. At the 14px floor the eyebrow sets 343px
          wide and the block is 335px at 375, so it wrapped, and the tagline
          (351px at 15px) wrapped at 390 too; two extra lines put the top of
          the block into the front card of the helix on a 667px screen.
        */}
        <p className="label mb-[0.75em] block text-[clamp(14px,1.05vw,19px)] max-mobile:text-[13px]">{HERO.eyebrow}</p>

        {/*
          The page's one h1 is the claim alone. The block used to be the h1 as
          a whole, which made the heading a list of four disciplines, a slogan
          and a line of Hindi. The hidden prefix is for the outline and for a
          screen reader landing on it: the claim says what the studio does to
          brands but not what or where the studio is.
        */}
        <h1 className="statement block text-[clamp(32px,3.8vw,56px)]">
          <span className="sr-only">Social Yatri, social media marketing agency in Kolkata. </span>
          {/* The space reads as one before the break and is never drawn. */}
          {HERO.lede[0]}{" "}
          <br />
          {HERO.lede[1]}
        </h1>

        <p className="label mt-[0.7em] block text-[clamp(15px,1.15vw,21px)] opacity-70 max-mobile:text-[14px]" lang="hi-Latn">
          {SITE.tagline}
        </p>
      </div>

      {/*
        The sound switch, bottom-right, mirroring the statement bottom-left.
        The one control in the corners, so it is set as a mono label like the
        reel strips' switch rather than as a button, and it fades with the rest
        of the furniture at the end of the scrub.
      */}
      <div
        data-hero-fade
        /*
         * Bottom-right on anything wider than a phone. On a phone the statement
         * runs nearly the full width of the bottom edge, so the switch moves up
         * under the MENU control, where the page's other control already is.
         */
        className="absolute right-[var(--corner)] bottom-[calc(var(--corner)-10px)] z-[41] max-mobile:top-[calc(var(--nav-height)+0.75em)] max-mobile:bottom-auto max-mobile:[text-shadow:0_0_16px_var(--paper)]"
      >
        {/*
          No opacity transition on this button. The hero's intro fades it in
          with a GSAP `from` tween, and a CSS transition on the same property
          let the tween capture a mid-transition value as its target: the
          switch was arriving at 0.15 instead of 0.9. Hover feedback is an
          underline, as on the reel strips' switch.
        */}
        <button
          type="button"
          onClick={toggleSound}
          aria-pressed={sound}
          // Padded to a 44px tap target and pulled back by the same amount, so
          // the label sits exactly where it did.
          className="label flex items-center gap-[0.6em] py-[11px] -my-[11px] text-[clamp(14px,1.05vw,19px)] opacity-90 underline decoration-transparent decoration-1 underline-offset-[5px] transition-[text-decoration-color] duration-300 hover:decoration-current"
        >
          <span
            aria-hidden
            className={`h-[7px] w-[7px] rounded-full border border-current ${sound ? "bg-current" : ""}`}
          />
          Sound {sound ? "on" : "off"}
        </button>
      </div>


    </section>
  );
}
