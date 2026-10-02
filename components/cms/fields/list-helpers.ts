/**
 * Small rules the editors' lists share.
 *
 * `SortableList` removes an entry the moment its Remove button is pressed.
 * For a line of copy that is fine (Discard brings it back), but a whole
 * service or case study is a lot of typing to lose to a slipped tap, so the
 * editors pass their list changes through `confirmRemoval` first.
 */

/** True to go ahead. Asks only when `next` is shorter than `prev`, naming what goes. */
export function confirmRemoval<T>(prev: readonly T[], next: readonly T[], name: (item: T) => string, noun = "this"): boolean {
  if (next.length >= prev.length) return true;
  const gone = prev.find((item) => !next.includes(item));
  const what = gone && name(gone).trim() ? `“${name(gone).trim()}”` : noun;
  return window.confirm(`Remove ${what}? It is gone from the site once you save. Until then, Discard brings it back.`);
}

/** "01", "02"... the numbering the site prints beside services and steps. */
export const twoDigit = (index: number) => String(index + 1).padStart(2, "0");

/** Rewrites each entry's `no` from its position, so the numbers always run in order. */
export function renumber<T extends { no: string }>(items: readonly T[]): T[] {
  return items.map((item, i) => (item.no === twoDigit(i) ? item : { ...item, no: twoDigit(i) }));
}
