"use client";

import type { MediaItem } from "@/lib/cms/media";

/**
 * The library as a grid of thumbnails. Videos show their poster with a play
 * badge and their length. Used by the library page and by the picker inside a
 * MediaField, so both look and behave the same.
 */
export function MediaGrid({
  items,
  selectedId,
  onSelect,
  emptyText = "Nothing here yet.",
}: {
  items: MediaItem[];
  selectedId?: string | null;
  onSelect: (item: MediaItem) => void;
  emptyText?: string;
}) {
  if (!items.length) return <p className="py-8 text-center opacity-60">{emptyText}</p>;
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3 max-mobile:grid-cols-2">
      {items.map((item) => {
        const thumb = item.kind === "video" ? item.posterUrl : item.url;
        const selected = item.id === selectedId;
        return (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onSelect(item)}
              aria-pressed={selected}
              className={`group flex w-full flex-col overflow-hidden rounded-[10px] border bg-white text-left transition-colors ${
                selected ? "border-ink ring-accent ring-2" : "border-ink/12 hover:border-ink/50"
              }`}
            >
              <span className="bg-ink/5 relative block aspect-square w-full">
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumb} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center text-[12px] opacity-50">No preview</span>
                )}
                {item.kind === "video" ? (
                  <span className="bg-ink/80 text-paper absolute bottom-1.5 left-1.5 rounded-full px-2 py-0.5 text-[11px]">
                    ▶ {item.duration ? `${Math.round(item.duration)}s` : "video"}
                  </span>
                ) : null}
              </span>
              <span className="line-clamp-2 px-2 py-1.5 text-[12px] leading-[1.3] opacity-75">{item.alt}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
