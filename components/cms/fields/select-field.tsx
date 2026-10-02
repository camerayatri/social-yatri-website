"use client";

import { useId, type ReactNode } from "react";
import { FieldShell, inputClass } from "./field-shell";

/**
 * A choice from a fixed list, for values that must name something that exists
 * (a reel list, a work) and so should never be typed by hand.
 *
 * `emptyLabel` adds a first option that clears the value (`onChange("")`);
 * the editor decides what empty means, usually "leave the key out".
 */
export function SelectField({
  label,
  value,
  onChange,
  options,
  emptyLabel,
  hint,
  error,
}: {
  label: ReactNode;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  emptyLabel?: string;
  hint?: ReactNode;
  error?: string;
}) {
  const id = useId();
  // A stored value that is no longer on the list is still shown, so opening
  // the editor never silently changes it; the save then says what is wrong.
  const known = value === "" || options.some((o) => o.value === value);
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass(error)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${id}-msg` : undefined}
      >
        {emptyLabel !== undefined ? <option value="">{emptyLabel}</option> : null}
        {!known ? <option value={value}>{value} (no longer exists)</option> : null}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}
