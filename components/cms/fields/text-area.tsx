"use client";

import { useId, useLayoutEffect, useRef, type ReactNode, type TextareaHTMLAttributes } from "react";
import { FieldShell, inputClass } from "./field-shell";

/**
 * Multi-line text that grows with what is typed, so a paragraph is never
 * edited through a keyhole. Same controlled/uncontrolled rules as TextField.
 */
export type TextAreaProps = {
  label: ReactNode;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  hint?: ReactNode;
  softLimit?: number;
  /** Starting height in lines. */
  rows?: number;
} & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange" | "className" | "rows">;

export function TextArea({ label, value, onChange, error, hint, softLimit, rows = 3, required, id: givenId, ...rest }: TextAreaProps) {
  const autoId = useId();
  const id = givenId ?? autoId;
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [value]);

  const count = softLimit && value !== undefined ? `${value.length} / ${softLimit}` : undefined;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required} aside={count}>
      <textarea
        ref={ref}
        id={id}
        rows={rows}
        className={`${inputClass(error)} resize-y`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${id}-msg` : undefined}
        required={required}
        {...(onChange ? { value: value ?? "", onChange: (e) => onChange(e.target.value) } : { defaultValue: value })}
        {...rest}
      />
    </FieldShell>
  );
}
