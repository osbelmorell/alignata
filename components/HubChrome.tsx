"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Persistent tool chrome: on tool routes, always offer a path back to `/apps`
 * (All apps). Hidden on brand home, /apps, the /apps/<slug> stories, /daily-digest and /guides/<slug> so Alignata nav
 * leads, and on retired tool routes (/env-diff), whose page already has its one link back to the tools.
 * Light nav — paper bg, ink link — on the one site container (.fx-wrap), so its left edge matches the header on every route.
 */
export function HubChrome() {
  const pathname = usePathname();
  const hide =
    pathname === "/" ||
    pathname === "" ||
    pathname === "/apps" ||
    pathname.startsWith("/apps/") ||
    pathname.startsWith("/daily-digest") ||
    pathname.startsWith("/guides/") ||
    pathname === "/env-diff";

  if (hide) {
    return null;
  }

  return (
    <nav
      aria-label="Apps"
      className="sticky top-0 z-50 border-b border-[var(--cb-line)] bg-[var(--cb-bg)]/95 backdrop-blur-sm"
    >
      <div className="fx-wrap flex items-center gap-2 py-1.5 sm:gap-3 sm:py-2.5">
        <Link
          href="/apps"
          className="inline-flex min-h-[44px] items-center gap-1 rounded-[var(--cb-radius-pill)] px-1.5 py-0.5 text-base font-medium text-[var(--cb-ink)] transition hover:bg-[var(--cb-surface)] sm:gap-1.5 sm:px-2 sm:py-1"
        >
          <span aria-hidden="true">←</span>
          All tools
        </Link>
        <span className="hidden text-sm font-medium text-[var(--cb-ink-muted)] sm:inline">
          Alignata
        </span>
      </div>
    </nav>
  );
}
