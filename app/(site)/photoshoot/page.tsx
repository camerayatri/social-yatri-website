import type { Metadata } from "next";

import { getContent } from "@/lib/cms/get-content";
import { orderedShoots, shootTotal } from "@/lib/cms/derive";
import { listOf, writtenFor } from "@/lib/seo";
import SectionHead from "@/components/ui/section-head";
import ShootStrips from "@/components/work/shoot-strips";
import JsonLd from "@/components/seo/json-ld";
import { photoshootCollection } from "@/lib/structured-data";

/*
 * Kolkata is where the studio is, not where these were shot: the wedding set
 * is in Rajasthan, and a title reading "photoshoots in Kolkata" would caption
 * those frames with a city they were not taken in. So the city is attached to
 * the studio and the shoots are named by what they are.
 *
 * The sentence names the shoots as they stood when it was written (below).
 * The frame count is always the content's own; the list of shoots is rebuilt
 * from their labels if the admin changes them.
 */
const WRITTEN_FOR = {
  name: "Social Yatri",
  labels: ["Wedding photography", "Interior photography", "Events and conferences", "Studio family portraits", "Fitness and athletes", "Hotels and resorts"],
};

/** The page's title, which its structured data names it by too. */
const TITLE = "Photoshoots: Weddings, Interiors & Events";

export async function generateMetadata(): Promise<Metadata> {
  const { site, shoots } = await getContent();
  const total = shootTotal(shoots);
  const facts = { name: site.name, labels: orderedShoots(shoots).map((shoot) => shoot.label) };
  return {
    title: TITLE,
    description: writtenFor(
      facts,
      WRITTEN_FOR,
      `The photoshoot portfolio of Social Yatri, a Kolkata content studio: weddings, interiors, events, studio family portraits, fitness and hotels. ${total} frames.`,
      () =>
        `The photoshoot portfolio of ${site.name}, a Kolkata content studio: ${listOf(facts.labels.map((l) => l.toLowerCase()))}. ${total} frames.`,
    ),
    alternates: { canonical: "/photoshoot" },
  };
}

/**
 * The photography, on its own.
 *
 * It used to sit at the foot of /work as an archive. /work is the client's
 * video categories now, and stills are a service they sell rather than a
 * footnote to the films, so the whole set moved up here and out of the work
 * page: one strip per shoot, every frame in it, nothing held back.
 */
export default async function PhotoshootPage() {
  const { photoshoot, shoots, site } = await getContent();
  return (
    <main className="text-ink">
      <JsonLd data={photoshootCollection(TITLE, site.name, shoots)} />
      <section className="px-[var(--gutter)] pt-[calc(var(--corner)+96px)] pb-[2em]">
        <SectionHead
          marker={photoshoot.sign}
          title={photoshoot.question}
          sub={photoshoot.sub}
          titleAs="h1"
          size="xl"
          aside={
            <p className="label opacity-60">
              {shootTotal(shoots)} frames · {photoshoot.sets}
            </p>
          }
          className="mb-[2em]"
        />
      </section>

      <ShootStrips shoots={orderedShoots(shoots)} />

      <div className="h-[6em]" />
    </main>
  );
}
