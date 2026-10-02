import type { Metadata } from "next";
import { HubChrome } from "@/components/HubChrome";
import { SiteTracker } from "@/components/site/SiteTracker";
import { Inter, Inter_Tight } from "next/font/google";
import { SiteHeader } from "@/components/fantasy/SiteHeader";
import { Reveal } from "@/components/fantasy/Reveal";
import "./globals.css";
import "./fantasy.css";

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
    <html lang="en" className={`${inter.variable} ${interTight.variable}`}>
      <body className="min-h-screen antialiased">
        <SiteHeader />
        <HubChrome />
        {children}
        <Reveal />
        <SiteTracker />
      </body>
    </html>
  );
}
