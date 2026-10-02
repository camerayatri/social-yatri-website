"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { startReelList } from "@/lib/cms/actions/works";
import type { DocState } from "@/lib/cms/repo";
import type { ContentDocs, WorkDoc } from "@/lib/cms/schema";
import { useAdmin } from "../admin-context";
import EditorForm, { type EditorFormApi } from "../editor-form";
import { FieldShell, inputClass } from "../fields/field-shell";
import { MediaField } from "../fields/media-field";
import { MultiMediaPicker } from "../fields/multi-media-picker";
import { ReelGrid, clipFromItem, clipProblem } from "../fields/reel-grid";
import { BlockSave, SaveBlocker } from "../fields/save-block";
import { TextField } from "../fields/text-field";
import { Button, Card, Notice } from "../ui";
import { DeleteWorkDialog, useRemountAfter, type WorkRowInfo } from "./works-editor";

/**
 * One category of work: its details, and its clips.
 *
 * Two documents, two save bars, as on every editor page. The details are this
 * category's entry in `works` (name, cover, the photo set it links to); the
 * clips are its list in `reels`, as cards with the first marked as the cover
 * clip, because the wall and the category's page take the head of the list
 * as the cover and the hover clip.
 *
 * A category with a still instead of clips can be given clips here. That
 * touches both documents, so it goes through its own action, after which both
 * forms start again from what is saved.
 */

export type ShootOption = { key: string; label: string; count: number };

export default function WorkDetailEditor({
  slug,
  works,
  reels,
  shoots,
  durations,
  info,
}: {
  slug: string;
  works: DocState<"works">;
  reels: DocState<"reels">;
  shoots: ShootOption[];
  durations: Record<string, number>;
  info: WorkRowInfo;
}) {
  const router = useRouter();
  const { base } = useAdmin();
  const [worksKey, expectWorks] = useRemountAfter(works.version);
  const [reelsKey, expectReels] = useRemountAfter(reels.version);
  const [deleting, setDeleting] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const index = works.data.findIndex((w) => w.slug === slug);
  const work = works.data[index];
  if (!work) {
    return <Notice tone="warning">This category was deleted or renamed. Go back to the list.</Notice>;
  }
  const reelKey = work.reels;
  const shared = reelKey ? (info.clips[reelKey]?.sharedWith ?? []).filter((s) => s !== `the ${work.title} category`) : [];

  return (
    <div className="flex flex-col gap-6">
      <EditorForm key={`w${worksKey}`} docKey="works" initial={works} title="Details" lead="The name, the cover the /work wall shows, and the photo set on this category's page.">
        {(form) => <DetailFields form={form} index={index} shoots={shoots} base={base} />}
      </EditorForm>

      {reelKey ? (
        <SaveBlocker>
          <EditorForm
            key={`r${reelsKey}`}
            docKey="reels"
            initial={reels}
            title="Clips"
            lead="The first clip is the cover: the wall plays it on hover and this category's page opens with it. Drag or use the arrows to reorder."
          >
            {(form) => <ClipFields form={form} reelKey={reelKey} durations={durations} shared={shared} />}
          </EditorForm>
        </SaveBlocker>
      ) : (
        <Card title="Clips" lead="This category shows one photograph instead of clips.">
          <div className="flex flex-col gap-3">
            <p className="text-[15px]">
              Add a first clip to turn it into a video category. That clip becomes the cover; more can be added after.
            </p>
            {startError ? <Notice tone="error">{startError}</Notice> : null}
            <div>
              <Button onClick={() => setStarting(true)}>Add a first clip</Button>
            </div>
          </div>
          {starting ? (
            <MultiMediaPicker
              kind="video"
              title="Choose the cover clip"
              max={1}
              unusable={clipProblem}
              onClose={() => setStarting(false)}
              onAdd={async ([item]) => {
                if (!item) return;
                setStartError(null);
                const result = await startReelList(slug, clipFromItem(item));
                if ("ok" in result) {
                  expectWorks();
                  expectReels();
                  router.refresh();
                } else setStartError("error" in result ? result.error : "The clip wasn't added.");
              }}
            />
          ) : null}
        </Card>
      )}

      <Card title="Delete this category">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-[560px] text-[14px] opacity-75">
            Takes it off the site with its clip list and home page cover. The files stay in the media library.
          </p>
          <Button variant="danger" onClick={() => setDeleting(true)}>
            Delete “{work.title}”…
          </Button>
        </div>
      </Card>

      {deleting ? (
        <DeleteWorkDialog
          work={work}
          index={index}
          info={info}
          extraWarning={<p className="text-[14px]">Anything not yet saved on this page is lost.</p>}
          onClose={() => setDeleting(false)}
          onDeleted={() => {
            setDeleting(false);
            router.push(`${base}/work`);
          }}
        />
      ) : null}
    </div>
  );
}

