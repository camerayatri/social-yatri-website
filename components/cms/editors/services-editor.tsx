"use client";

import type { ReactNode } from "react";
import EditorForm from "../editor-form";
import { LinesField, SortableList, TextArea, TextField } from "../fields";
import { Disclosure } from "../fields/disclosure";
import { FieldGroup } from "../fields/field-group";
import { LineListField } from "../fields/line-list-field";
import { confirmRemoval, renumber, twoDigit } from "../fields/list-helpers";
import { PhotoField } from "../fields/photo-field";
import { ViewOnSite } from "../fields/view-on-site";
import { serviceId } from "@/lib/cms/derive";
import type { DocState } from "@/lib/cms/repo";
import { serviceSchema, type ServiceDoc } from "@/lib/cms/schema";

/**
 * Services: the page's intro, the services themselves, and the closing
 * argument, each its own EditorForm.
 *
 * A service's number ("01") is never typed. The site prints it beside the
 * name and uses it to tell the rows apart, so it has to be unique and in
 * order; it is rewritten from the list's order on every change, and moving a
 * service renumbers the lot.
 */

const grid = "grid gap-5 tablet:grid-cols-2";

const SECTIONS = [
  { id: "intro", label: "Intro" },
  { id: "services", label: "The services" },
  { id: "why", label: "Why us" },
] as const;

function Lead({ children, href }: { children: ReactNode; href: string }) {
  return (
    <>
      {children} <ViewOnSite href={href} />
    </>
  );
}

const blankService = (index: number): ServiceDoc => ({
  no: twoDigit(index),
  name: "",
  desc: "",
  tag: "",
  body: [""],
  detail: [""],
  cover: { src: "", alt: "" },
});

