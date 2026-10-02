"use client";

import { KOLKATA } from "@/lib/content";
import SectionHead from "@/components/ui/section-head";

/**
 * Home turf: the claim, then four ruled columns of context.
 */
export default function Kolkata({
  /** `h1` when this section opens a page, which it does on /studio. */
  titleAs = "h2",
  marker,
  surface = "ink",
}: {
  titleAs?: "h1" | "h2";
  marker?: string;
  surface?: "ink" | "paper";
} = {}) {
  const ink = surface === "ink";
  // The cards sit one level under the section's title, whichever level that is.
  const CardHeading = titleAs === "h1" ? "h2" : "h3";
  return (
    <section
      data-surface={ink ? "ink" : undefined}
      className={`${ink ? "surface-ink text-paper" : "text-ink"} px-[var(--gutter)] ${
        titleAs === "h1" ? "pt-[calc(var(--corner)+96px)] pb-[7em]" : "py-[7em]"
      }`}
    >
      <SectionHead
        marker={marker ?? KOLKATA.sign}
        title={KOLKATA.question}
        titleAs={titleAs}
        size={titleAs === "h1" ? "xl" : "lg"}
      />

      <div className="mt-[4em] grid grid-cols-4 gap-[1.5em] max-tablet:grid-cols-2 max-mobile:grid-cols-1">
        {KOLKATA.cards.map((card, index) => (
          <div key={card.title} className="rule border-t pt-[1.1em]">
            <span className="label opacity-60">
              ({String(index + 1).padStart(2, "0")})
            </span>
            <CardHeading className="statement mt-[1.5em] text-[1.25em]">{card.title}</CardHeading>
            <p className="mt-[0.5em] text-[0.9375em] opacity-70">{card.body}</p>
          </div>
        ))}
      </div>

    </section>
  );
}
