import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { adminHref } from "@/lib/cms/admin-path";
import { getMaintainer } from "@/lib/cms/auth/dal";
import { hasSessionSecret } from "@/lib/cms/auth/cookie";
import { hasDatabase } from "@/lib/cms/db";
import SocialYatriLogo from "@/components/logo/social-yatri-logo";
import LoginForm from "@/components/cms/login-form";
import { Notice } from "@/components/cms/ui";

export const metadata: Metadata = { title: "Sign in" };

/**
 * The one admin page anyone can reach. Someone already signed in is sent
 * straight on to the dashboard.
 */
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getMaintainer()) redirect(adminHref());
  const { next } = await searchParams;
  const ready = hasDatabase() && hasSessionSecret();

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 flex items-center justify-between">
          <SocialYatriLogo className="h-[34px] w-auto" fg="var(--ink)" bg="var(--paper)" title="Social Yatri" />
          <span className="cms-label opacity-60">Admin</span>
        </div>
        <div className="rounded-[16px] border border-ink/12 bg-white/60 p-6 max-mobile:p-5">
          <h1 className="statement text-[26px]">Sign in</h1>
          <p className="mt-1 mb-6 text-[14px] opacity-65">For the people who keep the site up to date.</p>
          {!ready ? (
            <Notice tone="warning" className="mb-4">
              The admin isn&apos;t fully set up on this server yet (database or session secret missing).
            </Notice>
          ) : null}
          <LoginForm next={typeof next === "string" ? next : undefined} disabled={!ready} />
        </div>
        <p className="mt-6 text-center text-[13px] opacity-55">
          Forgotten your password? Ask another maintainer to issue a new one.
        </p>
      </div>
    </main>
  );
}
