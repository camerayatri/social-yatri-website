import type { Metadata } from "next";

import { WORK_INTRO } from "@/lib/content";
import SectionHead from "@/components/ui/section-head";
import WorkGrid from "@/components/work/work-grid";

/* The categories named are the client's own ten, from `WORKS`. */
export const metadata: Metadata = {
  title: "Reels & Brand Video Portfolio",
  description:
    "Reels and brand videos by Social Yatri, a Kolkata content studio: clothing, cafes, fitness, hotels, co-living, product, store, wedding and interior films.",
  alternates: { canonical: "/work" },
};

export default function WorkPage() {
  return (
    <main>
      <section className="text-ink px-[var(--gutter)] pt-[calc(var(--corner)+96px)] pb-[7em]">
        <SectionHead
          marker={WORK_INTRO.sign}
          title={WORK_INTRO.question}
          sub={WORK_INTRO.sub}
          titleAs="h1"
          size="xl"
          className="mb-[4em]"
        />

        <WorkGrid />
      </section>
    </main>
  );
}
