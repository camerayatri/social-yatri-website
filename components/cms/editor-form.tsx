"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { contentRevisions, loadContent, restoreContent, saveContent } from "@/lib/cms/actions/content";
import { describePath } from "@/lib/cms/labels";
import type { DocState, RevisionSummary } from "@/lib/cms/repo";
import { SCHEMAS, issuesToFieldErrors, type ContentDocs, type ContentKey, type FieldErrors } from "@/lib/cms/schema";
import { Button, Notice, formatWhen } from "./ui";

/**
 * The generic editor: one content document, its fields, and a save bar.
 *
 * An editor page hands it the document as loaded on the server and renders
 * fields through the `form` it gets back:
 *
 *   <EditorForm docKey="hero" initial={docs.hero} title="Opening">
 *     {(form) => (
 *       <>
 *         <TextField label="Eyebrow" {...form.bind(["eyebrow"])} />
 *         <LinesField label="Headline" count={2} value={form.value.headline}
 *           onChange={(v) => form.set(["headline"], v)} errorAt={(i) => form.error(["headline", i])} />
 *       </>
 *     )}
 *   </EditorForm>
 *
 * It owns everything around the fields: the dirty state (and a warning before
 * leaving with unsaved changes), checking against the schema before anything
 * is sent, the save itself, field errors from either side, the conflict when
 * someone else saved first, and the history panel with restore. Each form
 * saves its own document; a page can stack several.
 */

export type Path = (string | number)[];

export type EditorFormApi<T> = {
  /** The document as currently edited. */
  value: T;
  /** Reads the value at `path`. */
  get: (path: Path) => unknown;
  /** Writes `next` at `path`, immutably. */
  set: (path: Path, next: unknown) => void;
  /** Replaces the whole document. */
  replace: (next: T) => void;
  /** The first error at exactly `path`, if any. */
  error: (path: Path) => string | undefined;
  /** For string fields: `{ value, onChange, error }` to spread onto a TextField or TextArea. */
  bind: (path: Path) => { value: string; onChange: (v: string) => void; error?: string };
};

function getAt(obj: unknown, path: Path): unknown {
  return path.reduce<unknown>((o, k) => (o == null ? undefined : (o as Record<string | number, unknown>)[k]), obj);
}

function setAt(obj: unknown, path: Path, next: unknown): unknown {
  if (!path.length) return next;
  const [head, ...rest] = path;
  if (Array.isArray(obj)) {
    const copy = [...obj];
    copy[head as number] = setAt(obj[head as number], rest, next);
    return copy;
  }
  const record = (obj ?? {}) as Record<string, unknown>;
  const value = setAt(record[head as string], rest, next);
  if (value === undefined) {
    // Writing undefined removes an optional key rather than storing it.
    const { [head as string]: _removed, ...others } = record;
    void _removed;
    return others;
  }
  return { ...record, [head as string]: value };
}

const keyOf = (path: Path) => path.map(String).join(".");

type Status =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved" }
  | { kind: "error"; message: string }
  | { kind: "conflict"; version: number };

