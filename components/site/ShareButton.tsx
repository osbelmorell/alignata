"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { SID_KEY, VID_KEY, dogfoodSession, getOrCreateId, sendSiteEvent, shouldSkip } from "@/lib/site/client";
import type { ShareMethod } from "@/lib/site/events";
import { shareUrl } from "@/lib/share/url";


/**
 * share_click {slug, method} through the site's own first-party log (/api/site/e, allow-listed server-side; no URL,
 * query, title or referrer), with the usual sid/vid ids, dogfood flag and skip rule. Never Vercel Analytics.
 * Blocked storage or a failed beacon never affects sharing.
 */
function trackShare(slug: string, method: ShareMethod) {
  try {
    const local = window.localStorage;
    const session = window.sessionStorage;
    if (shouldSkip({ webdriver: navigator.webdriver, local })) return;
    sendSiteEvent({ sid: getOrCreateId(session, SID_KEY), vid: getOrCreateId(local, VID_KEY), dogfood: dogfoodSession(location.search, session) }, "share_click", { slug, method });
  } catch {
    /* storage blocked: no event */
  }
}

/** The page's ONE aria-live region (rendered by the top Share in the back-link row), shared by every Share on it. */
export const SHARE_LIVE_ID = "fx-share-live";
function announce(msg: string) {
  const el = document.getElementById(SHARE_LIVE_ID);
  if (el) el.textContent = msg;
}

/** Legacy copy (execCommand) for browsers or in-app WebViews where the async Clipboard API is missing or refused. */
function legacyCopy(text: string): boolean {
  try {
    const i = document.createElement("textarea");
    i.value = text;
    i.setAttribute("readonly", "");
    i.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0";
    document.body.appendChild(i);
    i.select();
    i.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    i.remove();
    return ok;
  } catch {
    return false;
  }
}

const noop = () => () => {};

const ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d="M12 3v12" />
    <path d="M7 8l5-5 5 5" />
    <path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
  </svg>
);

/**
 * Share (SPEC share-spec/SPEC.md + CEO calls Oct 11 2026). Server HTML = a plain link to the share URL (works without
 * JS: long-press / right-click "Copy link"); after hydration the same-size <button>:
 * - phones (coarse pointer) with navigator.share → the share sheet, called straight from the tap (no await first);
 *   AbortError (user cancelled) = nothing; any other error → copy.
 * - desktop / unsupported → clipboard.writeText → execCommand → the selected-URL panel.
 * Shared URL = canonical + ?utm_source=share. share_click {slug, method}. Focus returns to the button.
 */
export function ShareButton({ path, slug, label, title, live = false }: { path: string; slug: string; label: string; title: string; /** Render the page's one live region (top control only). */ live?: boolean }) {
  const url = shareUrl(path);
  // false in the server HTML (plain link), true once hydrated (the button); no setState-in-effect.
  const js = useSyncExternalStore(noop, () => true, () => false);
  const [toast, setToast] = useState(false);
  const [fail, setFail] = useState(false);
  const [busy, setBusy] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);
  const close = () => {
    setFail(false);
    btn.current?.focus();
  };
  useEffect(() => {
    if (!fail) return;
    const i = input.current;
    if (i) {
      i.focus();
      i.select();
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [fail]);

  const copied = () => {
    trackShare(slug, "copy");
    setToast(true);
    announce("Link copied");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setToast(false);
      announce("");
    }, 2500);
    btn.current?.focus();
  };
  const failed = () => {
    trackShare(slug, "fail");
    announce("Couldn't copy the link. It's selected below so you can copy it.");
    setFail(true);
  };
  const copy = () => {
    const done = () => setBusy(false);
    try {
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(url).then(copied, () => (legacyCopy(url) ? copied() : failed())).finally(done);
        return;
      }
    } catch {
      /* fall through */
    }
    if (legacyCopy(url)) copied();
    else failed();
    done();
  };

  const onClick = () => {
    if (busy) return;
    setBusy(true);
    const coarse = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
    const data = { title, url };
    const canNative = coarse && typeof navigator.share === "function" && (typeof navigator.canShare !== "function" || navigator.canShare(data));
    if (!canNative) return copy();
    // Straight from the tap: nothing awaited before share() (iOS drops the user gesture after an await).
    navigator.share(data).then(
      () => {
        trackShare(slug, "native");
        setBusy(false);
        btn.current?.focus();
      },
      (e: unknown) => {
        if (e instanceof DOMException && e.name === "AbortError") {
          setBusy(false);
          btn.current?.focus();
          return;
        }
        copy();
      },
    );
  };

  return (
    <>
      {js ? (
        <button ref={btn} type="button" className="fx-share" aria-label={label} aria-busy={busy || undefined} onClick={onClick} data-share={slug}>
          {ICON}
          <span>Share</span>
        </button>
      ) : (
        <a className="fx-share" href={url} aria-label={`${label} (link)`} data-share={slug}>
          {ICON}
          <span>Share</span>
        </a>
      )}
      {live ? <span id={SHARE_LIVE_ID} className="fx-share-live" role="status" aria-live="polite" aria-atomic="true" /> : null}
      {toast ? (
        <div className="fx-toast" aria-hidden="true">
          <i>✓</i>Link copied
        </div>
      ) : null}
      {fail ? (
        <div className="fx-sharefail" role="dialog" aria-modal="false" aria-labelledby={`fx-sharefail-${slug}`}>
          <p id={`fx-sharefail-${slug}`}>Couldn&apos;t copy the link. Copy it here:</p>
          <input ref={input} readOnly value={url} aria-label="Link to this page" onFocus={(e) => e.currentTarget.select()} />
          <div className="fx-sharefail-row">
            <span>Long-press, or press Ctrl+C / ⌘C</span>
            <button type="button" onClick={close}>
              Close
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

/** End-of-article Share strip (articles only): same control and tracking, just before "Next article". */
export function ShareEnd(props: { path: string; slug: string; label: string; title: string }) {
  return (
    <div className="fx-share-end">
      <p>Found this useful? Send it to someone.</p>
      <ShareButton {...props} />
    </div>
  );
}
