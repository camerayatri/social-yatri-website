"use client";

import Image from "next/image";

import { CLIENTS } from "@/lib/content";
import Reveal from "@/components/effects/reveal";
import SectionHead from "@/components/ui/section-head";
import TransitionLink from "@/components/transition/transition-link";

/**
 * The client results.
 *
 * The client gave two worked case studies with real figures rather than
 * quotes, so this is set as editorial: claim at display size, the story
 * beneath it, and the numbers ruled off on their own so they can be read
 * without reading the prose. Every figure here is theirs; where they gave no
 * number, none is shown.
 *
 * Each case keeps the page's two-column opening (label and still at 42%, the
 * argument on the headline's axis) so it sits on the same grid as every other
 * section rather than reading as a separate template.
 *
 * Two lengths, because it is asked to do two jobs. On /studio it runs in full:
 * the story, the figures, what was done, the result, and the brand's own clips.
 * On the home page it runs brief, which is the named brands and their numbers
 * and a way through to the rest.
 *
 * The brief version exists because the full one had no business being the last
 * thing on the home page. By the time a reader reached it they had already had
 * the hero, the work, the studio note, every service and the growth figures;
 * what followed was two complete case studies including their reel strips, and
 * the same clips are on /work already. The home page's job at that point is to
 * name who we did it for and send them somewhere, not to spend another screen
 * and a half proving it a second time.
 */
/**
 * A claim as written: one string, or lines the client's copy breaks in a set
 * place, each held whole so no width can split a figure from its unit. The
 * trailing space is invisible at the end of a block, and keeps the heading's
 * text from reading "From 12K to4.1 lakh+" to anything that reads the text.
 */
const claimLines = (claim: string | readonly string[]) =>
  typeof claim === "string"
    ? claim
    : claim.map((line, i) => (
        <span key={line} className="block">
          {line}
          {i < claim.length - 1 ? " " : null}
        </span>
      ));

