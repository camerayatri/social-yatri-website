"use client";

import { useState, type ReactNode } from "react";
import { TextField } from "./text-field";

/**
 * A number typed the way people write it here: "4,50,000" and "450000" are
 * the same number, so separators and spaces are ignored.
 *
 * What is being typed is kept as typed, so a half-finished entry ("4,5") is
 * not reformatted under the cursor. An empty or unreadable entry hands back
 * `NaN`, which the schema refuses, and the field says why in words.
 */
export function NumberField({
  label,
  value,
  onChange,
  error,
  hint,
  required,
}: {
  label: ReactNode;
  value: number;
  onChange: (value: number) => void;
  error?: string;
  hint?: ReactNode;
  required?: boolean;
}) {
  const [draft, setDraft] = useState(() => (Number.isFinite(value) ? String(value) : ""));
  // When the value changes from outside (Discard, a restore) the field shows
  // it; while typing, the draft already reads as the value and is left alone.
  const shown = Number.isNaN(value) || parseNumber(draft) === value ? draft : String(value);
  return (
    <TextField
      label={label}
      inputMode="decimal"
      required={required}
      value={shown}
      hint={hint}
      error={Number.isNaN(value) ? "Enter a number, like 450000." : error}
      onChange={(v) => {
        setDraft(v);
        onChange(parseNumber(v));
      }}
    />
  );
}

function parseNumber(text: string): number {
  const clean = text.replace(/[,\s_]/g, "");
  if (!/^\d+(\.\d+)?$/.test(clean)) return NaN;
  return Number(clean);
}
