import type { Metadata } from "next";
import { requireMaintainer } from "@/lib/cms/auth/dal";
import { getDocs } from "@/lib/cms/repo";
import SiteEditor from "@/components/cms/editors/site-editor";
import { PageHeader } from "@/components/cms/ui";

export const metadata: Metadata = { title: "Site & contact" };

/**
 * The reference editor page: authorize, load the documents fresh (never the
 * cached public copy, so the versions are current), hand them to the client
 * editor.
 */
export default async function SitePage() {
  await requireMaintainer();
  const docs = await getDocs();
  return (
    <>
      <PageHeader title="Site & contact" lead="Each section saves on its own. Changes show on the site as soon as they're saved." />
      <SiteEditor site={docs.site} nav={docs.nav} connect={docs.connect} marquee={docs.marquee} />
    </>
  );
}
