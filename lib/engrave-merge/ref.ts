/**
 * Guide ref tag (CEO 9:13 AM ET Oct 3 2026; design approved 9:31 AM ET: HANDOFF-PRICE-CARD.md §2.2, the "mixed"
 * design, NOT hold/em-ref-tag 5fff0a2's behaviour). Our guides link to /engrave-merge?ref=<guide>.
 * - Always strip: on load, ANY `ref` param (allowed, disallowed, wrong case, an email, empty) is removed from the
 *   address bar with history.replaceState(history.state, "", next). Only `ref` goes: path, hash and every other param
 *   stay byte for byte; no history entry is added.
 * - Allow-list only: only guide-lightburn / guide-etsy-export (exact, case-sensitive) are stored, in sessionStorage
 *   `em_ref`. Anything else is ignored (no "other", nothing stored, nothing sent); an allowed ref already stored in
 *   this tab stays; a stored value outside the allow-list is ignored on read.
 * - Storage blocked: nothing stored and no ref sent. There is no fallback to the URL value.
 * - It rides as props.ref on merge_downloaded + the 3 price card events only (events.ts).
 * - Never read: the referrer, document.referrer or the referring host.
 * Privacy page line (FINAL, Brand Creator + Voice Gate 8:45 AM ET Oct 3), at the end of "What we count" paragraph 1,
 * after the price-card sentence (content/company.ts):
 *   "If one of our guides sent you, we also note which one, as part of those counts."
 * Vercel Analytics: lib/site/analytics.ts (the one beforeSend) strips `ref` from event.url, whatever its value.
 * Revert this one commit to remove the whole feature; the guide Opens go back to plain /engrave-merge.
 */
export const GUIDE_REFS = ["guide-lightburn", "guide-etsy-export"] as const;
export const REF_VALUES = GUIDE_REFS;
export type EmRef = (typeof GUIDE_REFS)[number];
export const REF_KEY = "em_ref";

type Session = Pick<Storage, "getItem" | "setItem">;

export const isRef = (v: unknown): v is EmRef => typeof v === "string" && (GUIDE_REFS as readonly string[]).includes(v);

/**
 * On page load (before page_open): an allowed ?ref= is kept in sessionStorage; any other value is ignored (an allowed
 * ref already stored in this tab stays). Returns what this tab now carries (storedRef). Never throws.
 */
export function initRef(search: string, session: Session | null): EmRef | null {
  try {
    const q = new URLSearchParams(search).get("ref");
    if (isRef(q)) session?.setItem(REF_KEY, q);
  } catch {
    /* blocked storage or a bad query: nothing stored */
  }
  return storedRef(session);
}

/** This tab's ref, read from sessionStorage each time: only an allow-listed value; blocked storage → null. */
export function storedRef(session: Pick<Storage, "getItem"> | null): EmRef | null {
  try {
    const v = session?.getItem(REF_KEY) ?? null;
    return isRef(v) ? v : null;
  } catch {
    return null;
  }
}

export function sessionArea(): Session | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * Remove ONLY the `ref` query param from a URL (absolute or path-relative). The path, the hash and every other param
 * stay byte-for-byte as they were (e.g. ?dogfood=1&va=off). Used for the address bar and for Vercel Analytics URLs.
 */
export function stripRefParam(url: string): string {
  const hashAt = url.indexOf("#");
  const hash = hashAt >= 0 ? url.slice(hashAt) : "";
  const noHash = hashAt >= 0 ? url.slice(0, hashAt) : url;
  const qAt = noHash.indexOf("?");
  if (qAt < 0) return url;
  const base = noHash.slice(0, qAt);
  const kept = noHash
    .slice(qAt + 1)
    .split("&")
    .filter((pair) => {
      if (!pair) return false;
      const key = pair.split("=")[0];
      let k = key;
      try {
        k = decodeURIComponent(key.replace(/\+/g, " "));
      } catch {
        /* keep raw */
      }
      return k !== "ref";
    });
  return `${base}${kept.length ? `?${kept.join("&")}` : ""}${hash}`;
}

/** Address bar: drop ANY ?ref= with history.replaceState (Next's history.state kept, no new history entry). */
export function removeRefFromAddressBar(): void {
  try {
    const { pathname, search, hash } = window.location;
    const now = `${pathname}${search}${hash}`;
    const next = stripRefParam(now);
    if (next !== now) window.history.replaceState(window.history.state, "", next);
  } catch {
    /* ignore: the URL just keeps ?ref= */
  }
}
