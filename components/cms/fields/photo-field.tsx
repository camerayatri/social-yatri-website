"use client";

import { useState, type ReactNode } from "react";
import { FocusPicker } from "./focus-picker";
import { MediaField, type MediaValue } from "./media-field";

/**
 * One photograph in a content document: the MediaField's pick-or-upload slot,
 * mapped onto the shapes the schema stores, with the checks a slot needs
 * before anything is saved.
 *
 * - A plain photo stores `src`, `alt` and an optional `focus`.
 * - `sized` also stores the file's pixel size (`w`, `h`), which a card uses
 *   to take the picture's shape. A library file with no recorded size cannot
 *   go in such a slot, and is refused with a message rather than saved.
 * - `strictShape` refuses a pick more than 2% off `aspect`, for the slots the
 *   site rejects on save anyway (the home page's six cards). Refusing at the
 *   pick says so beside the slot, in words, instead of after pressing Save.
 * - `focusPreviews` shows the FocusPicker for slots that crop the picture,
 *   previewing those shapes.
 *
 * Picking a new file drops the old focus point, which belonged to the old
 * picture; editing the alt text keeps it.
 */

export type PhotoValue = { src: string; alt: string; focus?: string; w?: number; h?: number };

export type PhotoFieldProps = {
  label: ReactNode;
  hint?: ReactNode;
  value: PhotoValue | null;
  onChange: (value: PhotoValue) => void;
  aspect?: number;
  /** How the shape is said in a message: "4:3 landscape". */
  shapeName?: string;
  strictShape?: boolean;
  sized?: boolean;
  focusPreviews?: number[];
  error?: string;
  altError?: string;
  focusError?: string;
};

/** "1200×900" as "4:3", or "1.47:1" when it does not reduce to small numbers. */
export function ratioName(w: number, h: number) {
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  const d = gcd(w, h);
  return w / d <= 32 && h / d <= 32 ? `${w / d}:${h / d}` : `${(w / h).toFixed(2)}:1`;
}

export function PhotoField({
  label,
  hint,
  value,
  onChange,
  aspect,
  shapeName,
  strictShape,
  sized,
  focusPreviews,
  error,
  altError,
  focusError,
}: PhotoFieldProps) {
  const [refused, setRefused] = useState<string | null>(null);
  const current: MediaValue | null = value?.src ? value : null;

  const pick = (next: MediaValue) => {
    const same = next.src === value?.src;
    const w = same ? (value?.w ?? next.w) : next.w;
    const h = same ? (value?.h ?? next.h) : next.h;

    if (!same && sized && !(w && h)) {
      setRefused("The library has no size recorded for this file, so the card can't take its shape. Upload it again and pick the new copy.");
      return;
    }
    if (!same && strictShape && aspect && w && h && Math.abs(w / h - aspect) / aspect > 0.02) {
      setRefused(
        `Not used: this picture is ${w}×${h} (${ratioName(w, h)}), and this card is ${shapeName ?? ratioName(aspect * 1000, 1000)}. Crop it to that shape, upload it, and pick it again.`,
      );
      return;
    }

    setRefused(null);
    const focus = same ? value?.focus : undefined;
    onChange({
      src: next.src,
      alt: next.alt,
      ...(focus ? { focus } : {}),
      ...(sized && w && h ? { w, h } : {}),
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <MediaField
        label={label}
        kind="image"
        value={current}
        onChange={pick}
        // A strict slot refuses a wrong shape at the pick, so the slot's
        // "the page will crop it" note never applies; the editor explains a
        // picture that no longer fits in its own words.
        aspect={strictShape ? undefined : aspect}
        error={refused ?? error}
        altError={altError}
        hint={hint}
      />
      {focusPreviews && current ? (
        <div className="flex flex-col gap-1">
          <FocusPicker
            src={current.src}
            value={value?.focus}
            previews={focusPreviews}
            onChange={(focus) => onChange({ ...(value as PhotoValue), focus })}
          />
          {focusError ? <p className="text-[13px] text-[#a3271b]">{focusError}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
