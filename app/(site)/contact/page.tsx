import type { Metadata } from "next";

import { getContent } from "@/lib/cms/get-content";
import { direct } from "@/lib/cms/derive";
import { Marker } from "@/components/ui/section-head";
import Reveal from "@/components/effects/reveal";
import ContactForm from "@/components/sections/contact-form";
import { Icon } from "@/components/ui/icons";
import JsonLd from "@/components/seo/json-ld";
import { contactPage } from "./structured-data";

/*
 * The whole point of the page, in the snippet: somebody searching for the
 * studio's number gets it from the results page without a click. Read from
 * the content, so a new number saved in the admin is the number in the
 * snippet too.
 */
const TITLE = "Contact a Social Media Agency in Kolkata";
const describe = (site: { name: string; address: string; phone: string; email: string }, question: string) =>
  `Visit ${site.name} at ${site.address}, call ${site.phone} or email ${site.email}. ${question}`;

export async function generateMetadata(): Promise<Metadata> {
  const { site, connect } = await getContent();
  return {
    title: TITLE,
    description: describe(site, connect.question),
    alternates: { canonical: "/contact" },
  };
}

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
export default async function ContactPage() {
  const { site, connect } = await getContent();
  return (
    <main>
      <JsonLd data={contactPage(site, TITLE, describe(site, connect.question))} />
      <section className="text-ink px-[var(--gutter)] pt-[calc(var(--corner)+96px)] pb-[7em]">
        {/*
          Two rows: the marker's own height, then everything else. Without the
          `min-content` the headline column, which spans both, shares its height
          out between them and opens three hundred pixels of nothing between
          the marker and the details under it.
        */}
        <div className="grid grid-cols-[42%_1fr] grid-rows-[min-content_1fr] gap-x-[4vw] max-tablet:grid-cols-1 max-tablet:grid-rows-none">
          <div className="max-tablet:order-1">
            <Marker>{connect.sign}</Marker>
          </div>

          {/*
            The headline column, spanning both rows, so the left column has
            something tall to stick against.
          */}
          <div className="row-span-2 max-tablet:order-2 max-tablet:row-span-1">
            <Reveal as="h1" className="display text-[clamp(44px,6.6vw,104px)]">
              {connect.question}
            </Reveal>
            <Reveal
              as="p"
              className="mt-[1.75em] max-w-[30em] text-[0.9375em] leading-[1.4] opacity-70"
            >
              {connect.sub}
            </Reveal>

            <div className="mt-[4em]">
              <ContactForm
                connect={connect}
                contacts={{ email: site.email, phone: site.phone, phoneHref: site.phoneHref }}
              />
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
                {direct(site).map((entry) => {
                  const external = entry.href?.startsWith("http") ?? false;
                  return (
                    <a
                      key={entry.label}
                      href={entry.href ?? undefined}
                      // Both words, though `noreferrer` implies `noopener` in
                      // every current browser: older in-app browsers (the
                      // ones Instagram and Facebook open links in) honour
                      // only the one they know.
                      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : null)}
                      className="rule hover:text-accent group flex items-baseline justify-between gap-[1.5em] border-b py-[0.9em] text-[1.0625em] opacity-80 transition-[opacity,padding,color] duration-300 hover:pl-[0.5em] hover:opacity-100 max-mobile:gap-[1em]"
                    >
                      <span>{entry.value}</span>
                      {/*
                        The icon sits with the mono label. Below 768px it
                        stands in for the label, so a long value (the address,
                        the email) gets the row's width; the word is still
                        there for a screen reader. `self-center` because an
                        icon has no baseline worth aligning to.
                      */}
                      <span className="label-xs flex shrink-0 items-center gap-[0.6em] self-center opacity-50 transition-opacity duration-300 group-hover:opacity-80">
                        <Icon name={entry.icon} className="text-[1.35em] max-mobile:text-[1.6em]" />
                        <span className="max-mobile:sr-only">{entry.label}</span>
                        {external ? <span className="sr-only"> (opens in a new tab)</span> : null}
                      </span>
                    </a>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
