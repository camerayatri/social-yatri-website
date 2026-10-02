"use client";

import type { homeCards } from "@/lib/cms/derive";
import WorkCard from "@/components/work/work-card";
import Reveal from "@/components/effects/reveal";
import SpreadLabel from "@/components/effects/spread-label";
import TransitionLink from "@/components/transition/transition-link";

/**
 * The work.
 *
 * The section label sticks to the top and spreads its letters across the page
 * as you scroll, then gathers in the right corner. Below it the pieces run in
 * two columns that are deliberately out of step: the right column starts with
 * the page's one large statement and each item carries a different top offset,
 * so the eye moves down the page in a zigzag rather than a grid. Every item is
 * a tiny mono caption, a sentence-case title, then the image.
 */

/**
 * Top offsets alternate so no two neighbours align. The shapes alternate too,
 * 4:3 against 3:4 against 1:1, but they are not set here: the client cut the
 * six home covers (the `homeCovers` document) to exactly those shapes, so each card takes
 * its cover's own ratio and shows the whole artwork. A card without a home
 * cover falls back to the wall's cover and its shape.
 */
const OFFSETS = ["mt-[8vh]", "mt-[18vh]", "mt-[4vh]", "mt-[22vh]", "mt-[10vh]", "mt-[14vh]"];
/* One rhythm once the two columns fold into one: the zigzag has nothing to zag against. */
const FOLDED_OFFSET = "max-tablet:mt-[6vh]";

/** The shape of a card whose still has none of its own (a clip's poster). */
const DEFAULT_ASPECT = "4 / 5";

/** One card as the server works it out: the home cover for the still, the wall's clip for the hover. */
type Card = ReturnType<typeof homeCards>[number];

function WorkItem({
  work,
  offset,
  index,
}: {
  work: Card;
  offset: string;
  index: number;
}) {
  const { cover } = work;
  const aspect = cover.w && cover.h ? `${cover.w} / ${cover.h}` : DEFAULT_ASPECT;

  return (
    <TransitionLink
      href={`/work/${work.slug}`}
      className={`group block ${offset} ${FOLDED_OFFSET} ${index % 2 ? "w-[82%] justify-self-end" : "w-[88%]"} max-tablet:w-full`}
      // When the two columns collapse into one, the items interleave in
      // their original order with the statement second, instead of one whole
      // column followed by the other.
      style={{ order: index === 0 ? 0 : index + 1 }}
    >
      <p className="label-xs opacity-60 transition-[color,opacity] duration-300 group-hover:text-accent group-hover:opacity-100">
        ({String(index + 1).padStart(2, "0")})
      </p>
      <Reveal as="h3" splitLines={false} className="statement mt-[10px] text-[22px]">
        {work.title}
      </Reveal>
      <div className="relative mt-[18px] overflow-hidden" style={{ aspectRatio: aspect }}>
        <WorkCard cover={cover} sizes="(max-width: 992px) 100vw, 44vw" />
      </div>
    </TransitionLink>
  );
}

export default function Works({
  cards,
  statement,
  total,
  year,
}: {
  /** The first six works, from `homeCards`. */
  cards: Card[];
  /** The hero's headline, the one large statement here. */
  statement: readonly [string, string];
  /** How many works there are in all, for the count beside "View all". */
  total: number;
  /** The copyright line without the studio's name. */
  year: string;
}) {
  const featured = cards;
  const left = featured.filter((_, i) => i % 2 === 0);
  const right = featured.filter((_, i) => i % 2 === 1);

  // The section starts where the running head sticks, so the label never has
  // to jump to its sticky offset and the first row clears it.
  return (
    <section className="text-ink relative px-[var(--gutter)] pt-[calc(var(--corner)+56px)] pb-[10vh]">
      {/*
        The running head is sticky inside this block only, which ends above the
        closing row: a sticky element parks on its container's bottom edge as
        the container scrolls out, and with the whole section as the container
        the word parked on top of "View all" and the count.
      */}
      <div>
      <SpreadLabel>Work</SpreadLabel>

      <div className="mt-[10vh] grid grid-cols-2 gap-x-[4vw] max-tablet:grid-cols-1">
        <div className="grid content-start max-tablet:contents">
          {left.map((work, i) => (
            <WorkItem key={work.slug} work={work} offset={OFFSETS[i * 2]} index={i * 2} />
          ))}
        </div>

        <div className="grid content-start max-tablet:contents">
          {/* The one large statement on the page. */}
          <Reveal as="p" className="display mt-[4vh] max-w-[9em] text-[clamp(34px,3.4vw,52px)]" style={{ order: 1 }}>
            {statement[0]} {statement[1]}
          </Reveal>

          {right.map((work, i) => (
            <WorkItem key={work.slug} work={work} offset={OFFSETS[i * 2 + 1]} index={i * 2 + 1} />
          ))}
        </div>
      </div>
      </div>

      {/* The closing row: link, count, mark. */}
      <div className="mt-[16vh] grid grid-cols-2 items-baseline gap-x-[4vw] max-tablet:grid-cols-1 max-tablet:gap-y-[1em]">
        <TransitionLink
          href="/work"
          className="statement group py-[8px] text-[clamp(28px,3vw,44px)] opacity-60 transition-opacity duration-300 hover:opacity-100"
        >
          View all <span aria-hidden className="transition-colors duration-300 group-hover:text-accent">↳</span>
        </TransitionLink>
        <div className="flex items-baseline justify-between">
          <span className="label opacity-60">({String(total).padStart(2, "0")})</span>
          <span className="label opacity-60">{year}</span>
        </div>
      </div>
    </section>
  );
}
