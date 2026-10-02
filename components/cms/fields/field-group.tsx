import type { ReactNode } from "react";

/**
 * A titled box around fields that belong together on the page ("The numbers
 * row", "Logo"). A real fieldset and legend, so a screen reader announces the
 * group's name with each field inside it.
 */
export function FieldGroup({
  title,
  hint,
  children,
  aside,
}: {
  title: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
  /** A control for the group as a whole, set beside its hint (Add logo, Remove logo). */
  aside?: ReactNode;
}) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-4 rounded-[10px] border border-ink/10 p-4 max-mobile:p-3">
      <legend className="cms-label px-1 opacity-75">{title}</legend>
      {hint || aside ? (
        <div className="-mt-2 flex flex-wrap items-start justify-between gap-2">
          {hint ? <p className="max-w-[60ch] text-[13px] opacity-60">{hint}</p> : <span />}
          {aside}
        </div>
      ) : null}
      {children}
    </fieldset>
  );
}
