"use client";

import type { ReactNode } from "react";
import EditorForm from "../editor-form";
import { LinesField, SortableList, TextArea, TextField } from "../fields";
import { FieldGroup } from "../fields/field-group";
import { confirmRemoval, renumber, twoDigit } from "../fields/list-helpers";
import { NumberField } from "../fields/number-field";
import { PhotoField } from "../fields/photo-field";
import { ViewOnSite } from "../fields/view-on-site";
import { Button, Notice } from "../ui";
import type { DocState } from "@/lib/cms/repo";
import { HOME_SLOTS } from "@/lib/cms/schema";

/**
 * The home page, one section per content document, in the order the page
 * runs: the opening, the six work cards, the process, the growth numbers, and
 * then the studio note and its two photographs, which the page has switched
 * off for now and which are kept editable for when it returns.
 *
 * Each section is its own EditorForm with its own save bar, as on Site &
 * contact, so a change to the numbers never waits on a half-finished
 * headline.
 */

const grid = "grid gap-5 tablet:grid-cols-2";

/** The shapes the six cards are cut to, as people say them. */
const SHAPE_NAMES = new Map<number, string>([
  [4 / 3, "4:3 landscape"],
  [3 / 4, "3:4 portrait"],
  [1, "1:1 square"],
]);
const shapeName = (ratio: number) => SHAPE_NAMES.get(ratio) ?? `${ratio.toFixed(2)}:1`;

/** How many process steps the Howrah Bridge drawing is drawn for. */
const BRIDGE_STAGES = 8;

export type FeaturedWork = { slug: string; title: string };

const SECTIONS = [
  { id: "opening", label: "Opening" },
  { id: "work-cards", label: "Work cards" },
  { id: "process", label: "Process" },
  { id: "growth", label: "Growth numbers" },
  { id: "studio-note", label: "Studio note" },
  { id: "studio-photos", label: "Studio photos" },
] as const;

function Lead({ children, href }: { children: ReactNode; href?: string }) {
  return (
    <>
      {children}
      {href ? (
        <>
          {" "}
          <ViewOnSite href={href} />
        </>
      ) : null}
    </>
  );
}

