import { EXCLUDED_IIDS } from "@/lib/engrave-merge/fixtures";
import { HOME_TARGET_RE, type SiteEventName, type SiteEventProps, TOOL_OPEN_SOURCES, type ToolOpenSource, UUID_RE } from "./events";

/** Browser side of the site tracker. Pure helpers take their storage/env so they can be unit-tested. */
export const SITE_EVENT_URL = "/api/site/e";
export const SID_KEY = "site_sid"; // sessionStorage: one tab session
export const VID_KEY = "site_vid"; // localStorage: anonymous visitor, persists across visits
export const DOGFOOD_KEY = "site_dogfood"; // sessionStorage: "1" after ?dogfood=1 in this session
export const ARTICLES_KEY = "site_articles"; // sessionStorage: distinct Daily Digest slugs seen this session
export const EM_IID_KEY = "em_iid"; // Engrave Merge install id (read only, to skip owner devices)
const MAX_ARTICLES = 200;

export type KV = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function randomId(c: { randomUUID?: () => string; getRandomValues?: Crypto["getRandomValues"] } = globalThis.crypto): string {
  if (c?.randomUUID) return c.randomUUID();
  const b = new Uint8Array(16);
  if (c?.getRandomValues) c.getRandomValues(b);
  else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** Read the id at `key`, or create and save a new one. Storage errors → a fresh id (not saved). */
export function getOrCreateId(store: KV | null, key: string, make: () => string = randomId): string {
  try {
    const cur = store?.getItem(key);
    if (cur && UUID_RE.test(cur)) return cur;
    const id = make();
    store?.setItem(key, id);
    return id;
  } catch {
    return make();
  }
}

/** ?dogfood=1 marks this session dogfood (kept in sessionStorage); ?dogfood=0 clears it. */
export function dogfoodSession(search: string, session: KV | null): boolean {
  const q = new URLSearchParams(search).get("dogfood");
  try {
    if (q === "1") session?.setItem(DOGFOOD_KEY, "1");
    else if (q === "0") session?.removeItem(DOGFOOD_KEY);
    return q === "1" || session?.getItem(DOGFOOD_KEY) === "1";
  } catch {
    return q === "1";
  }
}

/**
 * In a dogfood session, a same-origin tool link gets ?dogfood=1 so the tool's own tracker (e.g. Engrave Merge's
 * dog- install id) marks our test runs too. Returns the new href, or null to leave the link alone
 * (external link, bad URL, or the param already there). Keeps the path, other params and the #hash.
 */
export function dogfoodHref(href: string, origin: string): string | null {
  try {
    const u = new URL(href, origin);
    if (u.origin !== origin || u.searchParams.get("dogfood") === "1") return null;
    u.searchParams.set("dogfood", "1");
    return u.pathname + u.search + u.hash;
  } catch {
    return null;
  }
}

/**
 * Links that get ?dogfood=1 in a dogfood session (same mechanism as the tool links since 75a11f3: the href attribute is
 * rewritten on arrival and again on tap, via dogfoodHref). Tool links (Open pills and the Deploy Decision row:
 * a[data-tool-slug]) plus the stretched card/row links (a.fx-stretch: feed and Daily Digest cards, /apps row bodies →
 * the stories). Rewriting an href never adds tracking: tool_open still keys off data-tool-slug only.
 */
export const DOGFOOD_LINKS = "a[data-tool-slug], a.fx-stretch";

/** Never send from automated browsers (navigator.webdriver) or the owner's own device (EXCLUDED_IIDS). */
export function shouldSkip(env: { webdriver?: boolean; local: KV | null }, excluded: readonly string[] = EXCLUDED_IIDS): boolean {
  if (env.webdriver) return true;
  try {
    const iid = env.local?.getItem(EM_IID_KEY);
    return !!iid && excluded.includes(iid);
  } catch {
    return false;
  }
}

/** Daily Digest article slug for a path, or null. Only /daily-digest/<slug> (one segment). */
export function articleSlug(path: string): string | null {
  const m = /^\/daily-digest\/([a-z0-9][a-z0-9-]{0,99})\/?$/.exec(path);
  return m ? m[1] : null;
}

/**
 * Record an article view and return n = distinct articles viewed this session (including this one).
 * Re-viewing an article does not raise n. Storage errors → 1.
 */
export function noteArticle(session: KV | null, slug: string): number {
  try {
    const raw = session?.getItem(ARTICLES_KEY);
    let seen: string[] = [];
    try {
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) seen = parsed.filter((s): s is string => typeof s === "string");
    } catch {
      seen = [];
    }
    if (!seen.includes(slug)) {
      seen.push(slug);
      if (seen.length > MAX_ARTICLES) seen = seen.slice(-MAX_ARTICLES);
      session?.setItem(ARTICLES_KEY, JSON.stringify(seen));
    }
    return Math.max(1, seen.length);
  } catch {
    return 1;
  }
}