export default function ServicesEditor({
  servicesIntro,
  services,
  why,
}: {
  servicesIntro: DocState<"servicesIntro">;
  services: DocState<"services">;
  why: DocState<"why">;
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

      <section id="intro" className="scroll-mt-6">
        <EditorForm
          docKey="servicesIntro"
          initial={servicesIntro}
          title="Intro"
          lead={<Lead href="/services">The top of the Services page. The marker, heading and line under it also head the services list on the home page.</Lead>}
        >
          {(form) => (
            <>
              <div className={grid}>
                <TextField label="Section marker" required {...form.bind(["sign"])} />
                <TextField label="Heading" required {...form.bind(["question"])} />
              </div>
              <TextField label="Line under the heading" required {...form.bind(["sub"])} />
              <LinesField
                label="Intro paragraphs"
                hint="Shown on the Services page only."
                multiline
                min={1}
                max={10}
                value={[...form.value.body]}
                onChange={(v) => form.set(["body"], v)}
                error={form.error(["body"])}
                errorAt={(i) => form.error(["body", i])}
              />
            </>
          )}
        </EditorForm>
      </section>

      <section id="services" className="scroll-mt-6">
        <EditorForm
          docKey="services"
          initial={services}
          title="The services"
          lead={
            <Lead href="/services">
              Each service is a row in the home page&apos;s list and a full section on the Services page, in this order.
            </Lead>
          }
        >
          {(form) => (
            <SortableList
              hint="Numbers (01, 02…) follow the order here and update by themselves when you move, add or remove a service. Press Edit to open one."
              items={form.value}
              onChange={(next) => {
                if (confirmRemoval(form.value, next, (s) => s.name, "this service")) form.replace(renumber(next));
              }}
              itemLabel={(s) => s.name || "New service"}
              newItem={() => blankService(form.value.length)}
              addLabel="Add a service"
              min={1}
              error={form.error([])}
              renderItem={(service, i) => {
                const anchor = serviceId(service);
                return (
                  <Disclosure
                    forceOpen={!serviceSchema.safeParse(service).success || Boolean(form.error([i, "name"]))}
                    // The name again, because a phone cuts the list's own header short.
                    summary={
                      <>
                        <span className="block text-[15px]">{service.name || "New service"}</span>
                        <span className="block text-[13px] opacity-60">{service.desc || "Not filled in yet."}</span>
                      </>
                    }
                  >
                    {anchor ? (
                      <p className="text-[13px]">
                        <ViewOnSite href={`/services#${anchor}`}>See this service on the site</ViewOnSite>
                      </p>
                    ) : null}
                    <div className={grid}>
                      <TextField
                        label="Name"
                        required
                        {...form.bind([i, "name"])}
                        hint={anchor ? `Also makes its link: /services#${anchor}. Changing the name changes the link.` : undefined}
                      />
                      <TextField label="Tag" required {...form.bind([i, "tag"])} hint="The small label beside the name, like “Ongoing”." />
                    </div>
                    <TextField label="One-line promise" required {...form.bind([i, "desc"])} hint="The line under the name on the Services page." />
                    <LinesField
                      label="Paragraphs"
                      multiline
                      min={1}
                      max={10}
                      value={service.body}
                      onChange={(v) => form.set([i, "body"], v)}
                      error={form.error([i, "body"])}
                      errorAt={(j) => form.error([i, "body", j])}
                    />
                    <LineListField
                      label="What it covers"
                      required
                      hint="The list beside the paragraphs. One item per line; a long item may wrap, only a new line starts a new item."
                      value={service.detail}
                      onChange={(v) => form.set([i, "detail"], v)}
                      error={form.error([i, "detail"])}
                      errorAt={(j) => form.error([i, "detail", j])}
                    />
                    <TextArea
                      label="Goal (optional)"
                      rows={2}
                      value={service.goal ?? ""}
                      onChange={(v) => form.set([i, "goal"], v === "" ? undefined : v)}
                      error={form.error([i, "goal"])}
                      hint="A closing line set large under the list. Leave empty to show none."
                    />
                    <FieldGroup title="Cover picture">
                      <PhotoField
                        label="Picture, 16:10 landscape"
                        hint="16:10 landscape, with any words set into the artwork. Shown on the Services page and when hovering the row on the home page."
                        value={service.cover.src ? service.cover : null}
                        aspect={16 / 10}
                        error={form.error([i, "cover", "src"])}
                        altError={form.error([i, "cover", "alt"])}
                        onChange={(v) => form.set([i, "cover"], { src: v.src, alt: v.alt })}
                      />
                    </FieldGroup>
                  </Disclosure>
                );
              }}
            />
          )}
        </EditorForm>
      </section>

      <section id="why" className="scroll-mt-6">
        <EditorForm
          docKey="why"
          initial={why}
          title="Why us"
          lead={<Lead href="/services">The closing argument at the bottom of the Services page.</Lead>}
        >
          {(form) => (
            <>
              <TextField label="Section marker" required {...form.bind(["sign"])} />
              <LinesField
                label="Heading"
                hint="One to three lines. Each starts on a new line on screen."
                min={1}
                max={3}
                value={[...form.value.question]}
                onChange={(v) => form.set(["question"], v)}
                error={form.error(["question"])}
                errorAt={(i) => form.error(["question", i])}
              />
              <LineListField
                label="The list"
                required
                hint="The short lines set one under another before the turn. One per line."
                value={form.value.list}
                onChange={(v) => form.set(["list"], v)}
                error={form.error(["list"])}
                errorAt={(i) => form.error(["list", i])}
              />
              <TextField label="The turn" required {...form.bind(["turn"])} hint="The line in yellow after the list." />
              <LinesField
                label="Paragraphs"
                multiline
                min={1}
                max={10}
                value={[...form.value.body]}
                onChange={(v) => form.set(["body"], v)}
                error={form.error(["body"])}
                errorAt={(i) => form.error(["body", i])}
              />
              <div className={grid}>
                <TextField label="Question before the close" required {...form.bind(["ask"])} />
                <TextField label="Closing line" required {...form.bind(["close"])} />
              </div>
            </>
          )}
        </EditorForm>
      </section>
    </div>
  );
}
