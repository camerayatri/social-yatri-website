"use client";

import { useId, type ReactNode } from "react";
import { FieldShell, inputClass } from "./field-shell";

/**
 * A six-digit hex colour: a swatch that opens the system picker, and the hex
 * as text beside it for pasting a brand colour exactly.
 */
export function ColorField({
  label,
  value,
  onChange,
  error,
  hint,
}: {
  label: ReactNode;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: ReactNode;
}) {
  const id = useId();
  const valid = /^#[0-9a-fA-F]{6}$/.test(value);
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label="Pick a colour"
          value={valid ? value : "#ffffff"}
          onChange={(e) => onChange(e.target.value)}
          className="h-[44px] w-[52px] shrink-0 cursor-pointer rounded-[8px] border border-ink/20 bg-white p-1"
        />
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value.trim())}
          spellCheck={false}
          maxLength={7}
          placeholder="#ffc72c"
          className={`${inputClass(error)} font-mono uppercase`}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? `${id}-msg` : undefined}
        />
      </div>
    </FieldShell>
  );
}
