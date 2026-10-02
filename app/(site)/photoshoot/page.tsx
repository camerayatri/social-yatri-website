import type { Metadata } from "next";

import { PHOTOSHOOT } from "@/lib/content";
import SectionHead from "@/components/ui/section-head";
import ShootStrips, { shootTotal } from "@/components/work/shoot-strips";

export const metadata: Metadata = {
  title: "Photoshoot portfolio",
  description: PHOTOSHOOT.sub,
};

/**
 * The photography, on its own.
 *
 * It used to sit at the foot of /work as an archive. /work is the client's
 * video categories now, and stills are a service they sell rather than a
 * footnote to the films, so the whole set moved up here and out of the work
 * page: one strip per shoot, every frame in it, nothing held back.
 */
export default function PhotoshootPage() {
  return (
    <main className="text-ink">
      <section className="px-[var(--gutter)] pt-[calc(var(--corner)+96px)] pb-[2em]">
        <SectionHead
          marker={PHOTOSHOOT.sign}
          title={PHOTOSHOOT.question}
          sub={PHOTOSHOOT.sub}
          titleAs="h1"
          size="xl"
          aside={
            <p className="label opacity-60">
              {shootTotal()} frames · {PHOTOSHOOT.sets}
            </p>
          }
          className="mb-[2em]"
        />
      </section>

      <ShootStrips />

      <div className="h-[6em]" />
    </main>
  );
}
