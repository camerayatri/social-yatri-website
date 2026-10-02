"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Button } from "../ui";

/**
 * A reorderable set of cards, laid out as a grid (clips, photographs) or as
 * rows (categories, shoots).
 *
 * The same two ways to reorder as `SortableList`: drag a card by its handle,
 * or use the arrow buttons, which work on touch screens and from the keyboard
 * where dragging does not. Order means something on every screen this is
 * used on (the first clip is the cover, the first photograph opens the strip),
 * so the buttons are always visible rather than tucked into a menu.
 *
 * After a button move the focus stays on the same button of the same card at
 * its new place, so pressing it again keeps moving that card, and a live
 * region says where it went. `itemKey` must be stable across reorders for
 * that to work; `itemName` is how the announcement and the button labels
 * refer to a card ("clip 3", "Wedding photography").
 *
 * The card's own content and any extra actions (remove, make first) are the
 * caller's; this owns the order.
 */
export type SortableGridProps<T> = {
  items: T[];
  onChange: (items: T[]) => void;
  itemKey: (item: T, index: number) => string;
  itemName: (item: T, index: number) => string;
  renderItem: (item: T, index: number) => ReactNode;
  /** Buttons after the arrows, like Remove. */
  actions?: (item: T, index: number) => ReactNode;
  /** A small tag beside the number, like "Cover clip". */
  badge?: (item: T, index: number) => ReactNode;
  layout?: "grid" | "rows";
  /** For a grid: the narrowest a card may get. */
  minCardWidth?: number;
  itemError?: (index: number) => string | undefined;
  /** Accessible name for the whole set. */
  label: string;
};

export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (to < 0 || to >= items.length || from === to) return items;
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/** Keys for items that may repeat: the value plus how many times it has been seen. */
export function occurrenceKeys<T>(items: T[], pick: (item: T) => string): string[] {
  const seen = new Map<string, number>();
  return items.map((item) => {
    const base = pick(item);
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    return n ? `${base}#${n}` : base;
  });
}

export function SortableGrid<T>({
  items,
  onChange,
  itemKey,
  itemName,
  renderItem,
  actions,
  badge,
  layout = "grid",
  minCardWidth = 200,
  itemError,
  label,
}: SortableGridProps<T>) {
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const listRef = useRef<HTMLOListElement>(null);
  const refocus = useRef<{ key: string; dir: "earlier" | "later" } | null>(null);

  const keys = items.map((item, i) => itemKey(item, i));

  useEffect(() => {
    const target = refocus.current;
    if (!target) return;
    refocus.current = null;
    const card = listRef.current?.querySelector<HTMLElement>(`[data-sort-key="${CSS.escape(target.key)}"]`);
    if (!card) return;
    const own = card.querySelector<HTMLButtonElement>(`[data-move="${target.dir}"]`);
    const other = card.querySelector<HTMLButtonElement>(`[data-move="${target.dir === "earlier" ? "later" : "earlier"}"]`);
    (own && !own.disabled ? own : other)?.focus();
  });

  const move = (from: number, to: number, dir?: "earlier" | "later") => {
    if (to < 0 || to >= items.length || from === to) return;
    if (dir) refocus.current = { key: keys[from], dir };
    setAnnouncement(`Moved ${itemName(items[from], from)} to position ${to + 1} of ${items.length}.`);
    onChange(moveItem(items, from, to));
  };

  const isGrid = layout === "grid";
  const earlier = isGrid ? "←" : "↑";
  const later = isGrid ? "→" : "↓";

  return (
    <>
      <ol
        ref={listRef}
        aria-label={label}
        // Two across on a phone whatever the card's minimum, so a long set stays scannable.
        className={
          isGrid
            ? "grid grid-cols-[repeat(auto-fill,minmax(min(var(--card-min),100%),1fr))] gap-3 max-mobile:grid-cols-2 max-mobile:gap-2"
            : "flex flex-col gap-2"
        }
        style={isGrid ? ({ "--card-min": `${minCardWidth}px` } as CSSProperties) : undefined}
      >
        {items.map((item, index) => {
          const error = itemError?.(index);
          const target = over === index && dragging !== null && dragging !== index;
          return (
            <li
              key={keys[index]}
              data-sort-key={keys[index]}
              onDragOver={(e) => {
                if (dragging === null) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                if (over !== index) setOver(index);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver((o) => (o === index ? null : o));
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragging !== null) move(dragging, index);
                setDragging(null);
                setOver(null);
              }}
              className={`flex min-w-0 flex-col rounded-[10px] border bg-white/80 transition-[opacity,box-shadow] ${
                dragging === index ? "opacity-40" : ""
              } ${target ? "ring-accent ring-2" : ""} ${error ? "border-[#a3271b]" : "border-ink/12"}`}
            >
              <div className="flex items-center gap-1 border-b border-ink/8 py-1 pr-1 pl-1.5">
                <span
                  draggable
                  onDragStart={(e) => {
                    setDragging(index);
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", keys[index]);
                    const card = e.currentTarget.closest("li");
                    if (card) e.dataTransfer.setDragImage(card, 24, 16);
                  }}
                  onDragEnd={() => {
                    setDragging(null);
                    setOver(null);
                  }}
                  className="cursor-grab rounded px-1 py-1 text-[16px] leading-none opacity-45 select-none hover:opacity-80 active:cursor-grabbing"
                  title="Drag to reorder"
                  aria-hidden
                >
                  ⋮⋮
                </span>
                <span className="cms-label shrink-0 tabular-nums opacity-60">{String(index + 1).padStart(2, "0")}</span>
                <span className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">{badge?.(item, index)}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="!px-2.5"
                  data-move="earlier"
                  onClick={() => move(index, index - 1, "earlier")}
                  disabled={index === 0}
                  aria-label={`Move ${itemName(item, index)} ${isGrid ? "earlier" : "up"}`}
                  title={isGrid ? "Move earlier" : "Move up"}
                >
                  {earlier}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="!px-2.5"
                  data-move="later"
                  onClick={() => move(index, index + 1, "later")}
                  disabled={index === items.length - 1}
                  aria-label={`Move ${itemName(item, index)} ${isGrid ? "later" : "down"}`}
                  title={isGrid ? "Move later" : "Move down"}
                >
                  {later}
                </Button>
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-2.5 p-2.5">
                {renderItem(item, index)}
                {error ? <p className="text-[13px] text-[#a3271b]">{error}</p> : null}
                {actions ? <div className="mt-auto flex flex-wrap gap-1.5 pt-1">{actions(item, index)}</div> : null}
              </div>
            </li>
          );
        })}
      </ol>
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </>
  );
}
