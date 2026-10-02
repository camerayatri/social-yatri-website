/**
 * Says a clip is loading, when it is taking long enough to notice.
 *
 * The same small ring, in the same corner, as the "Watch" mark the card shows
 * at rest, so it reads as that mark carrying on rather than as something new:
 * paper on the ink pill, turning. Shown only after a clip has been asked to
 * play and has waited for its file for a moment (see `useClip`); the rest of
 * the time it is not there at all.
 */
export default function Buffering({ show }: { show: boolean }) {
  return (
    <span
      aria-hidden
      className="bg-ink/55 pointer-events-none absolute bottom-[0.9em] left-[0.9em] flex h-[30px] w-[30px] items-center justify-center rounded-full backdrop-blur-sm transition-opacity duration-300"
      style={{ opacity: show ? 0.9 : 0 }}
    >
      {/* Only turning while it is shown: a strip of twenty idle spinners is twenty animations for nothing. */}
      {show ? (
        <span className="border-paper/80 block h-[16px] w-[16px] animate-spin rounded-full border border-t-transparent motion-reduce:animate-none" />
      ) : null}
    </span>
  );
}
