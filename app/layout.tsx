import type { Metadata } from "next";
import Link from "next/link";
import { HubChrome } from "@/components/HubChrome";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Alignata",
    template: "%s · Alignata",
  },
  description: "Build tools for busy humans",
  metadataBase: new URL("https://alignata.com"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <header
          className="border-b"
          style={{ borderColor: "var(--cb-line)", background: "var(--cb-surface)" }}
        >
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4">
            <Link href="/" className="text-[15px] font-semibold tracking-tight">
              Alignata
            </Link>
            <nav
              className="flex items-center gap-1 text-[13px]"
              style={{ color: "var(--cb-ink-muted)" }}
            >
              <Link
                href="/"
                className="rounded-full px-3 py-1.5 hover:bg-[var(--cb-bg)]"
              >
                Home
              </Link>
              <Link
                href="/apps"
                className="rounded-full px-3 py-1.5 hover:bg-[var(--cb-bg)]"
              >
                Apps
              </Link>
              <Link
                href="/daily-digest"
                className="rounded-full px-3 py-1.5 hover:bg-[var(--cb-bg)]"
              >
                Daily Digest
              </Link>
            </nav>
          </div>
        </header>
        <HubChrome />
        {children}
      </body>
    </html>
  );
}
