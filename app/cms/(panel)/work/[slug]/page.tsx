import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { adminBase } from "@/lib/cms/admin-path";
import { requireMaintainer } from "@/lib/cms/auth/dal";
import { getDoc, getDocs } from "@/lib/cms/repo";
import WorkDetailEditor from "@/components/cms/editors/work-detail-editor";
import { PageHeader, buttonClass } from "@/components/cms/ui";
import { clipDurations, workRowInfo } from "../work-info";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await requireMaintainer();
  const { slug } = await params;
  const works = await getDoc("works");
  return { title: works.data.find((w) => w.slug === slug)?.title ?? "Work" };
}

/**
 * One category's page: its details and its clips. Loads every document
 * fresh, as the editors need their versions, and the library's clip lengths.
 */
export default async function WorkDetailPage({ params }: Props) {
  await requireMaintainer();
  const { slug } = await params;
  const [docs, durations] = await Promise.all([getDocs(), clipDurations()]);
  const work = docs.works.data.find((w) => w.slug === slug);
  if (!work) notFound();

  const shoots = docs.shoots.data.order.map((key) => ({
    key,
    label: docs.shoots.data.gallery[key]?.label ?? key,
    count: docs.shoots.data.gallery[key]?.photos.length ?? 0,
  }));

  return (
    <>
      <p className="mb-3 text-[14px]">
        <Link href={`${adminBase()}/work`} className="underline underline-offset-2 hover:no-underline">
          ← All categories
        </Link>
      </p>
      <PageHeader
        title={work.title}
        lead={`A category of work, at /work/${work.slug}.`}
        actions={
          <a href={`/work/${work.slug}`} target="_blank" rel="noreferrer" className={buttonClass("secondary", "sm")}>
            View on site ↗
          </a>
        }
      />
      <WorkDetailEditor
        slug={slug}
        works={docs.works}
        reels={docs.reels}
        shoots={shoots}
        durations={durations}
        info={workRowInfo(docs)}
      />
    </>
  );
}
