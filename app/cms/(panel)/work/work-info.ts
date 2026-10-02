import "server-only";
import { listMedia } from "@/lib/cms/media";
import type { DocState } from "@/lib/cms/repo";
import type { ContentKey } from "@/lib/cms/schema";
import type { WorkRowInfo } from "@/components/cms/editors/works-editor";

/**
 * The small facts the work screens show beside each category, worked out on
 * the server so the client gets a summary rather than every document: how
 * many clips each reel list has and its cover poster, who else plays a list,
 * the photo sets' names, and which categories have a home page cover.
 */
export function workRowInfo(docs: { [K in ContentKey]: DocState<K> }): WorkRowInfo {
  const works = docs.works.data;
  const cases = docs.clients.data.cases;
  const clips: WorkRowInfo["clips"] = {};
  for (const [key, list] of Object.entries(docs.reels.data)) {
    clips[key] = {
      count: list.length,
      poster: list[0]?.poster ?? null,
      sharedWith: [
        ...works.filter((w) => w.reels === key).map((w) => `the ${w.title} category`),
        ...cases.filter((c) => c.reels === key).map((c) => `the ${c.name} case study on the studio page`),
      ],
    };
  }
  const shoots = Object.fromEntries(Object.entries(docs.shoots.data.gallery).map(([key, s]) => [key, s.label]));
  return { clips, shoots, homeCovers: Object.keys(docs.homeCovers.data) };
}

/** Clip lengths the library knows, by file URL. Clips without one are measured in the browser. */
export async function clipDurations(): Promise<Record<string, number>> {
  const videos = await listMedia({ kind: "video" });
  return Object.fromEntries(videos.filter((v) => v.duration).map((v) => [v.url, v.duration as number]));
}
