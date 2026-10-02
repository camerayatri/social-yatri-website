import Link from "next/link";
import { adminBase } from "@/lib/cms/admin-path";
import { requireMaintainer } from "@/lib/cms/auth/dal";
import { countNewSubmissions } from "@/lib/cms/inbox";
import { AdminProvider } from "@/components/cms/admin-context";
import AdminNav from "@/components/cms/admin-nav";
import { Notice } from "@/components/cms/ui";

/**
 * Every signed-in admin page sits in this group. The layout checks the
 * session (each page checks again, because layouts and pages render
 * independently and a layout check alone can be skipped), then frames the
 * page with the menu.
 */
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const me = await requireMaintainer();
  const base = adminBase();
  // A badge is not worth a broken page: without the count the menu just shows none.
  const newEnquiries = await countNewSubmissions().catch(() => 0);

  return (
    <AdminProvider base={base}>
      <div className="flex min-h-dvh flex-col tablet:flex-row">
        <AdminNav name={me.name} email={me.email} counts={{ inbox: newEnquiries }} />
        <main id="main" className="min-w-0 flex-1 px-8 pt-10 pb-24 max-tablet:px-4 max-tablet:pt-6">
          <div className="mx-auto w-full max-w-[1080px]">
            {me.mustChangePassword ? (
              <Notice tone="warning" className="mb-6">
                You signed in with a temporary password.{" "}
                <Link href={`${base}/account`} className="underline underline-offset-2">
                  Choose your own
                </Link>{" "}
                before you carry on.
              </Notice>
            ) : null}
            {children}
          </div>
        </main>
      </div>
    </AdminProvider>
  );
}
