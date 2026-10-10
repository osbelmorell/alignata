/**
 * Daily Digest "New" mark (Release A, Oct 10 2026). Pure helpers; storage is passed in so they can be unit-tested.
 * localStorage only, two keys:
 *   dd_since: local date (YYYY-MM-DD) of the first visit. Written on the first visit; nothing is marked on that visit.
 *   dd_read:  {"<slug>": "<local date opened>"}; each entry is dropped 30 local days after it was opened.
 * A card shows New when: post date > dd_since, the post is 0–29 local days old (30 days old is never New), and the
 * slug isn't in dd_read. Any storage error → no state → 0 marks (and the caller sends 0 events).
 */
export const SINCE_KEY = "dd_since";
export const READ_KEY = "dd_read";
export const NEW_MAX_AGE_DAYS = 29;
export const READ_KEEP_DAYS = 30;

type KV = Pick<Storage, "getItem" | "setItem">;
export type DigestState = { since: string; read: Record<string, string>; first: boolean };

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,99}$/;

/** The local calendar date of `d` in the browser's time zone, YYYY-MM-DD. */
export function localDay(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Whole calendar days from `a` to `b` (both YYYY-MM-DD). */
export function daysBetween(a: string, b: string): number {
  const n = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return Date.UTC(y, m - 1, d) / 86400000;
  };
  return n(b) - n(a);
}

/** dd_read parsed and trimmed: valid slugs with a valid date opened less than 30 local days before `today`. */
export function parseRead(raw: string | null, today: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!raw) return out;
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch {
    return out;
  }
  if (!v || typeof v !== "object" || Array.isArray(v)) return out;
  for (const [slug, day] of Object.entries(v as Record<string, unknown>)) {
    if (!SLUG_RE.test(slug) || typeof day !== "string" || !DAY_RE.test(day)) continue;
    const age = daysBetween(day, today);
    if (age >= 0 && age < READ_KEEP_DAYS) out[slug] = day;
  }
  return out;
}

/**
 * Read the state. With `init`, a first visit writes dd_since = today (and the trimmed dd_read).
 * Without `init` (render-time reads) nothing is written and a missing dd_since → null. Storage errors → null.
 */
export function loadState(local: KV | null, today: string, init = false): DigestState | null {
  if (!local) return null;
  try {
    let since = local.getItem(SINCE_KEY);
    let first = false;
    if (!since || !DAY_RE.test(since)) {
      if (!init) return null;
      since = today;
      first = true;
      local.setItem(SINCE_KEY, since);
    }
    const raw = local.getItem(READ_KEY);
    const read = parseRead(raw, today);
    if (init) {
      const s = JSON.stringify(read);
      if (raw !== null && raw !== s) local.setItem(READ_KEY, s);
    }
    return { since, read, first };
  } catch {
    return null;
  }
}

/** Is this post New for this state on local date `today`? */
export function isNewPost(slug: string, postDate: string, st: DigestState | null, today: string): boolean {
  if (!st || st.first) return false;
  if (!DAY_RE.test(postDate)) return false;
  const age = daysBetween(postDate, today);
  return postDate > st.since && age >= 0 && age <= NEW_MAX_AGE_DAYS && !(slug in st.read);
}

/** Record an open: dd_read[slug] = today (trimmed). Never throws. */
export function markOpened(local: KV | null, slug: string, today: string): boolean {
  if (!local) return false;
  try {
    const read = parseRead(local.getItem(READ_KEY), today);
    read[slug] = today;
    local.setItem(READ_KEY, JSON.stringify(read));
    return true;
  } catch {
    return false;
  }
}

/** <style id> the boot script and NewMarkSync write; it only turns on the eyebrow's ::before (styled in appstore.css). */
export const NEW_STYLE_ID = "dd-new-style";

/** CSS that shows "New" on these cards (the space in `[data-post-card ="…"]` keeps card-count greps over the HTML exact). The mark is a ::before with empty alt text, so it is never read twice. */
export function newMarkCss(slugs: string[]): string {
  const ok = slugs.filter((s) => SLUG_RE.test(s));
  return ok.length ? `${ok.map((s) => `.fx-scard[data-post-card ="${s}"] .fx-eyebrow::before`).join(",")}{content:"New" / ""}` : "";
}

/** Slugs (of `posts`: slug → date) that are New for `local` on local date `today`. Render-time read: never writes. */
export function newSlugs(local: KV | null, posts: Record<string, string>, today: string): string[] {
  const st = loadState(local, today);
  return Object.keys(posts).filter((s) => isNewPost(s, posts[s], st, today));
}

/**
 * Inline boot script (runs while the page is parsed, before the cards are painted): same rule as isNewPost, written as
 * plain ES5 so it needs no bundle. It only adds a <style> to <head>, never touches React's DOM, so hydration is clean and
 * nothing shifts. Read-only: no writes, no events. Any error (blocked storage) → nothing. Parity with isNewPost is
 * unit-tested in scripts/assert-site.mjs.
 */
export function bootScript(posts: Record<string, string>): string {
  const map = JSON.stringify(posts).replace(/</g, "\\u003c");
  return `(function(m){try{var L=window.localStorage,s=L.getItem("${SINCE_KEY}"),D=/^\\d{4}-\\d{2}-\\d{2}$/;if(!s||!D.test(s))return;var d=new Date(),p=function(n){return(n<10?"0":"")+n},t=d.getFullYear()+"-"+p(d.getMonth()+1)+"-"+p(d.getDate()),n=function(x){x=x.split("-");return Date.UTC(+x[0],x[1]-1,+x[2])/864e5},r={};try{var j=JSON.parse(L.getItem("${READ_KEY}")||"{}");if(j&&typeof j==="object"&&!Array.isArray(j))r=j}catch(e){}var o=[];for(var k in m){if(!Object.prototype.hasOwnProperty.call(m,k)||!D.test(m[k]))continue;var a=n(t)-n(m[k]),q=r[k],g=typeof q==="string"&&D.test(q)?n(t)-n(q):-1;if(m[k]>s&&a>=0&&a<=${NEW_MAX_AGE_DAYS}&&!(g>=0&&g<${READ_KEEP_DAYS}))o.push('.fx-scard[data-post-card ="'+k+'"] .fx-eyebrow::before')}if(!o.length)return;var e=document.getElementById("${NEW_STYLE_ID}")||document.head.appendChild(document.createElement("style"));e.id="${NEW_STYLE_ID}";e.textContent=o.join(",")+'{content:"New" / ""}'}catch(e){}})(${map})`;
}
