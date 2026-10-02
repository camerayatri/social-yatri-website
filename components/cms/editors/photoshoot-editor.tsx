"use client";

import Link from "next/link";
import { useId, useState } from "react";
import type { DocState } from "@/lib/cms/repo";
import type { ContentDocs } from "@/lib/cms/schema";
import { useAdmin } from "../admin-context";
import EditorForm, { type EditorFormApi } from "../editor-form";
import { LinesField } from "../fields/lines-field";
import { Thumb } from "../fields/media-thumb";
import { MultiMediaPicker } from "../fields/multi-media-picker";
import { PhotoBatchUpload } from "../fields/photo-batch-upload";
import { MissingAlt, PhotoGrid, photoFromItem, photoProblem } from "../fields/photo-grid";
import { BlockSave, SaveBlocker } from "../fields/save-block";
import { SortableGrid } from "../fields/sortable-grid";
import { TextField } from "../fields/text-field";
import { Button, Notice } from "../ui";
import { slugify } from "./works-editor";

/**
 * Photoshoots: the intro of /photoshoot, and the photo sets themselves.
 *
 * The sets are one document: their order (the order /photoshoot shows them
 * in) and each set's name and photographs. A set opens to a grid of its
 * photographs, where several can be uploaded at once or added from the
 * library, reordered (the first one opens the set's strip), described, or
 * taken out. Only one set is open at a time, so a page with a hundred and
 * more photographs stays quick.
 *
 * Every photograph needs alt text before the sets can be saved; the missing
 * ones are listed at the top, each a button that opens its set and puts the
 * cursor in the right box. A set a work category links to can't be removed
 * until the category is pointed elsewhere, since the category's page shows it.
 */

type Shoots = ContentDocs["shoots"];

export default function PhotoshootEditor({
  photoshoot,
  shoots,
  links,
}: {
  photoshoot: DocState<"photoshoot">;
  shoots: DocState<"shoots">;
  /** Categories that show each set, by set key. */
  links: Record<string, { slug: string; title: string }[]>;
}) {
  return (
    <div className="flex flex-col gap-6">
      <EditorForm docKey="photoshoot" initial={photoshoot} title="Intro" lead="The heading at the top of the /photoshoot page.">
        {(form) => {
          const total = shoots.data.order.length;
          return (
            <>
              <TextField label="Section marker" required {...form.bind(["sign"])} hint="The small label above the heading." />
              <LinesField
                label="Heading"
                hint="Each line is set on its own line."
                value={form.value.question}
                onChange={(v) => form.set(["question"], v)}
                min={1}
                max={3}
                error={form.error(["question"])}
                errorAt={(i) => form.error(["question", i])}
              />
              <TextField label="Line under the heading" required {...form.bind(["sub"])} />
              <TextField
                label="Number of sets, as written"
                required
                {...form.bind(["sets"])}
                hint={`Shown beside the heading. There ${total === 1 ? "is 1 set" : `are ${total} sets`} saved now.`}
              />
            </>
          );
        }}
      </EditorForm>

      <SaveBlocker>
        <EditorForm
          docKey="shoots"
          initial={shoots}
          title="Photo sets"
          lead="In the order /photoshoot shows them. Open a set to add, describe and arrange its photographs."
        >
          {(form) => <ShootFields form={form} links={links} />}
        </EditorForm>
      </SaveBlocker>
    </div>
  );
}

