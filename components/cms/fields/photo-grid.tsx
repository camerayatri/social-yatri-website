"use client";

import type { MediaItem } from "@/lib/cms/media";
import { Button } from "../ui";
import { Thumb } from "./media-thumb";
import { SortableGrid, moveItem, occurrenceKeys } from "./sortable-grid";
import { TextArea } from "./text-area";

/**
 * A set of photographs as a grid of cards, each with its alt text in place.
 *
 * The first photograph is the one the set opens on (in the strips on
 * /photoshoot and on a category's page), so it wears a badge and the others
 * offer "Open with this". Removing takes a photograph out of the set only;
 * the file stays in the media library. Pixel sizes come from the library,
 * never from typing.
 *
 * `altId(i)` gives each alt box a stable id, so a list of photos missing alt
 * text elsewhere on the page can jump straight to the right box.
 */

export type PhotoLike = { src: string; alt: string; w: number; h: number };

export function photoProblem(item: MediaItem): string | null {
  if (!item.w || !item.h) return "Size unknown";
  return null;
}

export function photoFromItem(item: MediaItem): PhotoLike {
  return { src: item.url, alt: item.alt, w: item.w ?? 0, h: item.h ?? 0 };
}

export function PhotoGrid({
  items,
  onChange,
  errorAt,
  altId,
  label,
  firstBadge = "Opens the strip",
}: {
  items: PhotoLike[];
  onChange: (items: PhotoLike[]) => void;
  errorAt: (index: number, field?: "alt" | "src") => string | undefined;
  altId: (index: number) => string;
  label: string;
  firstBadge?: string;
}) {
  const keys = occurrenceKeys(items, (p) => p.src);
  const name = (_: PhotoLike, i: number) => `photo ${i + 1}`;
  return (
    <SortableGrid
      label={label}
      items={items}
      onChange={onChange}
      itemKey={(_, i) => keys[i]}
      itemName={name}
      minCardWidth={180}
      itemError={(i) => errorAt(i) ?? errorAt(i, "src")}
      renderItem={(item, i) => (
        <>
          <span className="relative block">
            <Thumb src={item.src} ratio={4 / 5} fit="contain" />
            {i === 0 ? (
              <span className="bg-accent text-ink cms-label pointer-events-none absolute top-1.5 left-1.5 rounded-full px-2 py-0.5 !text-[11px] shadow-sm">
                {firstBadge}
              </span>
            ) : null}
          </span>
          <span className="text-[12px] tabular-nums opacity-55">
            {item.w}×{item.h} · {item.w > item.h ? "landscape" : item.w < item.h ? "portrait" : "square"}
          </span>
          <TextArea
            id={altId(i)}
            label="Alt text"
            required
            rows={2}
            value={item.alt}
            error={errorAt(i, "alt") ?? (item.alt.trim() ? undefined : "Needs alt text before saving.")}
            placeholder="Who or what is in it, and where"
            onChange={(alt) => onChange(items.map((p, j) => (j === i ? { ...p, alt } : p)))}
          />
        </>
      )}
      actions={(item, i) => (
        <>
          {i > 0 ? (
            <Button size="sm" onClick={() => onChange(moveItem(items, i, 0))} aria-label={`Open the set with ${name(item, i)}`}>
              Open with this
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            title="Takes it out of this set. The file stays in the media library."
            aria-label={`Remove ${name(item, i)} from this set`}
          >
            Remove
          </Button>
        </>
      )}
    />
  );
}

/**
 * The photographs still missing alt text, as buttons that jump to each box.
 * Shown above a set and used as the reason Save is off.
 */
export function MissingAlt({
  missing,
  onJump,
}: {
  missing: { key: string; label: string; thumb: string }[];
  onJump: (key: string) => void;
}) {
  if (!missing.length) return null;
  return (
    <div className="rounded-[10px] border border-[#b88a00]/40 bg-[#fff3cc] px-4 py-3 text-[14px] text-[#5a4300]">
      <p>
        <span className="font-medium">Add alt text</span> to {missing.length === 1 ? "1 photo" : `${missing.length} photos`} before
        saving. It is how people who can&apos;t see a picture know what it shows.
      </p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {missing.slice(0, 16).map((m) => (
          <li key={m.key}>
            <button
              type="button"
              onClick={() => onJump(m.key)}
              className="flex items-center gap-2 rounded-full border border-[#5a4300]/30 bg-white/60 py-1 pr-3 pl-1 text-[12px] hover:bg-white"
            >
              <span className="block size-7 overflow-hidden rounded-full">
                <Thumb src={m.thumb} className="!rounded-full" />
              </span>
              {m.label}
            </button>
          </li>
        ))}
        {missing.length > 16 ? <li className="self-center text-[12px]">and {missing.length - 16} more</li> : null}
      </ul>
    </div>
  );
}
