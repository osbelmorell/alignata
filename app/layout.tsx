import type { Metadata } from "next";
import { HubChrome } from "@/components/HubChrome";
import { SiteTracker } from "@/components/site/SiteTracker";
import { Inter, Inter_Tight } from "next/font/google";
import { SiteHeader } from "@/components/fantasy/SiteHeader";
import "./globals.css";
import "./fantasy.css";
import "./appstore.css";
import "./motion.css";
import { MOTION_ON } from "@/lib/motion";
import { RETIRED_WIPE_INLINE_SCRIPT } from "@/lib/site/retired-storage";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-inter", display: "swap" });
const interTight = Inter_Tight({ subsets: ["latin"], weight: ["600"], variable: "--font-inter-tight", display: "swap" });

/** Preview deployments (preview/* branches) stay unlisted; production is unchanged. */
const isPreview = process.env.VERCEL_ENV === "preview";

export const metadata: Metadata = {
  title: {
    default: "Alignata",
    template: "%s · Alignata",
  },
  description: "Small tools for busy people, and AI techniques in plain English.",
  metadataBase: new URL("https://alignata.com"),
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
