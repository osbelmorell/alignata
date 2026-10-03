import { type EventName, type EventProps } from "./events";
import { MIN_ORDERS_FOR_FINGERPRINT } from "./fingerprint";
import { type EmRef, initRef, removeRefFromAddressBar, sessionArea } from "./ref";

/**
 * Anonymous count events (SPEC §8). The ONLY localStorage key this tool writes is
 * `em_iid` (a random id). The only sessionStorage key is `em_ref` (the guide that sent this tab, lib/engrave-merge/ref.ts).
 * No cookies or IndexedDB.
 */
export const IID_KEY = "em_iid";
export const EVENT_URL = "/api/engrave-merge/e";

function newId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  // RFC 4122 v4 fallback from getRandomValues (older Safari)
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x: number) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** Read (or create) the install id. ?dogfood=1 → "dog-<uuid>", ?dogfood=0 → fresh normal id. */
export function initInstallId(search: string): string {
  const q = new URLSearchParams(search).get("dogfood");
  try {
    let iid = localStorage.getItem(IID_KEY);
    if (q === "1") iid = `dog-${newId()}`;
    else if (q === "0") iid = newId();
    else if (!iid || !/^(dog-)?[0-9a-f-]{36}$/.test(iid)) iid = newId();
    localStorage.setItem(IID_KEY, iid);
    return iid;
  } catch {
    return newId(); // storage blocked: still works, just not remembered
  }
}

/** Fingerprint only for files with ≥ 3 distinct Order IDs; otherwise small_file: true. */
export function fileRef(fingerprint: string, orderCount: number): EventProps {
  return orderCount >= MIN_ORDERS_FOR_FINGERPRINT ? { file_fingerprint: fingerprint } : { small_file: true };
}

let currentRef: EmRef | null = null;

/**
 * Read ?ref= (allow-list or "other") / this tab's stored value once on load; every later event carries it. Once saved
 * to sessionStorage, ONLY the ref param is removed from the address bar (path, hash and other params kept).
 */
export function initGuideRef(search: string): EmRef | null {
  currentRef = initRef(search, sessionArea());
  removeRefFromAddressBar();
  return currentRef;
}

/** Fire-and-forget; failures are silent and never block the tool. */
export function sendEvent(iid: string, event: EventName, props: EventProps = {}) {
  // Guard: a merge file with 0 rows is not a real download; never count it.
  if (event === "merge_downloaded" && !(Number(props.merge_row_count) > 0)) return;
  try {
    const body = JSON.stringify({ v: 1, event, iid, dogfood: iid.startsWith("dog-"), props: currentRef ? { ...props, ref: currentRef } : props });
    const blob = new Blob([body], { type: "application/json" });
    if (navigator.sendBeacon && navigator.sendBeacon(EVENT_URL, blob)) return;
    void fetch(EVENT_URL, { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } }).catch(
      () => {},
    );
  } catch {
    /* ignore */
  }
}
