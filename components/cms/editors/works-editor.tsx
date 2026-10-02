"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createWork, deleteWork } from "@/lib/cms/actions/works";
import type { MediaItem } from "@/lib/cms/media";
import type { DocState } from "@/lib/cms/repo";
import type { WorkDoc } from "@/lib/cms/schema";
import { useAdmin } from "../admin-context";
import EditorForm, { type EditorFormApi } from "../editor-form";
import { TextField } from "../fields/text-field";
import { Thumb } from "../fields/media-thumb";
import { MultiMediaPicker } from "../fields/multi-media-picker";
import { clipFromItem, clipProblem } from "../fields/reel-grid";
import { photoProblem } from "../fields/photo-grid";
import { SortableGrid } from "../fields/sortable-grid";
import { Button, Notice, buttonClass } from "../ui";

/**
 * Work & reels: the intro above the wall, and the list of categories.
 *
 * The list sets the order of the /work wall (and, for the first six, the
 * home page's featured cards); each row's name is edited in place and
 * everything else about a category, its clips most of all, is on the
 * category's own page. Adding and deleting a category touch more than this
 * list (a category's clips are a document of their own, and a home cover is
 * keyed to it), so they are not part of this form's save: each goes through
 * its own action, which saves the documents in a safe order (see
 * `lib/cms/actions/works.ts`). For that reason both ask for the list to be
 * saved first, so nothing typed here is lost when the list reloads.
 */

/** What the list shows about a reel list without shipping every clip. */
export type ClipSummary = { count: number; poster: string | null; sharedWith: string[] };

export type WorkRowInfo = {
  /** Reel lists by key. */
  clips: Record<string, ClipSummary>;
  /** Shoot labels by key. */
  shoots: Record<string, string>;
  /** Slugs that have a home page cover of their own. */
  homeCovers: string[];
};

