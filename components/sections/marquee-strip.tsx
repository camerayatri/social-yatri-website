"use client";

import Marquee from "@/components/effects/marquee";

/**
 * A ruled band of running text between sections, set in the display face at a
 * size that reads as a graphic rather than a sentence. Direction follows the
 * scroll, so reversing up the page reverses the strip.
 */
export default function MarqueeStrip({ phrases, invert = false }: { phrases: string[]; invert?: boolean }) {
  return (
    <div
      data-surface={invert ? undefined : "ink"}
      className={`overflow-hidden border-y py-[0.55em] ${
        invert ? "text-ink border-ink/15" : "surface-ink text-paper border-paper/15"
      }`}
    >
      <Marquee speed={64}>
        {phrases.map((phrase, index) => (
          <span
            key={`${phrase}-${index}`}
            className="display flex shrink-0 items-center gap-[0.6em] px-[0.35em] text-[clamp(28px,4.4vw,72px)] whitespace-nowrap"
          >
            {phrase}
            <span className="text-accent text-[0.28em]">✳</span>
          </span>
        ))}
      </Marquee>
    </div>
  );
}
