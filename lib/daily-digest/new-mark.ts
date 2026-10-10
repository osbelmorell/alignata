/**
 * Daily Digest "New" / "Updated" marks (Release A Oct 10 2026; Release B adds Updated). Pure helpers; storage is passed
 * in so they can be unit-tested. localStorage only, two keys:
 *   dd_since: local date (YYYY-MM-DD) of the first visit (written once, never moved).
 *   dd_read:  {"<slug>": "<local date opened>"}; each entry is dropped 90 local days after it was opened.
 * Effective start = the earlier of dd_since and (today − 6 days), so the last 7 local days INCLUDING today are New for
 * everyone (first visit included). One mark per card at most:
 *   New:     slug not in dd_read, post date ≥ start, post 0–29 local days old.
 *   Updated: slug in dd_read, post.updated.date > the open day, updated.date 0–29 local days old.
 *   else none. Any storage error → no state → 0 marks (and the caller sends 0 events).
 */
export const SINCE_KEY = "dd_since";
export const READ_KEY = "dd_read";
export const NEW_MAX_AGE_DAYS = 29;
export const UPDATED_MAX_AGE_DAYS = 29;
/** The last NEW_WINDOW_DAYS local days, today included, are always New-eligible. */
export const NEW_WINDOW_DAYS = 7;
export const READ_KEEP_DAYS = 90;

type KV = Pick<Storage, "getItem" | "setItem">;
export type DigestState = { since: string; read: Record<string, string>; first: boolean };
export type Mark = "new" | "updated" | "none";
/** slug → [publish date, updated date or ""]. */
export type PostDates = Record<string, [string, string]>;

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,99}$/;

/** The local calendar date of `d` in the browser's time zone, YYYY-MM-DD. */
export function localDay(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const dayNum = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / 86400000;
};

/** Whole calendar days from `a` to `b` (both YYYY-MM-DD). */
export function daysBetween(a: string, b: string): number {
  return dayNum(b) - dayNum(a);
}

/** `day` minus n days, YYYY-MM-DD. */
export function addDays(day: string, n: number): string {
  return new Date((dayNum(day) + n) * 86400000).toISOString().slice(0, 10);
}

/** Effective mark start: earlier of stored dd_since and (today − 6), so exactly 7 days incl. today are New. */
export function effectiveSince(since: string, today: string): string {
  const floor = addDays(today, -(NEW_WINDOW_DAYS - 1));
  return since < floor ? since : floor;
}

/** dd_read parsed and trimmed: valid slugs with a valid date opened less than 90 local days before `today`. */
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
 * Without `init` (render-time reads) a missing dd_since is treated as today (nothing written). Storage errors → null.
 */
export function loadState(local: KV | null, today: string, init = false): DigestState | null {
  if (!local) return null;
  try {
    let since = local.getItem(SINCE_KEY);
    let first = false;
    if (!since || !DAY_RE.test(since)) {
      since = today;
      first = true;
      if (init) local.setItem(SINCE_KEY, since);
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

/** The one mark for this card on local date `today`. */
export function markFor(slug: string, postDate: string, updated: string | undefined, st: DigestState | null, today: string): Mark {
  if (!st || !DAY_RE.test(postDate)) return "none";
  const opened = st.read[slug];
  if (opened === undefined) {
    const age = daysBetween(postDate, today);
    return postDate >= effectiveSince(st.since, today) && age >= 0 && age <= NEW_MAX_AGE_DAYS ? "new" : "none";
  }
  if (!updated || !DAY_RE.test(updated)) return "none";
  const uage = daysBetween(updated, today);
  return updated > opened && uage >= 0 && uage <= UPDATED_MAX_AGE_DAYS ? "updated" : "none";
}

/** Release A name kept: is this post New? */
export function isNewPost(slug: string, postDate: string, st: DigestState | null, today: string): boolean {
  return markFor(slug, postDate, undefined, st, today) === "new";
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

const sel = (s: string) => `.fx-scard[data-post-card ="${s}"] .fx-eyebrow::before`;

/** CSS that shows "New" / "Updated" on these cards. The ::before has empty alt text, so it is never read twice. */
export function newMarkCss(marks: Record<string, Mark>): string {
  const pick = (m: Mark) => Object.keys(marks).filter((s) => marks[s] === m && SLUG_RE.test(s)).map(sel);
  const n = pick("new");
  const u = pick("updated");
  return (n.length ? `${n.join(",")}{content:"New" / ""}` : "") + (u.length ? `${u.join(",")}{content:"Updated" / "";background:#DCD8FA;color:#3F35A8}` : "");
}

/** slug → mark (new/updated only) for `local` on local date `today`. Render-time read: never writes. */
export function cardMarks(local: KV | null, posts: PostDates, today: string): Record<string, Mark> {
  const st = loadState(local, today);
  const out: Record<string, Mark> = {};
  for (const s of Object.keys(posts)) {
    const m = markFor(s, posts[s][0], posts[s][1] || undefined, st, today);
    if (m !== "none") out[s] = m;
  }
  return out;
}

/**
 * Inline boot script (runs while the page is parsed, before the cards are painted): same rule as markFor, plain ES5.
 * It only adds a <style> to <head>, never touches React's DOM, so hydration is clean and nothing shifts. Read-only.
 * Any error (blocked storage) → nothing. Parity with markFor is unit-tested in scripts/assert-site.mjs.
 */
export function bootScript(posts: PostDates): string {
  const map = JSON.stringify(posts).replace(/</g, "\\u003c");
  return `(function(m){try{var L=window.localStorage,D=/^\\d{4}-\\d{2}-\\d{2}$/,s=L.getItem("${SINCE_KEY}"),d=new Date(),p=function(n){return(n<10?"0":"")+n},t=d.getFullYear()+"-"+p(d.getMonth()+1)+"-"+p(d.getDate()),n=function(x){x=x.split("-");return Date.UTC(+x[0],x[1]-1,+x[2])/864e5};if(!s||!D.test(s))s=t;var f=new Date((n(t)-${NEW_WINDOW_DAYS - 1})*864e5).toISOString().slice(0,10);if(f<s)s=f;var r={};try{var j=JSON.parse(L.getItem("${READ_KEY}")||"{}");if(j&&typeof j==="object"&&!Array.isArray(j))r=j}catch(e){}var N=[],U=[],S=/^[a-z0-9][a-z0-9-]{0,99}$/;for(var k in m){if(!Object.prototype.hasOwnProperty.call(m,k)||!S.test(k))continue;var P=m[k][0],u=m[k][1];if(!D.test(P))continue;var q=r[k],o=typeof q==="string"&&D.test(q)&&n(t)-n(q)>=0&&n(t)-n(q)<${READ_KEEP_DAYS},c='.fx-scard[data-post-card ="'+k+'"] .fx-eyebrow::before';if(!o){var a=n(t)-n(P);if(P>=s&&a>=0&&a<=${NEW_MAX_AGE_DAYS})N.push(c)}else if(u&&D.test(u)){var g=n(t)-n(u);if(u>q&&g>=0&&g<=${UPDATED_MAX_AGE_DAYS})U.push(c)}}if(!N.length&&!U.length)return;var e=document.getElementById("${NEW_STYLE_ID}")||document.head.appendChild(document.createElement("style"));e.id="${NEW_STYLE_ID}";e.textContent=(N.length?N.join(",")+'{content:"New" / ""}':"")+(U.length?U.join(",")+'{content:"Updated" / "";background:#DCD8FA;color:#3F35A8}':"")}catch(e){}})(${map})`;
}
