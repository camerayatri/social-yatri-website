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
 *
 * Each entry is keyed by an id that lives only here, never in the document,
 * so whatever an entry holds on screen (a section folded open, a half-typed
 * box) moves with it when it is moved, rather than staying in the slot.
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

let lastId = 0;
const nextId = () => `item-${++lastId}`;

type Track<T> = { items: T[]; ids: string[]; pending: string[] | null };

/**
 * Ids that follow the entries through moves, removals and additions.
 *
 * The list's own buttons know exactly what they did, so a move, removal or
 * addition hands the rearranged ids over (`expect`) together with the change.
 * That holds even when the editor rewrites every entry on the way (the
 * services renumber themselves), which leaves nothing to match by identity.
 *
 * Any other change (typing, Discard, a reload) is matched against the last
 * list: entries unchanged in place keep their ids, then entries found
 * elsewhere (the same object) bring theirs, and an entry edited in place is a
 * new object at the same position and keeps the id of the one it replaced.
 */
function useStableIds<T>(items: T[]) {
  const [track, setTrack] = useState<Track<T>>(() => ({ items, ids: items.map(nextId), pending: null }));
  const expect = (ids: string[]) => setTrack((t) => ({ ...t, pending: ids }));

  if (track.items === items) {
    // The handover and the new items arrive in the same render. If the items
    // did not change, the editor turned the change down (a removal not
    // confirmed), and the handed-over ids must not linger for the next one.
    if (track.pending) setTrack({ ...track, pending: null });
    return { ids: track.ids, expect };
  }
  if (track.pending && track.pending.length === items.length) {
    setTrack({ items, ids: track.pending, pending: null });
    return { ids: track.pending, expect };
  }

  const old = track.items;
  const used = new Set<number>();
  const take = (j: number) => (used.add(j), track.ids[j]);
  // Unchanged in place first, so typing a line that happens to equal another
  // line's text never trades their ids; then whatever moved; then the rest.
  const ids: (string | undefined)[] = items.map((item, i) => (i < old.length && old[i] === item ? take(i) : undefined));
  ids.forEach((id, i) => {
    if (id) return;
    const j = old.findIndex((o, k) => !used.has(k) && o === items[i]);
    if (j !== -1) ids[i] = take(j);
  });
  const sameLength = items.length === old.length;
  const settled = ids.map((id, i) => id ?? (sameLength && !used.has(i) ? take(i) : nextId()));
  // Storing what the last render saw, the way React's docs adjust state to a
  // changed prop: the next render then finds `items` already tracked.
  setTrack({ items, ids: settled, pending: null });
  return { ids: settled, expect };
}

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
  const { ids, expect } = useStableIds(items);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length || from === to) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    const nextIds = [...ids];
    nextIds.splice(to, 0, ...nextIds.splice(from, 1));
    expect(nextIds);
    onChange(next);
  };

  const update = (index: number) => (item: T) => onChange(items.map((it, i) => (i === index ? item : it)));
  const remove = (index: number) => {
    expect(ids.filter((_, i) => i !== index));
    onChange(items.filter((_, i) => i !== index));
  };

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
            key={ids[index]}
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
          <Button
            size="sm"
            onClick={() => {
              expect([...ids, nextId()]);
              onChange([...items, newItem()]);
            }}
            disabled={items.length >= max}
          >
            + {addLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
