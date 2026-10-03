"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";
import { vaBeforeSend } from "@/lib/site/analytics";
import { DOGFOOD_LINKS, SID_KEY, VID_KEY, dogfoodHref, dogfoodSession, getOrCreateId, homeClickTarget, routeEvents, sendSiteEvent, shouldSkip, trackToolOpen } from "@/lib/site/client";

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

/** Vercel Analytics: dropped when excluded; otherwise reported without the guide `ref` param (lib/site/analytics.ts). */
const beforeSend = (event: BeforeSendEvent) => vaBeforeSend(event, excluded());

/** Dogfood session: add ?dogfood=1 to a tool link (data-tool-slug) or card/row link (fx-stretch), so the run counts as a test. */
function markToolLink(a: Element | null) {
  if (!a) return;
  const next = dogfoodHref(a.getAttribute("href") || "", location.origin);
  if (next) a.setAttribute("href", next);
}

/**
 * Before-baseline tracking for the redesign (renders nothing visible):
 * Vercel Web Analytics pageviews, plus first-party site events to /api/site/e —
 * page_view on every route, apps_view on /apps, tool_open {slug, position, source} when an Open is tapped on the feed, /apps,
 * a tool story or its sticky bar,
 * article_view {slug, n} on a Daily Digest article, home_click {target} when a link on `/` is tapped. Ids: sid (sessionStorage), vid (localStorage).
 * In a dogfood session, tool links and card/row links (DOGFOOD_LINKS) get ?dogfood=1 so our test runs stay marked.
 */
export function SiteTracker() {
  const pathname = usePathname();
  const ids = useRef<{ sid: string; vid: string; dogfood: boolean } | null>(null);
  const skip = useRef(false);
  const dogfoodRef = useRef(false);

  useEffect(() => {
    const local = safe(() => window.localStorage);
    const session = safe(() => window.sessionStorage);
    const dogfood = dogfoodSession(location.search, session);
    dogfoodRef.current = dogfood;
    if (dogfood) document.querySelectorAll(DOGFOOD_LINKS).forEach(markToolLink);
    skip.current = shouldSkip({ webdriver: navigator.webdriver, local });
    if (skip.current) return;
    ids.current ??= { sid: getOrCreateId(session, SID_KEY), vid: getOrCreateId(local, VID_KEY), dogfood };
    ids.current.dogfood = dogfood;
    for (const e of routeEvents(pathname, session)) sendSiteEvent(ids.current, e.event, e.props);
  }, [pathname]);

  useEffect(() => {
    // Capture phase, no preventDefault: the tap navigates exactly as before.
    const onClick = (e: MouseEvent) => {
      // Dogfood: make sure the tool or card link carries ?dogfood=1 before the browser follows it (covers links rendered late).
      if (dogfoodRef.current) markToolLink((e.target as Element | null)?.closest?.(DOGFOOD_LINKS) ?? null);
      if (skip.current || !ids.current) return;
      if (location.pathname === "/") {
        const link = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
        if (!link) return;
        let path: string | null = null;
        try {
          const u = new URL(link.href, location.href);
          if (u.origin === location.origin) path = u.pathname;
        } catch {
          path = null;
        }
        const target = homeClickTarget(link.getAttribute("data-home-target"), path);
        if (target) sendSiteEvent(ids.current, "home_click", { target });
        // A feed Open also counts as tool_open (source: feed); card bodies carry no data-tool-slug.
        trackToolOpen(location.pathname, (e.target as Element | null)?.closest?.("a[data-tool-slug]") ?? null, ids.current, skip.current);
        return;
      }
      // tool_open: Opens on /apps (source apps) and on a tool story /apps/<slug> (story, or sticky for the bar). Row-body story links carry no data-tool-slug.
      trackToolOpen(location.pathname, (e.target as Element | null)?.closest?.("a[data-tool-slug]") ?? null, ids.current, skip.current);
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
