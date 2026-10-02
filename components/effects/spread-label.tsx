"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";

import { gsap } from "@/lib/gsap";

/**
 * The section label.
 *
 * The word sticks below the fixed mark. Over the first half of the scroll
 * its letters spread out until they span the full width; over the second half
 * they gather again in the far right corner and stay there as a running head.
 * The three keyframes are measured from the real letter widths, so the spread
 * is even whatever the word.
 */
export default function SpreadLabel({
  children,
  className,
  as: Tag = "h2",
}: {
  children: string;
  className?: string;
  /**
   * The heading level. A real heading element rather than a div with
   * `role="heading"`: the role is enough for a screen reader, but a crawler
   * builds the outline from elements, and to it the div was not a heading.
   */
  as?: "h2" | "h3" | "h4";
}) {
  const root = useRef<HTMLHeadingElement>(null);
  const letters = children.split("");

  useGSAP(
    () => {
      const wrap = root.current;
      const section = wrap?.parentElement;
      if (!wrap || !section) return;

      const spans = gsap.utils.toArray<HTMLElement>(wrap.querySelectorAll("[data-letter]"));
      if (spans.length < 2) return;

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      const build = () => {
        const width = wrap.clientWidth;
        const wordWidth = spans.reduce((sum, s) => sum + s.offsetWidth, 0);
        const slack = Math.max(0, width - wordWidth);

        // Where each letter has to be for the word to fill the line evenly.
        const spread = spans.map((_, i) => (i / (spans.length - 1)) * slack);

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.4,
            invalidateOnRefresh: true,
          },
        });

        // x is applied on top of each letter's natural position, so the same
        // `slack` for every letter gathers the whole word flush right intact.
        spans.forEach((span, i) => {
          tl.to(span, { x: spread[i], ease: "none", duration: 1 }, 0);
          tl.to(span, { x: slack, ease: "none", duration: 1 }, 1);
        });

        return tl;
      };

      let tl = build();
      let timer: number | undefined;
      let lastWidth = window.innerWidth;
      const rebuild = () => {
        window.clearTimeout(timer);
        timer = window.setTimeout(() => {
          tl?.scrollTrigger?.kill();
          tl?.kill();
          gsap.set(spans, { clearProps: "transform" });
          tl = build();
        }, 120);
      };
      const onResize = () => {
        if (window.innerWidth === lastWidth) return;
        lastWidth = window.innerWidth;
        rebuild();
      };
      window.addEventListener("resize", onResize);
      // The letters are measured; the fallback face measures differently.
      document.fonts.ready.then(rebuild);
      return () => {
        window.clearTimeout(timer);
        window.removeEventListener("resize", onResize);
        tl?.scrollTrigger?.kill();
        tl?.kill();
      };
    },
    { scope: root },
  );

  return (
    <Tag
      ref={root}
      className={`pointer-events-none sticky top-[calc(var(--corner)+56px)] z-10 mx-[calc(var(--corner)-var(--gutter))] flex whitespace-pre ${className ?? ""}`}
      aria-label={children}
    >
      {letters.map((letter, i) => (
        <span
          key={`${letter}-${i}`}
          data-letter
          aria-hidden
          className="font-sans inline-block text-[28px] leading-none font-medium tracking-[-0.02em] uppercase will-change-transform"
        >
          {letter}
        </span>
      ))}
    </Tag>
  );
}
