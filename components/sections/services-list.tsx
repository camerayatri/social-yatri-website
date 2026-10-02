"use client";

import Image from "next/image";

import type { ContentDocs } from "@/lib/cms/schema";
import SectionHead from "@/components/ui/section-head";
import TransitionLink from "@/components/transition/transition-link";

/**
 * Services as a ruled index.
 *
 * Set on ink, the one dark section in the home sequence: the alternation
 * the sequence runs, inverted. Each row is a full-width rule with the name at
 * display size; hovering pushes the row in and brings its line forward.
 */

/** One row: what it shows and where it goes, worked out on the server. */
export type ServiceRow = { no: string; name: string; tag: string; href: string; cover: string };

export default function ServicesList({
  intro,
  services,
  withHead = true,
}: {
  intro: Pick<ContentDocs["servicesIntro"], "sign" | "question" | "sub">;
  services: ServiceRow[];
  withHead?: boolean;
}) {
  return (
    <section data-surface="ink" className="surface-ink text-paper px-[var(--gutter)] py-[7em]">
      {withHead ? (
        <SectionHead
          marker={intro.sign}
          title={intro.question}
          sub={intro.sub}
          className="mb-[4em]"
        />
      ) : null}

      <div className="rule border-t">
        {services.map((service) => (
          <TransitionLink
            key={service.no}
            // Straight to that service's own section on /services.
            href={service.href}
            className="rule group relative grid grid-cols-[4em_1fr_10em] items-baseline gap-[1.5em] border-b py-[1.1em] transition-[padding] duration-500 hover:pl-[1em] max-tablet:grid-cols-[3em_1fr]"
            style={{ transitionTimingFunction: "var(--ease-brand)" }}
          >
            <span className="label opacity-60 transition-[color,opacity] duration-300 group-hover:text-accent group-hover:opacity-100">({service.no})</span>

            {/* A heading under the section's own, so the index reads as one in the outline. */}
            <h3 className="display text-[clamp(28px,4vw,60px)]">
              {service.name}
            </h3>

            <span className="label justify-self-end opacity-60 max-tablet:hidden">
              {service.tag}
            </span>

            {/* The stop's cover surfaces on hover. */}
            <span
              aria-hidden
              className="pointer-events-none absolute top-1/2 right-[11em] aspect-[16/10] w-[13vw] -translate-y-1/2 overflow-hidden opacity-0 transition-opacity duration-500 group-hover:opacity-100 max-tablet:hidden"
            >
              <Image src={service.cover} alt="" fill sizes="13vw" className="object-cover" />
            </span>
          </TransitionLink>
        ))}
      </div>
    </section>
  );
}
