import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { getContent } from "@/lib/cms/get-content";
import { findService, relatedWorks, serviceId, serviceNeighbours, wallCards } from "@/lib/cms/derive";
import { sentencesWithin } from "@/lib/seo";
import { servicePage } from "@/lib/structured-data";
import SectionHead, { Marker } from "@/components/ui/section-head";
import Reveal from "@/components/effects/reveal";
import BubbleButton from "@/components/effects/bubble-button";
import TransitionLink from "@/components/transition/transition-link";
import WorkGrid from "@/components/work/work-grid";
import JsonLd from "@/components/seo/json-ld";

type Params = { slug: string };

/*
 * One page per service, at the same id its section on /services carries, so
 * /services#branding and /services/branding are the same service by the same
 * name. Until these existed, a search for one service could only land on the
 * whole list.
 *
 * Every service in the content at build time is prerendered. One added in the
 * admin afterwards renders on its first visit and is cached from then on, as
 * the work pages are; a slug no service has is a 404.
 */
export const dynamicParams = true;

export async function generateStaticParams(): Promise<Params[]> {
  const { services } = await getContent();
  return services.map((service) => ({ slug: serviceId(service) }));
}

/** What a title may run to before a results page starts cutting it off. */
const TITLE_MAX = 60;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const { services, site } = await getContent();
  const service = findService(services, slug);
  if (!service) return { title: "Not found" };

  /*
   * The layout's template appends " · Social Yatri". The city is named for the
   * search people make ("branding agency Kolkata"), and dropped for a name so
   * long that it would push the title past what a results page shows.
   */
  const local = `${service.name} in Kolkata`;
  const title = `${local} · ${site.name}`.length <= TITLE_MAX ? local : service.name;

  return {
    title,
    // The service's own promise, then its own copy, in whole sentences.
    description: sentencesWithin([service.desc, ...service.body]),
    alternates: { canonical: `/services/${slug}` },
  };
}

export default async function ServicePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const content = await getContent();
  const { services, servicesIntro, connect, nav, works, reels } = content;
  const service = findService(services, slug);
  if (!service) notFound();

  const related = wallCards({ works: relatedWorks(service, works), reels });
  const around = serviceNeighbours(services, slug);
  const workLabel = nav.find((item) => item.href === "/work")?.label ?? "Work";

  return (
    <main className="text-ink">
      <JsonLd data={servicePage(service)} />

      {/*
        The services page's own head, with the service in place of the
        question: the list's sign, the stop's number and tag under it, and
        the client's one-line promise as the standfirst.
      */}
      <section className="px-[var(--gutter)] pt-[calc(var(--corner)+96px)] pb-[3em]">
        <SectionHead
          marker={servicesIntro.sign}
          aside={
            <p className="label opacity-60">
              ({service.no}) {service.tag}
            </p>
          }
          title={service.name}
          sub={service.desc}
          titleAs="h1"
          size="xl"
        />
      </section>

      {/* The tab's body from /services: the cover in the marker column, the copy on the headline's axis. */}
      <section className="grid grid-cols-[42%_1fr] gap-[4vw] px-[var(--gutter)] pt-[1em] pb-[5em] max-tablet:grid-cols-1 max-tablet:gap-[2.5em]">
        <div className="relative aspect-16/10 overflow-hidden">
          <Image
            src={service.cover.src}
            alt={service.cover.alt}
            fill
            // In view on arrival on every screen, so it is not left to lazy loading.
            loading="eager"
            sizes="(max-width: 992px) 100vw, 42vw"
            className="object-cover"
          />
        </div>

        <div>
          <div className="max-w-[32em]">
            {service.body.map((paragraph) => (
              <Reveal key={paragraph} as="p" className="mt-[1em] text-[1.0625em] opacity-70 first:mt-0">
                {paragraph}
              </Reveal>
            ))}
          </div>

          <ul className="mt-[2.5em] max-w-[30em]">
            {service.detail.map((line) => (
              <li key={line} className="rule border-t py-[0.9em]">
                <Reveal as="span" splitLines={false} className="block text-[1.0625em] opacity-60">
                  {line}
                </Reveal>
              </li>
            ))}
          </ul>

          {service.goal ? (
            <div className="rule mt-[2.5em] max-w-[30em] border-t pt-[1.1em]">
              <span className="label block opacity-60">Goal</span>
              <p className="statement mt-[0.5em] text-[1.25em]">{service.goal}</p>
            </div>
          ) : null}

          {/* The footer's own call to action, straight to the form. */}
          <div className="mt-[3em]">
            <BubbleButton href="/contact" invert>
              {connect.submit.replace(" →", "")}
            </BubbleButton>
          </div>
        </div>
      </section>

      {/*
        The work category that is this service, where one is. Only a category
        with the service's own name counts; see `relatedWorks`.
      */}
      {related.length > 0 ? (
        <section className="px-[var(--gutter)] pb-[5em]">
          <Marker className="mb-[2em]">{workLabel}</Marker>
          <WorkGrid cards={related} />
        </section>
      ) : null}

      {/* The way on: the stops either side, in the list's order. */}
      {around ? (
        <nav aria-label={servicesIntro.sign} className="px-[var(--gutter)] pb-[7em]">
          <div className="rule grid grid-cols-2 border-t max-mobile:grid-cols-1">
            {[
              { service: around.prev, arrow: "←", align: "" },
              { service: around.next, arrow: "→", align: "text-right max-mobile:text-left" },
            ].map(({ service: stop, arrow, align }) => (
              <TransitionLink
                key={arrow}
                href={`/services/${serviceId(stop)}`}
                rel={arrow === "←" ? "prev" : "next"}
                className={`group block py-[1.5em] ${align}`}
              >
                <span className="label opacity-60 transition-[color,opacity] duration-300 group-hover:text-accent group-hover:opacity-100">
                  {arrow === "←" ? `${arrow} (${stop.no})` : `(${stop.no}) ${arrow}`}
                </span>
                <span className="statement mt-[0.5em] block text-[clamp(20px,2.4vw,34px)]">{stop.name}</span>
              </TransitionLink>
            ))}
          </div>
        </nav>
      ) : null}
    </main>
  );
}