function DetailFields({
  form,
  index,
  shoots,
  base,
}: {
  form: EditorFormApi<WorkDoc[]>;
  index: number;
  shoots: ShootOption[];
  base: string;
}) {
  const selectId = useId();
  const work = form.value[index];
  if (!work) return null;
  const cover = work.cover;
  const shootError = form.error([index, "shoot"]);
  const others = form.value
    .map((w, i) => ({ w, i }))
    .filter(({ i }) => i !== index)
    .flatMap(({ i }) => {
      const e = form.error([i]) ?? form.error([i, "reels"]) ?? form.error([i, "shoot"]);
      return e ? [e] : [];
    });

  return (
    <>
      <div className="grid gap-5 tablet:grid-cols-2">
        <TextField label="Name" required {...form.bind([index, "title"])} />
        <TextField
          label="Page address"
          value={`/work/${work.slug}`}
          readOnly
          hint="Fixed: links and the home page cover point to it. To change it, add a new category and delete this one."
        />
      </div>

      <div className="flex flex-col gap-2">
        <MediaField
          label="Cover on the /work wall"
          kind="image"
          value={cover ?? null}
          error={form.error([index, "cover"]) ?? form.error([index, "cover", "w"]) ?? form.error([index, "cover", "h"])}
          altError={form.error([index, "cover", "alt"])}
          hint={
            work.reels
              ? "Optional. Without one, the wall shows the cover clip's poster. The card takes this picture's shape."
              : "Optional. Without one, the wall shows the photograph below."
          }
          onChange={(v) => {
            if (!v.w || !v.h) {
              form.set([index, "cover"], { src: v.src, alt: v.alt, w: 0, h: 0 });
              return;
            }
            form.set([index, "cover"], { src: v.src, alt: v.alt, w: v.w, h: v.h, ...(cover?.focus ? { focus: cover.focus } : {}) });
          }}
        />
        {cover ? (
          <div>
            <Button size="sm" variant="ghost" onClick={() => form.set([index, "cover"], undefined)}>
              Remove the cover
            </Button>
          </div>
        ) : null}
      </div>

      {!work.reels || work.frame ? (
        <MediaField
          label={work.reels ? "Still (not shown while there are clips)" : "Photograph"}
          kind="image"
          value={work.frame ?? null}
          error={form.error([index, "frame"])}
          altError={form.error([index, "frame", "alt"])}
          hint="The picture this category shows instead of clips."
          onChange={(v) => form.set([index, "frame"], { src: v.src, alt: v.alt, ...(work.frame?.focus ? { focus: work.frame.focus } : {}) })}
        />
      ) : null}

      <FieldShell
        id={selectId}
        label="Photo set on this page"
        error={shootError}
        hint={
          <>
            The category&apos;s page shows these photographs under its clips.{" "}
            <Link href={`${base}/photoshoot`} className="underline underline-offset-2">
              Edit the photo sets
            </Link>
          </>
        }
      >
        <select
          id={selectId}
          value={work.shoot ?? ""}
          onChange={(e) => form.set([index, "shoot"], e.target.value || undefined)}
          className={inputClass(shootError)}
          aria-describedby={`${selectId}-msg`}
        >
          <option value="">None</option>
          {shoots.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label} ({s.count} photo{s.count === 1 ? "" : "s"})
            </option>
          ))}
          {work.shoot && !shoots.some((s) => s.key === work.shoot) ? (
            <option value={work.shoot}>{work.shoot} (missing)</option>
          ) : null}
        </select>
      </FieldShell>

      {others.length ? (
        <Notice tone="warning">
          This list is saved as a whole, and another category has a problem:{" "}
          {others.slice(0, 3).join(" ")}{" "}
          <Link href={`${base}/work`} className="underline underline-offset-2">
            See all categories
          </Link>
        </Notice>
      ) : null}
    </>
  );
}

function ClipFields({
  form,
  reelKey,
  durations,
  shared,
}: {
  form: EditorFormApi<ContentDocs["reels"]>;
  reelKey: string;
  durations: Record<string, number>;
  shared: string[];
}) {
  const [picking, setPicking] = useState(false);
  const clips = form.value[reelKey] ?? [];
  const missingAlt = clips.map((c, i) => (c.alt.trim() ? null : i + 1)).filter((n): n is number => n !== null);

  return (
    <>
      {shared.length ? (
        <Notice>
          These clips also play in {shared.join(" and ")}. Changes here show there too.
        </Notice>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[14px]" aria-live="polite">
          <strong>{clips.length}</strong> clip{clips.length === 1 ? "" : "s"}
        </p>
        <Button variant="primary" size="sm" onClick={() => setPicking(true)}>
          + Add clips
        </Button>
      </div>
      <ReelGrid
        label="Clips"
        items={clips}
        onChange={(next) => form.set([reelKey], next)}
        durations={durations}
        coverFirst
        min={1}
        minReason="A video category keeps at least one clip: the first is its cover."
        errorAt={(i, field) => form.error(field ? [reelKey, i, field] : [reelKey, i])}
      />
      {form.error([reelKey]) ? <p className="text-[13px] text-[#a3271b]">{form.error([reelKey])}</p> : null}
      {form.error([]) ? <p className="text-[13px] text-[#a3271b]">{form.error([])}</p> : null}
      {missingAlt.length ? (
        <BlockSave
          reason={`write alt text for clip${missingAlt.length === 1 ? "" : "s"} ${missingAlt.join(", ")}. It describes the clip for people who can't watch it.`}
        />
      ) : null}
      {picking ? (
        <MultiMediaPicker
          kind="video"
          title="Add clips"
          exclude={clips.map((c) => c.src)}
          unusable={clipProblem}
          onClose={() => setPicking(false)}
          onAdd={(items) => form.set([reelKey], [...clips, ...items.map(clipFromItem)])}
        />
      ) : null}
    </>
  );
}