export function slugify(title: string) {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function workThumb(work: WorkDoc, clips: Record<string, ClipSummary>) {
  return work.cover?.src ?? (work.reels ? clips[work.reels]?.poster : null) ?? work.frame?.src ?? null;
}

/**
 * Remounts an EditorForm once the page's data has moved past `version`.
 *
 * EditorForm keeps the document it loaded as state, which is what lets it
 * guard unsaved work. After an action here changes the same document behind
 * its back, the refreshed page brings the new version; this hands back a new
 * key at that moment, so the form starts again from what is now saved
 * instead of offering a stale copy that would only end in a conflict.
 */
export function useRemountAfter(version: number) {
  const [state, setState] = useState<{ key: number; from: number | null }>({ key: 0, from: null });
  if (state.from !== null && version !== state.from) setState({ key: state.key + 1, from: null });
  return [state.key, () => setState((s) => ({ ...s, from: version }))] as const;
}

export default function WorksEditor({
  workIntro,
  works,
  info,
}: {
  workIntro: DocState<"workIntro">;
  works: DocState<"works">;
  info: WorkRowInfo;
}) {
  const router = useRouter();
  const { base } = useAdmin();
  const [formKey, expectChange] = useRemountAfter(works.version);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<WorkDoc | null>(null);
  const [done, setDone] = useState<{ text: string; notes: string[] } | null>(null);

  const reelKeys = Object.keys(info.clips);

  return (
    <div className="flex flex-col gap-6">
      <EditorForm docKey="workIntro" initial={workIntro} title="Intro" lead="The heading at the top of the /work page.">
        {(form) => (
          <>
            <TextField label="Section marker" required {...form.bind(["sign"])} hint="The small label above the heading." />
            <TextField label="Heading" required {...form.bind(["question"])} />
            <TextField label="Line under the heading" required {...form.bind(["sub"])} />
          </>
        )}
      </EditorForm>

      {done ? (
        <Notice tone="success">
          {done.text}
          {done.notes.map((n) => (
            <span key={n} className="mt-1 block">
              {n}
            </span>
          ))}
        </Notice>
      ) : null}

      <EditorForm
        key={formKey}
        docKey="works"
        initial={works}
        title="Categories"
        lead="In the order the /work wall shows them. The first six are also the featured cards on the home page."
      >
        {(form) => (
          <CategoryRows
            form={form}
            saved={works.data}
            info={info}
            base={base}
            onAdd={() => {
              setDone(null);
              setAdding(true);
            }}
            onDelete={(w) => {
              setDone(null);
              setDeleting(w);
            }}
          />
        )}
      </EditorForm>

      {adding ? (
        <NewWorkDialog
          takenSlugs={works.data.map((w) => w.slug)}
          takenReelKeys={reelKeys}
          onClose={() => setAdding(false)}
          onCreated={(slug) => {
            setAdding(false);
            router.push(`${base}/work/${slug}`);
          }}
        />
      ) : null}

      {deleting ? (
        <DeleteWorkDialog
          work={deleting}
          index={works.data.findIndex((w) => w.slug === deleting.slug)}
          info={info}
          onClose={() => setDeleting(null)}
          onDeleted={(notes) => {
            setDone({ text: `“${deleting.title}” was deleted.`, notes });
            setDeleting(null);
            expectChange();
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function CategoryRows({
  form,
  saved,
  info,
  base,
  onAdd,
  onDelete,
}: {
  form: EditorFormApi<WorkDoc[]>;
  saved: WorkDoc[];
  info: WorkRowInfo;
  base: string;
  onAdd: () => void;
  onDelete: (work: WorkDoc) => void;
}) {
  const dirty = JSON.stringify(form.value) !== JSON.stringify(saved);
  const listError = form.error([]);

  return (
    <>
      {dirty ? (
        <p className="text-[13px] opacity-70">
          Save or discard the changes to this list before adding or deleting a category.
        </p>
      ) : null}
      <SortableGrid
        layout="rows"
        label="Categories"
        items={form.value}
        onChange={(next) => form.set([], next)}
        itemKey={(w) => w.slug}
        itemName={(w) => `“${w.title || w.slug}”`}
        itemError={(i) => form.error([i]) ?? form.error([i, "reels"]) ?? form.error([i, "shoot"]) ?? form.error([i, "frame"])}
        badge={(_, i) =>
          i < 6 ? <span className="cms-label truncate rounded-full border border-ink/20 px-2 py-0.5 !text-[11px]">Home card {i + 1}</span> : null
        }
        renderItem={(work, i) => {
          const clips = work.reels ? info.clips[work.reels] : undefined;
          const facts = [
            `/work/${work.slug}`,
            work.reels ? `${clips?.count ?? 0} clip${clips?.count === 1 ? "" : "s"}` : "A still, no clips",
            work.shoot ? `Photos: ${info.shoots[work.shoot] ?? work.shoot}` : null,
            work.cover ? null : "No cover of its own",
          ].filter(Boolean);
          return (
            <div className="flex items-start gap-3">
              <Link
                href={`${base}/work/${work.slug}`}
                className="w-[64px] shrink-0 max-mobile:w-[52px]"
                aria-label={`Open ${work.title || work.slug}`}
                tabIndex={-1}
              >
                <Thumb src={workThumb(work, info.clips)} ratio={4 / 5} />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <TextField label="Name" required {...form.bind([i, "title"])} />
                <p className="text-[13px] break-words opacity-65">{facts.join(" · ")}</p>
              </div>
            </div>
          );
        }}
        actions={(work) => (
          <>
            <Link href={`${base}/work/${work.slug}`} className={buttonClass("primary", "sm")}>
              Clips & details →
            </Link>
            <Button
              size="sm"
              variant="danger"
              onClick={() => onDelete(work)}
              disabled={dirty || !saved.some((w) => w.slug === work.slug)}
              title={dirty ? "Save or discard the changes to this list first." : undefined}
            >
              Delete…
            </Button>
          </>
        )}
      />
      {listError ? <p className="text-[13px] text-[#a3271b]">{listError}</p> : null}
      <div>
        <Button onClick={onAdd} disabled={dirty} title={dirty ? "Save or discard the changes to this list first." : undefined}>
          + New category
        </Button>
      </div>
    </>
  );
}

/** A modal dialog that opens itself on mount and reports every way of closing. */
function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      // React hands a nested dialog's close event up the component tree too;
      // only this dialog's own closing counts. Escape fires "close" as well.
      onClose={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-label={title}
      className={`bg-paper text-ink m-auto max-h-[92dvh] max-w-none overflow-y-auto rounded-[16px] p-0 backdrop:bg-ink/50 ${
        wide ? "w-[min(720px,94vw)]" : "w-[min(560px,94vw)]"
      }`}
    >
      <div className="flex flex-col gap-4 px-6 py-5 max-mobile:px-4">
        <h2 className="text-[20px] tracking-[-0.01em]">{title}</h2>
        {children}
      </div>
    </dialog>
  );
}

function NewWorkDialog({
  takenSlugs,
  takenReelKeys,
  onClose,
  onCreated,
}: {
  takenSlugs: string[];
  takenReelKeys: string[];
  onClose: () => void;
  onCreated: (slug: string) => void;
}) {
  const radioName = useId();
  const [title, setTitle] = useState("");
  const [slugTyped, setSlugTyped] = useState<string | null>(null);
  const [type, setType] = useState<"video" | "still">("video");
  const [clip, setClip] = useState<MediaItem | null>(null);
  const [still, setStill] = useState<MediaItem | null>(null);
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [failure, setFailure] = useState<string | null>(null);

  const slug = slugTyped ?? slugify(title);
  const slugError = !slug
    ? null
    : !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)
      ? "Lower case letters, numbers and single hyphens only."
      : takenSlugs.includes(slug)
        ? "Another category already has this address."
        : type === "video" && takenReelKeys.includes(slug)
          ? "A reel list with this name already exists. Pick a different address."
          : null;
  const chosen = type === "video" ? clip : still;
  const canCreate = !!title.trim() && !!slug && !slugError && !!chosen && !busy;

  const create = async () => {
    if (!canCreate) return;
    setBusy(true);
    setFailure(null);
    const result = await createWork({
      title,
      slug,
      ...(type === "video" && clip ? { clip: clipFromItem(clip) } : {}),
      ...(type === "still" && still ? { frame: { src: still.url, alt: still.alt } } : {}),
    });
    setBusy(false);
    if ("ok" in result) onCreated(result.slug);
    else if ("fieldErrors" in result) setErrors(result.fieldErrors);
    else setFailure(result.error);
  };

  return (
    <Modal title="New category" onClose={onClose} wide>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void create();
        }}
      >
        <TextField
          label="Name"
          required
          autoFocus
          value={title}
          onChange={(v) => {
            setTitle(v);
            setErrors({});
          }}
          error={errors.title?.[0]}
          hint="As the client calls it, like “Hotel & Resort”."
        />
        <TextField
          label="Page address"
          required
          value={slug}
          onChange={(v) => setSlugTyped(v.toLowerCase().replace(/\s+/g, "-"))}
          error={slugError ?? errors.slug?.[0]}
          hint={
            <>
              The page will be at <strong>/work/{slug || "…"}</strong>. Made from the name; change it now if you like, because it
              can&apos;t change once the category exists.
            </>
          }
        />
        <fieldset className="flex flex-col gap-2">
          <legend className="cms-label mb-1.5 opacity-75">What it shows</legend>
          {(
            [
              ["video", "Clips", "A list of video clips. The first is the cover; add the rest on the next screen."],
              ["still", "One photograph", "A single still instead of clips, for photography with no video."],
            ] as const
          ).map(([value, label, hint]) => (
            <label
              key={value}
              className={`flex cursor-pointer gap-3 rounded-[10px] border px-3 py-2.5 ${type === value ? "border-ink bg-white" : "border-ink/15"}`}
            >
              <input
                type="radio"
                name={radioName}
                value={value}
                checked={type === value}
                onChange={() => setType(value)}
                className="accent-ink mt-1"
              />
              <span>
                <span className="block text-[15px]">{label}</span>
                <span className="block text-[13px] opacity-65">{hint}</span>
              </span>
            </label>
          ))}
        </fieldset>

        <div className="flex flex-col gap-2">
          <p className="cms-label opacity-75">{type === "video" ? "Cover clip *" : "Photograph *"}</p>
          <div className="flex items-center gap-3 rounded-[10px] border border-ink/15 bg-white/70 p-2">
            <div className="w-[64px] shrink-0">
              <Thumb src={chosen ? (chosen.kind === "video" ? chosen.posterUrl : chosen.url) : null} ratio={type === "video" ? 9 / 16 : 4 / 5} />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <p className="line-clamp-2 text-[13px] opacity-70">{chosen ? chosen.alt : "Nothing chosen yet."}</p>
              <div>
                <Button size="sm" onClick={() => setPicking(true)}>
                  {chosen ? "Choose another" : type === "video" ? "Choose or upload a clip" : "Choose or upload a photograph"}
                </Button>
              </div>
            </div>
          </div>
          {errors.clip?.[0] || errors.frame?.[0] || errors[""]?.[0] ? (
            <p className="text-[13px] text-[#a3271b]">{errors.clip?.[0] ?? errors.frame?.[0] ?? errors[""]?.[0]}</p>
          ) : null}
        </div>

        {failure ? <Notice tone="error">{failure}</Notice> : null}

        <div className="flex flex-wrap justify-end gap-2 border-t border-ink/10 pt-4">
          <Button onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={!canCreate}>
            {busy ? "Adding…" : "Add category"}
          </Button>
        </div>
      </form>

      {picking ? (
        <MultiMediaPicker
          kind={type === "video" ? "video" : "image"}
          title={type === "video" ? "Choose the cover clip" : "Choose the photograph"}
          max={1}
          unusable={type === "video" ? clipProblem : photoProblem}
          onClose={() => setPicking(false)}
          onAdd={([item]) => {
            if (!item) return;
            if (type === "video") setClip(item);
            else setStill(item);
          }}
        />
      ) : null}
    </Modal>
  );
}

export function DeleteWorkDialog({
  work,
  index,
  info,
  onClose,
  onDeleted,
  extraWarning,
}: {
  work: WorkDoc;
  index: number;
  info: WorkRowInfo;
  onClose: () => void;
  onDeleted: (notes: string[]) => void;
  extraWarning?: ReactNode;
}) {
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const clips = work.reels ? info.clips[work.reels] : undefined;
  const shared = clips?.sharedWith.filter((s) => s !== `the ${work.title} category`) ?? [];

  const confirm = async () => {
    setBusy(true);
    setFailure(null);
    const result = await deleteWork(work.slug);
    setBusy(false);
    if ("ok" in result) onDeleted(result.notes);
    else setFailure("error" in result ? result.error : "The category wasn't deleted.");
  };

  return (
    <Modal title={`Delete “${work.title}”?`} onClose={onClose}>
      <p>This takes the category off the site. In one go:</p>
      <ul className="flex list-disc flex-col gap-1.5 pl-5 text-[15px]">
        <li>
          It comes off the /work wall
          {index > -1 && index < 6 ? <>, and off the home page, where it is featured card {index + 1}</> : null}. The categories after it
          move up one place.
        </li>
        <li>
          Its page, <strong>/work/{work.slug}</strong>, stops working.
        </li>
        {work.reels ? (
          shared.length ? (
            <li>Its clips stay, because {shared.join(" and ")} plays the same list.</li>
          ) : (
            <li>
              Its list of {clips?.count ?? 0} clip{clips?.count === 1 ? "" : "s"} is removed.
            </li>
          )
        ) : null}
        {info.homeCovers.includes(work.slug) ? <li>Its home page cover is removed.</li> : null}
        <li>The video and photo files stay in the media library, so they can be used elsewhere.</li>
      </ul>
      {index > -1 && index < 6 ? (
        <Notice tone="warning">
          The category that moves into home card {index + 1} must have a cover of the right shape there. If it doesn&apos;t, this is refused
          and the message says what to fix.
        </Notice>
      ) : null}
      {extraWarning}
      <p className="text-[14px] opacity-70">Every earlier version stays in History, so this can be put back.</p>
      {failure ? <Notice tone="error">{failure}</Notice> : null}
      <div className="flex flex-wrap justify-end gap-2 border-t border-ink/10 pt-4">
        <Button onClick={onClose} disabled={busy} autoFocus>
          Keep it
        </Button>
        <Button variant="danger" onClick={confirm} disabled={busy}>
          {busy ? "Deleting…" : `Delete “${work.title}”`}
        </Button>
      </div>
    </Modal>
  );
}
