/**
 * Event allow-list (SPEC §8). Shared by the browser (builds payloads) and the
 * route handler (re-validates them). Only counts and a file fingerprint ever travel;
 * never file names, text, names, IDs, SKUs, item names, font names or settings.
 */
export const EVENT_PROPS = {
  file_processed: ["row_count", "item_count", "exception_count", "file_fingerprint", "small_file"],
  /** ref (optional on this + the 3 card events): the guide that sent this tab (lib/engrave-merge/ref.ts). */
  merge_downloaded: ["file_fingerprint", "small_file", "merge_row_count", "ref"],
  exceptions_downloaded: ["file_fingerprint", "small_file", "exception_count"],
  cutsheet_printed: ["file_fingerprint", "small_file"],
  page_open: [],
  /** "I'd pay" price card (lib/engrave-merge/price.ts): seen (≥ 50% on screen), "I'd pay $29", "No thanks". Only `ref`. */
  price_card_view: ["ref"],
  price_intent: ["ref"],
  price_dismiss: ["ref"],
} as const;

export type EventName = keyof typeof EVENT_PROPS;
/**
 * Allowed values of the optional `ref` prop (= lib/engrave-merge/ref.ts GUIDE_REFS; no "other"). Only merge_downloaded
 * and the 3 price card events carry it; anything else → bad_ref, and every other event rejects `ref`.
 */
export const REF_VALUES = ["guide-lightburn", "guide-etsy-export"] as const;
/** Events that may carry `ref` (exactly those whose EVENT_PROPS list it). */
export const carriesRef = (event: EventName): boolean => (EVENT_PROPS[event] as readonly string[]).includes("ref");
export const FILE_EVENTS: EventName[] = ["file_processed", "merge_downloaded", "exceptions_downloaded", "cutsheet_printed"];
const COUNT_KEYS = new Set(["row_count", "item_count", "exception_count", "merge_row_count"]);
const ENVELOPE_KEYS = new Set(["v", "event", "iid", "dogfood", "props"]);

export const MAX_BODY_BYTES = 1024;
export const FINGERPRINT_RE = /^[0-9a-f]{64}$/;
export const IID_RE = /^(dog-)?[0-9a-f-]{36}$/;

export type EventProps = Partial<Record<string, number | string | boolean>>;

export interface EventEnvelope {
  v: 1;
  event: EventName;
  iid: string;
  dogfood: boolean;
  props: EventProps;
}

export type Validated = { ok: true; event: EventEnvelope } | { ok: false; reason: string };

const isObj = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);

/** Strict validation: unknown keys or bad types are rejected (→ HTTP 400). */
export function validateEvent(raw: unknown): Validated {
  if (!isObj(raw)) return { ok: false, reason: "not_object" };
  for (const k of Object.keys(raw)) if (!ENVELOPE_KEYS.has(k)) return { ok: false, reason: `unknown_key:${k}` };
  if (raw.v !== 1) return { ok: false, reason: "bad_v" };
  if (typeof raw.event !== "string" || !Object.prototype.hasOwnProperty.call(EVENT_PROPS, raw.event)) {
    return { ok: false, reason: "bad_event" };
  }
  const event = raw.event as EventName;
  if (typeof raw.iid !== "string" || !IID_RE.test(raw.iid)) return { ok: false, reason: "bad_iid" };
  if (typeof raw.dogfood !== "boolean") return { ok: false, reason: "bad_dogfood" };
  const props = raw.props === undefined ? {} : raw.props;
  if (!isObj(props)) return { ok: false, reason: "bad_props" };
  const allowed = new Set<string>(EVENT_PROPS[event]);
  const out: EventProps = {};
  for (const [k, v] of Object.entries(props)) {
    if (!allowed.has(k)) return { ok: false, reason: `unknown_prop:${k}` };
    if (COUNT_KEYS.has(k)) {
      if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > 100000) {
        return { ok: false, reason: `bad_count:${k}` };
      }
    } else if (k === "file_fingerprint") {
      if (typeof v !== "string" || !FINGERPRINT_RE.test(v)) return { ok: false, reason: "bad_fingerprint" };
    } else if (k === "small_file") {
      if (v !== true) return { ok: false, reason: "bad_small_file" };
    } else if (k === "ref") {
      if (typeof v !== "string" || !(REF_VALUES as readonly string[]).includes(v)) return { ok: false, reason: "bad_ref" };
    }
    out[k] = v as number | string | boolean;
  }
  if (FILE_EVENTS.includes(event)) {
    const hasFp = "file_fingerprint" in out;
    const small = "small_file" in out;
    if (hasFp === small) return { ok: false, reason: "need_fingerprint_xor_small_file" };
  }
  return {
    ok: true,
    event: { v: 1, event, iid: raw.iid, dogfood: raw.dogfood || raw.iid.startsWith("dog-"), props: out },
  };
}

/** America/New_York calendar date (YYYY-MM-DD) for a timestamp. */
export function nyDay(ms: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ms));
}

export const PROD_HOST = "alignata.com";
