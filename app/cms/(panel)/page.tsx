import type { Metadata } from "next";
import Link from "next/link";
import { adminBase } from "@/lib/cms/admin-path";
import { recentAudit } from "@/lib/cms/audit";
import { requireMaintainer } from "@/lib/cms/auth/dal";
import { CONTENT_LABELS } from "@/lib/cms/labels";
import { countMedia } from "@/lib/cms/media";
import { getDocs } from "@/lib/cms/repo";
import { CONTENT_KEYS } from "@/lib/cms/schema";
import { Card, PageHeader, formatWhen } from "@/components/cms/ui";

export const metadata: Metadata = { title: "Dashboard" };

/** What happened lately, and where everything stands. */

const ACTIONS: Record<string, string> = {
  "content.save": "saved",
  "content.restore": "restored an earlier version of",
  "media.upload": "uploaded",
  "media.update": "edited the description of",
  "media.delete": "removed from the library",
  "auth.login": "signed in",
  "auth.logout": "signed out",
  "auth.logout-others": "signed out other sessions",
  "auth.password": "changed their password",
  "auth.fail": "failed sign-in for",
  "auth.locked": "locked out sign-in for",
  "maintainer.add": "added maintainer",
  "maintainer.disable": "disabled",
  "maintainer.enable": "re-enabled",
  "maintainer.remove": "removed maintainer",
  "maintainer.reset": "issued a new password for",
  "inbox.delete": "deleted an enquiry",
  "inbox.export": "downloaded the inbox as a spreadsheet",
  "media.purge": "permanently deleted the file",
  "work.create": "added the work category",
  "work.create.undo": "took back a half-added work category",
  "work.delete": "deleted the work category",
  "work.reels": "gave clips to the work category",
  "work.reels.undo": "took back half-added clips for",
};

/** Who did it: the person, or the scheduled clean-up for what it does on its own. */
function describeActor(action: string, email: string | null) {
  if (email) return email;
  return action === "media.purge" ? "The daily clean-up" : "Someone";
}

function describeTarget(action: string, target: string | null, detail: unknown) {
  // The work actions save several documents; what they were about is the category.
  if (action.startsWith("work.")) {
    const slug = (detail as { slug?: unknown } | null)?.slug;
    return typeof slug === "string" ? slug : "";
  }
  if (action === "inbox.delete") return "";
  if (action === "inbox.export") {
    const rows = (detail as { rows?: unknown } | null)?.rows;
    return `(${target === "all" || !target ? "everything" : target}${typeof rows === "number" ? `, ${rows} row${rows === 1 ? "" : "s"}` : ""})`;
  }
  if (!target) return "";
  if (action.startsWith("content.")) return CONTENT_LABELS[target as keyof typeof CONTENT_LABELS] ?? target;
  if (action.startsWith("media.")) return target.split("/").pop() ?? target;
  if (action === "auth.login" || action === "auth.logout" || action === "auth.password" || action === "auth.logout-others") return "";
  return target;
}

export default async function Dashboard() {
  const me = await requireMaintainer();
  const base = adminBase();
  const [entries, docs, media] = await Promise.all([recentAudit(15), getDocs(), countMedia()]);
  const edited = CONTENT_KEYS.filter((k) => docs[k].version > 0 && docs[k].updatedBy);

  return (
    <>
      <PageHeader title={`Hello, ${me.name.split(" ")[0]}`} lead="Everything on the site you can change lives in the menu." />

      <div className="grid gap-4 tablet:grid-cols-3">
        <Card title="Start here">
          <ul className="flex flex-col gap-2 text-[15px]">
            <li>
              <Link className="underline underline-offset-2" href={`${base}/site`}>
                Site &amp; contact details
              </Link>
            </li>
            <li>
              <Link className="underline underline-offset-2" href={`${base}/media`}>
                Media library
              </Link>
            </li>
          </ul>
        </Card>
        <Card title="Media">
          <p className="statement text-[28px]">{media.image + media.video}</p>
          <p className="text-[14px] opacity-65">
            {media.image} images · {media.video} videos
          </p>
        </Card>
        <Card title="Content">
          <p className="statement text-[28px]">
            {edited.length} <span className="text-[16px] opacity-60">of {CONTENT_KEYS.length}</span>
          </p>
          <p className="text-[14px] opacity-65">sections edited since launch</p>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 tablet:grid-cols-[3fr_2fr]">
        <Card title="Recent activity">
          {entries.length === 0 ? (
            <p className="opacity-60">Nothing yet.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-ink/10">
              {entries.map((e) => (
                <li key={e.id} className="flex flex-col py-2 text-[14px]">
                  <span>
                    <span>{describeActor(e.action, e.actorEmail)}</span> {ACTIONS[e.action] ?? e.action}{" "}
                    <span className="opacity-80">{describeTarget(e.action, e.target, e.detail)}</span>
                  </span>
                  <span className="text-[12px] opacity-55">{formatWhen(e.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Sections">
          <ul className="flex flex-col divide-y divide-ink/10 text-[14px]">
            {CONTENT_KEYS.map((k) => (
              <li key={k} className="flex items-baseline justify-between gap-3 py-1.5">
                <span>{CONTENT_LABELS[k]}</span>
                <span className="shrink-0 text-[12px] opacity-55">
                  {docs[k].fromDefaults && docs[k].version === 0
                    ? "original"
                    : `v${docs[k].version}${docs[k].updatedAt ? ` · ${formatWhen(docs[k].updatedAt).split(",")[0]}` : ""}`}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
