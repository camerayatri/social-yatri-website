import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

import OgWordmark, { OG_COLORS } from "@/components/logo/og-wordmark";
import { WORKS, workCover } from "@/lib/content";

/*
 * A work page's share image: the category's own cover beside its name.
 *
 * The cover is the client's designed still, the same one the /work wall shows,
 * handed to Satori as a data URL. It is read from `public` when it is still a
 * site path and fetched from the media store when `media()` has made it a full
 * URL, which is where the content media lives in production. The right-hand panel is 4:5 at this
 * height, which is the shape most of the covers were made in.
 */
export const alt = "A category of Social Yatri's work, its cover beside the category name";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/* Built for every category at build time, like the pages they belong to. */
export function generateStaticParams() {
  return WORKS.map((work) => ({ slug: work.slug }));
}

/* A failed fetch fails the build rather than drawing a broken card. */
async function fetchCover(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Cover ${url} answered ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

const PANEL = { width: 504, height: 630 };

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const work = WORKS.find((item) => item.slug === slug);
  if (!work) return new Response("Not found", { status: 404 });

  const cover = workCover(work);
  const data = cover.src.startsWith("https://")
    ? await fetchCover(cover.src)
    : await readFile(join(process.cwd(), "public", cover.src));
  const type = cover.src.endsWith(".png") ? "image/png" : "image/jpeg";
  const src = `data:${type};base64,${data.toString("base64")}`;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: OG_COLORS.paper, color: OG_COLORS.ink }}>
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "56px 64px",
          }}
        >
          <OgWordmark width={300} />

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 24, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.6 }}>
              Work
            </div>
            <div style={{ display: "flex", marginTop: 16, fontSize: 84, letterSpacing: "-0.035em", lineHeight: 0.95 }}>
              {work.title}
            </div>
            <div style={{ display: "flex", marginTop: 28, fontSize: 28, opacity: 0.7 }}>
              {"Reels and videos from a Kolkata studio"}
            </div>
          </div>
        </div>

        {/* A plain <img>: Satori draws no other kind. */}
        <img
          src={src}
          alt=""
          width={PANEL.width}
          height={PANEL.height}
          style={{ objectFit: "cover", objectPosition: cover.focus ?? "50% 50%" }}
        />
      </div>
    ),
    size,
  );
}
