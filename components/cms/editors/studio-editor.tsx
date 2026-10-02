"use client";

import EditorForm from "../editor-form";
import { LinesField, SortableList, TextArea, TextField } from "../fields";
import { confirmRemoval, twoDigit } from "../fields/list-helpers";
import { ViewOnSite } from "../fields/view-on-site";
import type { DocState } from "@/lib/cms/repo";

/**
 * Studio: the "home turf" section that opens the Studio page. The client
 * stories further down that page are edited under Clients.
 */
export default function StudioEditor({ kolkata }: { kolkata: DocState<"kolkata"> }) {
  return (
    <EditorForm
      docKey="kolkata"
      initial={kolkata}
      title="Home turf"
      lead={
        <>
          The big heading and the cards at the top of the Studio page. <ViewOnSite href="/studio" />
        </>
      }
    >
      {(form) => (
        <>
          <TextField
            label="Section marker"
            required
            {...form.bind(["sign"])}
            hint="Not shown at the moment: the Studio page labels this section “Studio” itself."
          />
          <LinesField
            label="Big heading on the Studio page"
            hint="One to three lines. Each starts on a new line on screen."
            min={1}
            max={3}
            value={[...form.value.question]}
            onChange={(v) => form.set(["question"], v)}
            error={form.error(["question"])}
            errorAt={(i) => form.error(["question", i])}
          />
          <SortableList
            label="Cards"
            hint="Numbered (01, 02…) on the site in this order. Four fill one row on a wide screen."
            items={form.value.cards}
            onChange={(next) => {
              if (confirmRemoval(form.value.cards, next, (c) => c.title, "this card")) form.set(["cards"], next);
            }}
            itemLabel={(card) => card.title}
            newItem={() => ({ title: "", body: "" })}
            addLabel="Add a card"
            min={1}
            max={8}
            error={form.error(["cards"])}
            renderItem={(_card, i) => (
              <>
                <TextField label={`Card ${twoDigit(i)} title`} required {...form.bind(["cards", i, "title"])} />
                <TextArea label={`Card ${twoDigit(i)} text`} required rows={2} {...form.bind(["cards", i, "body"])} />
              </>
            )}
          />
        </>
      )}
    </EditorForm>
  );
}
