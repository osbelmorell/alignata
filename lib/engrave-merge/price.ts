/**
 * Engrave Merge "I'd pay" price card: Phase 1 interest test (HANDOFF-PRICE-CARD.md §1 + UX-PRICE-CARD.md +
 * COPY-PRICE-CARD.md FINAL, Oct 3 2026; room calls settled 9:31 AM ET, dogfood flag 9:43 AM ET).
 * Nothing is sold: there is no checkout, no payment field, no email ask, and nothing that looks like a receipt.
 *
 * Storage: ONE localStorage key, `em_price` =
 *   {"v":1, "files":0-4, "fps":[<16 hex>, ...max 3], "seenDays":["YYYY-MM-DD", ...max 3], "answer":null|"pay"|"no"}
 * - files: real files counted, capped at 4 (only "has the 4th real file been made?" matters).
 * - fps: the first 16 hex of the existing file_fingerprint, only for counted files with >= 3 orders and only until
 *   files reaches 4 (then emptied). Used to spot a re-upload of a file already counted. Never sent.
 * - seenDays: device-local days the card was seen. answer: set by a tap, final.
 * Bad or unknown JSON reads as empty and nothing throws. Storage blocked → the card never shows.
 *
 * Counting: once per NEW upload, at the moment its merge file is made (never per re-download or settings change).
 * Files with >= 3 orders are de-duplicated by fp prefix; smaller files count once per upload. Never counted: the
 * sample (source "sample") or any bundled fixture fingerprint (isFixtureFingerprint), an excluded device
 * (EXCLUDED_IIDS), and nothing at all in a dogfood run.
 * Dogfood run = a `dog-` install id OR sessionStorage site_dogfood === "1" (the same rule as every event's dogfood
 * flag, track.ts). In a dogfood run the card never shows, no card event fires (even with 4 real files already
 * stored), nothing counts and em_price isn't touched.
 * Show (after any merge download, once the done scroll has settled, outside dogfood): files >= 4, no answer, seen on
 * fewer than 3 days, and not already seen today. So: up to 3 device-local days, once a day across tabs and reloads,
 * never again after either answer.
 * Seen: at least 50% of the card on screen (IntersectionObserver 0.5), or a tap if that comes first, so views >=
 * answers. Then today joins seenDays and price_card_view is sent once.
 * Cross-tab rules (HANDOFF-PRICE-CARD §1.3; QA FAIL 10:02 AM ET, room fixes 10:02 / 10:04 / 10:06 AM ET). Bars:
 * price_card_view max 1 per install ID per device-local day; an answer (price_intent OR price_dismiss) max 1 per
 * install ID, ever.
 * - View block (viewBlock): right before sending, re-read em_price. Today already in seenDays → send nothing.
 *   Otherwise write today into seenDays FIRST (write verified), then send.
 * - Answer block (answerBlock): right before sending, re-read em_price.answer. Already set (another tab) → send
 *   nothing and show the stored answer's state ("pay" → thanks line, "no" → the card closes). Otherwise write the
 *   answer first (verified), then send.
 * - Each block is one synchronous read → check → write → send (no await) and runs inside
 *   navigator.locks.request("em_price", …) when Web Locks exist (withPriceLock); otherwise directly. A rejected lock
 *   request falls back once and never runs the block twice.
 * - Storage blocked: no card; if it becomes blocked while a card is open, the view and the tap send nothing, nothing
 *   throws, and the UI still shows thanks / closes.
 * - Other tabs: a `storage` listener on em_price swaps an open card to thanks ("pay") or closes it ("no") when an
 *   answer lands from another tab. It never sends an event.
 * Events (lib/engrave-merge/events.ts): price_card_view, price_intent ("I'd pay $29"), price_dismiss ("No thanks").
 * KPI: price_intent / price_card_view over devices that reached the 4th real file, dogfood excluded.
 */
import { MIN_ORDERS_FOR_FINGERPRINT } from "./fingerprint";
import { isExcludedIid, isFixtureFingerprint } from "./fixtures";

export const PRICE_KEY = "em_price";
export const SHOW_FROM_FILE = 4;
export const MAX_SEEN_DAYS = 3;
export const FP_PREFIX_LEN = 16;
export const SITE_DOGFOOD_KEY = "site_dogfood"; // = lib/site/client.ts DOGFOOD_KEY (sessionStorage "1" in a dogfood session)

