import type { SiteDoc } from "@/lib/cms/schema";
import { ORG_ID } from "@/lib/structured-data";
import { SITE_URL, absoluteUrl } from "@/lib/seo";

/**
 * The contact page in schema.org terms: a `ContactPage` about the business,
 * and the business's `contactPoint`.
 *
 * The business itself is described once, by the root layout, under `ORG_ID`.
 * The second node here names the same `@id`, so a crawler merges the contact
 * point into that description rather than reading a second business. Every
 * value is one the page prints: the number and the address in the Direct
 * column. The one language stated is English, because that is what the site
 * and the form are written in; no other is claimed, since nothing on the site
 * says a call can be taken in one.
 */
export function contactPage(site: Pick<SiteDoc, "email" | "phoneHref">, title: string, description: string) {
  const url = absoluteUrl("/contact");
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ContactPage",
        "@id": `${url}#webpage`,
        url,
        name: title,
        description,
        inLanguage: "en-IN",
        isPartOf: { "@id": `${SITE_URL}/#website` },
        about: { "@id": ORG_ID },
        mainEntity: { "@id": ORG_ID },
      },
      {
        "@id": ORG_ID,
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "customer service",
          telephone: site.phoneHref.replace("tel:", ""),
          email: site.email,
          areaServed: "IN",
          availableLanguage: ["English"],
        },
      },
    ],
  };
}
