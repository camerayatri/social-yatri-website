import type { Metadata } from "next";

import KolkataSection from "@/components/sections/kolkata";
import Clients from "@/components/sections/clients";
import MarqueeStrip from "@/components/sections/marquee-strip";

/*
 * The figures are the two case studies' own, as `CLIENTS` prints them on this
 * page, and are not rounded or restated.
 */
export const metadata: Metadata = {
  title: "Kolkata Content Studio & Client Results",
  description:
    "Born in Kolkata, built for the internet. Koliving grew from 300 to 5,000+ followers with 15M+ views; EnvyMe Fashion from 12K to 4.1 lakh+ followers.",
  alternates: { canonical: "/studio" },
};

export default function StudioPage() {
  return (
    <main>
      <KolkataSection titleAs="h1" marker="Studio" surface="paper" />

      <MarqueeStrip />
      <Clients surface="paper" />
    </main>
  );
}
