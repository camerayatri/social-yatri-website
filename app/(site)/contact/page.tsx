import type { Metadata } from "next";

import { CONNECT, DIRECT, SITE } from "@/lib/content";
import { Marker } from "@/components/ui/section-head";
import Reveal from "@/components/effects/reveal";
import ContactForm from "@/components/sections/contact-form";

export const metadata: Metadata = {
  title: "Connect",
  description: SITE.description,
};

/**
 * Connect.
 *
 * Laid out as one grid rather than a section head with a form under it, which
 * is what the rest of the site uses and what this page used to use. Two things
 * made it wrong here.
 *
 * The details were the second thing in the left column, under a headline set
 * as large as any on the site, so the phone number started four hundred pixels
 * down a page whose entire purpose is to be contacted. They are the first
 * thing in the column now and are on screen before anybody scrolls.
 *
 * And a section head is its own grid, so anything sticky inside it can only
 * hold for that head's own height. One grid gives the left column the whole
 * length of the headline, the standfirst and the form to hold position
 * against, which is what keeps the number in view while the form is filled in.
 */
export default function ContactPage() {
  return (
    <main>
      <section className="text-ink px-[var(--gutter)] pt-[calc(var(--corner)+96px)] pb-[7em]">
        {/*
          Two rows: the marker's own height, then everything else. Without the
          `min-content` the headline column, which spans both, shares its height
          out between them and opens three hundred pixels of nothing between
          the marker and the details under it.
        */}
        <div className="grid grid-cols-[42%_1fr] grid-rows-[min-content_1fr] gap-x-[4vw] max-tablet:grid-cols-1 max-tablet:grid-rows-none">
          <div className="max-tablet:order-1">
            <Marker>{CONNECT.sign}</Marker>
          </div>

          {/*
            The headline column, spanning both rows, so the left column has
            something tall to stick against.
          */}
          <div className="row-span-2 max-tablet:order-2 max-tablet:row-span-1">
            <Reveal as="h1" className="display text-[clamp(44px,6.6vw,104px)]">
              {CONNECT.question}
            </Reveal>
            <Reveal
              as="p"
              className="mt-[1.75em] max-w-[30em] text-[0.9375em] leading-[1.4] opacity-70"
            >
              {CONNECT.sub}
            </Reveal>

            <div className="mt-[4em]">
              <ContactForm />
            </div>
          </div>

          {/*
            The details. Level with the top of the headline on a wide screen,
            held there while the form scrolls past, and released to the foot of
            the page below 992px where the columns stack and there is nothing
            to hold position against.
          */}
          <div className="max-tablet:order-3 max-tablet:mt-[4em]">
            <div className="sticky top-[calc(var(--nav-height)+2em)] mt-[1.75em] max-tablet:static max-tablet:mt-0">
              <p className="label mb-[1.25em] opacity-60">Direct</p>

              <div className="rule border-t">
                {/*
                  The same rows as the footer, from the same list. Anything
                  still unconfirmed is absent rather than guessed: a wrong
                  handle sends people to somebody else's account.
                */}
                {DIRECT.map((entry) => (
                  <a
                    key={entry.label}
                    href={entry.href ?? undefined}
                    {...(entry.href?.startsWith("http")
                      ? { target: "_blank", rel: "noreferrer" }
                      : null)}
                    className="rule hover:text-accent group flex items-baseline justify-between gap-[1.5em] border-b py-[0.9em] text-[1.0625em] opacity-80 transition-[opacity,padding,color] duration-300 hover:pl-[0.5em] hover:opacity-100"
                  >
                    <span>{entry.value}</span>
                    <span className="label-xs shrink-0 opacity-50 transition-opacity duration-300 group-hover:opacity-80">
                      {entry.label}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
