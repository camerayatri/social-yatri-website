"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";

import type { ContentDocs } from "@/lib/cms/schema";
import { gsap } from "@/lib/gsap";
import HowrahBridge from "@/components/effects/howrah-bridge";
import Reveal from "@/components/effects/reveal";
import SectionHead from "@/components/ui/section-head";

/**
 * The eight stages, drawn as a flight over the Howrah Bridge.
 *
 * The stroke is revealed in lockstep with
 * the scrollbar, so the line is always exactly as far along as the reader is.
 * Here the line is the bridge's own profile and a paper plane rides its head,
 * with the structure assembling near to far behind it.
 *
 * One drawing: sticky beside the steps on desktop, and across the top of the
 * list on phones, where a 40px column would show nothing. The block below
 * carries `data-bridge-scene`, which is what the drawing scrolls against, so
 * the flight is paced by the eight stages rather than by its own height.
 */
export default function RouteSteps({ stages }: { stages: ContentDocs["process"] }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const steps = gsap.utils.toArray<HTMLElement>(
        root.current?.querySelectorAll("[data-route-step]") ?? [],
      );

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        gsap.set(steps, { "--step-on": 1 });
        return;
      }

      steps.forEach((step) => {
        gsap.to(step, {
          "--step-on": 1,
          duration: 0.5,
          ease: "power2.out",
          scrollTrigger: { trigger: step, start: "top 78%", once: true },
        });
      });
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      className="text-ink relative px-[var(--gutter)] py-[7em]"
    >
      <SectionHead
        marker={stages.sign}
        title={stages.question}
        sub={stages.sub}
        className="mb-[4em]"
      />

      <div
        data-bridge-scene
        className="relative grid grid-cols-[42%_1fr] gap-[4vw] max-tablet:grid-cols-[38%_1fr] max-tablet:gap-[2em] max-mobile:grid-cols-1 max-mobile:gap-[2em]"
      >
        <div className="relative">
          <HowrahBridge className="sticky top-[calc(var(--nav-height)+2em)] w-full max-mobile:static" />
        </div>

        <ol className="relative">
          {stages.steps.map((step) => (
            <li
              key={step.no}
              data-route-step
              className="rule grid grid-cols-[4em_1fr] items-baseline gap-x-[1.5em] border-t py-[1.75em] last:pb-0 max-mobile:grid-cols-1 max-mobile:gap-y-[0.5em]"
              style={{ ["--step-on" as string]: 0 }}
            >
              <span
                className="label"
                style={{
                  color: "color-mix(in srgb, var(--accent) calc(var(--step-on) * 100%), currentColor)",
                  opacity: "calc(0.35 + var(--step-on) * 0.65)",
                }}
              >
                ({step.no})
              </span>
              <div>
                <Reveal
                  as="h3"
                  splitLines={false}
                  className="statement text-[clamp(22px,2.8vw,40px)]"
                >
                  {step.title}
                </Reveal>
                <p className="mt-[0.5em] max-w-[30em] text-[0.9375em] opacity-65">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
