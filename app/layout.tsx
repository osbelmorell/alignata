import type { Metadata } from "next";
import { HubChrome } from "@/components/HubChrome";
import { SiteTracker } from "@/components/site/SiteTracker";
import localFont from "next/font/local";
import { SiteHeader } from "@/components/fantasy/SiteHeader";
import "./globals.css";
import "./fantasy.css";
import "./appstore.css";
import "./motion.css";
import { MOTION_ON } from "@/lib/motion";
import { RETIRED_WIPE_INLINE_SCRIPT } from "@/lib/site/retired-storage";

/**
 * Self-hosted fonts (HANDOFF-COMPANY §6; Privacy "Our fonts are hosted on our own site."): the woff2 files live in
 * app/fonts (Inter + Inter Tight, SIL OFL 1.1, app/fonts/OFL.txt) and are served from our own /_next/static/media.
 * No request to fonts.googleapis.com / fonts.gstatic.com at build or run time, no preconnect. Same families, weights
 * and latin subset as the previous Google-loader setup (byte-identical files to the ones it preloaded).
 */
const inter = localFont({
  src: [{ path: "./fonts/Inter-latin-wght.woff2", weight: "400 600", style: "normal" }],
  variable: "--font-inter",
  display: "swap",
  fallback: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "Arial", "sans-serif"],
});
const interTight = localFont({
  src: [{ path: "./fonts/InterTight-latin-600.woff2", weight: "600", style: "normal" }],
  variable: "--font-inter-tight",
  display: "swap",
  fallback: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "Arial", "sans-serif"],
});

/** Preview deployments (preview/* branches) stay unlisted; production is unchanged. */
const isPreview = process.env.VERCEL_ENV === "preview";

export const metadata: Metadata = {
  title: {
    default: "Alignata",
    template: "%s · Alignata",
  },
  description: "Small tools for busy people, and AI techniques in plain English.",
  metadataBase: new URL("https://alignata.com"),
  // Google Search Console ownership check (CEO, Oct 3 2026).
  verification: { google: "hpF74ucSQwpql4ug5WHk_go4bnnz4rfUMzfdPM7xcRs" },
  ...(isPreview ? { robots: { index: false, follow: false } } : {}),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${interTight.variable}`} data-motion={MOTION_ON ? "on" : "off"}>
      <head>
        {/* Retired Env Diff: wipe its saved data before anything renders (acts on /env-diff only). */}
        <script dangerouslySetInnerHTML={{ __html: RETIRED_WIPE_INLINE_SCRIPT }} />
      </head>
      <body className="min-h-screen antialiased">
        <SiteHeader />
        <HubChrome />
        {children}
        <SiteTracker />
      </body>
    </html>
  );
}
