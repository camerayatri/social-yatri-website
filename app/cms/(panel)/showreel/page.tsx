import type { Metadata } from "next";
import { requireMaintainer } from "@/lib/cms/auth/dal";
import { getDocs } from "@/lib/cms/repo";
import ShowreelEditor from "@/components/cms/editors/showreel-editor";
import { PageHeader, buttonClass } from "@/components/cms/ui";
import { clipDurations } from "../work/work-info";

export const metadata: Metadata = { title: "Showreel" };

export default async function ShowreelPage() {
  await requireMaintainer();
  const [docs, durations] = await Promise.all([getDocs(), clipDurations()]);
  return (
    <>
      <PageHeader
        title="Showreel"
        lead="The spiral of clips on the home page. Six to twelve, each with a title."
        actions={
          <a href="/" target="_blank" rel="noreferrer" className={buttonClass("secondary", "sm")}>
            View on site ↗
          </a>
        }
      />
      <ShowreelEditor showreel={docs.showreel} durations={durations} />
    </>
  );
}
