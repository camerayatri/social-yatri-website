import type { Metadata } from "next";
import { requireMaintainer } from "@/lib/cms/auth/dal";
import { listMedia } from "@/lib/cms/media";
import { MediaLibrary } from "@/components/cms/media/media-library";
import { PageHeader } from "@/components/cms/ui";

export const metadata: Metadata = { title: "Media" };

export default async function MediaPage() {
  await requireMaintainer();
  const items = await listMedia();
  return (
    <>
      <PageHeader
        title="Media library"
        lead="Every photo and video the site can use. Upload here, then pick it from any editor."
      />
      <MediaLibrary initialItems={items} />
    </>
  );
}
