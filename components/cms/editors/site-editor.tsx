"use client";

import EditorForm from "../editor-form";
import { LinesField, TextArea, TextField } from "../fields";
import { phoneHref } from "@/lib/cms/derive";
import type { DocState } from "@/lib/cms/repo";

/**
 * Site & contact: the reference editor.
 *
 * Four documents, each its own EditorForm with its own save bar: the site's
 * details (name, contact, socials), the menu labels, the contact form's copy,
 * and the scrolling strip. Later editors follow the same pattern: a server
 * page loads `getDocs()` and passes each `DocState` in; this client file lays
 * out fields against `form.bind(path)` / `form.set(path, value)`.
 */

const NAV_PLACES: Record<string, string> = {
  "/": "the home page",
  "/services": "the services page",
  "/work": "the work page",
  "/photoshoot": "the photoshoot page",
  "/studio": "the studio page",
  "/contact": "the contact page",
};

const CONNECT_FIELDS: Record<string, string> = {
  name: "Name field",
  company: "Company field",
  phone: "Phone field",
  email: "Email field",
  need: "“What do you need” field",
};

const grid = "grid gap-5 tablet:grid-cols-2";

export default function SiteEditor({
  site,
  nav,
  connect,
  marquee,
}: {
  site: DocState<"site">;
  nav: DocState<"nav">;
  connect: DocState<"connect">;
  marquee: DocState<"marquee">;
}) {
  return (
    <div className="flex flex-col gap-6">
      <EditorForm docKey="site" initial={site} title="Site details" lead="The name, line and contact details shown in the footer, the contact page and search results.">
        {(form) => (
          <>
            <div className={grid}>
              <TextField label="Studio name" required {...form.bind(["name"])} />
              <TextField label="City" required {...form.bind(["city"])} hint="Shown in the menu and footer." />
            </div>
            <TextField label="Tagline" required {...form.bind(["tagline"])} hint="The Hindi line. Kept in the client's own spelling." />
            <TextArea label="Description" required rows={3} softLimit={160} {...form.bind(["description"])} hint="One or two sentences. Search engines show this under the site's name." />
            <div className={grid}>
              <TextField label="Email" type="email" required inputMode="email" {...form.bind(["email"])} />
              <TextField
                label="Phone"
                required
                inputMode="tel"
                value={form.value.phone}
                error={form.error(["phone"]) ?? form.error(["phoneHref"])}
                onChange={(v) => {
                  form.set(["phone"], v);
                  form.set(["phoneHref"], phoneHref(v.trim().startsWith("+") ? v : `+91${v.replace(/\D/g, "").replace(/^0/, "")}`));
                }}
                hint={`Written as people should read it. Dials ${form.value.phoneHref.replace("tel:", "")}.`}
              />
            </div>
            <TextArea label="Address" required rows={2} {...form.bind(["address"])} hint="Links to Google Maps." />
            <div className={grid}>
              <TextField label="Instagram handle" {...form.bind(["instagram"])} hint="Just the handle, no @. Leave empty to hide the row." />
              <TextField label="LinkedIn company handle" {...form.bind(["linkedin"])} hint="The part after linkedin.com/company/. Leave empty to hide." />
            </div>
            <div className={grid}>
              <TextField label="Footer line" required {...form.bind(["madeIn"])} />
              <TextField label="Copyright" required {...form.bind(["copyright"])} />
            </div>
          </>
        )}
      </EditorForm>

      <EditorForm docKey="nav" initial={nav} title="Menu labels" lead="What the menu calls each page. The pages themselves can't be changed here.">
        {(form) => (
          <div className={grid}>
            {form.value.map((item, i) => (
              <TextField key={item.href} label={`Link to ${NAV_PLACES[item.href] ?? item.href}`} required {...form.bind([i, "label"])} />
            ))}
          </div>
        )}
      </EditorForm>

      <EditorForm docKey="connect" initial={connect} title="Contact form" lead="The heading, field labels and messages on the contact page and in the footer.">
        {(form) => (
          <>
            <div className={grid}>
              <TextField label="Section marker" required {...form.bind(["sign"])} />
              <TextField label="Heading" required {...form.bind(["question"])} />
            </div>
            <TextField label="Line under the heading" required {...form.bind(["sub"])} />
            <fieldset className="flex flex-col gap-4 rounded-[10px] border border-ink/10 p-4">
              <legend className="cms-label px-1 opacity-75">Field labels</legend>
              <div className={grid}>
                {form.value.fields.map((field, i) => (
                  <TextField key={field.name} label={CONNECT_FIELDS[field.name] ?? field.name} required {...form.bind(["fields", i, "label"])} />
                ))}
                <TextField label="Message field" required {...form.bind(["messageLabel"])} />
              </div>
              <TextField label="Hint inside the “What do you need” field" {...form.bind(["fields", 4, "placeholder"])} />
            </fieldset>
            <div className={grid}>
              <TextField label="Send button" required {...form.bind(["submit"])} />
              <TextField label="Send button on hover" required {...form.bind(["submitHover"])} />
              <TextField label="Thank-you heading" required {...form.bind(["confirmed"])} />
              <TextField label="Thank-you line" required {...form.bind(["confirmedSub"])} />
            </div>
          </>
        )}
      </EditorForm>

      <EditorForm docKey="marquee" initial={marquee} title="Scrolling strip" lead="The phrases that scroll across the page between sections, in order.">
        {(form) => (
          <LinesField
            label="Phrases"
            value={form.value}
            onChange={(v) => form.replace(v)}
            min={1}
            max={12}
            noun="Phrase"
            error={form.error([])}
            errorAt={(i) => form.error([i])}
          />
        )}
      </EditorForm>
    </div>
  );
}