export default function EditorForm<K extends ContentKey>({
  docKey,
  initial,
  title,
  lead,
  children,
}: {
  docKey: K;
  initial: DocState<K>;
  title: ReactNode;
  lead?: ReactNode;
  children: (form: EditorFormApi<ContentDocs[K]>) => ReactNode;
}) {
  const router = useRouter();
  const [value, setValue] = useState<ContentDocs[K]>(initial.data);
  const [saved, setSaved] = useState<ContentDocs[K]>(initial.data);
  const [meta, setMeta] = useState({ version: initial.version, updatedAt: initial.updatedAt, updatedBy: initial.updatedBy });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [history, setHistory] = useState<RevisionSummary[] | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const dirty = useMemo(() => JSON.stringify(value) !== JSON.stringify(saved), [value, saved]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = useCallback((path: Path, next: unknown) => {
    setValue((v) => setAt(v, path, next) as ContentDocs[K]);
    setStatus((s) => (s.kind === "saved" ? { kind: "idle" } : s));
  }, []);

  const form: EditorFormApi<ContentDocs[K]> = {
    value,
    get: (path) => getAt(value, path),
    set,
    replace: (next) => setValue(next),
    error: (path) => errors[keyOf(path)]?.[0],
    bind: (path) => ({
      value: (getAt(value, path) as string | undefined) ?? "",
      onChange: (v: string) => set(path, v),
      error: errors[keyOf(path)]?.[0],
    }),
  };

  const save = async (version = meta.version) => {
    const check = SCHEMAS[docKey].safeParse(value);
    if (!check.success) {
      setErrors(issuesToFieldErrors(check.error.issues));
      setStatus({ kind: "error", message: "Some fields need fixing before this can be saved." });
      return;
    }
    setStatus({ kind: "saving" });
    const result = await saveContent(docKey, value, version);
    if ("ok" in result) {
      setSaved(value);
      setErrors({});
      setMeta({ version: result.version, updatedAt: new Date().toISOString(), updatedBy: "you" });
      setStatus({ kind: "saved" });
      setHistory(null);
      router.refresh();
    } else if ("fieldErrors" in result) {
      setErrors(result.fieldErrors);
      setStatus({ kind: "error", message: "Some fields need fixing before this can be saved." });
    } else if ("conflict" in result) {
      setStatus({ kind: "conflict", version: result.version });
    } else {
      setStatus({ kind: "error", message: result.error });
    }
  };

  const reload = async () => {
    const fresh = await loadContent(docKey);
    if ("error" in fresh) {
      setStatus({ kind: "error", message: fresh.error });
      return;
    }
    setValue(fresh.data as ContentDocs[K]);
    setSaved(fresh.data as ContentDocs[K]);
    setMeta({ version: fresh.version, updatedAt: fresh.updatedAt, updatedBy: fresh.updatedBy });
    setErrors({});
    setStatus({ kind: "idle" });
    setHistory(null);
  };

  const openHistory = async () => {
    const next = !historyOpen;
    setHistoryOpen(next);
    if (next && history === null) {
      const list = await contentRevisions(docKey);
      setHistory(Array.isArray(list) ? list : []);
    }
  };

  const restore = async (rev: RevisionSummary) => {
    if (dirty && !window.confirm("You have unsaved changes here. Restoring will discard them. Continue?")) return;
    if (!dirty && !window.confirm(`Put version ${rev.version} back? The current version stays in the history.`)) return;
    setStatus({ kind: "saving" });
    const result = await restoreContent(docKey, rev.id, meta.version);
    if ("ok" in result) {
      await reload();
      setStatus({ kind: "saved" });
      router.refresh();
    } else if ("conflict" in result) setStatus({ kind: "conflict", version: result.version });
    else if ("fieldErrors" in result) setStatus({ kind: "error", message: "That version no longer fits the current fields, so it can't be restored." });
    else if ("missing" in result) setStatus({ kind: "error", message: "That version is no longer kept." });
    else setStatus({ kind: "error", message: result.error });
  };

  const errorList = Object.entries(errors);

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (dirty) void save();
      }}
      onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
          e.preventDefault();
          if (dirty) void save();
        }
      }}
      className="rounded-[14px] border border-ink/12 bg-white/55"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink/10 px-5 pt-4 pb-3 max-mobile:px-4">
        <div className="min-w-0">
          <h2 className="text-[18px] tracking-[-0.01em]">{title}</h2>
          {lead ? <p className="mt-1 text-[14px] opacity-65">{lead}</p> : null}
        </div>
        <Button size="sm" variant="ghost" onClick={openHistory} aria-expanded={historyOpen}>
          {historyOpen ? "Hide history" : "History"}
        </Button>
      </div>

      {historyOpen ? (
        <div className="border-b border-ink/10 bg-paper/60 px-5 py-3 max-mobile:px-4">
          {history === null ? (
            <p className="text-[14px] opacity-60">Loading…</p>
          ) : history.length === 0 ? (
            <p className="text-[14px] opacity-60">No earlier versions yet. Each save keeps the one it replaced.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-ink/10">
              {history.map((rev) => (
                <li key={rev.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-[14px]">
                  <span>
                    Version {rev.version}
                    <span className="opacity-60">
                      {" "}
                      · replaced {formatWhen(rev.createdAt)}
                      {rev.createdBy ? ` by ${rev.createdBy}` : ""}
                    </span>
                  </span>
                  <Button size="sm" onClick={() => restore(rev)} disabled={status.kind === "saving"}>
                    Restore
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {initial.invalid ? (
        <div className="px-5 pt-4 max-mobile:px-4">
          <Notice tone="warning">
            The saved copy of this section didn&apos;t match the current fields, so the site is showing the original. Saving
            here replaces it.
          </Notice>
        </div>
      ) : null}

      <div className="flex flex-col gap-5 px-5 py-5 max-mobile:px-4">{children(form)}</div>

      <div className="bg-paper/95 sticky bottom-0 z-10 flex flex-col gap-3 rounded-b-[14px] border-t border-ink/10 px-5 py-3 backdrop-blur max-mobile:px-4">
        {status.kind === "conflict" ? (
          <Notice tone="warning">
            Someone else saved this section while you were editing (now version {status.version}).{" "}
            <span className="mt-2 flex flex-wrap gap-2">
              <Button size="sm" onClick={reload}>
                Load theirs (drops your changes)
              </Button>
              <Button size="sm" variant="danger" onClick={() => save(status.version)}>
                Save mine over theirs
              </Button>
            </span>
          </Notice>
        ) : null}
        {status.kind === "error" ? (
          <Notice tone="error">
            {status.message}
            {errorList.length ? (
              <ul className="mt-1 list-disc pl-5">
                {errorList.slice(0, 8).map(([path, messages]) => (
                  <li key={path}>
                    {path ? `${describePath(docKey, path)}: ` : ""}
                    {messages[0]}
                  </li>
                ))}
              </ul>
            ) : null}
          </Notice>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-[13px]" aria-live="polite">
            {dirty ? (
              <>
                <span className="bg-accent inline-block size-2.5 rounded-full" aria-hidden />
                Unsaved changes
              </>
            ) : status.kind === "saved" ? (
              "Saved. The site shows it now."
            ) : meta.version === 0 ? (
              <span className="opacity-60">Showing the original copy. Not edited yet.</span>
            ) : (
              <span className="opacity-60">
                Version {meta.version}
                {meta.updatedAt ? ` · ${formatWhen(meta.updatedAt)}` : ""}
                {meta.updatedBy ? ` · ${meta.updatedBy}` : ""}
              </span>
            )}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => {
                setValue(saved);
                setErrors({});
                setStatus({ kind: "idle" });
              }}
              disabled={!dirty || status.kind === "saving"}
            >
              Discard
            </Button>
            <Button size="sm" type="submit" variant="primary" disabled={!dirty || status.kind === "saving"}>
              {status.kind === "saving" ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
