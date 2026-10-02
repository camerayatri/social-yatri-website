"use client";

import { useState, type ReactNode } from "react";
import { TextArea } from "./text-area";

/**
 * A list of short items typed one per line, for lists like "What it covers"
 * where each entry is a few words and a box per entry would bury them.
 *
 * Blank lines are dropped from the value but kept in the box while typing, so
 * pressing Enter to start the next item works as anyone would expect. The
 * box only re-reads the value when it changes from outside (Discard, a
 * restore). Errors for single items are listed under the box by line number.
 */
export function LineListField({
  label,
  hint,
  value,
  onChange,
  error,
  errorAt,
  required,
}: {
  label: ReactNode;
  hint?: ReactNode;
  value: readonly string[];
  onChange: (value: string[]) => void;
  error?: string;
  errorAt?: (index: number) => string | undefined;
  required?: boolean;
}) {
  const [draft, setDraft] = useState(() => value.join("\n"));
  const shown = same(toItems(draft), value) ? draft : value.join("\n");
  const itemErrors = value.flatMap((_, i) => {
    const message = errorAt?.(i);
    return message ? [`Line ${i + 1}: ${message}`] : [];
  });
  const message = [error, ...itemErrors].filter(Boolean).join(" ");

  return (
    <TextArea
      label={label}
      required={required}
      rows={Math.max(3, value.length)}
      value={shown}
      error={message || undefined}
      hint={hint ?? "One item per line."}
      onChange={(text) => {
        setDraft(text);
        onChange(toItems(text));
      }}
    />
  );
}

function toItems(text: string) {
  return text.split("\n").filter((line) => line.trim() !== "");
}

function same(a: readonly string[], b: readonly string[]) {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}
