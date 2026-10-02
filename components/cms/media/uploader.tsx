"use client";

import { upload } from "@vercel/blob/client";
import { useEffect, useId, useRef, useState } from "react";
import { registerUpload } from "@/lib/cms/actions/media";
import type { MediaItem, MediaKind } from "@/lib/cms/media";
import { useAdmin } from "../admin-context";
import { DESCRIBE } from "../fields/describe";
import { TextArea } from "../fields/text-area";
import { Button, Notice, formatBytes } from "../ui";

/**
 * Adding a file to the library, in three steps: choose it, describe it, send
 * it.
 *
 * The browser measures the file first (pixel size, and for a video its
 * length), because the pages need those numbers and the server never sees the
 * bytes: the file goes straight to Blob with a token from the upload route.
 * A video also needs a poster, the still shown before it plays, which is
 * picked by scrubbing to a frame and captured from a canvas. Alt text is
 * required before anything uploads.
 */

const ACCEPT: Record<MediaKind, string> = {
  image: "image/jpeg,image/png,image/webp,image/avif",
  video: "video/mp4,video/webm,video/quicktime",
};

const LIMIT: Record<MediaKind, number> = { image: 20 * 1024 * 1024, video: 300 * 1024 * 1024 };

type Picked = {
  file: File;
  kind: MediaKind;
  url: string;
  w: number;
  h: number;
  duration: number | null;
};

