import { ImageResponse } from "next/og";

import OgWordmark, { OG_COLORS } from "@/components/logo/og-wordmark";
import { HERO, SITE } from "@/lib/content";

/*
 * The share image every page uses unless it has its own, which only the work
 * pages do.
 *
 * Paper, ink and one yellow mark, like the site. No font file is passed, so
 * Satori sets the type in its built-in Geist: PP Neue Montreal is licensed
 * into this repo as a .woff2 only, which Satori cannot read, and converting
 * the licensed file to another format is not ours to do. The wordmark is
 * outlines and needs no font at all.
 */
export const alt = `${SITE.name}, a social media marketing and content agency in Kolkata`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: OG_COLORS.paper,
          color: OG_COLORS.ink,
        }}
      >
        {/* The four words the hero opens on, the client's own. */}
        <div style={{ display: "flex", fontSize: 24, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.6 }}>
          {HERO.eyebrow}
        </div>

        <OgWordmark width={760} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ display: "flex", fontSize: 44, letterSpacing: "-0.02em", maxWidth: 760, lineHeight: 1.1 }}>
            {"Social media marketing and content agency in Kolkata"}
          </div>
          <div style={{ display: "flex", fontSize: 24, opacity: 0.6 }}>socialyatri.in</div>
        </div>
      </div>
    ),
    size,
  );
}
