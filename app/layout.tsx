import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Alignata",
    template: "%s · Alignata",
  },
  description: "Build tools for busy humans",
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
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-5 py-4">
            <Link href="/" className="text-[15px] font-semibold tracking-tight">
              Alignata
            </Link>
            <nav className="flex items-center gap-1 text-[13px]" style={{ color: "var(--cb-ink-muted)" }}>
              <Link
                href="/blog"
                className="rounded-full px-3 py-1.5 hover:bg-[var(--cb-bg)]"
              >
                Blog
              </Link>
              {/* Room for later: /cleaver, /license-gate — do not add until landings exist */}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-5 py-10">{children}</main>
        <footer
          className="mx-auto max-w-3xl px-5 pb-12 text-[12px]"
          style={{ color: "var(--cb-ink-muted)" }}
        >
          Alignata · Build tools for busy humans
        </footer>
      </body>
    </html>
  );
}
