"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import SocialYatriLogo from "@/components/logo/social-yatri-logo";
import { logout } from "@/lib/cms/actions/auth";
import { useAdmin } from "./admin-context";

/**
 * The admin's menu: a sidebar on wide screens, a bar with a drop-down on
 * phones. Paths are relative to the admin base, which arrives through context
 * because only the server knows it. New editors add a row to `SECTIONS`.
 *
 * `counts` puts a small number beside a row, by its href: the inbox's
 * unopened enquiries. The server layout counts them on each page.
 */

export const SECTIONS: { group: string; items: { href: string; label: string }[] }[] = [
  { group: "", items: [{ href: "", label: "Dashboard" }] },
  {
    group: "Content",
    items: [
      { href: "site", label: "Site & contact" },
      { href: "home", label: "Home page" },
      { href: "services", label: "Services" },
      { href: "work", label: "Work & reels" },
      { href: "showreel", label: "Showreel" },
      { href: "photoshoot", label: "Photoshoots" },
      { href: "clients", label: "Clients" },
      { href: "studio", label: "Studio" },
    ],
  },
  { group: "Library", items: [{ href: "media", label: "Media" }] },
  { group: "Enquiries", items: [{ href: "inbox", label: "Inbox" }] },
  {
    group: "Team",
    items: [
      { href: "maintainers", label: "Maintainers" },
      { href: "account", label: "Your account" },
    ],
  },
];

export default function AdminNav({
  name,
  email,
  counts = {},
}: {
  name: string;
  email: string;
  counts?: Partial<Record<string, number>>;
}) {
  const { base } = useAdmin();
  const pathname = usePathname();
  // Remembers the page the menu was opened on, so navigating closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;

  // usePathname reports the address in the browser bar (/<ADMIN_PATH>/...),
  // but compare against /cms too in case a rewrite ever surfaces it.
  const here = pathname.replace(/^\/cms(?=\/|$)/, base).replace(/\/+$/, "") || base;
  const isActive = (href: string) => {
    const full = href ? `${base}/${href}` : base;
    return href ? here === full || here.startsWith(`${full}/`) : here === base;
  };

  const links = (
    <nav aria-label="Admin" className="flex flex-col gap-5">
      {SECTIONS.map((section) => (
        <div key={section.group || "top"} className="flex flex-col gap-0.5">
          {section.group ? <p className="cms-label mb-1 px-3 opacity-45">{section.group}</p> : null}
          {section.items.map((item) => {
            const active = isActive(item.href);
            const count = counts[item.href] ?? 0;
            return (
              <Link
                key={item.href}
                href={item.href ? `${base}/${item.href}` : base}
                aria-current={active ? "page" : undefined}
                className={`flex items-center justify-between gap-2 rounded-[8px] px-3 py-2 text-[15px] transition-colors ${
                  active ? "bg-ink text-paper" : "hover:bg-ink/6"
                }`}
              >
                {item.label}
                {count > 0 ? (
                  <span className="bg-accent text-ink min-w-[22px] rounded-full px-1.5 text-center text-[12px] leading-[20px] tabular-nums">
                    {count > 99 ? "99+" : count}
                    <span className="sr-only"> new</span>
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );

  const footer = (
    <div className="flex flex-col gap-2 border-t border-ink/10 pt-4 text-[13px]">
      <p className="truncate" title={email}>
        {name}
        <span className="block truncate opacity-55">{email}</span>
      </p>
      <div className="flex items-center gap-3">
        <form action={logout}>
          <button type="submit" className="underline underline-offset-2 hover:no-underline">
            Sign out
          </button>
        </form>
        <a href="/" target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:no-underline">
          View site ↗
        </a>
      </div>
    </div>
  );

  return (
    <>
      {/* Wide screens: a fixed sidebar. */}
      <aside className="sticky top-0 hidden h-dvh w-[240px] shrink-0 flex-col justify-between border-r border-ink/10 px-3 py-6 tablet:flex">
        <div className="flex flex-col gap-8">
          <Link href={base} className="flex items-center gap-2 px-3">
            <SocialYatriLogo className="h-[28px] w-auto" fg="var(--ink)" bg="var(--paper)" title="Social Yatri admin" />
          </Link>
          {links}
        </div>
        <div className="px-3">{footer}</div>
      </aside>

      {/* Phones and tablets: a bar with a menu button. */}
      <div className="bg-paper/95 sticky top-0 z-30 border-b border-ink/10 backdrop-blur tablet:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Link href={base}>
            <SocialYatriLogo className="h-[24px] w-auto" fg="var(--ink)" bg="var(--paper)" title="Social Yatri admin" />
          </Link>
          <button
            type="button"
            onClick={() => setOpenOn(open ? null : pathname)}
            aria-expanded={open}
            aria-controls="cms-mobile-nav"
            className="cms-label rounded-full border border-ink/25 px-3.5 py-2"
          >
            {open ? "Close" : "Menu"}
          </button>
        </div>
        {open ? (
          <div id="cms-mobile-nav" className="flex flex-col gap-6 border-t border-ink/10 px-3 pt-4 pb-5">
            {links}
            <div className="px-3">{footer}</div>
          </div>
        ) : null}
      </div>
    </>
  );
}
