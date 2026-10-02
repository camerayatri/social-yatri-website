"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { mediaList } from "@/lib/cms/actions/media";
import type { MediaItem, MediaKind } from "@/lib/cms/media";
import { Uploader } from "../media/uploader";
import { Button } from "../ui";
import { Duration, Thumb } from "./media-thumb";
import { PhotoBatchUpload } from "./photo-batch-upload";

/**
 * The media library in a dialog, for adding several things to a list at once
 * (clips to a category, clips to the showreel, photographs to a shoot).
 *
 * Tick as many as are wanted, in the order they should be added, and add
 * them in one go; the number on each tick is its place in that order. Files
 * the list already holds are shown but can't be picked twice, and files that
 * lack something the list needs (a clip with no poster) say what is missing
 * instead of failing on save. Uploading happens here too: a new file is
 * ticked as soon as it is in the library.
 */
export function MultiMediaPicker({
  kind,
  title,
  exclude = [],
  max = Infinity,
  unusable,
  onAdd,
  onClose,
}: {
  kind: MediaKind;
  title: string;
  /** Files already in the list. */
  exclude?: string[];
  /** How many more the list can take. */
  max?: number;
  /** Why an item can't go in this list, or null if it can. */
  unusable?: (item: MediaItem) => string | null;
  onAdd: (items: MediaItem[]) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    dialog.current?.showModal();
    let live = true;
    mediaList(kind).then(
      (list) => live && setItems(list),
      () => live && setLoadError(true),
    );
    return () => {
      live = false;
    };
  }, [kind]);

  const taken = useMemo(() => new Set(exclude), [exclude]);
  const q = query.trim().toLowerCase();
  const shown = (items ?? []).filter((i) => !q || i.alt.toLowerCase().includes(q) || i.url.toLowerCase().includes(q));
  const full = picked.length >= max;

  const toggle = (item: MediaItem) =>
    setPicked((list) => (list.includes(item.id) ? list.filter((id) => id !== item.id) : list.length >= max ? list : [...list, item.id]));

  const arrived = (fresh: MediaItem[]) => {
    setItems((list) => [...fresh, ...(list ?? []).filter((i) => !fresh.some((f) => f.id === i.id))]);
    setPicked((list) => [...list, ...fresh.map((f) => f.id).filter((id) => !list.includes(id))].slice(0, Math.max(max, list.length)));
    setUploading(false);
  };

  const confirm = () => {
    const byId = new Map((items ?? []).map((i) => [i.id, i]));
    onAdd(picked.map((id) => byId.get(id)).filter(Boolean) as MediaItem[]);
    dialog.current?.close();
  };

  const noun = kind === "video" ? "clip" : "photo";

  return (
    <dialog
      ref={dialog}
      // React hands a nested dialog's close event up the component tree too;
      // only this dialog's own closing counts. Escape fires "close" as well.
      onClose={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-label={title}
      className="bg-paper text-ink m-auto h-[min(900px,94dvh)] w-[min(1100px,96vw)] max-w-none rounded-[16px] p-0 backdrop:bg-ink/50"
    >
      <div className="flex h-full flex-col">
        <div className="flex flex-wrap items-center gap-2 border-b border-ink/10 px-5 py-3 max-mobile:px-3">
          <h2 className="mr-auto text-[18px]">{title}</h2>
          {!uploading ? (
            <Button size="sm" onClick={() => setUploading(true)}>
              {kind === "video" ? "Upload a new clip" : "Upload new photos"}
            </Button>
          ) : null}
          <Button size="sm" variant="ghost" onClick={() => dialog.current?.close()}>
            Close
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 max-mobile:px-3">
          {uploading ? (
            <div className="mb-6">
              {kind === "video" ? (
                <div className="rounded-[12px] border border-ink/15 bg-white/60 p-4 max-mobile:p-3">
                  <Uploader kind="video" onUploaded={(item) => arrived([item])} onCancel={() => setUploading(false)} />
                </div>
              ) : (
                <PhotoBatchUpload onAdded={arrived} onClose={() => setUploading(false)} />
              )}
            </div>
          ) : null}

          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            // The picker sits inside an editor's form; Enter here must not save it.
            onKeyDown={(e) => {
              if (e.key === "Enter") e.preventDefault();
            }}
            placeholder="Search descriptions"
            aria-label="Search descriptions"
            className="mb-4 h-10 w-full rounded-full border border-ink/20 bg-white px-4 text-[14px] outline-none focus:border-ink"
          />

          {loadError ? (
            <p className="py-8 text-center">The library couldn&apos;t be loaded. Close this and try again.</p>
          ) : items === null ? (
            <p className="py-8 text-center opacity-60">Loading the library…</p>
          ) : !shown.length ? (
            <p className="py-8 text-center opacity-60">{q ? "Nothing matches that search." : `No ${noun}s in the library yet. Upload one above.`}</p>
          ) : (
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3 max-mobile:grid-cols-2">
              {shown.map((item) => {
                const here = taken.has(item.url);
                const why = here ? "Already in this list" : (unusable?.(item) ?? null);
                const order = picked.indexOf(item.id);
                const on = order !== -1;
                const disabled = !!why || (!on && full);
                const thumb = item.kind === "video" ? item.posterUrl : item.url;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => toggle(item)}
                      disabled={disabled}
                      aria-pressed={on}
                      title={why ?? undefined}
                      className={`relative flex w-full flex-col overflow-hidden rounded-[10px] border bg-white text-left transition-colors disabled:cursor-not-allowed ${
                        on ? "border-ink ring-accent ring-2" : "border-ink/12 hover:border-ink/50"
                      } ${why ? "opacity-55" : ""}`}
                    >
                      <Thumb src={thumb} ratio={item.kind === "video" ? 9 / 16 : 1} className="!rounded-none" />
                      {item.kind === "video" ? (
                        <span className="bg-ink/80 text-paper absolute top-1.5 left-1.5 rounded-full px-2 py-0.5 text-[11px]">
                          ▶ <Duration src={item.url} known={item.duration} />
                        </span>
                      ) : null}
                      {on ? (
                        <span className="bg-ink text-paper absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full text-[12px] tabular-nums">
                          {order + 1}
                        </span>
                      ) : null}
                      <span className="line-clamp-2 px-2 pt-1.5 text-[12px] leading-[1.3] opacity-80">{item.alt}</span>
                      <span className="px-2 pt-0.5 pb-1.5 text-[11px] opacity-55">
                        {why ?? (item.w && item.h ? `${item.w}×${item.h}` : "")}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 px-5 py-3 max-mobile:px-3">
          <p className="text-[13px] opacity-70" aria-live="polite">
            {picked.length ? `${picked.length} ${noun}${picked.length === 1 ? "" : "s"} ticked, added in the order shown` : `Tick the ${noun}s to add.`}
            {Number.isFinite(max) ? ` · room for ${Math.max(0, max - picked.length)} more` : ""}
          </p>
          <div className="flex gap-2">
            {picked.length ? (
              <Button size="sm" variant="ghost" onClick={() => setPicked([])}>
                Clear
              </Button>
            ) : null}
            <Button size="sm" variant="primary" onClick={confirm} disabled={!picked.length}>
              Add {picked.length || ""} {noun}
              {picked.length === 1 ? "" : "s"}
            </Button>
          </div>
        </div>
      </div>
    </dialog>
  );
}
