"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";

import type { wallCards } from "@/lib/cms/derive";
import { gsap } from "@/lib/gsap";
import { useLoaded } from "@/components/loader";
import { useTransition } from "@/components/transition/transition-provider";
import TransitionLink from "@/components/transition/transition-link";
import WorkCard from "./work-card";

/**
 * The work wall: the client's categories, one card each.
 *
 * There is no filter above it any more. The control used to sort nine pieces
 * by the shoot folder they came out of, which was the only grouping that
 * existed at the time. The categories are that grouping now, so a filter over
 * them would be a control that sorts categories by category.
 */
export default function WorkGrid({ cards }: { cards: ReturnType<typeof wallCards> }) {
  const grid = useRef<HTMLDivElement>(null);
  const loaded = useLoaded();
  const { isBusy } = useTransition();

  useGSAP(
    () => {
      if (!grid.current) return;
      // Nothing reveals under a cover: wait for the intro and the page turn,
      // otherwise the whole entrance plays behind the loader and is never seen.
      if (!loaded || isBusy) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      // Left to right, like every other reveal on the site.
      gsap.from(grid.current.children, {
        opacity: 0,
        xPercent: -6,
        duration: 0.8,
        ease: "expo.out",
        stagger: { amount: 0.35 },
      });
    },
    { scope: grid, dependencies: [loaded, isBusy] },
  );

  return (
    <div
      ref={grid}
      className="grid grid-cols-3 gap-x-[1.5em] gap-y-[3.5em] max-tablet:grid-cols-2 max-mobile:grid-cols-1"
    >
      {cards.map((work, index) => {
        const { cover } = work;
        return (
          <TransitionLink
            key={work.slug}
            href={`/work/${work.slug}`}
            className="group block"
          >
            {/*
              4:5, the shape seven of the nine designed covers were made in.
              One box for the whole grid so the captions line up across a
              row; the two 3:4 covers give up three percent top and bottom,
              which both have clear, and the one poster keeps its middle.
            */}
            <div className="relative aspect-[4/5] overflow-hidden">
              <WorkCard cover={cover} sizes="(max-width: 767px) 100vw, (max-width: 991px) 50vw, 30vw" />
            </div>

            <div className="rule mt-[0.9em] flex items-baseline justify-between border-t pt-[0.7em]">
              {/* h2: the grid sits straight under the page's h1, with no section heading between. */}
              <h2 className="statement text-[clamp(18px,1.7vw,26px)] transition-colors duration-300 group-hover:text-accent">
                {work.title}
              </h2>
              <span className="label opacity-60">
                ({String(index + 1).padStart(2, "0")})
              </span>
            </div>
          </TransitionLink>
        );
      })}
    </div>
  );
}
