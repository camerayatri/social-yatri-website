import type { Metadata } from "next";
import { requireMaintainer } from "@/lib/cms/auth/dal";
import { getDocs } from "@/lib/cms/repo";
import WorksEditor from "@/components/cms/editors/works-editor";
import { PageHeader, buttonClass } from "@/components/cms/ui";
import { workRowInfo } from "./work-info";

export const metadata: Metadata = { title: "Work & reels" };

export default async function WorkPage() {
  await requireMaintainer();
  const docs = await getDocs();
  return (
    <>
      <PageHeader
        title="Work & reels"
        lead="The categories on the /work wall and their clips. Open a category to change its clips, cover and photos."
        actions={
          <a href="/work" target="_blank" rel="noreferrer" className={buttonClass("secondary", "sm")}>
            View on site ↗
          </a>
        }
      />
      <WorksEditor workIntro={docs.workIntro} works={docs.works} info={workRowInfo(docs)} />
    </>
  );
}
