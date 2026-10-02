"use client";

import EditorForm from "../editor-form";
import { ColorField, LinesField, SortableList, TextArea, TextField } from "../fields";
import { Disclosure } from "../fields/disclosure";
import { FieldGroup } from "../fields/field-group";
import { LineListField } from "../fields/line-list-field";
import { confirmRemoval } from "../fields/list-helpers";
import { PhotoField } from "../fields/photo-field";
import { SelectField } from "../fields/select-field";
import { ViewOnSite } from "../fields/view-on-site";
import { Button } from "../ui";
import type { DocState } from "@/lib/cms/repo";
import { caseStudySchema, type CaseStudyDoc } from "@/lib/cms/schema";

/**
 * Clients: one document, shown in two places. The home page runs the short
 * version (each brand's claim, its figures and its logo); the Studio page runs
 * the whole story (the photo, the intro, what was done, the result), then the
 * closing pitch. The editor follows the document's order and says on each
 * field where it shows.
 */

const grid = "grid gap-5 tablet:grid-cols-2";

const blankCase = (): CaseStudyDoc => ({
  name: "",
  claim: "",
  intro: [""],
  metrics: [{ value: "", label: "", note: "" }],
  did: [""],
  result: [""],
  frame: "",
  alt: "",
});

export type ReelOption = { value: string; label: string };

