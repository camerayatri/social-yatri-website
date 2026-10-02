import type { Metadata, Viewport } from "next";
import { Geist_Mono } from "next/font/google";
import localFont from "next/font/local";

// Lenis's own stylesheet. It resets the document height it takes over and
// defines the class it uses to pause scrolling; without it a stray height rule
// on <html> can leave the page unscrollable.
import "lenis/dist/lenis.css";
import "./globals.css";
import { getContent } from "@/lib/cms/get-content";
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE, SITE_URL } from "@/lib/seo";
import { siteGraph } from "@/lib/structured-data";
import JsonLd from "@/components/seo/json-ld";
import Observability from "@/components/observability";

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

/**
 * What every page inherits.
 *
 * Each page sets its own title, description and canonical; this is the frame
 * around them. Two things are left out on purpose.
 *
 * No canonical. Metadata merges shallowly down the tree, so a canonical set
 * here would be printed on any page that forgot its own, and every such page
 * would tell Google it is a copy of the home page.
 *
 * No Open Graph title or description. Next fills both from the page's own
 * title and description when the Open Graph block leaves them out, so a link
 * to /services unfurls as the services page. Setting them here would stamp
 * the home page's words onto every shared link instead. The same goes for
 * the Twitter card, which takes its title, description and image from Open
 * Graph. The image itself comes from `opengraph-image.tsx` beside this file.
 *
 * Generated rather than exported as a constant because the studio's name is
 * content, which the admin can edit.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { site } = await getContent();
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: DEFAULT_TITLE,
      template: `%s · ${site.name}`,
    },
    description: DEFAULT_DESCRIPTION,
    applicationName: site.name,
    authors: [{ name: site.name, url: SITE_URL }],
    creator: site.name,
    publisher: site.name,
    /*
     * Search engines have long ignored this tag, so it is a statement of what
     * the site is about rather than a ranking lever: the phrases people in the
     * city search with, for the services the studio sells.
     */
    keywords: [
      "social media marketing agency in Kolkata",
      "social media agency Kolkata",
      "content creation agency Kolkata",
      "digital marketing agency Kolkata",
      "Instagram reels agency Kolkata",
      "UGC video production Kolkata",
      "branding agency Kolkata",
      "personal branding Kolkata",
      "ad films and product shoots Kolkata",
      "website development Kolkata",
      "performance marketing agency Kolkata",
      "Social Yatri",
    ],
    /*
     * iOS Safari turns anything that looks like a phone number into a link of
     * its own styling. The number on this site is already a link, styled like
     * the rest; the automatic one would only restyle it.
     */
    formatDetection: { telephone: false },
    openGraph: {
      type: "website",
      locale: "en_IN",
      siteName: site.name,
    },
    twitter: { card: "summary_large_image" },
    /*
     * The Search Console token, from the environment so it can be set on the
     * host without a commit. Unset, Next prints no tag at all rather than an
     * empty one.
     */
    verification: { google: process.env.GOOGLE_SITE_VERIFICATION },
  };
}

export const viewport: Viewport = {
  themeColor: "#f2efe9",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { site } = await getContent();
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
        {/* Who the studio is and where, once for the whole site. */}
        <JsonLd data={siteGraph(site)} />
        {/*
          The site's chrome (loader, Lenis, cursor, grain, transition, header
          and footer) lives in components/site-shell.tsx, applied by the
          (site) route group, so the admin can share this layout without it.
        */}
        {children}
        {/* Page views and real-visit vitals, public pages only (it stands down in the admin). */}
        <Observability />
      </body>
    </html>
  );
}
