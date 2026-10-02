"use client";

import { useState } from "react";
import type { DocState } from "@/lib/cms/repo";
import type { ContentDocs } from "@/lib/cms/schema";
import EditorForm, { type EditorFormApi } from "../editor-form";
import { MultiMediaPicker } from "../fields/multi-media-picker";
import { ReelGrid, clipFromItem, clipProblem } from "../fields/reel-grid";
import { BlockSave, SaveBlocker } from "../fields/save-block";
import { Button } from "../ui";

/**
 * The showreel: the clips on the home page's spiral, in order.
 *
 * The spiral is laid out for six to twelve cards, so the count is shown as
 * it changes and Save is off, with the reason beside it, whenever the list is
 * outside that range or a clip is missing its title or description. Clips come
 * from the media library (or are uploaded from the same dialog); removing
 * one leaves the file in the library.
 */

const MIN = 6;
const MAX = 12;

type Clips = ContentDocs["showreel"];

export default function ShowreelEditor({ showreel, durations }: { showreel: DocState<"showreel">; durations: Record<string, number> }) {
  return (
    <SaveBlocker>
      <EditorForm
        docKey="showreel"
        initial={showreel}
        title="Spiral clips"
        lead="The clips that turn in the spiral on the home page, in the order they appear. Each card shows its title."
      >
        {(form) => <ShowreelFields form={form} durations={durations} />}
      </EditorForm>
    </SaveBlocker>
  );
}

function list(numbers: number[]) {
  return numbers.length === 1 ? `clip ${numbers[0]}` : `clips ${numbers.slice(0, -1).join(", ")} and ${numbers.at(-1)}`;
}

function ShowreelFields({ form, durations }: { form: EditorFormApi<Clips>; durations: Record<string, number> }) {
  const [picking, setPicking] = useState(false);
  const clips = form.value;
  const n = clips.length;
  const inRange = n >= MIN && n <= MAX;
  const noTitle = clips.flatMap((c, i) => (c.title.trim() ? [] : [i + 1]));
  const noAlt = clips.flatMap((c, i) => (c.alt.trim() ? [] : [i + 1]));

  const reason =
    n < MIN
      ? `the spiral needs at least ${MIN} clips and has ${n}. Add ${MIN - n} more.`
      : n > MAX
        ? `the spiral holds at most ${MAX} clips and has ${n}. Remove ${n - MAX}.`
        : noTitle.length
          ? `give ${list(noTitle)} a title.`
          : noAlt.length
            ? `describe ${list(noAlt)}.`
            : null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <div className="flex min-w-[220px] flex-1 flex-col gap-1.5" aria-live="polite">
          <p className="text-[15px]">
            <strong className="tabular-nums">{n}</strong> of {MIN} to {MAX} clips
            {inRange ? <span className="opacity-60"> · room for {MAX - n} more</span> : null}
          </p>
          <div className="flex gap-1" aria-hidden>
            {Array.from({ length: Math.max(MAX, n) }, (_, i) => (
              <span
                key={i}
                className={`h-2 flex-1 rounded-full ${
                  i < n ? (i >= MAX ? "bg-[#a3271b]" : "bg-ink") : i < MIN ? "border border-dashed border-ink/50" : "bg-ink/10"
                }`}
              />
            ))}
          </div>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setPicking(true)}
          disabled={n >= MAX}
          title={n >= MAX ? `The spiral is full at ${MAX}. Remove one to add another.` : undefined}
        >
          + Add clips
        </Button>
      </div>

      <ReelGrid
        label="Spiral clips"
        items={clips}
        onChange={(next) => form.set([], next)}
        durations={durations}
        withTitle
        errorAt={(i, field) => form.error(field ? [i, field] : [i])}
      />
      {form.error([]) ? <p className="text-[13px] text-[#a3271b]">{form.error([])}</p> : null}

      {reason ? <BlockSave reason={reason} /> : null}

      {picking ? (
        <MultiMediaPicker
          kind="video"
          title="Add clips to the spiral"
          exclude={clips.map((c) => c.src)}
          max={MAX - n}
          unusable={clipProblem}
          onClose={() => setPicking(false)}
          onAdd={(items) => form.set([], [...clips, ...items.map((item) => ({ ...clipFromItem(item), title: "" }))])}
        />
      ) : null}
    </>
  );
}
