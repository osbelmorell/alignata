"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";
import { SID_KEY, VID_KEY, dogfoodSession, getOrCreateId, routeEvents, sendSiteEvent, shouldSkip } from "@/lib/site/client";

const safe = <T,>(f: () => T): T | null => {
  try {
    return f();
  } catch {
    return null;
  }
};

/** Same rule for Vercel Analytics and first-party events: no automated browsers, owner device or dogfood. */
function excluded(): boolean {
  if (typeof window === "undefined") return true;
  const local = safe(() => window.localStorage);
  const session = safe(() => window.sessionStorage);
  return shouldSkip({ webdriver: navigator.webdriver, local }) || dogfoodSession(location.search, session);
}

const beforeSend = (event: BeforeSendEvent) => (excluded() ? null : event);

/**
 * Before-baseline tracking for the redesign (renders nothing visible):
 * Vercel Web Analytics pageviews, plus first-party site events to /api/site/e —
 * page_view on every route, apps_view on /apps, tool_open when an /apps card or its Open is tapped,
 * article_view {slug, n} on a Daily Digest article. Ids: sid (sessionStorage), vid (localStorage).
 */
export function SiteTracker() {
  const pathname = usePathname();
  const ids = useRef<{ sid: string; vid: string; dogfood: boolean } | null>(null);
  const skip = useRef(false);

  useEffect(() => {
    const local = safe(() => window.localStorage);
    const session = safe(() => window.sessionStorage);
    const dogfood = dogfoodSession(location.search, session);
    skip.current = shouldSkip({ webdriver: navigator.webdriver, local });
    if (skip.current) return;
    ids.current ??= { sid: getOrCreateId(session, SID_KEY), vid: getOrCreateId(local, VID_KEY), dogfood };
    ids.current.dogfood = dogfood;
    for (const e of routeEvents(pathname, session)) sendSiteEvent(ids.current, e.event, e.props);
  }, [pathname]);

  useEffect(() => {
    // Capture phase, no preventDefault: the tap navigates exactly as before.
    const onClick = (e: MouseEvent) => {
      if (skip.current || !ids.current || location.pathname !== "/apps") return;
      const a = (e.target as Element | null)?.closest?.("a[data-tool-slug]");
      if (!a) return;
      const slug = a.getAttribute("data-tool-slug") || "";
      const position = Number(a.getAttribute("data-tool-pos"));
      sendSiteEvent(ids.current, "tool_open", { slug, position });
    };
    // middle-click opens a new tab without a click event
    const onAux = (e: MouseEvent) => e.button === 1 && onClick(e);
    document.addEventListener("click", onClick, true);
    document.addEventListener("auxclick", onAux, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("auxclick", onAux, true);
    };
  }, []);

  return <Analytics beforeSend={beforeSend} />;
}
