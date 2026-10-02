import Hero from "@/components/sections/hero";
import Works from "@/components/sections/works";
// import StudioNote from "@/components/sections/studio-note";
import RouteSteps from "@/components/sections/route-steps";
import ServicesList from "@/components/sections/services-list";
import Growth from "@/components/sections/growth";
import Clients from "@/components/sections/clients";

/**
 * Home: the spiral, then what we do, the work it made, how it gets made, the
 * studio, the numbers and the brands they were made for; the footer carries
 * the call to action.
 *
 * The clients section runs brief here. In full it is two complete case studies
 * with their own reel strips, which is a page of its own and is one: /studio.
 */
export default function HomePage() {
  return (
    <main>
      <Hero />
      {/* What we do comes straight after the showreel, before the work it made. */}
      <ServicesList />
      <Works />
      {/* The eight stages, drawn over the Howrah Bridge, straight after the work they produce. */}
      <RouteSteps />
      {/*
        The studio section is held back for now at the user's request
        (2026-09-18); it stays wired so it can return with one line.
      */}
      {/* <StudioNote /> */}
      <Growth />
      <Clients variant="brief" />
    </main>
  );
}
