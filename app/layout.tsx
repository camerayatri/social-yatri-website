import type { Metadata, Viewport } from "next";
import { Geist_Mono } from "next/font/google";
import localFont from "next/font/local";

// Lenis's own stylesheet. It resets the document height it takes over and
// defines the class it uses to pause scrolling; without it a stray height rule
// on <html> can leave the page unscrollable.
import "lenis/dist/lenis.css";
import "./globals.css";
import { SITE } from "@/lib/content";

/**
 * PP Neue Montreal, served locally. Only the Medium cut is licensed into this
 * repo, so the site uses one weight throughout and builds hierarchy from
 * size, tracking and opacity instead.
 */
const neueMontreal = localFont({
  src: "./fonts/PPNeueMontreal-Medium.woff2",
  weight: "500",
  style: "normal",
  display: "swap",
  variable: "--font-neue-montreal",
  fallback: ["Helvetica Neue", "Helvetica", "Arial", "sans-serif"],
});

/** Geist Mono, for every small tracked label. */
const geistMono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://socialyatri.com"),
  title: {
    default: `${SITE.name} · ${SITE.tagline}`,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
  openGraph: {
    title: `${SITE.name} · ${SITE.tagline}`,
    description: SITE.description,
    locale: "en_IN",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#f2efe9",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${neueMontreal.variable} ${geistMono.variable}`}
    >
      {/*
        `text-[length:var(--size-font)]` wires up the scaling system: the
        root font size is a function of viewport width, which is why the layout
        is written in `em` and scales rather than stepping at breakpoints.
      */}
      <body className="bg-paper text-ink font-sans text-[length:var(--size-font)] leading-[1.4] font-medium antialiased">
        {/*
          The site's chrome (loader, Lenis, cursor, grain, transition, header
          and footer) lives in components/site-shell.tsx, applied by the
          (site) route group, so the admin can share this layout without it.
        */}
        {children}
      </body>
    </html>
  );
}
