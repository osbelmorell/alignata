/**
 * First-party site events (redesign before-baseline). Shared by the browser (builds payloads) and the
 * route handler (re-validates them). Only a route path, an app slug, a card position and an article
 * count ever travel, plus two random ids: `sid` (per tab session, sessionStorage) and `vid`
 * (anonymous visitor, localStorage). No names, emails, IPs, user agents or query strings.
 */
export const SITE_EVENT_PROPS = {
  page_view: ["path"],
  apps_view: [],
  tool_open: ["slug", "position"],
  article_view: ["slug", "n"],
  home_click: ["target"],
} as const;

/**
 * Optional props: accepted when present, never required, so clients cached before they existed keep validating.
 * tool_open.source (CEO, Oct 3 2026) = where the Open was tapped: feed (homepage feed card), apps (/apps list),
 * story (an in-page Open on /apps/<slug>) or sticky (the story's sticky Open bar). Older clients send no source;
 * the record is stored without one (no guessed default).
 */
export const SITE_EVENT_OPTIONAL_PROPS: { readonly [E in keyof typeof SITE_EVENT_PROPS]?: readonly string[] } = {
  tool_open: ["source"],
};
export const TOOL_OPEN_SOURCES = ["feed", "apps", "story", "sticky"] as const;
export type ToolOpenSource = (typeof TOOL_OPEN_SOURCES)[number];

export type SiteEventName = keyof typeof SITE_EVENT_PROPS;
export type SiteEventProps = { path?: string; slug?: string; position?: number; n?: number; target?: string; source?: ToolOpenSource };

export interface SiteEventEnvelope {
  v: 1;
  event: SiteEventName;
  sid: string;
  vid: string;
  dogfood: boolean;
  props: SiteEventProps;
}

const ENVELOPE_KEYS = new Set(["v", "event", "sid", "vid", "dogfood", "props"]);
export const SITE_MAX_BODY_BYTES = 1024;
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
/** A route path only: starts with "/", no query, no fragment, ≤ 200 chars. */
export const PATH_RE = /^\/[A-Za-z0-9._~\-/]{0,199}$/;
export const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,99}$/;
/**
 * home_click targets on the homepage `/`: the two hero pills, a tool or article card, the see-all links,
 * or a nav link (short kebab name). Nothing else is accepted.
 */
export const HOME_TARGET_RE =
  /^(?:tools-pill|digest-pill|all-tools|all-articles|tool:[a-z0-9][a-z0-9-]{0,99}|article:[a-z0-9][a-z0-9-]{0,99}|nav:[a-z0-9][a-z0-9-]{0,39})$/;
export const MAX_POSITION = 500;
export const MAX_ARTICLE_N = 10000;

export type SiteValidated = { ok: true; event: SiteEventEnvelope } | { ok: false; reason: string };

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const isInt = (v: unknown, min: number, max: number) =>
  typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;

/** Strict validation: unknown keys, missing props or bad types are rejected (→ HTTP 400). */
export function validateSiteEvent(raw: unknown): SiteValidated {
  if (!isObj(raw)) return { ok: false, reason: "not_object" };
  for (const k of Object.keys(raw)) if (!ENVELOPE_KEYS.has(k)) return { ok: false, reason: `unknown_key:${k}` };
  if (raw.v !== 1) return { ok: false, reason: "bad_v" };
  if (typeof raw.event !== "string" || !Object.prototype.hasOwnProperty.call(SITE_EVENT_PROPS, raw.event)) {
    return { ok: false, reason: "bad_event" };
  }
  const event = raw.event as SiteEventName;
  if (typeof raw.sid !== "string" || !UUID_RE.test(raw.sid)) return { ok: false, reason: "bad_sid" };
  if (typeof raw.vid !== "string" || !UUID_RE.test(raw.vid)) return { ok: false, reason: "bad_vid" };
  if (typeof raw.dogfood !== "boolean") return { ok: false, reason: "bad_dogfood" };
  const props = raw.props === undefined ? {} : raw.props;
  if (!isObj(props)) return { ok: false, reason: "bad_props" };
  const required: readonly string[] = SITE_EVENT_PROPS[event];
  const optional: readonly string[] = SITE_EVENT_OPTIONAL_PROPS[event] ?? [];
  for (const k of Object.keys(props)) if (!required.includes(k) && !optional.includes(k)) return { ok: false, reason: `unknown_prop:${k}` };
  for (const k of required) if (!(k in props)) return { ok: false, reason: `missing_prop:${k}` };
  const out: SiteEventProps = {};
  if ("path" in props) {
    if (typeof props.path !== "string" || !PATH_RE.test(props.path) || props.path.includes("//")) {
      return { ok: false, reason: "bad_path" };
    }
    out.path = props.path;
  }
  if ("slug" in props) {
    if (typeof props.slug !== "string" || !SLUG_RE.test(props.slug)) return { ok: false, reason: "bad_slug" };
    out.slug = props.slug;
  }
  if ("position" in props) {
    if (!isInt(props.position, 1, MAX_POSITION)) return { ok: false, reason: "bad_position" };
    out.position = props.position as number;
  }
  if ("n" in props) {
    if (!isInt(props.n, 1, MAX_ARTICLE_N)) return { ok: false, reason: "bad_n" };
    out.n = props.n as number;
  }
  if ("target" in props) {
    if (typeof props.target !== "string" || !HOME_TARGET_RE.test(props.target)) return { ok: false, reason: "bad_target" };
    out.target = props.target;
  }
  if ("source" in props) {
    if (typeof props.source !== "string" || !(TOOL_OPEN_SOURCES as readonly string[]).includes(props.source)) {
      return { ok: false, reason: "bad_source" };
    }
    out.source = props.source as ToolOpenSource;
  }
  return { ok: true, event: { v: 1, event, sid: raw.sid, vid: raw.vid, dogfood: raw.dogfood, props: out } };
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

export const SITE_PROD_HOST = "alignata.com";