function safeName(name: string) {
  const dot = name.lastIndexOf(".");
  const base = (dot > 0 ? name.slice(0, dot) : name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  return `${base || "file"}${ext ? `.${ext}` : ""}`;
}

async function measureImage(file: File) {
  const bitmap = await createImageBitmap(file);
  const size = { w: bitmap.width, h: bitmap.height };
  bitmap.close();
  return size;
}

function measureVideo(url: string) {
  return new Promise<{ w: number; h: number; duration: number }>((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.onloadedmetadata = () => resolve({ w: video.videoWidth, h: video.videoHeight, duration: video.duration });
    video.onerror = () => reject(new Error("This browser can't read that video."));
    video.src = url;
  });
}

export function Uploader({
  kind: onlyKind,
  onUploaded,
  onCancel,
}: {
  /** Restrict to one kind (a MediaField for an image slot); both when omitted. */
  kind?: MediaKind;
  onUploaded: (item: MediaItem) => void;
  onCancel?: () => void;
}) {
  const { base } = useAdmin();
  const inputId = useId();
  const [picked, setPicked] = useState<Picked | null>(null);
  const [alt, setAlt] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [stage, setStage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [posterAt, setPosterAt] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => () => {
    if (picked) URL.revokeObjectURL(picked.url);
  }, [picked]);

  const choose = async (file: File | undefined) => {
    setError(null);
    if (!file) return;
    const kind: MediaKind | null = file.type.startsWith("video/") ? "video" : file.type.startsWith("image/") ? "image" : null;
    if (!kind || !ACCEPT[kind].split(",").includes(file.type)) {
      setError("That file type isn't supported. Use JPEG, PNG, WebP or AVIF for images, MP4, WebM or MOV for video.");
      return;
    }
    if (onlyKind && kind !== onlyKind) {
      setError(`This slot takes ${onlyKind === "image" ? "an image" : "a video"}.`);
      return;
    }
    if (file.size > LIMIT[kind]) {
      setError(`That file is ${formatBytes(file.size)}; the limit for ${kind}s is ${formatBytes(LIMIT[kind])}.`);
      return;
    }
    const url = URL.createObjectURL(file);
    try {
      const size = kind === "image" ? { ...(await measureImage(file)), duration: null } : await measureVideo(url);
      setPicked({ file, kind, url, ...size });
      setPosterAt(0);
    } catch (e) {
      URL.revokeObjectURL(url);
      setError((e as Error).message || "That file couldn't be read.");
    }
  };

  // Draw the chosen frame into the canvas whenever the scrubber moves.
  useEffect(() => {
    const video = videoRef.current;
    if (!picked || picked.kind !== "video" || !video) return;
    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d")?.drawImage(video, 0, 0);
    };
    video.addEventListener("seeked", draw);
    // Never exactly 0: setting the time a video is already at fires no
    // "seeked", and the first frame would never be drawn.
    video.currentTime = Math.max(0.01, Math.min(posterAt, (picked.duration ?? 0) - 0.05));
    return () => video.removeEventListener("seeked", draw);
  }, [picked, posterAt]);

  const warnings: string[] = [];
  if (picked?.kind === "video") {
    if (Math.max(picked.w, picked.h) > 1920) warnings.push(`It is ${picked.w}×${picked.h}; anything above 1920 pixels is wasted on the site.`);
    const mbps = picked.duration ? (picked.file.size * 8) / picked.duration / 1e6 : 0;
    if (mbps > 8) warnings.push(`It runs at about ${mbps.toFixed(0)} Mbps, which will be slow on phones.`);
  }

  const send = async () => {
    if (!picked) return;
    if (!alt.trim()) {
      setError("Describe what's in it first: the description is read aloud to blind visitors and used by Google.");
      return;
    }
    setError(null);
    try {
      let posterUrl: string | null = null;
      if (picked.kind === "video") {
        setStage("Saving the poster");
        const poster = await new Promise<Blob | null>((r) => canvasRef.current?.toBlob(r, "image/jpeg", 0.85) ?? r(null));
        if (!poster) throw new Error("The poster frame couldn't be captured. Move the scrubber and try again.");
        const name = safeName(picked.file.name).replace(/\.[a-z0-9]+$/, "");
        const res = await upload(`media/${name}-poster.jpg`, poster, {
          access: "public",
          handleUploadUrl: `${base}/api/upload`,
          clientPayload: JSON.stringify({ kind: "image" }),
          contentType: "image/jpeg",
        });
        posterUrl = res.url;
      }
      setStage(picked.kind === "video" ? "Uploading the video" : "Uploading");
      setProgress(0);
      const res = await upload(`media/${safeName(picked.file.name)}`, picked.file, {
        access: "public",
        handleUploadUrl: `${base}/api/upload`,
        clientPayload: JSON.stringify({ kind: picked.kind }),
        contentType: picked.file.type,
        multipart: picked.file.size > 20 * 1024 * 1024,
        onUploadProgress: ({ percentage }) => setProgress(percentage),
      });
      setStage("Adding to the library");
      const result = await registerUpload({
        kind: picked.kind,
        url: res.url,
        posterUrl,
        w: picked.w,
        h: picked.h,
        duration: picked.duration,
        alt: alt.trim(),
      });
      if ("error" in result) throw new Error(result.error);
      setPicked(null);
      setAlt("");
      onUploaded(result.item);
    } catch (e) {
      setError((e as Error).message || "The upload failed. Check your connection and try again.");
    } finally {
      setProgress(null);
      setStage("");
    }
  };

  const busy = stage !== "";

  return (
    <div className="flex flex-col gap-4">
      {error ? <Notice tone="error">{error}</Notice> : null}

      {!picked ? (
        <label
          htmlFor={inputId}
          className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-[12px] border border-dashed border-ink/30 px-4 py-8 text-center hover:border-ink"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            choose(e.dataTransfer.files[0]);
          }}
        >
          <span className="text-[16px]">Choose a file, or drop it here</span>
          <span className="text-[13px] opacity-60">
            {onlyKind === "video"
              ? "MP4, WebM or MOV, up to 300 MB. Best: 720×1280 H.264."
              : onlyKind === "image"
                ? "JPEG, PNG, WebP or AVIF, up to 20 MB."
                : "Images up to 20 MB, videos up to 300 MB."}
          </span>
          <input
            id={inputId}
            type="file"
            accept={onlyKind ? ACCEPT[onlyKind] : `${ACCEPT.image},${ACCEPT.video}`}
            className="sr-only"
            onChange={(e) => choose(e.target.files?.[0])}
          />
        </label>
      ) : (
        <div className="grid gap-4 tablet:grid-cols-[minmax(0,240px)_1fr]">
          <div className="flex flex-col gap-2">
            {picked.kind === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={picked.url} alt="" className="w-full rounded-[8px] border border-ink/10" />
            ) : (
              <>
                <video ref={videoRef} src={picked.url} muted playsInline preload="auto" className="hidden" />
                <canvas ref={canvasRef} className="w-full rounded-[8px] border border-ink/10 bg-ink/5" />
                <label className="flex flex-col gap-1 text-[13px]">
                  <span className="cms-label opacity-75">Poster frame</span>
                  <input
                    type="range"
                    min={0}
                    max={picked.duration ?? 0}
                    step={0.05}
                    value={posterAt}
                    onChange={(e) => setPosterAt(Number(e.target.value))}
                    className="accent-ink"
                  />
                  <span className="opacity-60">Scrub to the frame people see before it plays ({posterAt.toFixed(1)}s).</span>
                </label>
              </>
            )}
            <p className="text-[12px] opacity-60">
              {picked.w}×{picked.h}
              {picked.duration ? ` · ${picked.duration.toFixed(1)}s` : ""} · {formatBytes(picked.file.size)}
            </p>
          </div>
          <div className="flex flex-col gap-4">
            {warnings.length ? (
              <Notice tone="warning">
                {warnings.join(" ")} Exporting at 720×1280, H.264, around 4 Mbps keeps it sharp and quick.
              </Notice>
            ) : null}
            <TextArea
              label={DESCRIBE[picked.kind].label}
              required
              value={alt}
              onChange={setAlt}
              rows={3}
              softLimit={250}
              hint={`${DESCRIBE[picked.kind].hint} Who, what, where; not the file name.`}
            />
            {progress !== null || busy ? (
              <div className="flex flex-col gap-1" aria-live="polite">
                <div className="h-2 overflow-hidden rounded-full bg-ink/10">
                  <div className="bg-ink h-full transition-[width]" style={{ width: `${progress ?? 5}%` }} />
                </div>
                <span className="text-[13px] opacity-70">
                  {stage}
                  {progress !== null ? ` · ${Math.round(progress)}%` : "…"}
                </span>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" onClick={send} disabled={busy}>
                Upload
              </Button>
              <Button
                onClick={() => {
                  setPicked(null);
                  setAlt("");
                  setError(null);
                  onCancel?.();
                }}
                disabled={busy}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
