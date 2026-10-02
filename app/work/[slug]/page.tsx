import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SITE, WORKS } from "@/lib/content";
import { GALLERY } from "@/lib/gallery";
import { REELS } from "@/lib/reels";
import ShootViewer from "@/components/work/shoot-viewer";
import ReelStrip from "@/components/work/reel-strip";
import Reveal from "@/components/effects/reveal";
import BubbleButton from "@/components/effects/bubble-button";
import TransitionLink from "@/components/transition/transition-link";
import { Marker } from "@/components/ui/section-head";
import JsonLd from "@/components/seo/json-ld";
import { workBreadcrumb } from "@/lib/structured-data";

type Params = { slug: string };

/** Every category is known at build time, so the detail pages are static. */
export function generateStaticParams(): Params[] {
  return WORKS.map((work) => ({ slug: work.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const work = WORKS.find((item) => item.slug === slug);
  if (!work) return { title: "Not found" };

  /*
   * The counts are the page's own "In this set" figures, so the snippet and
   * the page cannot disagree. Kolkata is named as the studio's city, not as
   * where the footage was shot, which for some sets it was not.
   */
  const films = work.reels ? (REELS[work.reels]?.length ?? 0) : 0;
  const photos: number = work.shoot ? GALLERY[work.shoot].photos.length : 0;
  const counts = [
    films ? `${films} ${films === 1 ? "film" : "films"}` : null,
    photos ? `${photos} ${photos === 1 ? "photo" : "photos"}` : null,
  ]
    .filter(Boolean)
    .join(" and ");

  return {
    // "Store Video" would read "Store Video Reels & Videos".
    title: `${work.title.replace(/ Video$/, "")} Reels & Videos`,
    description: `${work.title} reels and videos by ${SITE.name}, a social media and content studio in Kolkata${counts ? `: ${counts} in this set` : ""}.`,
    alternates: { canonical: `/work/${work.slug}` },
  };
}

export default async function WorkPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const work = WORKS.find((item) => item.slug === slug);
  if (!work) notFound();

  const index = WORKS.indexOf(work);
  const next = WORKS[(index + 1) % WORKS.length];
  const reels = work.reels ? (REELS[work.reels] ?? []) : [];
  const shoot = work.shoot ? GALLERY[work.shoot] : null;

  return (
    <main className="text-ink">
      <JsonLd data={workBreadcrumb(work)} />
      <section className="px-[var(--gutter)] pt-[calc(var(--corner)+96px)] pb-[3em]">
        <Marker>Work</Marker>

        <Reveal as="h1" className="display mt-[0.6em] text-[clamp(44px,8vw,140px)]">
          {work.title}
        </Reveal>
      </section>

      {/*
        The footage first, because that is what the client shoots. The strip
        plays on hover and latches on a click.
      */}
      <ReelStrip reels={reels} />

      {/*
        Then the photography, where this category has any: one frame held large
        with the whole set beneath it, and choosing from the strip replaces it.
        Three of the ten categories have a shoot; the rest are video only and
        end above.
      */}
      {shoot ? (
        <div className="pt-[3em]">
          <ShootViewer shoot={shoot} openingSrc={shoot.photos[0].src} />
        </div>
      ) : null}

      {/* The facts, then the way on: all of the work, or the next category. */}
      <section className="px-[var(--gutter)] pt-[3em] pb-[7em]">
        <dl className="grid grid-cols-3 max-mobile:grid-cols-1">
          {[
            { term: "Category", value: work.title },
            { term: "Made in", value: SITE.city },
            {
              term: "In this set",
              value: `${reels.length} ${reels.length === 1 ? "film" : "films"}${
                shoot ? `, ${shoot.photos.length} frames` : ""
              }`,
            },
          ].map((item) => (
            <div key={item.term} className="rule border-t pt-[1em] pr-[1.5em] pb-[2em]">
              <dt className="label opacity-60">{item.term}</dt>
              <dd className="statement mt-[0.75em] text-[1.375em]">{item.value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-[4em] flex flex-wrap items-center gap-[1.5em]">
          <BubbleButton href="/work" invert>
            All work
          </BubbleButton>
          <TransitionLink
            href={`/work/${next.slug}`}
            // Vertical padding on an inline link grows the tap area to 44px
            // without touching the line it sits on.
            className="label py-[11px] opacity-65 transition-opacity duration-300 hover:opacity-100"
          >
            {next.title} ↗
          </TransitionLink>
        </div>
      </section>
    </main>
  );
}
