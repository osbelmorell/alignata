/**
 * Guide ref tag (CEO, Oct 3 2026). Our guides link to /engrave-merge?ref=<guide>; Engrave Merge then adds `ref` to the
 * count events it sends in that tab, so we can count which guide sent people.
 * - Only these values are ever stored or sent: guide-lightburn, guide-etsy-export, or "other" for any other ?ref=.
 * - Kept in sessionStorage (`em_ref`) only, so it lasts for this tab's visit, not on the device.
 * - Never the referrer: document.referrer and the referring host are never read.
 * Privacy page line (FINAL, Brand Creator + Voice Gate 8:45 AM ET Oct 3), for "What we count" when that page exists:
 *   "If one of our guides sent you, we also note which one, as part of those counts."
 * Revert this one commit to remove the whole feature; the guide links keep working (the tool ignores ?ref=).
 */
export const GUIDE_REFS = ["guide-lightburn", "guide-etsy-export"] as const;
export const REF_VALUES = [...GUIDE_REFS, "other"] as const;
export type EmRef = (typeof REF_VALUES)[number];
export const REF_KEY = "em_ref";

type Session = Pick<Storage, "getItem" | "setItem">;

export const isRef = (v: unknown): v is EmRef => typeof v === "string" && (REF_VALUES as readonly string[]).includes(v);

/** Any ?ref= value → an allow-listed guide, else "other". */
export function normalizeRef(raw: string): EmRef {
  return (GUIDE_REFS as readonly string[]).includes(raw) ? (raw as EmRef) : "other";
}

/**
 * On page load: ?ref= present → normalise, keep it in sessionStorage, use it. Otherwise reuse this tab's stored value
 * (only if it is still an allowed value). Storage blocked → the URL value for this page load only. Never throws.
 */
export function initRef(search: string, session: Session | null): EmRef | null {
  let fromUrl: EmRef | null = null;
  try {
    const q = new URLSearchParams(search).get("ref");
    if (q !== null) fromUrl = normalizeRef(q);
  } catch {
    /* ignore */
  }
  try {
    if (fromUrl) {
      session?.setItem(REF_KEY, fromUrl);
      return fromUrl;
    }
    const stored = session?.getItem(REF_KEY) ?? null;
    return isRef(stored) ? stored : null;
  } catch {
    return fromUrl;
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

/** Address bar: once the ref is handled, drop ?ref= with history.replaceState (Next's history.state kept). */
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
