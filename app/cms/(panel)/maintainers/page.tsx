import type { Metadata } from "next";
import { requireMaintainer } from "@/lib/cms/auth/dal";
import { listMaintainers } from "@/lib/cms/maintainers";
import { AddMaintainerForm, MaintainerRows } from "@/components/cms/maintainers";
import { Card, PageHeader } from "@/components/cms/ui";

export const metadata: Metadata = { title: "Maintainers" };

export default async function MaintainersPage() {
  const me = await requireMaintainer();
  const rows = await listMaintainers();
  return (
    <>
      <PageHeader title="Maintainers" lead="The people who can sign in here. Everyone has the same access." />
      <div className="flex flex-col gap-4">
        <Card title={`${rows.length} ${rows.length === 1 ? "person" : "people"}`}>
          <MaintainerRows rows={rows} meId={me.id} />
        </Card>
        <Card title="Add someone" lead="They get a temporary password to sign in with, and choose their own afterwards.">
          <AddMaintainerForm />
        </Card>
      </div>
    </>
  );
}