export default function Clients({
  surface = "ink",
  variant = "full",
}: {
  surface?: "ink" | "paper";
  variant?: "full" | "brief";
}) {
  const ink = surface === "ink";
  const brief = variant === "brief";

  return (
    <section
      data-surface={ink ? "ink" : undefined}
      className={`${ink ? "surface-ink text-paper" : "text-ink"} relative px-[var(--gutter)] py-[7em]`}
    >
      <SectionHead
        marker={CLIENTS.sign}
        title={CLIENTS.question}
        sub={CLIENTS.sub}
        className="mb-[3em]"
      />

      <div className="grid grid-cols-[42%_1fr] gap-[4vw] max-tablet:grid-cols-1">
        <div />
        <div className="max-w-[34em]">
          {CLIENTS.body.map((paragraph) => (
            <Reveal key={paragraph} as="p" className="mt-[1em] text-[1.0625em] opacity-70">
              {paragraph}
            </Reveal>
          ))}
        </div>
      </div>

      {brief ? (
        <div className="mt-[4em]">
          <div className="grid grid-cols-2 gap-x-[4vw] gap-y-[3em] max-tablet:grid-cols-1">
            {CLIENTS.cases.map((study, index) => (
              <article key={study.name} className="rule border-t pt-[1.5em]">
                <p className="label opacity-60">
                  ({String(index + 1).padStart(2, "0")}) {study.name}
                </p>

                {/*
                  The brand's logo beside its own text, in the space to the
                  right of the claim that used to be empty: a small 3:2 field
                  in the brand's colour with the mark set modestly inside. On
                  phones there is no room beside, so it sits above the claim.
                */}
                <div className="mt-[1em] grid grid-cols-[1fr_auto] items-start gap-[2em] max-mobile:grid-cols-1 max-mobile:gap-[1.25em]">
                  <div className="max-mobile:order-2">
                    <Reveal
                      as="h3"
                      className="display max-w-[12em] text-[clamp(22px,2.3vw,34px)]"
                    >
                      {claimLines(study.claim)}
                    </Reveal>

                    {/* The figures alone. The story behind them is on /studio. */}
                    <div className="mt-[1.5em] grid grid-cols-2 gap-[2vw] max-mobile:grid-cols-1 max-mobile:gap-[1.25em]">
                      {study.metrics.map((metric) => (
                        <div key={metric.label} className="rule border-t pt-[0.9em]">
                          <p className="label opacity-60">{metric.label}</p>
                          <p className="display mt-[0.4em] text-[clamp(20px,2vw,30px)]">
                            {metric.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {study.logo ? (
                    <div
                      className="relative aspect-[3/2] w-[clamp(120px,11vw,180px)] overflow-hidden max-mobile:order-1 max-mobile:w-[44%]"
                      style={{ backgroundColor: study.logo.bg }}
                    >
                      <Image
                        src={study.logo.src}
                        alt={study.logo.alt}
                        fill
                        sizes="180px"
                        // Padding percentages resolve against the width, so the
                        // vertical pair is chosen to leave a matching share of
                        // the box's height for the mark.
                        className="object-contain px-[18%] py-[9%]"
                      />
                    </div>
                  ) : null}
                </div>
              </article>
            ))}
          </div>

          <TransitionLink
            href="/studio"
            // Padded to a 44px tap target. The margin above gives back what
            // the padding adds so the line does not move; the padding below
            // stays, which also lifts it off the rule it was sitting on.
            className="statement group mt-[2.4em] inline-block py-[0.6em] text-[clamp(20px,2.2vw,32px)] opacity-60 transition-opacity duration-300 hover:opacity-100"
          >
            Read the full stories{" "}
            <span
              aria-hidden
              className="transition-colors duration-300 group-hover:text-accent"
            >
              ↳
            </span>
          </TransitionLink>
        </div>
      ) : (
      <div className="mt-[5em]">
        {CLIENTS.cases.map((study, index) => (
          <article
            key={study.name}
            className="rule grid grid-cols-[42%_1fr] gap-[4vw] border-t pt-[1.5em] pb-[5em] max-tablet:grid-cols-1 max-tablet:gap-[2em]"
          >
            <div>
              <p className="label opacity-60">
                ({String(index + 1).padStart(2, "0")}) {study.name}
              </p>

              <div className="relative mt-[1.5em] aspect-[4/5] w-full max-w-[420px] overflow-hidden max-tablet:max-w-none">
                <Image
                  src={study.frame}
                  alt={study.alt}
                  fill
                  sizes="(max-width: 992px) 100vw, 34vw"
                  className="object-cover"
                  style={{ objectPosition: study.focus }}
                />
              </div>
            </div>

            <div>
              <Reveal as="h3" className="display max-w-[11em] text-[clamp(26px,3.4vw,52px)]">
                {claimLines(study.claim)}
              </Reveal>

              <div className="mt-[1.5em] max-w-[34em]">
                {study.intro.map((paragraph) => (
                  <Reveal
                    key={paragraph}
                    as="p"
                    className="mt-[1em] text-[1.0625em] opacity-70"
                  >
                    {paragraph}
                  </Reveal>
                ))}
              </div>

              {/* The figures, given room of their own. */}
              <div className="mt-[3em] grid grid-cols-2 gap-x-[2.5vw] gap-y-[1.5em] max-mobile:grid-cols-1">
                {study.metrics.map((metric) => (
                  <div key={metric.label} className="rule border-t pt-[1.1em]">
                    <p className="label opacity-60">{metric.label}</p>
                    <p className="display mt-[0.5em] text-[clamp(24px,2.6vw,40px)]">
                      {metric.value}
                    </p>
                    <p className="mt-[1em] text-[0.9375em] opacity-60">{metric.note}</p>
                  </div>
                ))}
              </div>

              <div className="mt-[3em] grid grid-cols-2 gap-[2.5vw] max-mobile:grid-cols-1">
                <div>
                  <p className="label opacity-60">What we did</p>
                  <ul className="mt-[0.5em]">
                    {study.did.map((item) => (
                      <li key={item} className="rule border-b py-[0.6em] text-[0.9375em] opacity-70">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="label opacity-60">The result</p>
                  {study.result.map((paragraph) => (
                    <p key={paragraph} className="mt-[1em] text-[0.9375em] opacity-70">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            </div>

          </article>
        ))}
      </div>
      )}

      {/* The client's closing pitch. */}
      <div className="rule grid grid-cols-[42%_1fr] gap-[4vw] border-t pt-[2.5em] max-tablet:grid-cols-1 max-tablet:gap-[2em]">
        <div>
          <Reveal as="p" className="display max-w-[8em] text-[clamp(28px,3.4vw,52px)]">
            {CLIENTS.closing.title[0]}
          </Reveal>
          <Reveal
            as="p"
            className="display text-accent max-w-[8em] text-[clamp(28px,3.4vw,52px)]"
          >
            {CLIENTS.closing.title[1]}
          </Reveal>
        </div>

        <div className="max-w-[34em]">
          {CLIENTS.closing.body.map((paragraph) => (
            <Reveal key={paragraph} as="p" className="mt-[1em] text-[1.0625em] opacity-70">
              {paragraph}
            </Reveal>
          ))}

          <p className="label mt-[2.5em] opacity-60">{CLIENTS.closing.goalsLead}</p>
          {/*
            One goal per line, as the client set them. Run together on a wrapped
            row they read as a single run-on sentence and the repetition of
            "More" (which is the whole rhetorical point) stops landing.
          */}
          <ul className="mt-[0.75em]">
            {CLIENTS.closing.goals.map((goal) => (
              <li key={goal} className="rule statement border-t py-[0.5em] text-[1.25em]">
                {goal}
              </li>
            ))}
          </ul>
          <p className="mt-[1.5em] text-[1.0625em] opacity-70">
            {CLIENTS.closing.goalsClose}
          </p>
        </div>
      </div>
    </section>
  );
}