export default function HomeEditor({
  hero,
  about,
  homeCovers,
  growth,
  process,
  photos,
  featured,
}: {
  hero: DocState<"hero">;
  about: DocState<"about">;
  homeCovers: DocState<"homeCovers">;
  growth: DocState<"growth">;
  process: DocState<"process">;
  photos: DocState<"photos">;
  /** The first six work categories, in order: the works the six cards show. */
  featured: FeaturedWork[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Sections on this page" className="flex flex-wrap gap-x-4 gap-y-2 text-[14px]">
        {SECTIONS.map((s) => (
          <a key={s.id} href={`#${s.id}`} className="underline decoration-ink/25 underline-offset-[3px] hover:decoration-ink">
            {s.label}
          </a>
        ))}
      </nav>
      <section id="opening" className="scroll-mt-6">
        <EditorForm
          docKey="hero"
          initial={hero}
          title="Opening"
          lead={<Lead href="/">The lines over the showreel at the top of the home page, and the big statement in the work section.</Lead>}
        >
          {(form) => (
            <>
              <TextField
                label="Small line above the headline"
                required
                {...form.bind(["eyebrow"])}
                hint="Also printed on the picture shown when someone shares a link to the site."
              />
              <LinesField
                label="Big headline on the home page"
                hint="Always two lines. The break between line 1 and line 2 is where the headline breaks on screen, so split it where it reads best. Keep each line short: a long one wraps onto a third line on phones."
                count={2}
                value={[...form.value.lede]}
                onChange={(v) => form.set(["lede"], v)}
                errorAt={(i) => form.error(["lede", i])}
              />
              <LinesField
                label="Statement beside the work cards"
                hint="The large line in the middle of the home page's work section. Two parts that read as one sentence: on screen they run on with a space between them, so the split itself does not show."
                count={2}
                noun="Part"
                value={[...form.value.headline]}
                onChange={(v) => form.set(["headline"], v)}
                errorAt={(i) => form.error(["headline", i])}
              />
            </>
          )}
        </EditorForm>
      </section>

      <section id="work-cards" className="scroll-mt-6">
        <EditorForm
          docKey="homeCovers"
          initial={homeCovers}
          title="Work cards"
          lead={
<Lead href="/">The pictures on the six work cards. Each card has a fixed shape, and its picture must match it.</Lead>
          }
        >
          {(form) => {
            const shown = new Set(featured.map((w) => w.slug));
            const others = Object.keys(form.value).filter((slug) => !shown.has(slug));
            return (
              <>
                <p className="-mt-1 text-[13px] opacity-60">
                  The cards show the first six categories on the Work page, in that order. To change which categories appear, reorder them in
                  the Work editor.
                </p>
                <div className="grid gap-6 tablet:grid-cols-2">
                  {featured.map((work, i) => {
                    const ratio = HOME_SLOTS[i];
                    const cover = form.value[work.slug] ?? null;
                    return (
                      <FieldGroup
                        key={work.slug}
                        title={`Card ${i + 1} (${shapeName(ratio)}): ${work.title}`}
                        aside={
                          cover ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                if (window.confirm(`Stop using this picture on card ${i + 1}? The card falls back to ${work.title}'s cover from the Work page.`)) {
                                  form.set([work.slug], undefined);
                                }
                              }}
                            >
                              Use the Work page cover
                            </Button>
                          ) : null
                        }
                      >
                        <PhotoField
                          label={`Picture, ${shapeName(ratio)}`}
                          value={cover}
                          aspect={ratio}
                          shapeName={shapeName(ratio)}
                          strictShape
                          sized
                          hint={
                            cover
                              ? `Must be ${shapeName(ratio)}. A picture of any other shape is refused.`
                              : `None chosen: the card shows ${work.title}'s cover from the Work page, cropped to ${shapeName(ratio)}.`
                          }
                          error={form.error([work.slug]) ?? form.error([work.slug, "src"]) ?? form.error([work.slug, "w"])}
                          altError={form.error([work.slug, "alt"])}
                          onChange={(v) => form.set([work.slug], { src: v.src, alt: v.alt, w: v.w, h: v.h, ...(v.focus ? { focus: v.focus } : {}) })}
                        />
                      </FieldGroup>
                    );
                  })}
                </div>
                {others.length ? (
                  <FieldGroup title="Saved pictures not on the home page" hint="These belong to categories that are not among the first six, so no card shows them.">
                    <ul className="flex flex-col gap-2">
                      {others.map((slug) => (
                        <li key={slug} className="flex flex-wrap items-center justify-between gap-2 text-[14px]">
                          <span>
                            {slug}
                            {form.error([slug]) ? <span className="ml-2 text-[#a3271b]">{form.error([slug])}</span> : null}
                          </span>
                          <Button size="sm" variant="ghost" onClick={() => form.set([slug], undefined)}>
                            Remove
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </FieldGroup>
                ) : null}
              </>
            );
          }}
        </EditorForm>
      </section>

      <section id="process" className="scroll-mt-6">
        <EditorForm
          docKey="process"
          initial={process}
          title="Process"
          lead={<Lead href="/">The steps drawn over the Howrah Bridge on the home page.</Lead>}
        >
          {(form) => (
            <>
              <div className={grid}>
                <TextField label="Section marker" required {...form.bind(["sign"])} />
                <TextField label="Heading" required {...form.bind(["question"])} />
              </div>
              <TextField label="Line under the heading" required {...form.bind(["sub"])} />
              {form.value.steps.length !== BRIDGE_STAGES ? (
                <Notice tone="warning">
                  There are {form.value.steps.length} steps. The Howrah Bridge drawing beside them is drawn in exactly {BRIDGE_STAGES} stages,
                  so with any other number the drawing and the steps no longer line up. Keep it to {BRIDGE_STAGES}.
                </Notice>
              ) : null}
              <SortableList
                label="Steps"
                hint={`Numbered automatically in the order shown here. The drawing expects ${BRIDGE_STAGES}.`}
                items={form.value.steps}
                onChange={(next) => {
                  if (confirmRemoval(form.value.steps, next, (s) => s.title, "this step")) form.set(["steps"], renumber(next));
                }}
                itemLabel={(step) => step.title}
                newItem={() => ({ no: twoDigit(form.value.steps.length), title: "", body: "" })}
                addLabel="Add a step"
                min={1}
                max={12}
                error={form.error(["steps"])}
                renderItem={(step, i) => (
                  <>
                    <TextField label={`Step ${twoDigit(i)} title`} required {...form.bind(["steps", i, "title"])} />
                    <TextArea label={`Step ${twoDigit(i)} text`} required rows={2} {...form.bind(["steps", i, "body"])} />
                  </>
                )}
              />
            </>
          )}
        </EditorForm>
      </section>

      <section id="growth" className="scroll-mt-6">
        <EditorForm
          docKey="growth"
          initial={growth}
          title="Growth numbers"
          lead={<Lead href="/">The before-and-after figures and the row of counters on the home page.</Lead>}
        >
          {(form) => (
            <>
              <div className={grid}>
                <TextField label="Section marker" required {...form.bind(["sign"])} />
                <TextField label="Heading" required {...form.bind(["question"])} />
              </div>
              <TextField label="Line under the heading" required {...form.bind(["sub"])} />
              <FieldGroup title="Before and after" hint="The big figures in one row: before, an arrow, after, and the change at the right. Typed exactly as shown, commas included.">
                <div className="grid gap-5 tablet:grid-cols-3">
                  <TextField label="Before: label" required {...form.bind(["before", "label"])} />
                  <TextField label="Before: figure" required {...form.bind(["before", "value"])} />
                  <TextField label="Before: unit" required {...form.bind(["before", "unit"])} hint="Not shown on the site at the moment." />
                  <TextField label="After: label" required {...form.bind(["after", "label"])} />
                  <TextField label="After: figure" required {...form.bind(["after", "value"])} />
                  <TextField label="After: unit" required {...form.bind(["after", "unit"])} hint="Small, after the figure." />
                  <TextField label="Change: label" required {...form.bind(["deltaLabel"])} />
                  <TextField label="Change: figure" required {...form.bind(["delta"])} hint="In yellow, at the right." />
                </div>
              </FieldGroup>
              <SortableList
                label="Counters"
                hint="The row of numbers that count up when it scrolls into view. Up to eight; four fill one row on a wide screen."
                items={form.value.cells}
                onChange={(next) => {
                  if (confirmRemoval(form.value.cells, next, (c) => c.label, "this counter")) form.set(["cells"], next);
                }}
                itemLabel={(cell) => cell.label}
                newItem={() => ({ target: 0, suffix: "", label: "" })}
                addLabel="Add a counter"
                min={1}
                max={8}
                error={form.error(["cells"])}
                renderItem={(cell, i) => (
                  <div className="grid gap-4 tablet:grid-cols-[1fr_1fr_2fr]">
                    <NumberField
                      label="Counts up to"
                      required
                      value={cell.target}
                      onChange={(v) => form.set(["cells", i, "target"], v)}
                      error={form.error(["cells", i, "target"])}
                      hint="Digits only. Commas are fine."
                    />
                    <TextField label="After the number" {...form.bind(["cells", i, "suffix"])} hint="Spaces count: “%” or “ cities”." />
                    <TextField label="Label" required {...form.bind(["cells", i, "label"])} />
                  </div>
                )}
              />
            </>
          )}
        </EditorForm>
      </section>

      <section id="studio-note" className="scroll-mt-6">
        <EditorForm
          docKey="about"
          initial={about}
          title="Studio note"
          lead="The studio's own note, with the two photos below. This section is switched off on the home page for now; what is saved here is kept and shows when it returns."
        >
          {(form) => (
            <>
              <div className={grid}>
                <TextField label="Section marker" required {...form.bind(["sign"])} />
                <TextField label="Claim under the square photo" required {...form.bind(["claim"])} />
              </div>
              <LinesField
                label="The note"
                hint="Always two paragraphs: the first sits beside the square photo, the second under the large photo."
                count={2}
                multiline
                value={form.value.body}
                onChange={(v) => form.set(["body"], v)}
                errorAt={(i) => form.error(["body", i])}
              />
              <LinesField
                label="Closing statement"
                hint="One to three parts, run together with spaces into one large line."
                noun="Part"
                min={1}
                max={3}
                value={form.value.close}
                onChange={(v) => form.set(["close"], v)}
                error={form.error(["close"])}
                errorAt={(i) => form.error(["close", i])}
              />
            </>
          )}
        </EditorForm>
      </section>

      <section id="studio-photos" className="scroll-mt-6">
        <EditorForm
          docKey="photos"
          initial={photos}
          title="Studio photos"
          lead="The two photos in the studio note. Like the note, they are off the home page for now."
        >
          {(form) => (
            <div className="grid gap-6 tablet:grid-cols-2">
              <FieldGroup title="Large photo">
                <PhotoField
                  label="Photo"
                  hint="Grows to fill the screen as the page scrolls. Landscape works best; set the focus on the subject."
                  value={form.value.showreel}
                  focusPreviews={[16 / 10, 4 / 5]}
                  error={form.error(["showreel", "src"])}
                  altError={form.error(["showreel", "alt"])}
                  focusError={form.error(["showreel", "focus"])}
                  onChange={(v) => form.set(["showreel"], { src: v.src, alt: v.alt, ...(v.focus ? { focus: v.focus } : {}) })}
                />
              </FieldGroup>
              <FieldGroup title="Square photo">
                <PhotoField
                  label="Photo"
                  hint="Cropped to a square beside the note."
                  value={form.value.studioNote}
                  aspect={1}
                  focusPreviews={[1]}
                  error={form.error(["studioNote", "src"])}
                  altError={form.error(["studioNote", "alt"])}
                  focusError={form.error(["studioNote", "focus"])}
                  onChange={(v) => form.set(["studioNote"], { src: v.src, alt: v.alt, ...(v.focus ? { focus: v.focus } : {}) })}
                />
              </FieldGroup>
            </div>
          )}
        </EditorForm>
      </section>
    </div>
  );
}
