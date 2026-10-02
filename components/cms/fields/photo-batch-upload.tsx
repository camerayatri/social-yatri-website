"use client";

import { upload } from "@vercel/blob/client";
import { useId, useRef, useState } from "react";
import { registerUpload } from "@/lib/cms/actions/media";
import { discardUploads } from "@/lib/cms/actions/works";
import type { MediaItem } from "@/lib/cms/media";
import { useAdmin } from "../admin-context";
import { Button, Notice, formatBytes } from "../ui";
import { TextArea } from "./text-area";

/**
 * Several photographs at once: choose (or drop) a batch, describe each one
 * while they upload, then add them all.
 *
 * Uploading starts the moment the files are chosen, three at a time, each
 * with its own progress bar, so the waiting happens while people write the
 * descriptions rather than after. Each photo's pixel size is read in the
 * browser, so nobody types dimensions. Nothing joins the library until every
 * photo in the batch has a description; the button says which ones are still
 * missing and jumps to them. A photo taken out of the batch, or a batch
 * cancelled, has its uploaded file deleted again, since nothing uses it.
 */

const ACCEPT = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MAX_BYTES = 20 * 1024 * 1024;
const MAX_FILES = 50;
const PARALLEL = 3;

type Entry = {
  id: string;
  file: File;
  preview: string;
  w: number;
  h: number;
  alt: string;
  progress: number;
  status: "queued" | "uploading" | "uploaded" | "adding" | "error";
  url?: string;
  error?: string;
};

