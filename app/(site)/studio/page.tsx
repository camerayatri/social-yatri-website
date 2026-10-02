import type { Metadata } from "next";

import { getContent } from "@/lib/cms/get-content";
import { writtenFor } from "@/lib/seo";
import KolkataSection from "@/components/sections/kolkata";
import Clients from "@/components/sections/clients";
import MarqueeStrip from "@/components/sections/marquee-strip";

/*
 * The figures are the two case studies' own, as the clients section prints
 * them on this page, and are not rounded or restated.
 *
 * The sentence was written against the claims below. While the case studies
 * still make them, it stands; once one is edited, the description is the
 * case studies' own claims instead, so it can never quote a superseded figure.
 */
const CLAIMS_WRITTEN = [
  { name: "Koliving", claim: "From 300 followers to 5,000+, and 15M+ views." },
  { name: "EnvyMe Fashion", claim: ["From 12K to", "4.1 lakh+ followers."] },
];

export async function generateMetadata(): Promise<Metadata> {
  const { clients } = await getContent();
  const claims = clients.cases.map((study) => ({ name: study.name, claim: study.claim }));
  return {
    title: "Kolkata Content Studio & Client Results",
    description: writtenFor(
      claims,
      CLAIMS_WRITTEN,
      "Born in Kolkata, built for the internet. Koliving grew from 300 to 5,000+ followers with 15M+ views; EnvyMe Fashion from 12K to 4.1 lakh+ followers.",
      () =>
        `Born in Kolkata, built for the internet. ${claims
          .map(({ name, claim }) => `${name}: ${typeof claim === "string" ? claim : claim.join(" ")}`)
          .join(" ")}`,
    ),
    alternates: { canonical: "/studio" },
  };
}

export default async function StudioPage() {
  const { kolkata, marquee, clients } = await getContent();
  return (
    <main>
      <KolkataSection kolkata={kolkata} titleAs="h1" marker="Studio" surface="paper" />

      <MarqueeStrip phrases={marquee} />
      <Clients clients={clients} surface="paper" />
    </main>
  );
}
