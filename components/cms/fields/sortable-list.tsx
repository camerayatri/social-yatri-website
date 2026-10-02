"use client";

import { useState, type ReactNode } from "react";
import { Button } from "../ui";

/**
 * A reorderable list of anything.
 *
 * Reordering works two ways on purpose. Dragging by the handle (native HTML
 * drag and drop, no library) is quickest with a mouse; the up and down buttons
 * work everywhere drag does not, which includes touch screens and keyboards.
 * Order often means something on this site (the first reel is the cover), so
 * both are always on screen.
 *
 * `renderItem` draws one entry's fields and gets an `update` for that entry.
 * Give `newItem` to allow adding, `min`/`max` to bound the length.
 */
export type SortableListProps<T> = {
  label?: ReactNode;
  hint?: ReactNode;
  items: T[];
  onChange: (items: T[]) => void;
  renderItem: (item: T, index: number, update: (item: T) => void) => ReactNode;
  /** The short name shown in each entry's header, e.g. the reel's title. */
  itemLabel?: (item: T, index: number) => ReactNode;
  newItem?: () => T;
  addLabel?: string;
  min?: number;
  max?: number;
  error?: string;
  /** Errors for one entry as a whole, by index. */
  itemError?: (index: number) => string | undefined;
};

export function SortableList<T>({
  label,
  hint,
  items,
  onChange,
  renderItem,
  itemLabel,
  newItem,
  addLabel = "Add",
  min = 0,
  max = Infinity,
  error,
  itemError,
}: SortableListProps<T>) {
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length || from === to) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  const update = (index: number) => (item: T) => onChange(items.map((it, i) => (i === index ? item : it)));
  const remove = (index: number) => onChange(items.filter((_, i) => i !== index));

  return (
    <div className="flex flex-col gap-2">
      {label ? (
        <div>
          <p className="cms-label opacity-75">{label}</p>
          {hint ? <p className="mt-1 text-[13px] opacity-60">{hint}</p> : null}
        </div>
      ) : null}
      <ol className="flex flex-col gap-2">
        {items.map((item, index) => (
          <li
            key={index}
            data-drop-target={over === index && dragging !== null && dragging !== index ? "true" : undefined}
            onDragOver={(e) => {
              if (dragging === null) return;
              e.preventDefault();
              setOver(index);
            }}
            onDragLeave={() => setOver((o) => (o === index ? null : o))}
            onDrop={(e) => {
              e.preventDefault();
              if (dragging !== null) move(dragging, index);
              setDragging(null);
              setOver(null);
            }}
            className={`rounded-[10px] border bg-white/70 ${dragging === index ? "opacity-50" : ""} ${
              itemError?.(index) ? "border-[#a3271b]" : "border-ink/12"
            }`}
          >
            <div className="flex items-center gap-2 border-b border-ink/8 px-3 py-1.5">
              <span
                draggable
                onDragStart={(e) => {
                  setDragging(index);
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", String(index));
                }}
                onDragEnd={() => {
                  setDragging(null);
                  setOver(null);
                }}
                className="cursor-grab px-1 text-[18px] leading-none opacity-50 select-none active:cursor-grabbing"
                title="Drag to reorder"
                aria-hidden
              >
                ⋮⋮
              </span>
              <span className="cms-label min-w-0 flex-1 truncate opacity-70">
                {String(index + 1).padStart(2, "0")}
                {itemLabel ? <span className="ml-2 normal-case">{itemLabel(item, index)}</span> : null}
              </span>
              <Button size="sm" variant="ghost" onClick={() => move(index, index - 1)} disabled={index === 0} aria-label={`Move item ${index + 1} up`}>
                ↑
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => move(index, index + 1)}
                disabled={index === items.length - 1}
                aria-label={`Move item ${index + 1} down`}
              >
                ↓
              </Button>
              {newItem || min < items.length ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => remove(index)}
                  disabled={items.length <= min}
                  aria-label={`Remove item ${index + 1}`}
                >
                  Remove
                </Button>
              ) : null}
            </div>
            <div className="flex flex-col gap-4 px-3 py-3">
              {renderItem(item, index, update(index))}
              {itemError?.(index) ? <p className="text-[13px] text-[#a3271b]">{itemError(index)}</p> : null}
            </div>
          </li>
        ))}
      </ol>
      {error ? <p className="text-[13px] text-[#a3271b]">{error}</p> : null}
      {newItem ? (
        <div>
          <Button size="sm" onClick={() => onChange([...items, newItem()])} disabled={items.length >= max}>
            + {addLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
