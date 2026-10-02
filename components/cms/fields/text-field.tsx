"use client";

import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { FieldShell, inputClass } from "./field-shell";

/**
 * A single-line text input.
 *
 * Controlled when given `value` and `onChange` (the editors), uncontrolled
 * with just a `name` (the sign-in and account forms, which post FormData).
 * `onChange` hands back the string, not the event.
 */
export type TextFieldProps = {
  label: ReactNode;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  hint?: ReactNode;
  /** Shows a running count against this limit; the input does not hard-stop at it. */
  softLimit?: number;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "className">;

export function TextField({ label, value, onChange, error, hint, softLimit, required, id: givenId, ...rest }: TextFieldProps) {
  const autoId = useId();
  const id = givenId ?? autoId;
  const count = softLimit && value !== undefined ? `${value.length} / ${softLimit}` : undefined;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required} aside={count}>
      <input
        id={id}
        className={inputClass(error)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${id}-msg` : undefined}
        required={required}
        {...(onChange ? { value: value ?? "", onChange: (e) => onChange(e.target.value) } : { defaultValue: value })}
        {...rest}
      />
    </FieldShell>
  );
}