export default function ClientsEditor({ clients, reelOptions }: { clients: DocState<"clients">; reelOptions: ReelOption[] }) {
  return (
    <EditorForm
      docKey="clients"
      initial={clients}
      title="Clients"
      lead={
        <>
          The client stories. A short version closes the home page; the full stories and the closing pitch are on the Studio page.{" "}
          <span className="inline-flex flex-wrap gap-x-3">
            <ViewOnSite href="/">Home page</ViewOnSite>
            <ViewOnSite href="/studio">Studio page</ViewOnSite>
          </span>
        </>
      }
    >
      {(form) => (
        <>
          <h3 className="text-[16px]">Intro</h3>
          <div className={grid}>
            <TextField label="Section marker" required {...form.bind(["sign"])} />
            <TextField label="Heading" required {...form.bind(["question"])} />
          </div>
          <TextField label="Line under the heading" required {...form.bind(["sub"])} />
          <LinesField
            label="Intro paragraphs"
            multiline
            min={1}
            max={10}
            value={[...form.value.body]}
            onChange={(v) => form.set(["body"], v)}
            error={form.error(["body"])}
            errorAt={(i) => form.error(["body", i])}
          />

          <h3 className="mt-4 border-t border-ink/10 pt-5 text-[16px]">Case studies</h3>
          <SortableList
            hint="Numbered (01, 02…) on the site in this order. Up to eight. Press Edit to open one."
            items={form.value.cases}
            onChange={(next) => {
              if (confirmRemoval(form.value.cases, next, (c) => c.name, "this case study")) form.set(["cases"], next);
            }}
            itemLabel={(c) => c.name || "New case study"}
            newItem={blankCase}
            addLabel="Add a case study"
            min={1}
            max={8}
            error={form.error(["cases"])}
            renderItem={(study, i) => {
              const at = (...rest: (string | number)[]) => ["cases", i, ...rest];
              const claim = typeof study.claim === "string" ? [study.claim] : [...study.claim];
              const claimText = claim.join(" ");
              return (
                <Disclosure
                  forceOpen={!caseStudySchema.safeParse(study).success || Boolean(form.error(at("reels")))}
                  // The name again, because a phone cuts the list's own header short.
                  summary={
                    <>
                      <span className="block text-[15px]">{study.name || "New case study"}</span>
                      <span className="block text-[13px] opacity-60">{claimText || "Not filled in yet."}</span>
                    </>
                  }
                >
                  <TextField label="Brand name" required {...form.bind(at("name"))} />
                  <LinesField
                    label="Claim"
                    hint="The headline figure, on both pages. Each line starts on a new line on screen: split it so a figure is never parted from its unit."
                    min={1}
                    max={3}
                    value={claim}
                    // One line is stored as plain text, as the original copy is.
                    onChange={(v) => form.set(at("claim"), v.length === 1 ? v[0] : v)}
                    error={typeof study.claim === "string" ? undefined : form.error(at("claim"))}
                    errorAt={(j) => (typeof study.claim === "string" ? form.error(at("claim")) : form.error(at("claim", j)))}
                  />

                  <SortableList
                    label="Figures"
                    hint="The home page shows each figure and its label; the Studio page adds the note."
                    items={study.metrics}
                    onChange={(next) => {
                      if (confirmRemoval(study.metrics, next, (m) => m.value, "this figure")) form.set(at("metrics"), next);
                    }}
                    itemLabel={(m) => m.value}
                    newItem={() => ({ value: "", label: "", note: "" })}
                    addLabel="Add a figure"
                    min={1}
                    max={6}
                    error={form.error(at("metrics"))}
                    renderItem={(_m, j) => (
                      <>
                        <div className={grid}>
                          <TextField label="Figure" required {...form.bind(at("metrics", j, "value"))} hint="Exactly as it should read, like “300 → 5,000+”." />
                          <TextField label="Label" required {...form.bind(at("metrics", j, "label"))} hint="Like “The growth”." />
                        </div>
                        <TextArea label="Note" required rows={2} {...form.bind(at("metrics", j, "note"))} />
                      </>
                    )}
                  />

                  <FieldGroup
                    title="Logo, on the home page"
                    hint="The home page shows each brand by its logo, set small on a block of colour. Without one, the home page shows no picture for this brand."
                    aside={
                      study.logo ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (window.confirm(`Remove ${study.name || "this brand"}'s logo? The home page then shows no picture for this brand.`)) {
                              form.set(at("logo"), undefined);
                            }
                          }}
                        >
                          Remove logo
                        </Button>
                      ) : (
                        <Button size="sm" onClick={() => form.set(at("logo"), { src: "", alt: "", bg: "#ffffff" })}>
                          Add a logo
                        </Button>
                      )
                    }
                  >
                    {study.logo ? (
                      <div className="grid gap-5 tablet:grid-cols-[3fr_2fr]">
                        <PhotoField
                          label="Logo file"
                          hint="Shown whole, never cropped."
                          value={study.logo.src ? study.logo : null}
                          error={form.error(at("logo", "src"))}
                          altError={form.error(at("logo", "alt"))}
                          onChange={(v) => form.set(at("logo"), { src: v.src, alt: v.alt, bg: study.logo?.bg ?? "#ffffff" })}
                        />
                        <div className="flex flex-col gap-3">
                          <ColorField
                            label="Background colour"
                            value={study.logo.bg}
                            onChange={(bg) => form.set(at("logo", "bg"), bg)}
                            error={form.error(at("logo", "bg"))}
                            hint="Match the logo's own background so its edges disappear."
                          />
                          {study.logo.src ? (
                            <div
                              className="relative aspect-[3/2] w-[180px] max-w-full overflow-hidden border border-ink/10"
                              style={{ backgroundColor: /^#[0-9a-f]{6}$/i.test(study.logo.bg) ? study.logo.bg : undefined }}
                              aria-hidden
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={study.logo.src} alt="" className="absolute inset-0 size-full object-contain px-[18%] py-[9%]" />
                            </div>
                          ) : null}
                          <p className="text-[12px] opacity-60">Preview at the home page&apos;s shape.</p>
                        </div>
                      </div>
                    ) : null}
                  </FieldGroup>

                  <FieldGroup title="Photo, on the Studio page" hint="Cropped tall (4:5) beside the story. Set the focus on the face or the product.">
                    <PhotoField
                      label="Photo"
                      value={study.frame ? { src: study.frame, alt: study.alt, ...(study.focus ? { focus: study.focus } : {}) } : null}
                      focusPreviews={[4 / 5]}
                      error={form.error(at("frame"))}
                      altError={form.error(at("alt"))}
                      focusError={form.error(at("focus"))}
                      onChange={(v) => {
                        const { focus: _old, ...rest } = study;
                        void _old;
                        form.set(at(), { ...rest, frame: v.src, alt: v.alt, ...(v.focus ? { focus: v.focus } : {}) });
                      }}
                    />
                  </FieldGroup>

                  <LinesField
                    label="The story (Studio page)"
                    multiline
                    min={1}
                    max={10}
                    value={study.intro}
                    onChange={(v) => form.set(at("intro"), v)}
                    error={form.error(at("intro"))}
                    errorAt={(j) => form.error(at("intro", j))}
                  />
                  <LineListField
                    label="What we did (Studio page)"
                    required
                    value={study.did}
                    onChange={(v) => form.set(at("did"), v)}
                    error={form.error(at("did"))}
                    errorAt={(j) => form.error(at("did", j))}
                  />
                  <LinesField
                    label="The result (Studio page)"
                    multiline
                    min={1}
                    max={10}
                    value={study.result}
                    onChange={(v) => form.set(at("result"), v)}
                    error={form.error(at("result"))}
                    errorAt={(j) => form.error(at("result", j))}
                  />
                  <SelectField
                    label="This brand's clips"
                    value={study.reels ?? ""}
                    onChange={(v) => form.set(at("reels"), v === "" ? undefined : v)}
                    options={reelOptions}
                    emptyLabel="None"
                    error={form.error(at("reels"))}
                    hint="Which reel list holds this brand's videos. Not shown on the site at the moment; it keeps the story tied to its work."
                  />
                </Disclosure>
              );
            }}
          />

          <h3 className="mt-4 border-t border-ink/10 pt-5 text-[16px]">Closing pitch (Studio page)</h3>
          <LinesField
            label="Closing title"
            hint="Always two lines: the first in ink, the second in yellow, each on its own line on screen."
            count={2}
            value={[...form.value.closing.title]}
            onChange={(v) => form.set(["closing", "title"], v)}
            errorAt={(i) => form.error(["closing", "title", i])}
          />
          <LinesField
            label="Paragraphs"
            multiline
            min={1}
            max={10}
            value={[...form.value.closing.body]}
            onChange={(v) => form.set(["closing", "body"], v)}
            error={form.error(["closing", "body"])}
            errorAt={(i) => form.error(["closing", "body", i])}
          />
          <TextField label="Line before the goals" required {...form.bind(["closing", "goalsLead"])} hint="Like “Whether your goal is:”." />
          <LineListField
            label="Goals"
            required
            hint="One goal per line."
            value={form.value.closing.goals}
            onChange={(v) => form.set(["closing", "goals"], v)}
            error={form.error(["closing", "goals"])}
            errorAt={(i) => form.error(["closing", "goals", i])}
          />
          <TextField label="Line after the goals" required {...form.bind(["closing", "goalsClose"])} />
        </>
      )}
    </EditorForm>
  );
}
