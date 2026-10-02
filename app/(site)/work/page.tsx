import type { Metadata } from "next";

import { getContent } from "@/lib/cms/get-content";
import { wallCards } from "@/lib/cms/derive";
import { listOf, writtenFor } from "@/lib/seo";
import SectionHead from "@/components/ui/section-head";
import WorkGrid from "@/components/work/work-grid";
import JsonLd from "@/components/seo/json-ld";
import { workCollection } from "@/lib/structured-data";

/*
 * The categories named are the client's own, from the works document. The
 * sentence was written against the list below; if the admin adds, renames or
 * removes a category, the description lists the categories as they now are.
 */
const WRITTEN_FOR = {
  name: "Social Yatri",
  titles: ["Clothing", "Cafe", "Fitness", "Hotel & Resort", "Co-Living Space", "Product Spotlight", "Store Video", "Wedding Content", "Interior", "Personal Branding"],
};

/** The page's title, which its structured data names it by too. */
const TITLE = "Reels & Brand Video Portfolio";

export async function generateMetadata(): Promise<Metadata> {
  const { site, works } = await getContent();
  const facts = { name: site.name, titles: works.map((work) => work.title) };
  return {
    title: TITLE,
    description: writtenFor(
      facts,
      WRITTEN_FOR,
      "Reels and brand videos by Social Yatri, a Kolkata content studio: clothing, cafes, fitness, hotels, co-living, product, store, wedding and interior films.",
      () => `Reels and brand videos by ${site.name}, a Kolkata content studio: ${listOf(facts.titles.map((t) => t.toLowerCase()))}.`,
    ),
    alternates: { canonical: "/work" },
  };
}

export default async function WorkPage() {
  const content = await getContent();
  const { workIntro } = content;
  return (
    <main>
      <JsonLd data={workCollection(TITLE, content)} />
      <section className="text-ink px-[var(--gutter)] pt-[calc(var(--corner)+96px)] pb-[7em]">
        <SectionHead
          marker={workIntro.sign}
          title={workIntro.question}
          sub={workIntro.sub}
          titleAs="h1"
          size="xl"
          className="mb-[4em]"
        />

        <WorkGrid cards={wallCards(content)} />
      </section>
    </main>
  );
}
