"use client";
/**
 * On a Daily Digest article: clears its New/Updated mark (dd_read) and sends digest_open {slug, mark} once per open through
 * the site's event helper, with the existing sid/vid ids and dogfood flag. Skipped devices (automated browsers, owner
 * devices) send nothing, as for every site event. Blocked storage: no state, no event, no error. Renders nothing.
 */
import { useEffect } from "react";
import { loadState, markFor, localDay, markOpened } from "@/lib/daily-digest/new-mark";
import { SID_KEY, VID_KEY, dogfoodSession, getOrCreateId, sendSiteEvent, shouldSkip } from "@/lib/site/client";

const safe = <T,>(f: () => T): T | null => {
  try {
    return f();
  } catch {
    return null;
  }
};

export function DigestOpen({ slug, date, updated }: { slug: string; date: string; updated?: string }) {
  useEffect(() => {
    const local = safe(() => window.localStorage);
    const today = localDay();
    const st = loadState(local, today, true);
    if (!st) return;
    const mark = markFor(slug, date, updated, st, today);
    if (!markOpened(local, slug, today)) return;
    const session = safe(() => window.sessionStorage);
    if (shouldSkip({ webdriver: navigator.webdriver, local })) return;
    const dogfood = dogfoodSession(location.search, session);
    sendSiteEvent({ sid: getOrCreateId(session, SID_KEY), vid: getOrCreateId(local, VID_KEY), dogfood }, "digest_open", { slug, mark });
  }, [slug, date, updated]);
  return null;
}
