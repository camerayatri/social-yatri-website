"use client";

import { useState } from "react";
import type { MediaItem } from "@/lib/cms/media";
import { media } from "@/lib/media";
import { Button } from "../ui";
import { Duration, Thumb } from "./media-thumb";
import { SortableGrid, moveItem, occurrenceKeys } from "./sortable-grid";
import { TextArea } from "./text-area";
import { TextField } from "./text-field";

/**
 * A list of clips as cards: the poster, the length, the description, and
 * (for the showreel) a title. Reorder by dragging or with the arrows.
 *
 * With `coverFirst`, the first card wears a "Cover clip" badge and the others
 * offer "Make cover clip", because the pages take the head of a reel list as
 * the category's cover and its hover clip. Removing a clip only takes it out
 * of this list; the file stays in the media library.
 *
 * Each card can play its clip in place (muted, with controls), so a clip is
 * recognised by watching it rather than by its file name.
 */

export type ReelLike = { src: string; poster: string; alt: string; w: number; h: number; title?: string };

/** What a library video lacks before it can be a clip on the site, or null. */
export function clipProblem(item: MediaItem): string | null {
  if (!item.posterUrl) return "Has no poster frame";
  if (!item.w || !item.h) return "Size unknown";
  return null;
}

/** A library video as a clip. Check `clipProblem` first. */
export function clipFromItem(item: MediaItem): ReelLike {
  return { src: item.url, poster: item.posterUrl ?? "", alt: item.alt, w: item.w ?? 0, h: item.h ?? 0 };
}

export function ReelGrid<T extends ReelLike>({
  items,
  onChange,
  durations = {},
  coverFirst = false,
  withTitle = false,
  min = 0,
  minReason,
  errorAt,
  label,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  /** Known lengths by file URL, from the library. Others are read when shown. */
  durations?: Record<string, number>;
  coverFirst?: boolean;
  withTitle?: boolean;
  /** Fewest clips the list may keep; Remove is off below it. */
  min?: number;
  /** Why Remove is off at the minimum. */
  minReason?: string;
  errorAt: (index: number, field?: "alt" | "title" | "src" | "poster") => string | undefined;
  label: string;
}) {
  const [playing, setPlaying] = useState<string | null>(null);
  const keys = occurrenceKeys(items, (r) => r.src);
  const name = (item: T, i: number) => (item.title ? `“${item.title}”` : `clip ${i + 1}`);

  return (
    <SortableGrid
      label={label}
      items={items}
      onChange={onChange}
      itemKey={(_, i) => keys[i]}
      itemName={name}
      minCardWidth={210}
      itemError={(i) => errorAt(i) ?? errorAt(i, "src") ?? errorAt(i, "poster")}
      renderItem={(item, i) => {
        const key = keys[i];
        const isPlaying = playing === key;
        return (
          <>
            <div className="relative">
              {isPlaying ? (
                <video
                  src={media(item.src)}
                  poster={media(item.poster)}
                  controls
                  autoPlay
                  muted
                  playsInline
                  onEnded={() => setPlaying(null)}
                  className="bg-ink block w-full rounded-[6px]"
                  style={{ aspectRatio: `${item.w || 9} / ${item.h || 16}` }}
                />
              ) : (
                <Thumb src={item.poster} ratio={item.w && item.h ? item.w / item.h : 9 / 16} />
              )}
              {coverFirst && i === 0 ? (
                <span className="bg-accent text-ink cms-label pointer-events-none absolute top-1.5 left-1.5 rounded-full px-2 py-0.5 !text-[11px] shadow-sm">
                  Cover clip
                </span>
              ) : null}
              {!isPlaying ? (
                <span className="bg-ink/80 text-paper pointer-events-none absolute bottom-1.5 left-1.5 rounded-full px-2 py-0.5 text-[11px] tabular-nums">
                  ▶ <Duration src={item.src} known={durations[item.src]} />
                </span>
              ) : null}
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12px] tabular-nums opacity-55">
                {item.w}×{item.h}
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="!h-7 !px-2.5"
                onClick={() => setPlaying(isPlaying ? null : key)}
                aria-label={isPlaying ? `Stop ${name(item, i)}` : `Play ${name(item, i)}`}
              >
                {isPlaying ? "Stop" : "Play"}
              </Button>
            </div>
            {withTitle ? (
              <TextField
                label="Title"
                required
                value={item.title ?? ""}
                error={errorAt(i, "title") ?? ((item.title ?? "").trim() ? undefined : "Needs a title before saving.")}
                onChange={(title) => onChange(items.map((it, j) => (j === i ? { ...it, title } : it)))}
              />
            ) : null}
            <TextArea
              label="Alt text"
              required
              rows={2}
              value={item.alt}
              error={errorAt(i, "alt") ?? (item.alt.trim() ? undefined : "Needs alt text before saving.")}
              onChange={(alt) => onChange(items.map((it, j) => (j === i ? { ...it, alt } : it)))}
            />
          </>
        );
      }}
      actions={(item, i) => (
        <>
          {coverFirst && i > 0 ? (
            <Button size="sm" onClick={() => onChange(moveItem(items, i, 0))} aria-label={`Make ${name(item, i)} the cover clip`}>
              Make cover clip
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              if (playing === keys[i]) setPlaying(null);
              onChange(items.filter((_, j) => j !== i));
            }}
            disabled={items.length <= min}
            title={items.length <= min ? minReason : "Takes it out of this list. The file stays in the media library."}
            aria-label={`Remove ${name(item, i)} from this list`}
          >
            Remove
          </Button>
        </>
      )}
    />
  );
}
