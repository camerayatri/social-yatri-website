import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

import OgWordmark, { OG_COLORS } from "@/components/logo/og-wordmark";
import { getContent } from "@/lib/cms/get-content";
import { findService, serviceId } from "@/lib/cms/derive";

/*
 * A service page's share image: the service's name and promise beside its
 * cover, built the way the work pages' cards are.
 *
 * The covers are the client's designed 16:10 cards with a line of type set
 * into the artwork, so unlike a work cover this one is never cropped to fit a
 * panel: it is drawn whole, at 16:10, and the name sits in the column beside
 * it. The cover is read from `public` while it is a site path and fetched from
 * the media store once `media()` has made it a full URL, which is where the
 * content media lives in production.
 */
export const alt = "A Social Yatri service, its name beside the service's cover";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/* Built for every service at build time, and on first request for one added in the admin since. */
export const dynamicParams = true;

export async function generateStaticParams() {
  const { services } = await getContent();
  return services.map((service) => ({ slug: serviceId(service) }));
}

/* A failed fetch fails the build rather than drawing a broken card. */
async function fetchCover(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Cover ${url} answered ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

/** The cover, whole, at 16:10. */
const PANEL = { width: 640, height: 400 };

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { services, servicesIntro } = await getContent();
  const service = findService(services, slug);
  if (!service) return new Response("Not found", { status: 404 });

  /*
   * Satori reads JPEG and PNG. The shipped covers are JPEGs; one uploaded in
   * the admin may be WebP or AVIF, and for one of those the panel is left as
   * plain ink rather than failing the card.
   */
  const cover = service.cover;
  const type = /\.png$/i.test(cover.src) ? "image/png" : /\.jpe?g$/i.test(cover.src) ? "image/jpeg" : null;
  let src: string | null = null;
  if (type) {
    const data = cover.src.startsWith("https://")
      ? await fetchCover(cover.src)
      : await readFile(join(process.cwd(), "public", cover.src));
    src = `data:${type};base64,${data.toString("base64")}`;
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          background: OG_COLORS.paper,
          color: OG_COLORS.ink,
        }}
      >
        <div
          style={{
            flex: 1,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "56px 48px 56px 64px",
          }}
        >
          <OgWordmark width={260} />

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 22, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.6 }}>
              {`${servicesIntro.sign} · Kolkata`}
            </div>
            <div style={{ display: "flex", marginTop: 16, fontSize: 60, letterSpacing: "-0.035em", lineHeight: 0.98 }}>
              {service.name}
            </div>
            <div style={{ display: "flex", marginTop: 24, fontSize: 26, lineHeight: 1.25, opacity: 0.7 }}>
              {service.desc}
            </div>
          </div>
        </div>

        {/* A plain <img>: Satori draws no other kind. */}
        <div style={{ display: "flex", marginRight: 48 }}>
          {src ? (
            <img
              src={src}
              alt=""
              width={PANEL.width}
              height={PANEL.height}
              style={{ objectFit: "cover", objectPosition: cover.focus ?? "50% 50%" }}
            />
          ) : (
            <div style={{ display: "flex", width: PANEL.width, height: PANEL.height, background: OG_COLORS.ink }} />
          )}
        </div>
      </div>
    ),
    size,
  );
}
