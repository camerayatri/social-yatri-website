"use client";

import { useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";

import type { NavDoc } from "@/lib/cms/schema";
import { gsap } from "@/lib/gsap";
import SocialYatriLogo from "@/components/logo/social-yatri-logo";
import TransitionLink from "@/components/transition/transition-link";

/**
 * The site's chrome: the mark top-left and MENU top-right. MENU carries the
 * navigation everywhere; the route column that used to sit on the left edge
 * of the home screen is gone at the client's request.
 *
 * Both are fixed, painted white and composited with
 * `mix-blend-mode: difference` (the `.chrome` rule), so one set of furniture
 * reads as ink over paper, paper over ink, a negative over photographs, and
 * inverts wherever it crosses type of its own colour instead of vanishing
 * into it. A blend only sees the page when the element sits directly in the
 * root stacking context: a fixed, z-indexed header box would be a stacking
 * context of its own, and a blend inside it would composite against nothing
 * but the header's transparent backdrop. So the header is `display: contents`
 * and each piece is its own fixed element.
 *
 * The map pin is the one thing that must not invert (difference turns the
 * yellow blue over paper), so the mark is drawn twice in the same box: the
 * blended copy carries the road and the letters, and a plain copy stacked
 * over it carries the pin.
 *
 * MENU opens an overlay of the same routes set very large, right-aligned,
 * with a rolling hover on each link.
 *
 * The mark is hidden until the loader hands it over with `Flip.fit`.
 *
 * The menu's labels, the studio's name, email and city are content, handed
 * down by the site shell.
 */
export default function SiteHeader({
  nav,
  name,
  email,
  city,
}: {
  nav: NavDoc;
  name: string;
  email: string;
  city: string;
}) {
  const [open, setOpen] = useState(false);
  const overlay = useRef<HTMLDivElement>(null);

  // The root carries the open state so the scroll (Lenis) can pause on it.
  useEffect(() => {
    document.documentElement.toggleAttribute("data-menu-open", open);
    return () => document.documentElement.removeAttribute("data-menu-open");
  }, [open]);

  // Escape closes the menu; the links close it themselves on click.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useGSAP(
    () => {
      const el = overlay.current;
      if (!el) return;
      const links = el.querySelectorAll("[data-menu-link]");
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      // GSAP owns the overlay's visibility both ways, so the close can fade
      // instead of snapping to display:none on the same render.
      if (open) {
        gsap.set(el, { autoAlpha: 1, overwrite: "auto" });
        if (reduced) gsap.set(links, { yPercent: 0 });
        else
          gsap.fromTo(
            links,
            { yPercent: 110 },
            { yPercent: 0, duration: 0.9, ease: "expo.out", stagger: 0.06 },
          );
      } else {
        gsap.to(el, { autoAlpha: 0, duration: reduced ? 0 : 0.3, overwrite: "auto" });
      }
    },
    { dependencies: [open] },
  );

  // The mark's box, shared by both copies so they register exactly. Its
  // height follows from the width and the artwork's viewBox (1000 by 369),
  // and MENU is centred on that height, so both are declared once on the
  // header and inherited: custom properties pass through `display: contents`.
  const markBox = "fixed top-[var(--corner)] left-[var(--corner)] block w-[var(--mark-w)]";

  return (
    <>
      {/* Corner furniture. */}
      {/*
        No box of its own, for the blend (see above). Each piece sits above
        the transition covers (z-300) and below the loader (z-400).
      */}
      <header className="contents [--mark-h:calc(var(--mark-w)*369/1000)] [--mark-w:112px]">
        {/*
          A 44px tap box, like MENU: the link's top is pulled up by half the
          difference and the mark is centred in it, so the artwork and the pin
          copy below still register on the same pixels.
        */}
        <TransitionLink
          href="/"
          aria-label={`${name}, home`}
          className={`chrome z-[350] ${markBox} -mt-[calc((44px-var(--mark-h))/2)] flex min-h-[44px] items-center`}
        >
          <span data-header-logo className="block w-full">
            {/*
              The lane markings are cut out of the road, so under the blend
              they paint nothing and read as holes over anything.
            */}
            <SocialYatriLogo className="w-full" layer="mark" fg="currentColor" />
          </span>
        </TransitionLink>

        {/*
          The pin, unblended, over the blended mark. It carries
          `data-header-logo` so the loader reveals it with the other copy, and
          it comes second in the DOM so the loader's Flip still lands on the
          blended copy. Its ink sits on the yellow, so it is plain ink. It
          never takes the pointer: the link beneath does.
        */}
        <span aria-hidden data-header-logo className={`pointer-events-none z-[351] ${markBox}`}>
          <SocialYatriLogo className="w-full" layer="pin" fg="var(--ink)" accent="var(--accent)" />
        </span>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="site-menu"
          // A 44px box centred on the mark's height, so the word sits level
          // with the mark's middle at every corner size (it used to hang from
          // the mark's top edge, which read as floating on phones), padded out
          // sideways without moving the text off the corner.
          // Not the accent on hover: the cursor dot is that same yellow and
          // sits directly over this word, which makes it hard to read at the
          // exact moment it is being pointed at.
          className="chrome label fixed top-[calc(var(--corner)+(var(--mark-h)-44px)/2)] right-[calc(var(--corner)-12px)] z-[350] flex h-[44px] min-w-[44px] items-center justify-end px-[12px] text-[clamp(16px,1.1vw,20px)] text-right underline decoration-transparent decoration-1 underline-offset-[5px] transition-[text-decoration-color] duration-300 hover:decoration-current"
        >
          {open ? "Close" : "Menu ::"}
        </button>

      </header>

      {/* The menu. */}
      <div
        ref={overlay}
        id="site-menu"
        aria-hidden={!open}
        className="gradient-ink text-paper fixed inset-0 z-[345] flex flex-col justify-between overflow-y-auto px-[var(--corner)] pt-[calc(var(--corner)+56px)] pb-[var(--corner)] opacity-0"
        style={{ visibility: "hidden" }}
      >
        <nav aria-label="Menu" className="flex flex-col items-end">
          {nav.map((item) => (
            <div key={item.href} className="overflow-hidden">
              <TransitionLink
                href={item.href}
                data-menu-link
                onClick={() => setOpen(false)}
                // Sized by height as well, so five lines fit a laptop screen.
                className="group display block min-h-[44px] py-[0.04em] text-[clamp(40px,min(7.5vw,10.5vh),112px)] uppercase"
              >
                {/* Two copies, so the label rolls on hover. */}
                <span className="relative block overflow-hidden">
                  <span className="block transition-transform duration-500 [transition-timing-function:var(--ease-brand)] group-hover:-translate-y-full">
                    {item.label}
                  </span>
                  <span
                    aria-hidden
                    className="text-accent absolute inset-0 block translate-y-full transition-transform duration-500 [transition-timing-function:var(--ease-brand)] group-hover:translate-y-0"
                  >
                    {item.label}
                  </span>
                </span>
              </TransitionLink>
            </div>
          ))}
        </nav>

        <div className="label flex flex-wrap justify-between gap-[1em]">
          <a
            href={`mailto:${email}`}
            className="hover:text-accent py-[11px] opacity-65 transition-[opacity,color] duration-300 hover:opacity-100"
          >
            {email}
          </a>
          <span className="opacity-65">{city}</span>
        </div>
      </div>
    </>
  );
}
