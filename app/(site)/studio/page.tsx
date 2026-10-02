import type { Metadata } from "next";

import { SITE } from "@/lib/content";
import KolkataSection from "@/components/sections/kolkata";
import Clients from "@/components/sections/clients";
import MarqueeStrip from "@/components/sections/marquee-strip";

export const metadata: Metadata = {
  title: "Studio",
  description: SITE.description,
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
