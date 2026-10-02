"use client";

import type { ReactNode } from "react";
import Image from "next/image";

import type { ContentDocs } from "@/lib/cms/schema";
import FlipScrollScene from "@/components/effects/flip-scroll";
import Reveal from "@/components/effects/reveal";
import Poster from "@/components/work/poster";
import { Marker } from "@/components/ui/section-head";

function Waypoint({ className, children }: { className?: string; children?: ReactNode }) {
  return (
    <div className={`relative ${className ?? ""}`}>
      <div data-flip-element="wrapper" className="absolute inset-0 h-full w-full">
        {children}
      </div>
    </div>
  );
}

/**
 * The studio.
 *
 * A marker on the left with a small still and the claim under it, the
 * paragraph on the right at reading size, then one large frame in a row of
 * its own. The frame is the target of the GSAP Flip scene: it grows to the
 * full viewport in the next section and lands as a column-width still beside
 * the closing claim.
 *
 * The target is transformed out of the first section and across the next two,
 * so those two carry no background of their own and the first sits above them:
 * an opaque later sibling would otherwise paint straight over the frame. The
 * frame also shares no row with anything, so its first leg grows over space
 * rather than over the copy.
 */
export default function StudioNote({ about, photos }: { about: ContentDocs["about"]; photos: ContentDocs["photos"] }) {
  const still = photos.studioNote;
  const showreel = photos.showreel;

  return (
    <FlipScrollScene>
      <section className="text-ink relative z-[2] px-[var(--gutter)] pt-[8vh] pb-[4vh]">
        <div className="grid grid-cols-[42%_1fr] gap-[4vw] max-tablet:grid-cols-1">
          <div>
            <Marker>{about.sign}</Marker>
            <div className="mt-[2em] max-w-[212px]">
              <div className="relative aspect-[1/1] overflow-hidden">
                <Image
                  src={still.src}
                  alt={still.alt}
                  fill
                  sizes="212px"
                  className="object-cover"
                  style={{ objectPosition: still.focus }}
                />
              </div>
              <p className="mt-[1em] text-[0.9375em] leading-[1.3]">{about.claim}</p>
            </div>
          </div>

          <Reveal
            as="p"
            className="max-w-[30em] text-[clamp(18px,1.55vw,22px)] leading-[1.35] tracking-[-0.01em]"
          >
            {about.body[0]}
          </Reveal>
        </div>

        <div className="mt-[4vh] grid grid-cols-[42%_1fr] gap-[4vw] max-tablet:grid-cols-1">
          <Waypoint className="col-start-2 aspect-[16/10] w-full max-tablet:col-start-1">
            <div
              data-flip-element="target"
              className="absolute top-0 left-0 h-full w-full overflow-hidden [isolation:isolate] will-change-transform"
            >
              <Poster photo={showreel} sizes="100vw" />
            </div>
          </Waypoint>
        </div>
      </section>

      {/*
        Full bleed inside the gutters, sized to the viewport rather than to an
        aspect ratio, so the grown frame is seen whole on any screen. Hidden
        for reduced motion, where the frame lands in the last waypoint at once.
      */}
      <section className="relative flex min-h-dvh items-center px-[var(--gutter)] py-[var(--gutter)] max-mobile:min-h-[60vh] motion-reduce:hidden">
        <Waypoint className="h-[calc(100dvh-2*var(--gutter))] w-full max-mobile:h-[calc(60vh-2*var(--gutter))]" />
      </section>

      <section className="text-ink relative px-[var(--gutter)] pt-[4vh] pb-[10vh]">
        <div className="grid grid-cols-[42%_1fr] items-end gap-[4vw] max-tablet:grid-cols-1">
          <Waypoint className="aspect-[16/10] w-full" />
          <div>
            {/* Held back until the frame has narrowed into its column. */}
            <Reveal as="h2" start="top 45%" className="display max-w-[10em] text-[clamp(30px,3.4vw,52px)]">
              {about.close.join(" ")}
            </Reveal>
            <Reveal
              as="p"
              start="top 45%"
              className="mt-[1.5em] max-w-[30em] text-[0.9375em] leading-[1.4] opacity-70"
            >
              {about.body[1]}
            </Reveal>
          </div>
        </div>
      </section>
    </FlipScrollScene>
  );
}
