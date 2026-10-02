"use client";

import { useRef, type CSSProperties, type ElementType, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";

import { gsap, SplitText } from "@/lib/gsap";
import { useLoaded } from "@/components/loader";
import { useTransition } from "@/components/transition/transition-provider";

type Props = {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  /** Split into lines and stagger them, or lift the whole block as one piece. */
  splitLines?: boolean;
  delay?: number;
  stagger?: number;
  /** Where in the viewport the reveal fires. ScrollTrigger `start` syntax. */
  start?: string;
  /** Play immediately on mount instead of waiting for the scroll position. */
  immediate?: boolean;
  /** The language of the copy, where it is not the page's English. */
  lang?: string;
};

/**
 * Masked line reveal, left to right.
 *
 * SplitText wraps each rendered line in its own overflow-hidden mask, then each
 * line is wiped in from its left edge. The split waits on `document.fonts.ready`:
 * measuring earlier gives the line breaks of the fallback face, which re-wrap
 * when the real face arrives and leave words clipped by stale masks.
 *
 * `[data-reveal]` stays hidden by CSS until the timeline exists, so the copy is
 * never briefly visible in its finished position.
 */
export default function Reveal({
  children,
  as: Tag = "div",
  className,
  style,
  splitLines = true,
  delay = 0,
  stagger = 0.08,
  start = "top 85%",
  immediate = false,
  lang,
}: Props) {
  const root = useRef<HTMLElement>(null);
  // Nothing reveals under the intro panel or under a page cover: the build
  // waits for both handoffs, so the copy rises once it can actually be seen.
  const loaded = useLoaded();
  const { isBusy } = useTransition();

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      if (!loaded || isBusy) return;

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        el.classList.add("is--ready");
        return;
      }

      let split: SplitText | null = null;
      let tween: gsap.core.Tween | null = null;
      let cancelled = false;

      // The split has to wait for fonts, which puts the tween outside the GSAP
      // context's synchronous capture window, so `useGSAP` never learns about
      // it and cannot revert it. Hold it here and kill it by hand instead,
      // otherwise every Reveal leaks a live ScrollTrigger on each route change.
      const build = () => {
        if (cancelled || !root.current) return;

        let targets: Element[];
        if (splitLines) {
          // Words split on the plain space only. SplitText's default
          // delimiter also matches a non-breaking space, which turned
          // "4.1\u00a0lakh+" into two words and let the figure break from
          // its unit; a no-break space has to mean no break.
          /*
           * `aria: "none"` and span lines, because the defaults broke the
           * markup. By default SplitText copies the text into an `aria-label`
           * on the element and hides every line, and an aria-label is not
           * allowed on a <p>; and it wraps lines in <div>s, which cannot sit
           * inside an <h1> or a <p>. With spans and no aria the lines are
           * read as the text they are. They are made blocks in CSS
           * (`.reveal-line`), since a span line no longer gets SplitText's
           * inline `display: block`.
           */
          split = new SplitText(el, {
            type: "lines",
            mask: "lines",
            wordDelimiter: " ",
            aria: "none",
            tag: "span",
            linesClass: "reveal-line",
          });
          targets = split.lines;

          // A mask is sized to its line's box, which sits on the baseline, so
          // by default it shears the descenders off every g, j, p and y. Pad
          // the clip box down and pull the next line back up by the same
          // amount, so the leading is unchanged but nothing is cut.
          gsap.set(split.masks, {
            paddingBottom: "0.16em",
            marginBottom: "-0.16em",
          });
        } else {
          targets = [el];
        }

        el.classList.add("is--ready");

        /*
         * Left to right: each line is uncovered by its own clip travelling off
         * the right edge, with a short drift in from the left behind it.
         *
         * The wipe is a `clip-path` rather than a transform because the words
         * have to stay put while they are uncovered: sliding a full line in
         * from the left moves every word the width of its own line, which on a
         * paragraph of body copy reads as a stampede rather than a reveal. The
         * drift is what keeps it from looking mechanical, and the line mask is
         * what hides it.
         *
         * `fromTo` rather than `from`: the finished state has to be a real
         * `inset(0 0% 0 0)` and not `none`, or there is nothing to tween to.
         */
        tween = gsap.fromTo(
          targets,
          {
            clipPath: "inset(-0.35em 100% -0.35em 0)",
            xPercent: -4,
            ...(splitLines ? null : { autoAlpha: 0 }),
          },
          {
            clipPath: "inset(-0.35em 0% -0.35em 0)",
            xPercent: 0,
            ...(splitLines ? null : { autoAlpha: 1 }),
            duration: 1.1,
            ease: "expo.out",
            delay,
            stagger,
            scrollTrigger: immediate ? undefined : { trigger: el, start, once: true },
          },
        );
      };

      const teardown = () => {
        tween?.scrollTrigger?.kill();
        tween?.kill();
        split?.revert();
        tween = null;
        split = null;
      };

      // Lines are split for one width. When the width changes the split is
      // undone so the copy reflows; if it had not played yet it is rebuilt.
      let lastWidth = window.innerWidth;
      let timer: number | undefined;
      const onResize = () => {
        if (window.innerWidth === lastWidth) return;
        lastWidth = window.innerWidth;
        window.clearTimeout(timer);
        timer = window.setTimeout(() => {
          const played = !tween || tween.progress() === 1;
          teardown();
          if (!played) build();
        }, 150);
      };
      window.addEventListener("resize", onResize);

      document.fonts.ready.then(build);

      return () => {
        cancelled = true;
        window.clearTimeout(timer);
        window.removeEventListener("resize", onResize);
        teardown();
      };
    },
    { scope: root, dependencies: [loaded, isBusy, splitLines, delay, stagger, start, immediate] },
  );

  return (
    <Tag ref={root} data-reveal className={className} style={style} lang={lang}>
      {children}
    </Tag>
  );
}
