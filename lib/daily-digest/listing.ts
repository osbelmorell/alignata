import type { Post, PostTag } from "@/content/posts";

function cardTag(post: { tag?: PostTag }): PostTag {
  return post.tag ?? "Technique";
}

/** Pinned entry posts. Why-read lines are listing copy, not a content field. Shown once, under the feed. */
export const START_HERE: { slug: string; why: string }[] = [
  {
    slug: "cdm-vs-llm-vs-jev",
    why: "Three model types do different jobs. Read this before you treat every task as a chat model.",
  },
  {
    slug: "ai-harnesses-explained",
    why: "The model is half the system. This is the harness around it: tools, checks, and the loop.",
  },
  {
    slug: "the-ai-safety-paradox",
    why: "A field note on asking the model to police itself, and why that does not hold.",
  },
];

export const START_HERE_SLUGS = new Set(START_HERE.map((item) => item.slug));

/**
 * Type chips. Labels match the card tag strings. `id` is the `type` query param
 * (`/daily-digest?type=deep-dive&q=`). Absent or unknown = All. Canonical stays `/daily-digest`.
 */
export const DIGEST_TYPES = [
  { id: "all", label: "All", tag: null },
  { id: "technique", label: "Technique", tag: "Technique" },
  { id: "deep-dive", label: "Deep dive", tag: "Deep dive" },
  { id: "essay", label: "Essay", tag: "Essay" },
] as const;

export type DigestTypeId = (typeof DIGEST_TYPES)[number]["id"];

export function parseDigestType(value: string | null | undefined): DigestTypeId {
  if (value === "technique" || value === "deep-dive" || value === "essay") return value;
  return "all";
}

export function digestTypeTag(id: DigestTypeId): PostTag | null {
  return DIGEST_TYPES.find((item) => item.id === id)!.tag;
}

/** Lowercased title, card dek, full dek, tag, and cluster words. The find bar matches this string. */
export function digestSearchText(post: Pick<Post, "title" | "dek" | "cardDek" | "tag" | "cluster">): string {
  const cluster = post.cluster.replaceAll("-", " ");
  return [post.title, post.cardDek ?? "", post.dek, cardTag(post), cluster].join(" ").toLowerCase().replace(/\s+/g, " ").trim();
}

export function postMatches(item: { tag: string; search: string }, type: DigestTypeId, q: string): boolean {
  const tag = digestTypeTag(type);
  if (tag && item.tag !== tag) return false;
  const query = q.trim().toLowerCase();
  return query.length === 0 || item.search.includes(query);
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "2026-11-03" → "November 2026" (string math, no time zone). */
export function monthLabel(iso: string): string {
  const [y, m] = iso.split("-");
  return `${MONTHS[Number(m) - 1]} ${y}`;
}

export type MonthGroup<T> = { key: string; label: string; posts: T[] };

/** Posts must already be newest-first. One group per YYYY-MM, in that same order. */
export function groupByMonth<T extends { date: string }>(posts: readonly T[]): MonthGroup<T>[] {
  const groups: MonthGroup<T>[] = [];
  for (const post of posts) {
    const key = post.date.slice(0, 7);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.posts.push(post);
    else groups.push({ key, label: monthLabel(post.date), posts: [post] });
  }
  return groups;
}

/** CSS that hides non-matching feed cards and empty month groups. Empty string = show the whole feed. */
export function digestFilterCss(type: DigestTypeId, q: string): string {
  const tag = digestTypeTag(type);
  const query = q.trim().toLowerCase();
  if (!tag && !query) return "";
  const card: string[] = [];
  const has = ["li"];
  const esc = (value: string) => value.replace(/["\\]/g, "\\$&");
  if (tag) {
    const t = esc(tag);
    card.push(`.fx-digest-latest .fx-latest > li[data-tag]:not([data-tag="${t}"])`);
    has.push(`[data-tag="${t}"]`);
  }
  if (query) {
    const s = esc(query);
    card.push(`.fx-digest-latest .fx-latest > li[data-search]:not([data-search*="${s}"])`);
    has.push(`[data-search*="${s}"]`);
  }
  const hideCards = card.map((sel) => `${sel}{display:none!important}`).join("");
  const hideMonths = `.fx-digest-latest [data-digest-month]:not(:has(${has.join("")})){display:none!important}`;
  return hideCards + hideMonths;
}

/**
 * Runs at parse time, before the feed cards, so a shared `?type=&q=` link does not paint the
 * unfiltered list. Same rules as digestFilterCss (assert-site checks them against each other).
 * Kept in ES5: it is an inline script, not a module.
 */
export const DIGEST_FILTER_BOOT = `(function(){try{var p=new URLSearchParams(location.search);var type=p.get("type")||"";var q=(p.get("q")||"").trim().toLowerCase();var tag=type==="technique"?"Technique":type==="deep-dive"?"Deep dive":type==="essay"?"Essay":"";if(!tag&&!q)return;var esc=function(v){return String(v).replace(/["\\\\]/g,"\\\\$&")};var card=[],has=["li"];if(tag){var t=esc(tag);card.push('.fx-digest-latest .fx-latest > li[data-tag]:not([data-tag="'+t+'"])');has.push('[data-tag="'+t+'"]')}if(q){var s=esc(q);card.push('.fx-digest-latest .fx-latest > li[data-search]:not([data-search*="'+s+'"])');has.push('[data-search*="'+s+'"]')}var css=card.map(function(sel){return sel+"{display:none!important}"}).join("")+'.fx-digest-latest [data-digest-month]:not(:has('+has.join("")+')){display:none!important}';var el=document.getElementById("dd-find-style");if(!el){el=document.createElement("style");el.id="dd-find-style";document.head.appendChild(el)}el.textContent=css}catch(e){}})();`;
