import type { ReactNode } from "react";

/**
 * The frame every field shares: a label above, the control, then a hint or
 * the error that replaces it. The error is linked to the control with
 * `aria-describedby` by the field that renders it, so a screen reader reads
 * the problem with the field.
 */
export function FieldShell({
  id,
  label,
  hint,
  error,
  required,
  children,
  aside,
}: {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  children: ReactNode;
  /** Something small to the right of the label, like a character count. */
  aside?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="cms-label opacity-75">
          {label}
          {required ? <span aria-hidden> *</span> : null}
        </label>
        {aside ? <span className="text-[12px] opacity-50">{aside}</span> : null}
      </div>
      {children}
      {error ? (
        <p id={`${id}-msg`} className="text-[13px] text-[#a3271b]">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-msg`} className="text-[13px] opacity-60">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Classes for a text input or textarea, with the error state. */
export function inputClass(error?: string) {
  return [
    "w-full rounded-[8px] border bg-white px-3 py-2.5 text-[15px] leading-[1.4] text-ink outline-none transition-colors",
    "placeholder:text-ink/35 focus:border-ink",
    "read-only:bg-transparent read-only:text-ink/60",
    error ? "border-[#a3271b]" : "border-ink/20 hover:border-ink/40",
  ].join(" ");
}
