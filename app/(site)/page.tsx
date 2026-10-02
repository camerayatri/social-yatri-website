import type { Metadata } from "next";

import { getContent } from "@/lib/cms/get-content";
import { homeCards, serviceId } from "@/lib/cms/derive";
import Hero from "@/components/sections/hero";
import Works from "@/components/sections/works";
// import StudioNote from "@/components/sections/studio-note";
import RouteSteps from "@/components/sections/route-steps";
import ServicesList from "@/components/sections/services-list";
import Growth from "@/components/sections/growth";
import Clients from "@/components/sections/clients";

/*
 * The title and description are the layout's defaults, which are written for
 * this page; only the canonical has to be said here, because the layout
 * deliberately sets none.
 */
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

/**
 * Home: the spiral, then what we do, the work it made, how it gets made, the
 * studio, the numbers and the brands they were made for; the footer carries
 * the call to action.
 *
 * The clients section runs brief here. In full it is two complete case studies
 * with their own reel strips, which is a page of its own and is one: /studio.
 *
 * Every section is a client component, so each is handed only what it prints:
 * the services as rows with their link worked out, the six featured works with
 * their covers chosen, and so on, rather than whole documents it would pick
 * through in the browser.
 */
export default async function HomePage() {
  const content = await getContent();
  const { hero, site, servicesIntro, services, works } = content;

  return (
    <main>
      <Hero eyebrow={hero.eyebrow} lede={hero.lede} tagline={site.tagline} clips={content.showreel} />
      {/* What we do comes straight after the showreel, before the work it made. */}
      <ServicesList
        intro={{ sign: servicesIntro.sign, question: servicesIntro.question, sub: servicesIntro.sub }}
        services={services.map((service) => ({
          no: service.no,
          name: service.name,
          tag: service.tag,
          href: `/services#${serviceId(service)}`,
          cover: service.cover.src,
        }))}
      />
      <Works
        cards={homeCards(content)}
        statement={hero.headline}
        total={works.length}
        year={site.copyright.replace(site.name, "").trim()}
      />
      {/* The eight stages, drawn over the Howrah Bridge, straight after the work they produce. */}
      <RouteSteps stages={content.process} />
      {/*
        The studio section is held back for now at the user's request
        (2026-09-18); it stays wired so it can return with one line.
      */}
      {/* <StudioNote about={content.about} photos={content.photos} /> */}
      <Growth growth={content.growth} />
      <Clients clients={content.clients} variant="brief" />
    </main>
  );
}
