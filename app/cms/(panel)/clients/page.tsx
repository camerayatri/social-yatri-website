import type { Metadata } from "next";
import { requireMaintainer } from "@/lib/cms/auth/dal";
import { getDocs } from "@/lib/cms/repo";
import ClientsEditor from "@/components/cms/editors/clients-editor";
import { PageHeader } from "@/components/cms/ui";

export const metadata: Metadata = { title: "Clients" };

/**
 * The Clients editor. Besides the document it needs the reel lists that
 * exist, so a case study's clips are chosen from a list rather than typed;
 * each is named by the work category of the same slug where there is one.
 */
export default async function ClientsPage() {
  await requireMaintainer();
  const docs = await getDocs();
  const titles = new Map(docs.works.data.map((w) => [w.slug, w.title]));
  const reelOptions = Object.keys(docs.reels.data).map((key) => ({
    value: key,
    label: titles.has(key) ? `${titles.get(key)} (${key})` : key,
  }));

  return (
    <>
      <PageHeader title="Clients" lead="The case studies on the home and Studio pages. Changes show on the site as soon as they're saved." />
      <ClientsEditor clients={docs.clients} reelOptions={reelOptions} />
    </>
  );
}
