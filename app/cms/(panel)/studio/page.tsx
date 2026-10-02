import type { Metadata } from "next";
import { requireMaintainer } from "@/lib/cms/auth/dal";
import { getDocs } from "@/lib/cms/repo";
import StudioEditor from "@/components/cms/editors/studio-editor";
import { PageHeader } from "@/components/cms/ui";

export const metadata: Metadata = { title: "Studio" };

/** The Studio editor: authorize, load fresh, hand the document over. */
export default async function StudioPage() {
  await requireMaintainer();
  const docs = await getDocs();
  return (
    <>
      <PageHeader
        title="Studio"
        lead="The opening of the Studio page. The client stories below it are edited under Clients; the scrolling strip under Site & contact."
      />
      <StudioEditor kolkata={docs.kolkata} />
    </>
  );
}
