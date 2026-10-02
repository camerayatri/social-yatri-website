import type { Metadata } from "next";
import { logout } from "@/lib/cms/actions/auth";
import { requireMaintainer } from "@/lib/cms/auth/dal";
import { ChangePasswordForm, SignOutOthersForm } from "@/components/cms/account-forms";
import { Button, Card, PageHeader } from "@/components/cms/ui";

export const metadata: Metadata = { title: "Your account" };

export default async function AccountPage() {
  const me = await requireMaintainer();
  return (
    <>
      <PageHeader title="Your account" lead={`Signed in as ${me.email}.`} />
      <div className="flex flex-col gap-4">
        <Card title="Password" lead={me.mustChangePassword ? "You're on a temporary password. Choose your own now." : undefined}>
          <ChangePasswordForm />
        </Card>
        <Card title="Sessions" lead="Signed in on a computer you no longer use, or lost a phone? End every other session.">
          <SignOutOthersForm />
        </Card>
        <Card title="Sign out">
          <form action={logout}>
            <Button type="submit">Sign out of this browser</Button>
          </form>
        </Card>
      </div>
    </>
  );
}
