"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { mediaList } from "@/lib/cms/actions/media";
import type { MediaItem, MediaKind } from "@/lib/cms/media";
import { MediaGrid } from "../media/media-grid";
import { Uploader } from "../media/uploader";
import { Button } from "../ui";
import { TextArea } from "./text-area";

/**
 * A slot for one image or video.
 *
 * Shows what is there now with its alt text, and a button that opens the
 * library to pick something else or upload something new. Picking hands back
 * a `MediaValue`; the editor maps it onto its own shape (a Photo takes
 * src/alt/w/h, a Reel also takes the poster). The alt text is copied from the
 * library and can be changed here, because the same picture can need a
 * different description in a different place.
 *
 * Give `aspect` (width / height) when the slot is cut to a shape; a pick more
 * than 2% off it is flagged, since the page will crop it.
 */

export type MediaValue = {
  src: string;
  alt: string;
  w?: number;
  h?: number;
  poster?: string;
  duration?: number;
};

export type MediaFieldProps = {
  label: ReactNode;
  kind: MediaKind;
  value: MediaValue | null;
  onChange: (value: MediaValue) => void;
  aspect?: number;
  error?: string;
  /** Error for the alt text specifically. */
  altError?: string;
  hint?: ReactNode;
  /** Hide the inline alt text box (when the editor shows alt elsewhere). */
  hideAlt?: boolean;
};

const fromItem = (item: MediaItem): MediaValue => ({
  src: item.url,
  alt: item.alt,
  ...(item.w ? { w: item.w } : {}),
  ...(item.h ? { h: item.h } : {}),
  ...(item.posterUrl ? { poster: item.posterUrl } : {}),
  ...(item.duration ? { duration: item.duration } : {}),
});

export function MediaField({ label, kind, value, onChange, aspect, error, altError, hint, hideAlt }: MediaFieldProps) {
  const [open, setOpen] = useState(false);
  const ratio = value?.w && value?.h ? value.w / value.h : null;
  const off = aspect && ratio ? Math.abs(ratio - aspect) / aspect > 0.02 : false;
  const thumb = kind === "video" ? value?.poster : value?.src;

  return (
    <div className="flex flex-col gap-2">
      <p className="cms-label opacity-75">{label}</p>
      <div className={`flex gap-3 rounded-[10px] border p-2 ${error ? "border-[#a3271b]" : "border-ink/15"} bg-white/70`}>
        <div className="bg-ink/5 relative size-[96px] shrink-0 overflow-hidden rounded-[6px]">
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumb} alt="" className="absolute inset-0 size-full object-cover" />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-[12px] opacity-50">Empty</span>
          )}
          {kind === "video" && value ? (
            <span className="bg-ink/80 text-paper absolute bottom-1 left-1 rounded-full px-1.5 text-[10px]">▶</span>
          ) : null}
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
          <p className="truncate text-[12px] opacity-60" title={value?.src}>
            {value ? value.src.split("/").pop() : "Nothing chosen"}
            {value?.w && value?.h ? ` · ${value.w}×${value.h}` : ""}
          </p>
          <div>
            <Button size="sm" onClick={() => setOpen(true)}>
              {value ? "Replace" : "Choose"}
            </Button>
          </div>
        </div>
      </div>
      {off ? (
        <p className="text-[13px] text-[#7a5a00]">
          This slot is cut to {aspect! > 1 ? "a landscape" : aspect! < 1 ? "a portrait" : "a square"} shape; this file is{" "}
          {value!.w}×{value!.h}, so the page will crop it.
        </p>
      ) : null}
      {error ? <p className="text-[13px] text-[#a3271b]">{error}</p> : hint ? <p className="text-[13px] opacity-60">{hint}</p> : null}
      {value && !hideAlt ? (
        <TextArea
          label="Alt text here"
          value={value.alt}
          rows={2}
          error={altError}
          onChange={(alt) => onChange({ ...value, alt })}
        />
      ) : null}
      {open ? (
        <MediaPicker
          kind={kind}
          currentSrc={value?.src}
          onClose={() => setOpen(false)}
          onPick={(item) => {
            onChange(fromItem(item));
            setOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

/** The library in a modal dialog, filtered to one kind, with upload. */
export function MediaPicker({
  kind,
  currentSrc,
  onPick,
  onClose,
}: {
  kind: MediaKind;
  currentSrc?: string;
  onPick: (item: MediaItem) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const [query, setQuery] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    dialog.current?.showModal();
    let live = true;
    mediaList(kind).then((list) => {
      if (live) setItems(list);
    });
    return () => {
      live = false;
    };
  }, [kind]);

  const q = query.trim().toLowerCase();
  const shown = (items ?? []).filter((i) => !q || i.alt.toLowerCase().includes(q) || i.url.toLowerCase().includes(q));
  const current = items?.find((i) => i.url === currentSrc)?.id;

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onCancel={onClose}
      className="bg-paper text-ink m-auto h-[min(860px,92dvh)] w-[min(1000px,94vw)] max-w-none rounded-[16px] p-0 backdrop:bg-ink/50"
    >
      <div className="flex h-full flex-col">
        <div className="flex flex-wrap items-center gap-2 border-b border-ink/10 px-5 py-3 max-mobile:px-3">
          <h2 className="mr-auto text-[18px]">Choose {kind === "image" ? "an image" : "a video"}</h2>
          {!uploading ? (
            <Button size="sm" variant="primary" onClick={() => setUploading(true)}>
              Upload new
            </Button>
          ) : null}
          <Button size="sm" onClick={() => dialog.current?.close()}>
            Close
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 max-mobile:px-3">
          {uploading ? (
            <div className="mb-6">
              <Uploader kind={kind} onUploaded={onPick} onCancel={() => setUploading(false)} />
            </div>
          ) : null}
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search descriptions"
            aria-label="Search descriptions"
            className="mb-4 h-10 w-full rounded-full border border-ink/20 bg-white px-4 text-[14px] outline-none focus:border-ink"
          />
          {items === null ? (
            <p className="py-8 text-center opacity-60">Loading the library…</p>
          ) : (
            <MediaGrid items={shown} selectedId={current} onSelect={onPick} emptyText="No files match." />
          )}
        </div>
      </div>
    </dialog>
  );
}
