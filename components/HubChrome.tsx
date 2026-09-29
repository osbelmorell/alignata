"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Persistent tool chrome: on tool routes, always offer a path back to `/apps`
 * (All apps). Hidden on brand home, /apps, and /daily-digest so Alignata nav leads.
 * Clay Board light nav — paper bg, ink link — matches hub shell.
 */
export function HubChrome() {
  const pathname = usePathname();
  const hide =
    pathname === "/" ||
    pathname === "" ||
    pathname === "/apps" ||
    pathname.startsWith("/daily-digest");

  if (hide) {
    return null;
  }

  return (
    <nav
      aria-label="Apps"
      className="sticky top-0 z-50 border-b border-[var(--cb-line)] bg-[var(--cb-bg)]/95 backdrop-blur-sm"
    >
      <div className="mx-auto flex w-full max-w-5xl items-center gap-2 px-3 py-1.5 sm:gap-3 sm:px-6 sm:py-2.5 lg:px-8">
        <Link
          href="/apps"
          className="inline-flex items-center gap-1 rounded-[var(--cb-radius-pill)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--cb-ink)] transition hover:bg-[var(--cb-surface)] sm:gap-1.5 sm:px-2 sm:py-1 sm:text-xs"
        >
          <span aria-hidden="true">←</span>
          Apps / All tools
        </Link>
        <span className="hidden text-[10px] uppercase tracking-[0.16em] text-[var(--cb-ink-muted)] sm:inline">
          Alignata
        </span>
      </div>
    </nav>
  );
}