export type PriceAnswer = "pay" | "no";
export interface PriceState {
  v: 1;
  files: number;
  fps: string[];
  seenDays: string[];
  answer: PriceAnswer | null;
}
type KV = Pick<Storage, "getItem" | "setItem">;

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const FP_RE = /^[0-9a-f]{16}$/;
export const freshPrice = (): PriceState => ({ v: 1, files: 0, fps: [], seenDays: [], answer: null });

/** Read em_price; anything missing, tampered or unreadable → a fresh state. Never throws. */
export function readPrice(store: KV | null): PriceState {
  try {
    const s = JSON.parse(store?.getItem(PRICE_KEY) || "null");
    if (!s || typeof s !== "object" || s.v !== 1) return freshPrice();
    const files = Number.isInteger(s.files) ? Math.min(SHOW_FROM_FILE, Math.max(0, s.files)) : 0;
    const fps =
      files >= SHOW_FROM_FILE || !Array.isArray(s.fps)
        ? []
        : [...new Set((s.fps as unknown[]).filter((x): x is string => typeof x === "string" && FP_RE.test(x)))].slice(0, SHOW_FROM_FILE - 1);
    const seenDays = Array.isArray(s.seenDays)
      ? [...new Set((s.seenDays as unknown[]).filter((d): d is string => typeof d === "string" && DAY_RE.test(d)))].slice(-MAX_SEEN_DAYS)
      : [];
    const answer = s.answer === "pay" || s.answer === "no" ? s.answer : null;
    return { v: 1, files, fps, seenDays, answer };
  } catch {
    return freshPrice();
  }
}

/** Write exactly the five allowed fields and read it back. Returns false when storage is blocked (then nothing is sent). */
export function writePrice(store: KV | null, s: PriceState): boolean {
  if (!store) return false;
  try {
    const json = JSON.stringify({ v: 1, files: s.files, fps: s.fps, seenDays: s.seenDays, answer: s.answer });
    store.setItem(PRICE_KEY, json);
    return store.getItem(PRICE_KEY) === json; // verified: only a write that really landed lets an event go out
  } catch {
    return false;
  }
}

