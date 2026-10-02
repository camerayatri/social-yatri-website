"use client";

import type { ReactNode } from "react";
import { SortableList } from "./sortable-list";
import { TextArea } from "./text-area";
import { TextField } from "./text-field";

/**
 * A list of lines or paragraphs.
 *
 * With `count`, exactly that many inputs and no adding or removing: for the
 * headings the animations mask line by line (the hero's two lines), where the
 * number of lines is part of the design. Without it, a reorderable list
 * bounded by `min` and `max`.
 *
 * `errorAt(i)` returns the message for line `i`; pass the editor's
 * `form.error` bound to this field's path.
 */
export type LinesFieldProps = {
  label: ReactNode;
  hint?: ReactNode;
  value: string[];
  onChange: (value: string[]) => void;
  count?: number;
  min?: number;
  max?: number;
  /** Paragraphs rather than short lines. */
  multiline?: boolean;
  error?: string;
  errorAt?: (index: number) => string | undefined;
  /** What one entry is called, for the add button and labels ("Line", "Paragraph"). */
  noun?: string;
};

export function LinesField({
  label,
  hint,
  value,
  onChange,
  count,
  min = 1,
  max = 40,
  multiline = false,
  error,
  errorAt,
  noun = multiline ? "Paragraph" : "Line",
}: LinesFieldProps) {
  const Input = multiline ? TextArea : TextField;

  if (count !== undefined) {
    const lines = Array.from({ length: count }, (_, i) => value[i] ?? "");
    return (
      <fieldset className="flex flex-col gap-3">
        <legend className="cms-label mb-2 opacity-75">{label}</legend>
        {hint ? <p className="-mt-1 text-[13px] opacity-60">{hint}</p> : null}
        {lines.map((line, i) => (
          <Input
            key={i}
            label={`${noun} ${i + 1}`}
            value={line}
            error={errorAt?.(i)}
            onChange={(next: string) => onChange(lines.map((l, j) => (j === i ? next : l)))}
          />
        ))}
        {error ? <p className="text-[13px] text-[#a3271b]">{error}</p> : null}
      </fieldset>
    );
  }

  return (
    <SortableList
      label={label}
      hint={hint}
      items={value}
      onChange={onChange}
      min={min}
      max={max}
      newItem={() => ""}
      addLabel={noun.toLowerCase()}
      error={error}
      renderItem={(line, i, update) => (
        <Input label={`${noun} ${i + 1}`} value={line} error={errorAt?.(i)} onChange={(next: string) => update(next)} />
      )}
    />
  );
}
