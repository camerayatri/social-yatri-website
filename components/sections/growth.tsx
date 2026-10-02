"use client";

import type { ContentDocs } from "@/lib/cms/schema";
import Counter from "@/components/effects/counter";
import SectionHead from "@/components/ui/section-head";

/** The numbers, set as large as the headline and ruled off from each other. */
export default function Growth({ growth }: { growth: ContentDocs["growth"] }) {
  return (
    <section className="text-ink relative px-[var(--gutter)] py-[7em]">
      <SectionHead
        marker={growth.sign}
        title={growth.question}
        sub={growth.sub}
        className="mb-[4em]"
      />

      {/*
        Before / after / change, as one line of display type.

        Every column is the same label-over-figure stack and the row aligns on
        `items-end`, which is what actually holds the four figures on one line.
        The delta used to be a bare number pushed right with `ml-auto`: with no
        label above it, it sat a label's height lower than everything else and
        read as though it belonged to the row below.
      */}
      <div className="rule flex flex-wrap items-end gap-x-[0.6em] gap-y-[0.75em] border-t pt-[1.5em]">
        <span className="flex flex-col">
          <span className="label opacity-60">{growth.before.label}</span>
          <span className="display text-[clamp(32px,5vw,80px)] opacity-40">
            {growth.before.value}
          </span>
        </span>

        <span
          aria-hidden
          className="display pb-[0.1em] text-[clamp(32px,5vw,80px)] opacity-40"
        >
          →
        </span>

        <span className="flex flex-col">
          <span className="label opacity-60">{growth.after.label}</span>
          <span className="display text-[clamp(32px,5vw,80px)]">
            {growth.after.value}{" "}
            <span className="label align-baseline opacity-60">{growth.after.unit}</span>
          </span>
        </span>

        <span className="ml-auto flex flex-col items-end">
          <span className="label opacity-60">{growth.deltaLabel}</span>
          <span className="display text-accent text-[clamp(32px,5vw,80px)]">
            {growth.delta}
          </span>
        </span>
      </div>

      <div className="mt-[3.5em] grid grid-cols-4 max-tablet:grid-cols-2 max-mobile:grid-cols-1">
        {growth.cells.map((cell) => (
          <div key={cell.label} className="rule border-t pt-[1.1em] pr-[1.5em] pb-[2em]">
            <div className="display text-[clamp(30px,3.6vw,58px)]">
              <Counter target={cell.target} suffix={cell.suffix} />
            </div>
            <div className="label mt-[0.9em] opacity-40">{cell.label}</div>
          </div>
        ))}
      </div>

    </section>
  );
}
