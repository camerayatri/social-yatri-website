import type { Metadata } from "next";
import { requireMaintainer } from "@/lib/cms/auth/dal";
import { getDocs } from "@/lib/cms/repo";
import HomeEditor from "@/components/cms/editors/home-editor";
import { PageHeader } from "@/components/cms/ui";

export const metadata: Metadata = { title: "Home page" };

/**
 * The home page's editor. Authorize, load the documents fresh, and work out
 * which six categories the cards show (the first six works, in order) so the
 * editor can name each card by what it is.
 */
export default async function HomePage() {
  await requireMaintainer();
  const docs = await getDocs();
  const featured = docs.works.data.slice(0, 6).map((w) => ({ slug: w.slug, title: w.title }));

  return (
    <>
      <PageHeader title="Home page" lead="Each section saves on its own. Changes show on the site as soon as they're saved." />
      <HomeEditor
        hero={docs.hero}
        about={docs.about}
        homeCovers={docs.homeCovers}
        growth={docs.growth}
        process={docs.process}
        photos={docs.photos}
        featured={featured}
      />
    </>
  );
}
