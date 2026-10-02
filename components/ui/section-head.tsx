import type { ReactNode } from "react";

import Reveal from "@/components/effects/reveal";

/**
 * The section marker: a small mono label in parentheses. No rule, no
 * index: the parentheses are the whole device.
 */
export function Marker({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={`label-xs opacity-60 ${className ?? ""}`}>( {children} )</p>;
}

/**
 * Marker on the left, headline and standfirst on the right: the two-column
 * opening, with the label column at 42%.
 */
export default function SectionHead({
  marker,
  aside,
  title,
  sub,
  titleAs = "h2",
  size = "lg",
  className,
}: {
  marker: string;
  /** Anything that belongs under the marker in the label column. */
  aside?: ReactNode;
  title: string | readonly string[];
  sub?: string;
  titleAs?: "h1" | "h2";
  size?: "lg" | "xl";
  className?: string;
}) {
  const lines = Array.isArray(title) ? title : [title];

  return (
    <div className={`grid grid-cols-[42%_1fr] gap-[4vw] max-tablet:grid-cols-1 max-tablet:gap-[1.5em] ${className ?? ""}`}>
      <div>
        <Marker>{marker}</Marker>
        {aside ? <div className="mt-[1.5em]">{aside}</div> : null}
      </div>

      <div>
        <Reveal
          as={titleAs}
          className={`display ${
            size === "xl" ? "text-[clamp(42px,6.6vw,104px)]" : "text-[clamp(32px,4vw,64px)]"
          }`}
        >
          {/*
            A space between authored lines. Each is a block, so it is never
            seen, but without it the text of the heading runs the lines
            together ("Born in Kolkata.Built for the internet.") for anything
            that reads the text rather than the layout: a crawler, a snippet,
            a copy and paste.
          */}
          {lines.map((line, i) => (
            <span key={line} className="block">
              {line}
              {i < lines.length - 1 ? " " : null}
            </span>
          ))}
        </Reveal>

        {sub ? (
          <Reveal as="p" className="mt-[1.75em] max-w-[30em] text-[0.9375em] leading-[1.4] opacity-70">
            {sub}
          </Reveal>
        ) : null}
      </div>
    </div>
  );
}
