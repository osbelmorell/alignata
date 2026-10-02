"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** SPEC §5: wordmark left, two text links right ("Tools", "Daily Digest"). No hamburger. 48px tap targets. */
export function SiteHeader() {
  const pathname = usePathname() || "/";
  const current = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`) ? ({ "aria-current": "page" } as const) : {};
  return (
    <header className="fx-header">
      <div className="fx-wrap">
        <Link href="/" className="fx-wordmark">
          Alignata
        </Link>
        <nav className="fx-nav" aria-label="Main">
          <Link href="/apps" {...current("/apps")}>
            Tools
          </Link>
          <Link href="/daily-digest" {...current("/daily-digest")}>
            Daily Digest
          </Link>
        </nav>
      </div>
    </header>
  );
}
