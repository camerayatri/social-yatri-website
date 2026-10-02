import type { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * The admin's small set of building blocks. Plain, high-contrast and roomy:
 * the people using this are editing copy between other jobs, often on a
 * phone, and should never have to wonder what a control does. Ink does the
 * work; the brand yellow is kept for focus, the unsaved-changes dot and the
 * primary action's hover.
 */

type Variant = "primary" | "secondary" | "danger" | "ghost";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-ink text-paper border-ink hover:bg-accent hover:text-ink hover:border-accent",
  secondary: "bg-transparent text-ink border-ink/30 hover:border-ink",
  danger: "bg-transparent text-[#a3271b] border-[#a3271b]/40 hover:border-[#a3271b] hover:bg-[#a3271b] hover:text-paper",
  ghost: "bg-transparent text-ink border-transparent hover:border-ink/20",
};

export function buttonClass(variant: Variant = "secondary", size: "md" | "sm" = "md") {
  return [
    "inline-flex items-center justify-center gap-2 rounded-full border whitespace-nowrap transition-colors duration-200",
    "disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-inherit",
    size === "md" ? "h-11 px-5 text-[14px]" : "h-8 px-3.5 text-[13px]",
    VARIANTS[variant],
  ].join(" ");
}

export function Button({
  variant = "secondary",
  size = "md",
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "md" | "sm" }) {
  return <button type={type} className={`${buttonClass(variant, size)} ${className}`} {...props} />;
}

export function PageHeader({ title, lead, actions }: { title: string; lead?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-[640px]">
        <h1 className="statement text-[30px] max-mobile:text-[26px]">{title}</h1>
        {lead ? <p className="mt-2 opacity-70">{lead}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

export function Card({
  title,
  lead,
  children,
  className = "",
  id,
}: {
  title?: ReactNode;
  lead?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`rounded-[14px] border border-ink/12 bg-white/55 ${className}`}>
      {title ? (
        <div className="border-b border-ink/10 px-5 pt-4 pb-3 max-mobile:px-4">
          <h2 className="text-[18px] tracking-[-0.01em]">{title}</h2>
          {lead ? <p className="mt-1 text-[14px] opacity-65">{lead}</p> : null}
        </div>
      ) : null}
      <div className="px-5 py-5 max-mobile:px-4">{children}</div>
    </section>
  );
}

export function Notice({
  tone = "info",
  children,
  className = "",
}: {
  tone?: "info" | "success" | "error" | "warning";
  children: ReactNode;
  className?: string;
}) {
  const tones = {
    info: "border-ink/15 bg-white/60",
    success: "border-[#2e6b3a]/30 bg-[#e6efe3] text-[#1f4a28]",
    error: "border-[#a3271b]/30 bg-[#f6e2de] text-[#7c1d13]",
    warning: "border-[#b88a00]/35 bg-[#fff3cc] text-[#5a4300]",
  };
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-[10px] border px-4 py-3 text-[14px] ${tones[tone]} ${className}`}>
      {children}
    </div>
  );
}

/** A date as people say it, in India time, which is where the studio is. */
export function formatWhen(iso: string | null) {
  if (!iso) return "never";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  }).format(new Date(iso));
}

export function formatBytes(bytes: number | null) {
  if (bytes === null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
