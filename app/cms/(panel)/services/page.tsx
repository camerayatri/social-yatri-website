import type { Metadata } from "next";
import { requireMaintainer } from "@/lib/cms/auth/dal";
import { getDocs } from "@/lib/cms/repo";
import ServicesEditor from "@/components/cms/editors/services-editor";
import { PageHeader } from "@/components/cms/ui";

export const metadata: Metadata = { title: "Services" };

/** The Services editor: authorize, load fresh, hand the three documents over. */
export default async function ServicesPage() {
  await requireMaintainer();
  const docs = await getDocs();
  return (
    <>
      <PageHeader title="Services" lead="Each section saves on its own. Changes show on the site as soon as they're saved." />
      <ServicesEditor servicesIntro={docs.servicesIntro} services={docs.services} why={docs.why} />
    </>
  );
}