/** Events for a route view: page_view always, plus apps_view on /apps and article_view on an article. */
export function routeEvents(path: string, session: KV | null): { event: SiteEventName; props: SiteEventProps }[] {
  const out: { event: SiteEventName; props: SiteEventProps }[] = [{ event: "page_view", props: { path } }];
  if (path === "/apps") out.push({ event: "apps_view", props: {} });
  const slug = articleSlug(path);
  if (slug) out.push({ event: "article_view", props: { slug, n: noteArticle(session, slug) } });
  return out;
}

/**
 * home_click target for a tapped link on `/`, or null (not counted). An explicit `data-home-target`
 * wins; otherwise it is derived from the link's same-site path: /apps → nav:apps,
 * /daily-digest → nav:daily-digest, / → nav:home, /daily-digest/<slug> → article:<slug>,
 * /<slug> → tool:<slug>. External links and anything that would not validate → null.
 */
export function homeClickTarget(explicit: string | null | undefined, path: string | null | undefined): string | null {
  if (explicit) return HOME_TARGET_RE.test(explicit) ? explicit : null;
  if (!path) return null;
  const p = path.replace(/\/+$/, "") || "/";
  let t: string | null = null;
  if (p === "/") t = "nav:home";
  else if (p === "/apps") t = "nav:apps";
  else if (p === "/daily-digest") t = "nav:daily-digest";
  else {
    const art = articleSlug(p);
    if (art) t = `article:${art}`;
    else {
      const m = /^\/([a-z0-9][a-z0-9-]{0,99})$/.exec(p);
      if (m) t = `tool:${m[1]}`;
    }
  }
  return t && HOME_TARGET_RE.test(t) ? t : null;
}

/**
 * Pages where tapping a tool link (an Open pill: a[data-tool-slug]) counts as tool_open: the homepage feed (/, where
 * home_click is sent too), /apps (the list), and a tool story /apps/<slug> (its row Opens and the sticky Open bar).
 * Card and row bodies that open a story are plain links without data-tool-slug, so they are never counted as
 * tool_open. Tool routes send nothing.
 */
export function toolOpenPage(path: string): boolean {
  return path === "/" || path === "/apps" || /^\/apps\/[a-z0-9][a-z0-9-]{0,99}$/.test(path);
}

/**
 * Where an Open was tapped: the link's data-tool-src (set by OpenPill: feed | apps | story | sticky), else derived
 * from the page (/ → feed, /apps → apps, /apps/<slug> → story).
 */
export function toolOpenSource(path: string, attr: string | null): ToolOpenSource | null {
  if (attr && (TOOL_OPEN_SOURCES as readonly string[]).includes(attr)) return attr as ToolOpenSource;
  if (path === "/") return "feed";
  if (path === "/apps") return "apps";
  if (/^\/apps\/[a-z0-9][a-z0-9-]{0,99}$/.test(path)) return "story";
  return null;
}

/**
 * tool_open for a tap on `link` (the tapped a[data-tool-slug], or null) at `path`: {slug, position, source}, position =
 * the tool's /apps position from data-tool-pos everywhere, source = toolOpenSource. Not sent when the device is
 * skipped (navigator.webdriver or an EXCLUDED_IIDS owner device) or ids aren't ready; in a dogfood session it is sent
 * flagged dogfood: true like every other event, and the baseline drops it. Fire-and-forget via sendSiteEvent, so the
 * link navigates exactly as before.
 */
export function trackToolOpen(
  path: string,
  link: { getAttribute(name: string): string | null } | null,
  ids: { sid: string; vid: string; dogfood: boolean } | null,
  skip: boolean,
): boolean {
  if (skip || !ids || !link || !toolOpenPage(path)) return false;
  const slug = link.getAttribute("data-tool-slug") || "";
  const position = Number(link.getAttribute("data-tool-pos"));
  const source = toolOpenSource(path, link.getAttribute("data-tool-src"));
  sendSiteEvent(ids, "tool_open", source ? { slug, position, source } : { slug, position });
  return true;
}

/** Fire-and-forget; never blocks navigation (sendBeacon, then fetch keepalive). Failures are silent. */
export function sendSiteEvent(
  ids: { sid: string; vid: string; dogfood: boolean },
  event: SiteEventName,
  props: SiteEventProps = {},
) {
  try {
    const body = JSON.stringify({ v: 1, event, sid: ids.sid, vid: ids.vid, dogfood: ids.dogfood, props });
    const blob = new Blob([body], { type: "application/json" });
    if (navigator.sendBeacon && navigator.sendBeacon(SITE_EVENT_URL, blob)) return;
    void fetch(SITE_EVENT_URL, { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } }).catch(
      () => {},
    );
  } catch {
    /* ignore */
  }
}
