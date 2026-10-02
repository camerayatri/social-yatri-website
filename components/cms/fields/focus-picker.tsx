"use client";

import { useRef, type KeyboardEvent, type PointerEvent } from "react";

/**
 * Where a photo's subject is, for the crops that cut it.
 *
 * Click (or tap) the part of the picture that must stay in frame; the value is
 * that point as CSS `object-position` percentages ("50% 35%"). The arrow keys
 * nudge it by 5%. Below, the same picture at the shapes the site crops it to,
 * so the effect is visible before saving.
 */

function parse(value: string | undefined): [number, number] {
  const m = value?.match(/^(\d+(?:\.\d+)?)% (\d+(?:\.\d+)?)%$/);
  return m ? [Number(m[1]), Number(m[2])] : [50, 50];
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function FocusPicker({
  src,
  value,
  onChange,
  previews = [4 / 5, 3 / 2, 1],
  label = "Focus point",
}: {
  src: string;
  value: string | undefined;
  onChange: (value: string) => void;
  /** Aspect ratios (width / height) to preview the crop at. */
  previews?: number[];
  label?: string;
}) {
  const [x, y] = parse(value);
  const box = useRef<HTMLDivElement>(null);

  const pick = (e: PointerEvent<HTMLDivElement>) => {
    const rect = box.current?.getBoundingClientRect();
    if (!rect) return;
    onChange(`${clamp(((e.clientX - rect.left) / rect.width) * 100)}% ${clamp(((e.clientY - rect.top) / rect.height) * 100)}%`);
  };

  const nudge = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = { ArrowLeft: [-5, 0], ArrowRight: [5, 0], ArrowUp: [0, -5], ArrowDown: [0, 5] }[e.key];
    if (!step) return;
    e.preventDefault();
    onChange(`${clamp(x + step[0])}% ${clamp(y + step[1])}%`);
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="cms-label opacity-75">
        {label} <span className="normal-case">({x}% {y}%)</span>
      </p>
      <div className="flex flex-wrap items-start gap-3">
        <div
          ref={box}
          role="slider"
          tabIndex={0}
          aria-label={`${label}: click the part of the picture that must stay in frame`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={x}
          aria-valuetext={`${x}% across, ${y}% down`}
          onPointerDown={pick}
          onKeyDown={nudge}
          className="relative w-[220px] max-w-full cursor-crosshair overflow-hidden rounded-[8px] border border-ink/15"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" className="block h-auto w-full select-none" draggable={false} />
          <span
            className="border-accent pointer-events-none absolute size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 shadow-[0_0_0_2px_rgba(0,0,0,0.5)]"
            style={{ left: `${x}%`, top: `${y}%` }}
          />
        </div>
        <div className="flex items-start gap-2">
          {previews.map((ratio) => (
            <div key={ratio} className="flex flex-col items-center gap-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt=""
                className="h-[96px] rounded-[6px] border border-ink/10 object-cover"
                style={{ aspectRatio: String(ratio), objectPosition: `${x}% ${y}%` }}
              />
              <span className="text-[11px] opacity-65">{ratio === 1 ? "1:1" : ratio > 1 ? "wide" : "tall"}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
