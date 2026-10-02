"use client";

import { useRef } from "react";
import { usePathname } from "next/navigation";
import { useGSAP } from "@gsap/react";

import { CONNECT, DIRECT, NAV, SITE } from "@/lib/content";
import TransitionLink from "@/components/transition/transition-link";
import Reveal from "@/components/effects/reveal";
import { ArrowUpRightIcon, Icon } from "@/components/ui/icons";

/**
 * The footer.
 *
 * One viewport tall. The closing line and two outlined pills sit top-left, the
 * social links form a column at four-fifths of the width, a mono row runs along
 * the bottom edge, and the wordmark is set as wide as the page and bled off the
 * bottom so only its upper four-fifths show.
 *
 * On phones the wordmark is a line of type a few dozen pixels tall, and a box
 * clipping it well above the bottom edge read as a mistake rather than a
 * bleed. So there the wordmark and the mono row leave the absolute layer and
 * join the column in flow, the row first and the wordmark last against the
 * footer's bottom edge, which is where the clip then falls. In flow they can
 * never be climbed into by the contact column on a short screen either.
 */
export default function SiteFooter() {
  const mark = useRef<HTMLSpanElement>(null);
  // On the contact page the question is already the h1 above the form, so the
  // footer closes with the tagline and drops the pill that leads back here.
  const onContact = usePathname() === "/contact";

  /*
   * The wordmark is fitted to the width between the gutters by measurement,
   * not by a guessed `vw` size: the fit depends on the face's advance widths,
   * and the fallback face measures differently from PP Neue Montreal.
   */
  useGSAP(() => {
    const el = mark.current;
    const box = el?.parentElement;
    if (!el || !box) return;

    const fit = () => {
      el.style.fontSize = "100px";
      const ratio = box.clientWidth / el.scrollWidth;
      el.style.fontSize = `${Math.floor(100 * ratio * 100) / 100}px`;
      box.style.height = `${Math.round(el.offsetHeight * 0.8)}px`;
    };

    fit();
    document.fonts.ready.then(fit);
    let timer: number | undefined;
    const onResize = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(fit, 100);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", onResize);
    };
  });

  return (
    <footer data-surface="ink" className="gradient-ink text-paper relative flex min-h-dvh flex-col overflow-hidden px-[var(--gutter)] pt-[calc(var(--corner)+96px)] pb-[calc(13vw+72px)] max-mobile:pb-0">
      <div className="grid grid-cols-[1fr_auto] items-start gap-[3em] max-tablet:grid-cols-1">
        <div>
          <Reveal
            as="h2"
            className="display max-w-[6.5em] text-[clamp(44px,6.6vw,104px)]"
            // On /contact this is the tagline, which is Hindi in Latin letters.
            lang={onContact ? "hi-Latn" : undefined}
          >
            {onContact ? SITE.tagline : CONNECT.question}
          </Reveal>

          {/*
            The house line, in the client's own words. Not on /contact, where
            the heading above it already is the tagline and the two printed
            the same sentence twice, one under the other.
          */}
          {onContact ? null : (
            <Reveal
              as="p"
              splitLines={false}
              className="statement text-accent mt-[0.6em] text-[clamp(20px,2.4vw,34px)]"
            >
              <span lang="hi-Latn">{SITE.tagline}</span>
            </Reveal>
          )}

          <div className="mt-[28px] flex flex-wrap gap-[10px]">
            {onContact ? null : (
              <TransitionLink href="/contact" className="pill">
                <span>{CONNECT.submit.replace(" →", "")}</span>
                <span aria-hidden>→</span>
              </TransitionLink>
            )}
            <a href={`mailto:${SITE.email}`} className="pill">
              <span>Drop us an email</span>
              <span aria-hidden>@</span>
            </a>
          </div>
        </div>

        {/*
          The contact column. Every row here is a live link: the profiles open
          the profile, the email opens a draft, the phone dials, the address
          opens the map. They used to be plain names, which looked like links
          and behaved like nothing.

          The row's own value sits under its name in mono, so the address and
          the number can be read off the footer without a click.
        */}
        <ul className="mr-[8vw] flex flex-col gap-[0.75em] max-tablet:mr-0">
          {DIRECT.map((entry) => {
            const external = entry.href?.startsWith("http") ?? false;
            return (
              <li key={entry.label}>
                <a
                  href={entry.href ?? undefined}
                  {...(external ? { target: "_blank", rel: "noreferrer" } : null)}
                  // Padded to a 44px touch target without moving the type.
                  className="group block py-[6px] -my-[6px] opacity-60 transition-opacity duration-300 hover:opacity-100"
                >
                  {/*
                    The icon leads the name and takes its colour, so it turns
                    yellow with it on hover. The two that leave the site (the
                    profile and the map) trail a small arrow, and say so to a
                    screen reader, since they open in a new tab.
                  */}
                  <span className="statement group-hover:text-accent flex items-center gap-[0.35em] text-[clamp(20px,1.9vw,28px)] transition-colors duration-300">
                    <Icon name={entry.icon} className="text-[0.8em]" />
                    {entry.label}
                    {external ? (
                      <>
                        <ArrowUpRightIcon className="text-[0.6em] opacity-60" />
                        <span className="sr-only"> (opens in a new tab)</span>
                      </>
                    ) : null}
                  </span>
                  <span className="label-xs block opacity-70">{entry.value}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex-1" />

      {/*
        The wordmark, set wider than the page and bled off the bottom edge so
        only its upper four-fifths show, which is what makes it read as the
        ground of the page rather than a line of type.
      */}
      <div
        className="pointer-events-none absolute inset-x-[var(--gutter)] bottom-[56px] h-[13vw] overflow-hidden select-none max-mobile:static max-mobile:order-1"
        aria-hidden
      >
        <span
          ref={mark}
          className="display absolute top-0 left-0 block leading-[0.78] whitespace-nowrap uppercase max-mobile:static"
        >
          {SITE.name}
        </span>
      </div>

      {/* The bottom row, over the wordmark; above it on phones. */}
      <div className="label-xs absolute inset-x-[var(--gutter)] bottom-[var(--gutter)] z-10 flex items-center justify-between gap-[1em] mix-blend-difference max-mobile:static max-mobile:mt-[56px] max-mobile:mb-[20px] max-mobile:flex-wrap">
        {/*
          The strapline is dropped on phones: with it the row wrapped to three
          lines and climbed into the wordmark, and the same words already run
          in the marquee.
        */}
        <span>
          {SITE.copyright}
          <span className="max-mobile:hidden"> · {SITE.madeIn}</span>
        </span>
        <nav aria-label="Footer" className="flex gap-[1.25em] max-tablet:hidden">
          {NAV.map((item) => (
            <TransitionLink key={item.href} href={item.href} className="opacity-70 transition-[opacity,color] duration-300 hover:text-accent hover:opacity-100">
              {item.label}
            </TransitionLink>
          ))}
        </nav>
        <span className="flex items-center gap-[1em]">
          <span className="max-mobile:hidden">{SITE.city}</span>
          <span className="bg-accent text-ink rounded-[3px] px-[6px] py-[2px] text-[11px] font-medium">EN</span>
        </span>
      </div>
    </footer>
  );
}
