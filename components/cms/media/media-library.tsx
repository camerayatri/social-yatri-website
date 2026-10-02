"use client";

import { useEffect, useMemo, useState } from "react";
import { deleteMedia, mediaUsage, updateMediaAlt } from "@/lib/cms/actions/media";
import { describePath } from "@/lib/cms/labels";
import type { MediaItem, MediaKind, Reference } from "@/lib/cms/media";
import { DESCRIBE } from "../fields/describe";
import { TextArea } from "../fields/text-area";
import { Button, Card, Notice, formatBytes, formatWhen } from "../ui";
import { MediaGrid } from "./media-grid";
import { Uploader } from "./uploader";

/**
 * The media library page: filter, upload, and look after what is there.
 *
 * Selecting a file opens its details: the alt text (editable), its size, and
 * where the live content uses it. A file that is in use cannot be deleted;
 * the list says what to change first. Deleting hides the file from the
 * library and keeps it on the store, so an older revision that names it can
 * still be restored.
 */

type Filter = "all" | MediaKind;

export function MediaLibrary({ initialItems }: { initialItems: MediaItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState<MediaItem | null>(null);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (i) => (filter === "all" || i.kind === filter) && (!q || i.alt.toLowerCase().includes(q) || i.url.toLowerCase().includes(q)),
    );
  }, [items, filter, query]);

  const counts = { all: items.length, image: items.filter((i) => i.kind === "image").length, video: items.filter((i) => i.kind === "video").length };

  return (
    <div className="flex flex-col gap-6">
      {uploading ? (
        <Card title="Upload a file">
          <Uploader
            onUploaded={(item) => {
              setItems((list) => [item, ...list.filter((i) => i.id !== item.id)]);
              setUploading(false);
              setSelected(item);
            }}
            onCancel={() => setUploading(false)}
          />
        </Card>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Show" className="flex rounded-full border border-ink/20 p-0.5">
          {(["all", "image", "video"] as const).map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3.5 py-1.5 text-[13px] ${filter === f ? "bg-ink text-paper" : "hover:bg-ink/5"}`}
            >
              {f === "all" ? "All" : f === "image" ? "Images" : "Videos"} ({counts[f]})
            </button>
          ))}
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search descriptions"
          aria-label="Search descriptions"
          className="h-10 min-w-0 flex-1 rounded-full border border-ink/20 bg-white px-4 text-[14px] outline-none focus:border-ink"
        />
        {!uploading ? (
          <Button variant="primary" onClick={() => setUploading(true)}>
            Upload
          </Button>
        ) : null}
      </div>

      <div className={`grid gap-6 ${selected ? "tablet:grid-cols-[1fr_360px]" : ""}`}>
        <MediaGrid items={shown} selectedId={selected?.id} onSelect={setSelected} emptyText="No files match." />
        {selected ? (
          <MediaDetails
            key={selected.id}
            item={selected}
            onClose={() => setSelected(null)}
            onChanged={(item) => {
              setItems((list) => list.map((i) => (i.id === item.id ? item : i)));
              setSelected(item);
            }}
            onDeleted={(id) => {
              setItems((list) => list.filter((i) => i.id !== id));
              setSelected(null);
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

function MediaDetails({
  item,
  onClose,
  onChanged,
  onDeleted,
}: {
  item: MediaItem;
  onClose: () => void;
  onChanged: (item: MediaItem) => void;
  onDeleted: (id: string) => void;
}) {
  const [alt, setAlt] = useState(item.alt);
  const [refs, setRefs] = useState<Reference[] | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    mediaUsage(item.id).then((r) => {
      if (live) setRefs(Array.isArray(r) ? r : []);
    });
    return () => {
      live = false;
    };
  }, [item.id]);

  const saveAlt = async () => {
    setBusy(true);
    const res = await updateMediaAlt(item.id, alt);
    setBusy(false);
    if ("error" in res) setMessage({ tone: "error", text: res.error });
    else {
      setMessage({ tone: "success", text: "Description saved." });
      onChanged(res.item);
    }
  };

  const remove = async () => {
    if (!window.confirm("Remove this file from the library? Content that used to use it in old revisions can still be restored.")) return;
    setBusy(true);
    const res = await deleteMedia(item.id);
    setBusy(false);
    if ("ok" in res) onDeleted(item.id);
    else if ("inUse" in res) {
      setRefs(res.inUse);
      setMessage({ tone: "error", text: "It's still in use. Replace it in the places below first." });
    } else setMessage({ tone: "error", text: res.error });
  };

  const inUse = refs !== null && refs.length > 0;

  return (
    <aside className="h-fit tablet:sticky tablet:top-6">
      <Card
        title={item.kind === "video" ? "Video" : "Image"}
        lead={`${item.w && item.h ? `${item.w}×${item.h} · ` : ""}${formatBytes(item.bytes)}${item.source === "seed" ? " · shipped with the site" : ""}`}
      >
        <div className="flex flex-col gap-4">
          {item.kind === "video" ? (
            <video src={item.url} poster={item.posterUrl ?? undefined} controls muted playsInline className="w-full rounded-[8px] bg-ink/5" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.url} alt={item.alt} className="w-full rounded-[8px] border border-ink/10" />
          )}
          {message ? <Notice tone={message.tone}>{message.text}</Notice> : null}
          <TextArea
            label={DESCRIBE[item.kind].label}
            hint={`${DESCRIBE[item.kind].hint} New picks copy it; places already using the file keep their own.`}
            value={alt}
            onChange={setAlt}
            rows={3}
            softLimit={250}
          />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="primary" onClick={saveAlt} disabled={busy || alt.trim() === item.alt || !alt.trim()}>
              Save description
            </Button>
            <a href={item.url} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center px-2 text-[13px] underline underline-offset-2">
              Open file
            </a>
          </div>
          <div>
            <p className="cms-label opacity-75">Where it&apos;s used</p>
            {refs === null ? (
              <p className="mt-1 text-[13px] opacity-60">Checking…</p>
            ) : refs.length ? (
              <ul className="mt-1 list-disc pl-5 text-[13px]">
                {refs.map((r) => (
                  <li key={`${r.key}:${r.path}`}>{describePath(r.key, r.path)}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-[13px] opacity-60">Not used anywhere on the site right now.</p>
            )}
          </div>
          <p className="text-[12px] opacity-55">Added {formatWhen(item.createdAt)}</p>
          <div className="flex flex-wrap gap-2 border-t border-ink/10 pt-4">
            <Button size="sm" variant="danger" onClick={remove} disabled={busy || inUse || refs === null}>
              Remove from library
            </Button>
            <Button size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
          {inUse ? <p className="text-[12px] opacity-60">Files in use can&apos;t be removed.</p> : null}
        </div>
      </Card>
    </aside>
  );
}
