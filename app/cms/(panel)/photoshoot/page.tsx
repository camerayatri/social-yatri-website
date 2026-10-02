import type { Metadata } from "next";
import { requireMaintainer } from "@/lib/cms/auth/dal";
import { getDocs } from "@/lib/cms/repo";
import PhotoshootEditor from "@/components/cms/editors/photoshoot-editor";
import { PageHeader, buttonClass } from "@/components/cms/ui";

export const metadata: Metadata = { title: "Photoshoots" };

export default async function PhotoshootPage() {
  await requireMaintainer();
  const docs = await getDocs();

  // Which categories show each set, so a set in use isn't removed from under them.
  const links: Record<string, { slug: string; title: string }[]> = {};
  for (const w of docs.works.data) if (w.shoot) (links[w.shoot] ??= []).push({ slug: w.slug, title: w.title });

  return (
    <>
      <PageHeader
        title="Photoshoots"
        lead="The photo sets on /photoshoot, and on the categories that link to them."
        actions={
          <a href="/photoshoot" target="_blank" rel="noreferrer" className={buttonClass("secondary", "sm")}>
            View on site ↗
          </a>
        }
      />
      <PhotoshootEditor photoshoot={docs.photoshoot} shoots={docs.shoots} links={links} />
    </>
  );
}
