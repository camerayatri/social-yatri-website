import type { Metadata } from "next";
import Image from "next/image";

import { getContent } from "@/lib/cms/get-content";
import { serviceId } from "@/lib/cms/derive";
import { StickyTab, StickyTabGroup } from "@/components/effects/sticky-tabs";
import SectionHead from "@/components/ui/section-head";
import Reveal from "@/components/effects/reveal";
import MarqueeStrip from "@/components/sections/marquee-strip";
import JsonLd from "@/components/seo/json-ld";
import TransitionLink from "@/components/transition/transition-link";
import { servicesList } from "@/lib/structured-data";

/*
 * The standfirst ("We turn brands into stories people remember.") was the
 * description here, and it names neither a service nor a place. This one
 * names all ten, in the order the page runs them.
 */
export const metadata: Metadata = {
  title: "Social Media & Content Services in Kolkata",
  description:
    "Social media management and marketing, content creation and strategy, UGC videos, branding, ad films, websites and performance marketing from Kolkata.",
  alternates: { canonical: "/services" },
};

export default async function ServicesPage() {
  const { services, servicesIntro, why, marquee } = await getContent();
  return (
    <main>
      <JsonLd data={servicesList(services)} />
      <section className="text-ink px-[var(--gutter)] pt-[calc(var(--corner)+96px)] pb-[3em]">
        <SectionHead
          marker={servicesIntro.sign}
          title={servicesIntro.question}
          sub={servicesIntro.sub}
          titleAs="h1"
          size="xl"
        />

        <div className="mt-[3em] grid grid-cols-[42%_1fr] gap-[4vw] max-tablet:grid-cols-1">
          <div />
          <div className="max-w-[34em]">
            {servicesIntro.body.map((paragraph) => (
              <Reveal key={paragraph} as="p" className="mt-[1em] text-[1.0625em] opacity-70">
                {paragraph}
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/*
        Sticky section tabs. Each stop's header pins under the site
        header and the next arrives on top of it, so the list reads as a stack
        of tabs. The header row shares its grid with the services index on the
        home page (index, name, tag) and each body puts the client's cover in
        the marker column and the copy on the headline's axis, so the page
        keeps one grid.
      */}
      <StickyTabGroup>
        {services.map((service) => {
          return (
            <StickyTab
              key={service.no}
              id={serviceId(service)}
              className="text-ink"
              header={
                <div className="surface-paper border-ink/15 grid grid-cols-[4em_1fr_10em] items-baseline gap-[1.5em] border-y px-[var(--gutter)] py-[0.9em] max-tablet:grid-cols-[3em_1fr]">
                  <span className="label opacity-60">({service.no})</span>
                  {/*
                    The name is the way to the service's own page; the tab
                    keeps its anchor, so /services#id still lands here.
                  */}
                  <h2 className="display text-[clamp(26px,4vw,60px)]">
                    <TransitionLink
                      href={`/services/${serviceId(service)}`}
                      className="transition-colors duration-300 hover:text-accent"
                    >
                      {service.name}
                    </TransitionLink>
                  </h2>
                  <span className="label justify-self-end opacity-60 max-tablet:hidden">
                    {service.tag}
                  </span>
                </div>
              }
            >
              <div className="grid grid-cols-[42%_1fr] gap-[4vw] px-[var(--gutter)] pt-[2.5em] pb-[5em] max-tablet:grid-cols-1 max-tablet:gap-[2.5em]">
                {/* The client's cover for this stop. */}
                <div className="relative aspect-16/10 overflow-hidden">
                  <Image
                    src={service.cover.src}
                    alt={service.cover.alt}
                    fill
                    sizes="(max-width: 992px) 100vw, 42vw"
                    className="object-cover"
                  />
                </div>

                <div>
                  <p className="statement max-w-[14em] text-[clamp(20px,2.4vw,34px)] opacity-70">
                    {service.desc}
                  </p>

                  <div className="mt-[1.5em] max-w-[32em]">
                    {service.body.map((paragraph) => (
                      <Reveal
                        key={paragraph}
                        as="p"
                        className="mt-[1em] text-[1.0625em] opacity-70"
                      >
                        {paragraph}
                      </Reveal>
                    ))}
                  </div>

                  <ul className="mt-[2.5em] max-w-[30em]">
                    {service.detail.map((line) => (
                      <li key={line} className="rule border-t py-[0.9em]">
                        <Reveal
                          as="span"
                          splitLines={false}
                          className="block text-[1.0625em] opacity-60"
                        >
                          {line}
                        </Reveal>
                      </li>
                    ))}
                  </ul>

                  {/* The client wrote a goal line for the first stop only. */}
                  {service.goal ? (
                    <div className="rule mt-[2.5em] max-w-[30em] border-t pt-[1.1em]">
                      <span className="label block opacity-60">Goal</span>
                      <p className="statement mt-[0.5em] text-[1.25em]">{service.goal}</p>
                    </div>
                  ) : null}
                </div>
              </div>
            </StickyTab>
          );
        })}
      </StickyTabGroup>

      {/* Why Social Yatri: the client's closing argument, set on ink. */}
      <section
        data-surface="ink"
        className="surface-ink text-paper px-[var(--gutter)] py-[7em]"
      >
        <SectionHead marker={why.sign} title={why.question} className="mb-[3em]" />

        <div className="grid grid-cols-[42%_1fr] gap-[4vw] max-tablet:grid-cols-1 max-tablet:gap-[2em]">
          {/*
            Three near-identical lines and then the turn. Ruled apart and set at
            statement size so the repetition is the point, with the last line
            carried in the brand colour because it is the one that answers them.
          */}
          <div>
            {why.list.map((line) => (
              <Reveal
                key={line}
                as="p"
                className="rule statement border-t py-[0.9em] text-[1.125em] opacity-60"
              >
                {line}
              </Reveal>
            ))}
            <Reveal
              as="p"
              className="rule statement text-accent border-t py-[0.9em] text-[1.5em]"
            >
              {why.turn}
            </Reveal>
          </div>

          <div className="max-w-[34em]">
            {why.body.map((paragraph) => (
              <Reveal key={paragraph} as="p" className="mt-[1em] text-[1.0625em] opacity-70">
                {paragraph}
              </Reveal>
            ))}

            <Reveal
              as="p"
              className="display mt-[2em] max-w-[10em] text-[clamp(24px,2.8vw,44px)]"
            >
              {why.ask}
            </Reveal>
            <Reveal as="p" className="mt-[1em] text-[1.0625em] opacity-70">
              {why.close}
            </Reveal>
          </div>
        </div>
      </section>

      <MarqueeStrip phrases={marquee} />
    </main>
  );
}
