/**
 * Structured data: the same facts the pages print, said again in schema.org
 * terms so a search engine does not have to infer them.
 *
 * Everything here is read from the content documents the pages are drawn
 * from (passed in, so a save in the admin reaches the structured data in the
 * same render as the page) and from `lib/seo.ts`. Nothing is
 * stated that the site does not already say: there are no opening hours and
 * no price range, because the client has given neither, and a guessed value
 * in structured data is shown to people as fact in the results page.
 */

import { serviceId } from "./cms/derive";
import type { ServiceDoc, SiteDoc, WorkDoc } from "./cms/schema";
import { DEFAULT_DESCRIPTION, GEO, MAP_CID_URL, MAP_URL, SITE_URL, absoluteUrl } from "./seo";

/*
 * Stable identifiers for the two sitewide nodes, so a page's own data can
 * point at the business by reference instead of describing it again.
 */
export const ORG_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;

const abs = absoluteUrl;

/*
 * The address as it was written when the fields below were taken apart from
 * it, and the map link the CID and the pin belong to. The parts, the pin and
 * the CID describe that one place; if the admin changes the address or the
 * map link, they would describe the old one, so they are only stated while
 * the content still names it.
 */
const ADDRESS_WRITTEN = "91/6, Beltala Road, Bhawanipur, Kolkata 700026";

/**
 * The business and the website, in one graph, printed once by the root
 * layout.
 *
 * `ProfessionalService` rather than plain `Organization`: it is a kind of
 * `LocalBusiness`, which is what ties a site to a place with an address and a
 * map pin, and the Google listing files the studio as a marketing agency, a
 * professional service. `sameAs` lists only profiles that exist: the
 * Instagram account when its handle is filled in, and the Maps listing.
 */
export function siteGraph(site: SiteDoc) {
  const instagram = site.instagram ? `https://instagram.com/${site.instagram}` : null;
  const samePlace = site.mapUrl === MAP_URL;
  const map = samePlace ? MAP_CID_URL : site.mapUrl;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ProfessionalService",
        "@id": ORG_ID,
        name: site.name,
        url: SITE_URL,
        logo: abs("/icon.png"),
        image: abs("/opengraph-image"),
        description: DEFAULT_DESCRIPTION,
        slogan: site.tagline,
        telephone: site.phoneHref.replace("tel:", ""),
        email: site.email,
        // `site.address`, taken apart into the fields an address has; a
        // changed address is stated whole until someone takes it apart here.
        address:
          site.address === ADDRESS_WRITTEN
            ? {
                "@type": "PostalAddress",
                streetAddress: "91/6, Beltala Road, Bhawanipur",
                addressLocality: "Kolkata",
                addressRegion: "West Bengal",
                postalCode: "700026",
                addressCountry: "IN",
              }
            : { "@type": "PostalAddress", streetAddress: site.address, addressCountry: "IN" },
        ...(samePlace && site.address === ADDRESS_WRITTEN
          ? { geo: { "@type": "GeoCoordinates", latitude: GEO.latitude, longitude: GEO.longitude } }
          : null),
        hasMap: map,
        areaServed: [
          { "@type": "City", name: "Kolkata" },
          { "@type": "Country", name: "India" },
        ],
        sameAs: [instagram, map].filter(Boolean),
      },
      {
        "@type": "WebSite",
        "@id": WEBSITE_ID,
        url: SITE_URL,
        name: site.name,
        inLanguage: "en-IN",
        publisher: { "@id": ORG_ID },
      },
    ],
  };
}

/**
 * The services page's list, one `Service` per stop, each pointing at its own
 * section of the page and at the business that provides it.
 */
export function servicesList(services: ServiceDoc[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Social Yatri services",
    itemListElement: services.map((service, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Service",
        name: service.name,
        serviceType: service.name,
        description: `${service.desc} ${service.body[0]}`,
        url: abs(`/services#${serviceId(service)}`),
        image: abs(service.cover.src),
        provider: { "@id": ORG_ID },
      },
    })),
  };
}

/** Home, then Work, then the category: the trail above a work page. */
export function workBreadcrumb(work: Pick<WorkDoc, "slug" | "title">) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Work", item: abs("/work") },
      { "@type": "ListItem", position: 3, name: work.title, item: abs(`/work/${work.slug}`) },
    ],
  };
}
