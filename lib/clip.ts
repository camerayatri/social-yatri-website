"use client";

import { useEffect, useState, type RefObject } from "react";
import { preconnect } from "react-dom";

import { MEDIA_ORIGIN, previewSrc } from "@/lib/media";
import { claimPlayback } from "@/lib/solo-video";

/**
 * How a clip on a card is loaded, played, switched and let go.
 *
 * Every card that plays on hover (a reel, a showreel card on the spiral, a
 * cover on the work wall) renders its `<video>` with no source at all, and
 * this attaches one at the moment it is asked to play. That is what makes the
 * three things below possible without fighting React over the element:
 *
 * - The muted preview. With the sound off a card plays its reel's silent
 *   540px preview (see `previewSrc`), and with it on, the full file. Turning
 *   the switch on mid-play swaps the file under the card at the moment it had
 *   reached, so the picture carries on and the sound comes in.
 * - Letting go. A card that leaves the screen is paused and its source
 *   detached, which stops the download and frees the decoded frames: a strip
 *   of twenty-one clips can be hovered end to end without twenty-one buffers
 *   held behind it. It shows its cover again, and the next hover attaches the
 *   file afresh, from the browser's cache when it is still there.
 * - Falling back. A reel without a preview (an upload, or a seeded one whose
 *   preview is missing) plays its full file; a preview that fails to load is
 *   swapped for the full file on the spot.
 *
 * One clip at a time is still `claimPlayback`'s job.
 */

type Clip = { full: string; preview: string | null };

const clips = new WeakMap<HTMLVideoElement, Clip>();

/** The source a clip should have for the sound it is being asked to play with. */
function wanted(clip: Clip, sound: boolean) {
  return sound ? clip.full : (clip.preview ?? clip.full);
}

/**
 * Point the element at `src`, keeping its place. The preview is the head of
 * the full clip on the same clock, so the moment it had reached is the same
 * moment in the other file.
 */
function swap(video: HTMLVideoElement, src: string) {
  const at = video.currentTime;
  video.src = src;
  if (at > 0) {
    video.addEventListener(
      "loadedmetadata",
      () => {
        if (at < video.duration) video.currentTime = at;
      },
      { once: true },
    );
  }
}

function onError(this: HTMLVideoElement) {
  const clip = clips.get(this);
  if (!clip || !clip.preview || this.getAttribute("src") !== clip.preview) return;
  // The preview is not there: play the clip itself, as before previews existed.
  const resume = this.dataset.intent === "play";
  clip.preview = null;
  swap(this, clip.full);
  if (resume) void this.play().catch(() => {});
}

/** Let go of a clip's file: stop the download and free its frames. The cover comes back. */
export function releaseClip(video: HTMLVideoElement) {
  delete video.dataset.intent;
  if (!video.hasAttribute("src")) return;
  video.pause();
  video.removeAttribute("src");
  video.load();
}

/*
 * One observer for every card on the page. A card that has gone off screen,
 * whether scrolled past or slid out of its strip, is let go; the next hover
 * brings it back.
 */
let offscreen: IntersectionObserver | null = null;
function observer() {
  offscreen ??= new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) releaseClip(entry.target as HTMLVideoElement);
    }
  });
  return offscreen;
}

/**
 * Open the connection to the store before the first clip is asked for. Called
 * as the pointer comes onto a strip and as a finger lands on a card, which is
 * a few hundred milliseconds before the hover or the click that wants a file:
 * about the time a fresh connection takes to set up on a phone network.
 */
export function warmClips() {
  if (MEDIA_ORIGIN) preconnect(MEDIA_ORIGIN);
}

/**
 * Play a card's clip with the sound its switch says, settling for silence
 * rather than nothing when the browser refuses sound (a hover is not a
 * gesture, so before the first click anywhere it will).
 */
export async function playClip(video: HTMLVideoElement, sound: boolean) {
  const clip = clips.get(video);
  if (!clip) return;
  claimPlayback(video);
  video.dataset.intent = "play";
  const current = video.getAttribute("src");
  /*
   * A card already holding the full file keeps it even with the sound off: it
   * has that file buffered, and going back to the preview would be a second
   * download to save nothing.
   */
  const target = current === clip.full ? clip.full : wanted(clip, sound);
  if (current !== target) swap(video, target);
  video.muted = !sound;
  try {
    await video.play();
  } catch (error) {
    // Only the autoplay refusal earns a muted retry. Any other rejection,
    // chiefly the pointer leaving before a frame arrived, which aborts the
    // pending play, is left alone: retrying would start a card nobody is on.
    if (!(error instanceof DOMException && error.name === "NotAllowedError")) return;
    if (video.dataset.intent !== "play") return;
    video.muted = true;
    try {
      await video.play();
    } catch {
      /* the cover stays */
    }
  }
}

/** Stop a card's clip where it is. */
export function pauseClip(video: HTMLVideoElement) {
  delete video.dataset.intent;
  video.pause();
}

/**
 * A sound switch flipped. A card that is playing its preview and is now
 * asked for sound moves to the full file at the same moment and carries on;
 * every other card simply takes the new mute, and picks its file at its next
 * play.
 */
export function setClipSound(video: HTMLVideoElement, sound: boolean) {
  const clip = clips.get(video);
  video.muted = !sound;
  if (!clip || !sound || !video.hasAttribute("src")) return;
  if (video.getAttribute("src") === clip.full) return;
  const playing = !video.paused;
  swap(video, clip.full);
  if (playing) void playClip(video, true);
}

/**
 * Registers a card's `<video>` with its reel and watches it: off screen it is
 * let go, and a playback that stalls for more than a moment is reported, so
 * the card can say it is loading instead of sitting on a frozen frame.
 * Returns whether it is stalled now.
 */
export function useClip(ref: RefObject<HTMLVideoElement | null>, full: string) {
  const [stalled, setStalled] = useState(false);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    clips.set(video, { full, preview: previewSrc(full) });
    video.addEventListener("error", onError);
    observer().observe(video);

    let timer: number | undefined;
    const waiting = () => {
      window.clearTimeout(timer);
      // A beat before saying so: most waits are over before anyone notices.
      timer = window.setTimeout(() => setStalled(!video.paused), 350);
    };
    const settled = () => {
      window.clearTimeout(timer);
      setStalled(false);
    };
    video.addEventListener("waiting", waiting);
    video.addEventListener("playing", settled);
    video.addEventListener("pause", settled);
    video.addEventListener("emptied", settled);

    return () => {
      window.clearTimeout(timer);
      video.removeEventListener("error", onError);
      video.removeEventListener("waiting", waiting);
      video.removeEventListener("playing", settled);
      video.removeEventListener("pause", settled);
      video.removeEventListener("emptied", settled);
      offscreen?.unobserve(video);
      releaseClip(video);
      clips.delete(video);
    };
  }, [ref, full]);

  return stalled;
}