function safeName(name: string) {
  const dot = name.lastIndexOf(".");
  const base = (dot > 0 ? name.slice(0, dot) : name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  return `${base || "photo"}${ext ? `.${ext}` : ""}`;
}

async function measure(file: File) {
  const bitmap = await createImageBitmap(file);
  const size = { w: bitmap.width, h: bitmap.height };
  bitmap.close();
  return size;
}

export function PhotoBatchUpload({
  onAdded,
  onClose,
  title = "Upload photos",
}: {
  /** The photos as the library now has them, in the order they were chosen. */
  onAdded: (items: MediaItem[]) => void;
  onClose: () => void;
  title?: string;
}) {
  const { base } = useAdmin();
  const inputId = useId();
  const altIdBase = useId();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [rejected, setRejected] = useState<string[]>([]);
  const [problem, setProblem] = useState<string | null>(null);
  const aborts = useRef(new Map<string, AbortController>());

  const patch = (id: string, change: Partial<Entry>) =>
    setEntries((list) => list.map((e) => (e.id === id ? { ...e, ...change } : e)));

  const send = async (entry: Entry) => {
    const controller = new AbortController();
    aborts.current.set(entry.id, controller);
    patch(entry.id, { status: "uploading", progress: 0, error: undefined });
    try {
      const res = await upload(`media/${safeName(entry.file.name)}`, entry.file, {
        access: "public",
        handleUploadUrl: `${base}/api/upload`,
        clientPayload: JSON.stringify({ kind: "image" }),
        contentType: entry.file.type,
        abortSignal: controller.signal,
        onUploadProgress: ({ percentage }) => patch(entry.id, { progress: percentage }),
      });
      patch(entry.id, { status: "uploaded", progress: 100, url: res.url, error: undefined });
    } catch (e) {
      if (controller.signal.aborted) return;
      patch(entry.id, { status: "error", error: (e as Error).message || "The upload failed." });
    } finally {
      aborts.current.delete(entry.id);
    }
  };

  /** Uploads `batch` a few at a time. */
  const pump = async (batch: Entry[]) => {
    const queue = [...batch];
    const worker = async () => {
      for (let next = queue.shift(); next; next = queue.shift()) await send(next);
    };
    await Promise.all(Array.from({ length: Math.min(PARALLEL, queue.length) }, worker));
  };

  const choose = async (files: FileList | File[] | null) => {
    if (!files) return;
    setProblem(null);
    const list = Array.from(files);
    const skipped: string[] = [];
    const room = MAX_FILES - entries.length;
    const fresh: Entry[] = [];
    for (const file of list) {
      if (!ACCEPT.includes(file.type)) {
        skipped.push(`${file.name}: not a JPEG, PNG, WebP or AVIF image.`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        skipped.push(`${file.name}: ${formatBytes(file.size)}, over the 20 MB limit.`);
        continue;
      }
      if (fresh.length >= room) {
        skipped.push(`${file.name}: a batch holds ${MAX_FILES} photos. Add the rest in a second batch.`);
        continue;
      }
      try {
        const size = await measure(file);
        fresh.push({
          id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
          file,
          preview: URL.createObjectURL(file),
          ...size,
          alt: "",
          progress: 0,
          status: "queued",
        });
      } catch {
        skipped.push(`${file.name}: this browser can't read it.`);
      }
    }
    setRejected(skipped);
    if (!fresh.length) return;
    setEntries((current) => [...current, ...fresh]);
    void pump(fresh);
  };

  const remove = (entry: Entry) => {
    aborts.current.get(entry.id)?.abort();
    URL.revokeObjectURL(entry.preview);
    setEntries((list) => list.filter((e) => e.id !== entry.id));
    if (entry.url) void discardUploads([entry.url]);
  };

  const cancel = () => {
    for (const c of aborts.current.values()) c.abort();
    const uploaded = entries.map((e) => e.url).filter(Boolean) as string[];
    if (uploaded.length) void discardUploads(uploaded);
    for (const e of entries) URL.revokeObjectURL(e.preview);
    setEntries([]);
    onClose();
  };

  const missingAlt = entries.filter((e) => !e.alt.trim());
  const busy = entries.some((e) => e.status === "queued" || e.status === "uploading" || e.status === "adding");
  const failed = entries.filter((e) => e.status === "error");
  const ready = entries.length > 0 && !busy && !failed.length && !missingAlt.length;

  const add = async () => {
    if (!ready) return;
    setProblem(null);
    const added: MediaItem[] = [];
    for (const entry of entries) {
      patch(entry.id, { status: "adding" });
      const result = await registerUpload({ kind: "image", url: entry.url, w: entry.w, h: entry.h, alt: entry.alt.trim() });
      if ("error" in result) {
        // Still uploaded: the file is fine, the library refused it. Adding again retries.
        patch(entry.id, { status: "uploaded", error: result.error });
        continue;
      }
      added.push(result.item);
      URL.revokeObjectURL(entry.preview);
    }
    const addedUrls = new Set(added.map((i) => i.url));
    setEntries((list) => list.filter((e) => !e.url || !addedUrls.has(e.url)));
    if (added.length) onAdded(added);
    if (added.length < entries.length) setProblem("Some photos couldn't be added. They are still listed below with the reason.");
  };

  const focusAlt = (id: string) => document.getElementById(`${altIdBase}-${id}`)?.focus();

  return (
    <section aria-label={title} className="flex flex-col gap-4 rounded-[12px] border border-ink/15 bg-paper/70 p-4 max-mobile:p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[16px]">{title}</h3>
        <Button size="sm" variant="ghost" onClick={cancel}>
          {entries.length ? "Cancel batch" : "Close"}
        </Button>
      </div>

      <label
        htmlFor={inputId}
        className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-[12px] border border-dashed border-ink/30 px-4 py-6 text-center hover:border-ink focus-within:border-ink"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void choose(e.dataTransfer.files);
        }}
      >
        <span className="text-[15px]">{entries.length ? "Add more photos" : "Choose photos, or drop them here"}</span>
        <span className="text-[13px] opacity-60">
          Several at once is fine. JPEG, PNG, WebP or AVIF, up to 20 MB each. Sizes are measured for you.
        </span>
        <input
          id={inputId}
          type="file"
          multiple
          accept={ACCEPT.join(",")}
          className="sr-only"
          onChange={(e) => {
            void choose(e.target.files);
            e.target.value = "";
          }}
        />
      </label>

      {rejected.length ? (
        <Notice tone="warning">
          {rejected.length === 1 ? "One file was left out:" : `${rejected.length} files were left out:`}
          <ul className="mt-1 list-disc pl-5">
            {rejected.slice(0, 8).map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </Notice>
      ) : null}

      {entries.length ? (
        <ul className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(260px,100%),1fr))]">
          {entries.map((entry) => (
            <li key={entry.id} className="flex gap-3 rounded-[10px] border border-ink/12 bg-white/80 p-2.5">
              <div className="w-[84px] shrink-0">
                <span className="bg-ink/6 relative block overflow-hidden rounded-[6px]" style={{ aspectRatio: `${entry.w} / ${entry.h}` }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={entry.preview} alt="" className="absolute inset-0 size-full object-cover" />
                </span>
                <p className="mt-1 text-[11px] leading-tight tabular-nums opacity-60">
                  {entry.w}×{entry.h}
                </p>
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <p className="truncate text-[12px] opacity-65" title={entry.file.name}>
                  {entry.file.name} · {formatBytes(entry.file.size)}
                </p>
                <div aria-live="polite" className="flex flex-col gap-1">
                  <div
                    className="h-1.5 overflow-hidden rounded-full bg-ink/10"
                    role="progressbar"
                    aria-label={`Upload of ${entry.file.name}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(entry.progress)}
                  >
                    <div
                      className={`h-full transition-[width] ${entry.status === "error" ? "bg-[#a3271b]" : "bg-ink"}`}
                      style={{ width: `${entry.status === "queued" ? 0 : Math.max(entry.progress, 4)}%` }}
                    />
                  </div>
                  <span className={`text-[12px] ${entry.error ? "text-[#a3271b]" : "opacity-60"}`}>
                    {entry.status === "queued"
                      ? "Waiting to upload"
                      : entry.status === "uploading"
                        ? `Uploading · ${Math.round(entry.progress)}%`
                        : entry.status === "uploaded"
                          ? (entry.error ?? "Uploaded")
                          : entry.status === "adding"
                            ? "Adding to the library…"
                            : entry.error}
                  </span>
                </div>
                <TextArea
                  id={`${altIdBase}-${entry.id}`}
                  label="Alt text"
                  required
                  rows={2}
                  value={entry.alt}
                  onChange={(alt) => patch(entry.id, { alt })}
                  placeholder="Who or what is in it, and where"
                />
                <div className="flex flex-wrap gap-1.5">
                  {entry.status === "error" && !entry.url ? (
                    <Button size="sm" onClick={() => void send(entry)}>
                      Try again
                    </Button>
                  ) : null}
                  <Button size="sm" variant="ghost" onClick={() => remove(entry)} aria-label={`Take ${entry.file.name} out of this batch`}>
                    Take out
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {problem ? <Notice tone="error">{problem}</Notice> : null}

      {entries.length ? (
        <div className="flex flex-col gap-3 border-t border-ink/10 pt-3">
          {missingAlt.length ? (
            <Notice tone="warning">
              <p>
                Add alt text to {missingAlt.length === 1 ? "1 photo" : `${missingAlt.length} photos`} before they can be added. It tells
                people who can&apos;t see the picture what it shows.
              </p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {missingAlt.slice(0, 12).map((e) => (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={() => focusAlt(e.id)}
                      className="max-w-[220px] truncate rounded-full border border-current/30 px-2.5 py-1 text-[12px] hover:bg-white"
                    >
                      Write for {e.file.name}
                    </button>
                  </li>
                ))}
                {missingAlt.length > 12 ? <li className="py-1 text-[12px]">and {missingAlt.length - 12} more</li> : null}
              </ul>
            </Notice>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" onClick={add} disabled={!ready}>
              Add {entries.length === 1 ? "1 photo" : `${entries.length} photos`}
            </Button>
            <span className="text-[13px] opacity-65" aria-live="polite">
              {busy
                ? `Uploading ${entries.filter((e) => e.status === "uploaded").length} of ${entries.length} done`
                : failed.length
                  ? `${failed.length} failed: try again or take ${failed.length === 1 ? "it" : "them"} out.`
                  : missingAlt.length
                    ? "Waiting for alt text."
                    : "Ready."}
            </span>
          </div>
        </div>
      ) : null}
    </section>
  );
}
