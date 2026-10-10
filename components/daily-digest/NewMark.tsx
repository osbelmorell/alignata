"use client";
/**
 * Daily Digest "New" mark (Release A). Client-only. The visual mark is the eyebrow's ::before (appstore.css), switched on
 * per card by one <style id="dd-new-style">: first written by NewMarkBoot's inline script before the cards paint (so the
 * eyebrow text never moves: 0 layout shift, and React's DOM is untouched: no hydration warning), then kept current here
 * on client navigations and on pageshow (WebKit back cache), focus, visibilitychange and storage (other tabs).
 * The spoken part is NewMarkSr inside the title link, so the card's accessible name is "New, <title>".
 */
import { useLayoutEffect, useSyncExternalStore } from "react";
import { NEW_STYLE_ID, cardMarks, loadState, localDay, newMarkCss, type PostDates } from "@/lib/daily-digest/new-mark";

function local(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const EVENTS = ["pageshow", "focus", "storage"] as const;
function listen(cb: () => void) {
  EVENTS.forEach((e) => window.addEventListener(e, cb));
  document.addEventListener("visibilitychange", cb);
  return () => {
    EVENTS.forEach((e) => window.removeEventListener(e, cb));
    document.removeEventListener("visibilitychange", cb);
  };
}

/** One per page: writes dd_since on a first visit and keeps the <style> in step with storage. Renders nothing. */
export function NewMarkSync({ posts }: { posts: PostDates }) {
  useLayoutEffect(() => {
    const sync = () => {
      const css = newMarkCss(cardMarks(local(), posts, localDay()));
      const cur = document.getElementById(NEW_STYLE_ID);
      if (!css) return void cur?.remove();
      const el = cur ?? document.head.appendChild(document.createElement("style"));
      el.id = NEW_STYLE_ID;
      if (el.textContent !== css) el.textContent = css;
    };
    loadState(local(), localDay(), true); // first visit: dd_since = today
    sync();
    const off = listen(sync);
    return () => {
      off();
      document.getElementById(NEW_STYLE_ID)?.remove();
    };
  }, [posts]);
  return null;
}

function subscribe(cb: () => void) {
  return listen(cb);
}

/** Screen-reader text inside the title link ("New, " / "Updated, "), visually hidden; same rule as the visual mark. */
export function NewMarkSr({ slug, date, updated }: { slug: string; date: string; updated?: string }) {
  const m = useSyncExternalStore(
    subscribe,
    () => cardMarks(local(), { [slug]: [date, updated ?? ""] }, localDay())[slug] ?? "none",
    () => "none",
  );
  return m === "new" ? <span className="fx-sr">New, </span> : m === "updated" ? <span className="fx-sr">Updated, </span> : null;
}