function ShootFields({ form, links }: { form: EditorFormApi<Shoots>; links: Record<string, { slug: string; title: string }[]> }) {
  const { base } = useAdmin();
  const idBase = useId();
  const doc = form.value;
  const [open, setOpen] = useState<string | null>(null);
  const [uploadingTo, setUploadingTo] = useState<string | null>(null);
  const [pickingFor, setPickingFor] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState("");

  const altId = (key: string, i: number) => `${idBase}-${key}-${i}`;
  const photosOf = (key: string) => doc.gallery[key]?.photos ?? [];
  const setPhotos = (key: string, photos: Shoots["gallery"][string]["photos"]) => form.set(["gallery", key, "photos"], photos);

  const missing = doc.order.flatMap((key) =>
    photosOf(key).flatMap((p, i) =>
      p.alt.trim() ? [] : [{ key: `${key}:${i}`, label: `${doc.gallery[key]?.label || key}, photo ${i + 1}`, thumb: p.src }],
    ),
  );
  const empty = doc.order.filter((key) => photosOf(key).length === 0);
  const unnamed = doc.order.filter((key) => !doc.gallery[key]?.label.trim());
  const total = doc.order.reduce((n, key) => n + photosOf(key).length, 0);

  const reason = missing.length
    ? `add alt text to ${missing.length === 1 ? "1 photo" : `${missing.length} photos`} (listed at the top).`
    : empty.length
      ? `“${doc.gallery[empty[0]]?.label || empty[0]}” has no photographs. Add some, or remove the set.`
      : unnamed.length
        ? "every set needs a name."
        : null;

  const jump = (target: string) => {
    const [key, i] = target.split(":");
    setOpen(key);
    // The set's grid renders on the next frame; then the box exists to focus.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const el = document.getElementById(altId(key, Number(i)));
        el?.scrollIntoView({ block: "center" });
        el?.focus({ preventScroll: true });
      }),
    );
  };

  const newKey = (() => {
    const root = slugify(newLabel) || "set";
    let key = root;
    for (let n = 2; key in doc.gallery; n++) key = `${root}-${n}`;
    return key;
  })();

  const addSet = () => {
    if (!newLabel.trim()) return;
    form.set([], { order: [...doc.order, newKey], gallery: { ...doc.gallery, [newKey]: { label: newLabel.trim(), photos: [] } } });
    setNewLabel("");
    setOpen(newKey);
    setUploadingTo(newKey);
  };

  const removeSet = (key: string) => {
    const shoot = doc.gallery[key];
    const count = shoot?.photos.length ?? 0;
    if (
      !window.confirm(
        `Remove the set “${shoot?.label || key}”${count ? ` and its ${count} photo${count === 1 ? "" : "s"}` : ""} from /photoshoot? The files stay in the media library. Nothing changes on the site until you save.`,
      )
    )
      return;
    const { [key]: _gone, ...gallery } = doc.gallery;
    void _gone;
    form.set([], { order: doc.order.filter((k) => k !== key), gallery });
    if (open === key) setOpen(null);
  };

  return (
    <>
      <p className="text-[15px]">
        <strong className="tabular-nums">{doc.order.length}</strong> set{doc.order.length === 1 ? "" : "s"} ·{" "}
        <strong className="tabular-nums">{total}</strong> photograph{total === 1 ? "" : "s"}
      </p>

      <MissingAlt missing={missing} onJump={jump} />

      <SortableGrid
        layout="rows"
        label="Photo sets"
        items={doc.order}
        onChange={(order) => form.set(["order"], order)}
        itemKey={(key) => key}
        itemName={(key) => `“${doc.gallery[key]?.label || key}”`}
        itemError={(i) => form.error(["order", i])}
        renderItem={(key) => {
          const shoot = doc.gallery[key];
          const photos = shoot?.photos ?? [];
          const isOpen = open === key;
          const used = links[key] ?? [];
          const setError = form.error(["gallery", key, "photos"]) ?? form.error(["gallery", key]);
          return (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex shrink-0 gap-1" aria-hidden>
                  {photos.slice(0, 4).map((p, i) => (
                    <span key={`${p.src}-${i}`} className={`block w-[40px] ${i > 1 ? "max-mobile:hidden" : ""}`}>
                      <Thumb src={p.src} ratio={4 / 5} />
                    </span>
                  ))}
                  {!photos.length ? (
                    <span className="block w-[40px]">
                      <Thumb src={null} ratio={4 / 5} />
                    </span>
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[16px]">{shoot?.label || <span className="opacity-60">Unnamed set</span>}</p>
                  <p className="text-[13px] opacity-65">
                    {photos.length} photo{photos.length === 1 ? "" : "s"}
                    {used.length ? ` · shown on ${used.map((w) => w.title).join(", ")}` : ""}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={isOpen ? "secondary" : "primary"}
                  onClick={() => setOpen(isOpen ? null : key)}
                  aria-expanded={isOpen}
                  aria-controls={`${idBase}-${key}-panel`}
                >
                  {isOpen ? "Close" : "Open"}
                </Button>
              </div>
              {setError ? <p className="text-[13px] text-[#a3271b]">{setError}</p> : null}

              {isOpen ? (
                <div id={`${idBase}-${key}-panel`} className="flex flex-col gap-4 border-t border-ink/10 pt-4">
                  <div className="grid gap-4 tablet:grid-cols-2">
                    <TextField label="Set name" required {...form.bind(["gallery", key, "label"])} hint="Shown above the strip, and read out to screen readers." />
                    <TextField label="Set key" value={key} readOnly hint="Fixed. Categories link to the set by it." />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="primary" onClick={() => setUploadingTo(key)} disabled={uploadingTo === key}>
                      Upload photos
                    </Button>
                    <Button size="sm" onClick={() => setPickingFor(key)}>
                      Add from the library
                    </Button>
                  </div>
                  {uploadingTo === key ? (
                    <PhotoBatchUpload
                      title={`Upload photos to “${shoot?.label || key}”`}
                      onClose={() => setUploadingTo(null)}
                      onAdded={(items) => {
                        setPhotos(key, [...photosOf(key), ...items.map(photoFromItem)]);
                        setUploadingTo(null);
                      }}
                    />
                  ) : null}
                  {photos.length ? (
                    <PhotoGrid
                      label={`Photos in ${shoot?.label || key}`}
                      items={photos}
                      onChange={(next) => setPhotos(key, next)}
                      altId={(i) => altId(key, i)}
                      errorAt={(i, field) => form.error(field ? ["gallery", key, "photos", i, field] : ["gallery", key, "photos", i])}
                    />
                  ) : (
                    <p className="rounded-[10px] border border-dashed border-ink/25 px-4 py-6 text-center text-[14px] opacity-70">
                      No photographs yet. Upload some, or add them from the library.
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          );
        }}
        actions={(key) => {
          const used = links[key] ?? [];
          return used.length ? (
            <p className="text-[13px] opacity-70">
              Can&apos;t be removed while{" "}
              {used.map((w, i) => (
                <span key={w.slug}>
                  {i ? " and " : ""}
                  <Link href={`${base}/work/${w.slug}`} className="underline underline-offset-2">
                    {w.title}
                  </Link>
                </span>
              ))}{" "}
              {used.length === 1 ? "shows" : "show"} it. Pick another set there first.
            </p>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => removeSet(key)} aria-label={`Remove the set ${doc.gallery[key]?.label || key}`}>
              Remove set…
            </Button>
          );
        }}
      />
      {form.error(["order"]) ? <p className="text-[13px] text-[#a3271b]">{form.error(["order"])}</p> : null}

      <div className="flex flex-col gap-2 rounded-[10px] border border-dashed border-ink/25 p-3">
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[220px] flex-1">
            <TextField
              label="New set"
              value={newLabel}
              onChange={setNewLabel}
              placeholder="Like “Product photography”"
              hint={newLabel.trim() ? `Its key will be “${newKey}”.` : "Name it the way the page should."}
              onKeyDown={(e) => {
                // Enter adds the set rather than saving the whole form.
                if (e.key === "Enter") {
                  e.preventDefault();
                  addSet();
                }
              }}
            />
          </div>
          <Button onClick={addSet} disabled={!newLabel.trim()} className="mb-[26px]">
            + Add set
          </Button>
        </div>
      </div>

      {reason ? <BlockSave reason={reason} /> : null}

      {pickingFor ? (
        <MultiMediaPicker
          kind="image"
          title={`Add photos to “${doc.gallery[pickingFor]?.label || pickingFor}”`}
          exclude={photosOf(pickingFor).map((p) => p.src)}
          unusable={photoProblem}
          onClose={() => setPickingFor(null)}
          onAdd={(items) => setPhotos(pickingFor, [...photosOf(pickingFor), ...items.map(photoFromItem)])}
        />
      ) : null}

      {Object.keys(doc.gallery).some((k) => !doc.order.includes(k)) ? (
        <Notice tone="warning">Some saved sets aren&apos;t in the order and won&apos;t show. Saving keeps them hidden.</Notice>
      ) : null}
    </>
  );
}