/** Device-local calendar day (the user's own clock and time zone). */
export function localDay(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Dogfood run: a dog- install id or a ?dogfood=1 site session (sessionStorage site_dogfood === "1"). Never throws. */
export function isDogfoodRun(iid: string, session: Pick<Storage, "getItem"> | null): boolean {
  if (iid.startsWith("dog-")) return true;
  try {
    return session?.getItem(SITE_DOGFOOD_KEY) === "1";
  } catch {
    return false;
  }
}

/** The upload a merge file was made from. uploadId is unique per successful load in this page. */
export interface MadeFrom {
  uploadId: number;
  source: "upload" | "sample";
  fingerprint: string | null;
  orderCount: number;
}

/** A real file: not the sample, not a bundled fixture fingerprint, not an excluded device. */
export function isRealFile(f: Pick<MadeFrom, "source" | "fingerprint">, iid: string, excludedIids?: readonly string[]): boolean {
  if (f.source === "sample" || isFixtureFingerprint(f.fingerprint)) return false;
  return !isExcludedIid(iid, excludedIids);
}

/**
 * Count the upload a merge file was just made from (call outside dogfood only). `counted` holds the uploadIds already
 * counted in this page, so re-downloads and settings changes never count. Returns the state after counting.
 */
export function countMade(store: KV | null, f: MadeFrom, iid: string, counted: Set<number>, excludedIids?: readonly string[]): PriceState {
  const s = readPrice(store);
  if (counted.has(f.uploadId)) return s;
  counted.add(f.uploadId);
  if (!isRealFile(f, iid, excludedIids) || s.files >= SHOW_FROM_FILE) return s;
  if (f.orderCount >= MIN_ORDERS_FOR_FINGERPRINT && f.fingerprint) {
    const short = f.fingerprint.slice(0, FP_PREFIX_LEN);
    if (s.fps.includes(short)) return s; // the same real file uploaded again
    s.fps = [...s.fps, short];
  }
  s.files += 1;
  if (s.files >= SHOW_FROM_FILE) s.fps = []; // not needed once the 4th real file is made
  writePrice(store, s);
  return s;
}

/** After a merge file is made (and counted): show the card? Storage must be writable, or it never shows. */
export function shouldShowCard(store: KV | null, today: string): boolean {
  const s = readPrice(store);
  if (s.files < SHOW_FROM_FILE || s.answer !== null || s.seenDays.length >= MAX_SEEN_DAYS || s.seenDays.includes(today)) return false;
  return writePrice(store, s); // blocked storage → never show
}

/**
 * The view block (HANDOFF §1.3). Call inside withPriceLock. Fresh read of em_price right before sending: today already
 * in seenDays (another tab, a reload) → nothing is sent. Otherwise today is written into seenDays FIRST and only a
 * verified write lets price_card_view go out. Synchronous: no await between read, check, write and send.
 * Returns whether the view was sent.
 */
export function viewBlock(store: KV | null, today: string, send: () => void): boolean {
  const s = readPrice(store);
  if (s.seenDays.includes(today)) return false;
  if (!writePrice(store, { ...s, seenDays: [...s.seenDays, today].slice(-MAX_SEEN_DAYS) })) return false; // write first (blocked: no event)
  send(); // ...then send
  return true;
}

/**
 * The answer block (HANDOFF §1.3). Call inside withPriceLock. Fresh read of em_price.answer right before sending:
 * already set (e.g. answered in another tab) → nothing is sent and the stored answer's state is shown. Otherwise the
 * answer is written first and only a verified write lets price_intent / price_dismiss go out; the tapped answer's
 * state is shown either way (blocked storage: thanks / close, no event). Synchronous, never throws.
 */
export function answerBlock(store: KV | null, a: PriceAnswer, send: (a: PriceAnswer) => void): { sent: boolean; show: PriceAnswer } {
  const s = readPrice(store);
  if (s.answer) return { sent: false, show: s.answer };
  if (!writePrice(store, { ...s, answer: a })) return { sent: false, show: a };
  send(a);
  return { sent: true, show: a };
}

type LockManagerLike = { request: (name: string, cb: () => unknown) => Promise<unknown> };

/**
 * Run a synchronous price block inside navigator.locks.request("em_price", …) when Web Locks exist (Safari 15.4+,
 * Chrome 69+), so two tabs firing at the same moment are serialised. Without Web Locks it runs directly (the block's
 * synchronous re-read is the fallback). A rejected or throwing lock request falls back once; the block never runs twice.
 */
export function withPriceLock(fn: () => void, locks: LockManagerLike | null | undefined = defaultLocks()): void {
  let ran = false;
  const run = () => {
    if (ran) return;
    ran = true;
    fn();
  };
  try {
    if (locks && typeof locks.request === "function") {
      locks.request(PRICE_KEY, () => run()).catch(run);
      return;
    }
  } catch {
    /* lock request threw: fall through */
  }
  run();
}

function defaultLocks(): LockManagerLike | null {
  try {
    return typeof navigator !== "undefined" && navigator.locks ? (navigator.locks as unknown as LockManagerLike) : null;
  } catch {
    return null;
  }
}

/** The stored answer, if any (for the cross-tab storage listener). Never throws. */
export function storedAnswer(store: KV | null): PriceAnswer | null {
  return readPrice(store).answer;
}

export function localArea(): KV | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}
export function tabSession(): Pick<Storage, "getItem"> | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

/** Resolves once the page's smooth scroll has settled (scrollend, ~6 still frames, or a 900 ms fallback). */
export function scrollSettled(): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    const fin = () => {
      if (done) return;
      done = true;
      window.removeEventListener("scrollend", fin);
      resolve();
    };
    window.addEventListener("scrollend", fin, { once: true });
    let last = -1;
    let still = 0;
    const tick = () => {
      if (done) return;
      if (window.scrollY === last) {
        if (++still > 6) return fin();
      } else {
        still = 0;
        last = window.scrollY;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    setTimeout(fin, 900);
  });
}

/** Sticky offset (HANDOFF §1.5): Make merge file's top lands at the sticky "All tools" bar's height + 16px. */
export function doneScrollTop(primaryTop: number, scrollY: number, barHeight: number): number {
  return Math.max(0, primaryTop + scrollY - (Math.ceil(barHeight) + 16));
}
