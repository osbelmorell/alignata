#!/usr/bin/env node
// Site before-baseline summary (redesign). Reads first-party site events from site:ev:* and prints,
// per America/New_York day, per Mon–Sun week and for the whole window:
//   views per route (page_view), /apps views (apps_view) and /apps sessions, sessions with ≥1 tool_open,
//   /apps → tool_open conversion, tool_open rate (tool_open / /apps page_view), tool_open per card slug,
//   distinct Daily Digest readers (distinct vid with article_view), second-article rate
//   (sessions whose article n reached ≥ 2 / sessions with ≥ 1 article_view),
//   homepage home_click per target, sessions/visitors, and / sessions with ≥ 1 tap,
//   Daily Digest "New" mark (Release A): digest_open split by was_new, distinct New openers (vid with ≥ 1
//   was_new:true open) and how many of them came back to open a post on a later day (kill bar: < 3 in 14 days → the
//   mark comes out). Strict rule (CEO + Product, Oct 10 2026): a New opener counts only with ≥ 1 counted digest_open
//   (was_new true or false) on an ET day strictly later than the ET day of their first was_new:true digest_open.
//   Page views and other events never count; earlier or same-day opens don't count.
//   Release B: digest_open carries mark "new" | "updated" | "none" (old events: was_new:true reads as "new", anything
//   else as "none"). New, Updated and none opens are reported separately. Kill bars (killBars, needs --new-since /
//   --updated-since): New = distinct New openers who returned (strict rule above), counted over 14 days from
//   --new-since (Product restarts it on merge day); < 3 → the mark comes out. Updated = distinct visitors with ≥ 1
//   mark=updated open within 30 days from --updated-since (the first real update); < 2 → Updated comes out.
//   Visitor = vid; day = the stored America/New_York `day` (the only day the store has; the browser's own local day
//   is never sent).
// Excluded: dogfood events and non-alignata.com hosts (owner device and automated browsers never send).
//
// Usage:
//   node scripts/site-baseline.mjs [--since ISO] [--until ISO] [--json]
//     reads the store: KV_REST_API_URL + KV_REST_API_READ_ONLY_TOKEN (preferred) or KV_REST_API_TOKEN,
//     or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN. Only SCAN and LRANGE on site:ev:* are issued.
//   node scripts/site-baseline.mjs --file events.jsonl [...]   (one JSON event per line, no store needed)
//   node scripts/site-baseline.mjs --fixture scripts/fixtures/digest-open-events.sample.jsonl   (same; offline QA)
//   [--new-since ISO] [--updated-since ISO]   kill-bar windows (14 days / 30 days from these), printed as "Kill bars"
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const SITE_EVENT_KEY_MATCH = "site:ev:*";

export function parseLog(text) {
  const out = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      out.push(JSON.parse(line));
    } catch {
      /* skip malformed */
    }
  }
  return out;
}

/** Monday (YYYY-MM-DD) of the Mon–Sun week containing an America/New_York day string. */
export function weekOf(day) {
  const d = new Date(`${day}T12:00:00Z`);
  const back = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - back);
  return d.toISOString().slice(0, 10);
}

/** digest_open mark, with the backward read of Release A events (was_new:true → "new"). */
export function openMark(p = {}) {
  if (p.mark === "new" || p.mark === "updated" || p.mark === "none") return p.mark;
  return p.was_new === true ? "new" : "none";
}

const ratio = (a, b) => (b ? a / b : null);

function bucket(events) {
  const views = {};
  const appsSessions = new Set();
  const toolSessions = new Set();
  const toolBySlug = {};
  const articleMaxN = new Map();
  const readers = new Set();
  let appsPageViews = 0;
  let appsViews = 0;
  let toolOpens = 0;
  let articleViews = 0;
  let homeClicks = 0;
  const homeSessions = new Set();
  const homeClickSessions = new Set();
  const homeClickVisitors = new Set();
  const homeByTarget = {};
  let digestOpens = 0;
  let digestOpensNew = 0;
  let digestOpensUpdated = 0;
  const updatedOpeners = new Set();
  const newOpeners = new Set();
  const lastOpenDayByVid = new Map();
  const firstNewDayByVid = new Map();
  for (const e of events) {
    const p = e.props || {};
    if (e.event === "page_view") {
      views[p.path] = (views[p.path] || 0) + 1;
      if (p.path === "/apps") appsPageViews++;
      if (p.path === "/") homeSessions.add(e.sid);
    } else if (e.event === "apps_view") {
      appsViews++;
      appsSessions.add(e.sid);
    } else if (e.event === "tool_open") {
      toolOpens++;
      toolSessions.add(e.sid);
      toolBySlug[p.slug] = (toolBySlug[p.slug] || 0) + 1;
    } else if (e.event === "article_view") {
      articleViews++;
      readers.add(e.vid);
      articleMaxN.set(e.sid, Math.max(articleMaxN.get(e.sid) || 0, Number(p.n) || 0));
    } else if (e.event === "home_click") {
      homeClicks++;
      homeClickSessions.add(e.sid);
      homeClickVisitors.add(e.vid);
      homeByTarget[p.target] = (homeByTarget[p.target] || 0) + 1;
    } else if (e.event === "digest_open") {
      digestOpens++;
      if (!(lastOpenDayByVid.get(e.vid) >= e.day)) lastOpenDayByVid.set(e.vid, e.day);
      const mark = openMark(p);
      if (mark === "updated") {
        digestOpensUpdated++;
        updatedOpeners.add(e.vid);
      }
      if (mark === "new") {
        digestOpensNew++;
        newOpeners.add(e.vid);
        if (!(firstNewDayByVid.get(e.vid) <= e.day)) firstNewDayByVid.set(e.vid, e.day);
      }
    }
  }
  const appsToTool = [...appsSessions].filter((s) => toolSessions.has(s)).length;
  const articleSessions = articleMaxN.size;
  const secondArticleSessions = [...articleMaxN.values()].filter((n) => n >= 2).length;
  return {
    events: events.length,
    viewsPerRoute: Object.fromEntries(Object.entries(views).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))),
    pageViews: Object.values(views).reduce((a, b) => a + b, 0),
    appsPageViews,
    appsViews,
    appsSessions: appsSessions.size,
    toolOpens,
    toolOpenSessions: toolSessions.size,
    appsSessionsWithToolOpen: appsToTool,
    appsToToolConversion: ratio(appsToTool, appsSessions.size),
    toolOpenRate: ratio(toolOpens, appsPageViews),
    toolOpenBySlug: Object.fromEntries(Object.entries(toolBySlug).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))),
    articleViews,
    digestReaders: readers.size,
    articleSessions,
    secondArticleSessions,
    secondArticleRate: ratio(secondArticleSessions, articleSessions),
    homeSessions: homeSessions.size,
    homeClicks,
    homeClickSessions: homeClickSessions.size,
    homeClickVisitors: homeClickVisitors.size,
    homeSessionsWithClick: [...homeSessions].filter((s) => homeClickSessions.has(s)).length,
    homeClickRate: ratio([...homeSessions].filter((s) => homeClickSessions.has(s)).length, homeSessions.size),
    homeClickByTarget: Object.fromEntries(Object.entries(homeByTarget).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))),
    digestOpens,
    digestOpensNew,
    digestOpensNotNew: digestOpens - digestOpensNew,
    digestOpensUpdated,
    digestOpensNone: digestOpens - digestOpensNew - digestOpensUpdated,
    digestUpdatedOpeners: updatedOpeners.size,
    digestNewOpeners: newOpeners.size,
    // strict: a counted digest_open on an ET day later than the vid's first was_new:true open (YYYY-MM-DD compares as text)
    digestNewOpenersReturned: [...newOpeners].filter((v) => lastOpenDayByVid.get(v) > firstNewDayByVid.get(v)).length,
    visitors: new Set(events.map((e) => e.vid)).size,
    sessions: new Set(events.map((e) => e.sid)).size,
  };
}

export const NEW_KILL_DAYS = 14;
export const NEW_KILL_MIN = 3;
export const UPDATED_KILL_DAYS = 30;
export const UPDATED_KILL_MIN = 2;
const DAY_MS = 86400000;

/**
 * Kill bars over counted events (dogfood / non-prod host already dropped). newSince / updatedSince: ms, or undefined
 * (bar not computed). New bar: the strict returned rule, on events in [newSince, newSince + 14 d).
 * Updated bar: distinct vids with a mark=updated open in [updatedSince, updatedSince + 30 d).
 */
export function killBars(real, { newSince, updatedSince } = {}) {
  const out = {};
  if (Number.isFinite(newSince)) {
    const until = newSince + NEW_KILL_DAYS * DAY_MS;
    const b = bucket(real.filter((e) => e.ts >= newSince && e.ts < until));
    out.new = { since: new Date(newSince).toISOString(), until: new Date(until).toISOString(), openers: b.digestNewOpeners, returned: b.digestNewOpenersReturned, min: NEW_KILL_MIN, kill: b.digestNewOpenersReturned < NEW_KILL_MIN };
  }
  if (Number.isFinite(updatedSince)) {
    const until = updatedSince + UPDATED_KILL_DAYS * DAY_MS;
    const v = new Set(real.filter((e) => e.event === "digest_open" && e.ts >= updatedSince && e.ts < until && openMark(e.props) === "updated").map((e) => e.vid));
    out.updated = { since: new Date(updatedSince).toISOString(), until: new Date(until).toISOString(), openers: v.size, min: UPDATED_KILL_MIN, kill: v.size < UPDATED_KILL_MIN };
  }
  return out;
}

/** Pure summary over raw events (tests use this). since/until: ms timestamps (inclusive / exclusive). */
export function summarize(all, { since = -Infinity, until = Infinity, newSince, updatedSince } = {}) {
  const excluded = { dogfood: 0, nonProdHost: 0, outsideWindow: 0 };
  const real = [];
  for (const e of all) {
    if (e.dogfood) excluded.dogfood++;
    else if (e.prod !== true) excluded.nonProdHost++;
    else if (!(e.ts >= since && e.ts < until)) excluded.outsideWindow++;
    else real.push(e);
  }
  const group = (keyOf) => {
    const m = {};
    for (const e of real) (m[keyOf(e)] ||= []).push(e);
    return Object.fromEntries(Object.keys(m).sort().map((k) => [k, bucket(m[k])]));
  };
  return {
    totalEvents: all.length,
    realEvents: real.length,
    excluded,
    window: bucket(real),
    killBars: killBars(all.filter((e) => !e.dogfood && e.prod === true), { newSince, updatedSince }),
    days: group((e) => e.day),
    weeks: group((e) => weekOf(e.day)),
  };
}

async function redis(url, token, cmd) {
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
  });
  if (!res.ok) throw new Error(`Redis ${cmd[0]} failed: HTTP ${res.status}`);
  return (await res.json()).result;
}

export async function readStore(env = process.env) {
  const url = (env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL || "").replace(/\/+$/, "");
  const token = env.KV_REST_API_READ_ONLY_TOKEN || env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error(
      "No event store configured. Set KV_REST_API_URL + KV_REST_API_READ_ONLY_TOKEN (or KV_REST_API_TOKEN), " +
        "or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN, or pass --file events.jsonl.",
    );
  }
  const keys = new Set();
  let cursor = "0";
  do {
    const [next, batch] = await redis(url, token, ["SCAN", cursor, "MATCH", SITE_EVENT_KEY_MATCH, "COUNT", "1000"]);
    batch.forEach((k) => keys.add(k));
    cursor = String(next);
  } while (cursor !== "0");
  const events = [];
  for (const k of [...keys].sort()) {
    for (const l of await redis(url, token, ["LRANGE", k, "0", "-1"])) {
      try {
        events.push(JSON.parse(l));
      } catch {
        /* skip malformed */
      }
    }
  }
  return events;
}

const pct = (r) => (r === null ? "n/a" : `${(r * 100).toFixed(1)}%`);

function printBucket(label, b) {
  console.log(`\n${label}`);
  console.log(`  Page views: ${b.pageViews} (${b.visitors} visitors, ${b.sessions} sessions)`);
  for (const [path, n] of Object.entries(b.viewsPerRoute)) console.log(`    ${String(n).padStart(6)}  ${path}`);
  console.log(`  /apps: ${b.appsViews} views, ${b.appsSessions} sessions; ${b.toolOpenSessions} sessions with ≥1 tool_open`);
  console.log(`    /apps → tool_open conversion: ${pct(b.appsToToolConversion)} (${b.appsSessionsWithToolOpen}/${b.appsSessions} sessions)`);
  console.log(`    tool_open rate: ${pct(b.toolOpenRate)} (${b.toolOpens} tool_open / ${b.appsPageViews} /apps page_view)`);
  for (const [slug, n] of Object.entries(b.toolOpenBySlug)) console.log(`    ${String(n).padStart(6)}  ${slug}`);
  console.log(`  Daily Digest: ${b.digestReaders} distinct readers, ${b.articleViews} article views`);
  console.log(`    second-article rate: ${pct(b.secondArticleRate)} (${b.secondArticleSessions}/${b.articleSessions} sessions)`);
  console.log(`  Homepage: ${b.homeClicks} home_click from ${b.homeClickSessions} sessions, ${b.homeClickVisitors} visitors`);
  console.log(`    / sessions with ≥1 tap: ${pct(b.homeClickRate)} (${b.homeSessionsWithClick}/${b.homeSessions} sessions)`);
  for (const [t, n] of Object.entries(b.homeClickByTarget)) console.log(`    ${String(n).padStart(6)}  ${t}`);
  console.log(`  Digest marks: ${b.digestOpens} digest_open (New ${b.digestOpensNew}, Updated ${b.digestOpensUpdated}, none ${b.digestOpensNone})`);
  console.log(`    distinct Updated openers: ${b.digestUpdatedOpeners}`);
  console.log(`    distinct New openers: ${b.digestNewOpeners}; came back and opened a post on a later day after a New open: ${b.digestNewOpenersReturned} (kill bar: < 3 in 14 days)`);
}

async function main() {
  const args = process.argv.slice(2);
  const opt = (name) => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : undefined;
  };
  // --fixture is an alias of --file (QA, offline): only that file is read; no store client, no network.
  const file = opt("--file") ?? opt("--fixture");
  const events = file ? parseLog(readFileSync(file, "utf8")) : await readStore();
  const since = opt("--since") ? Date.parse(opt("--since")) : -Infinity;
  const until = opt("--until") ? Date.parse(opt("--until")) : Infinity;
  for (const f of ["--new-since", "--updated-since"]) {
    const v = opt(f);
    if (v && !/(Z|[+-]\d{2}:?\d{2})$/.test(v)) throw new Error(`${f} needs a time zone offset, e.g. 2026-10-12T00:00:00-04:00 (got "${v}")`);
  }
  const newSince = opt("--new-since") ? Date.parse(opt("--new-since")) : undefined;
  const updatedSince = opt("--updated-since") ? Date.parse(opt("--updated-since")) : undefined;
  if ([since, until, newSince, updatedSince].some((x) => Number.isNaN(x))) throw new Error("--since/--until/--new-since/--updated-since must be ISO timestamps");
  const s = summarize(events, { since, until, newSince, updatedSince });
  if (args.includes("--json")) {
    console.log(JSON.stringify(s, null, 2));
    return;
  }
  console.log("Site baseline (dogfood and non-alignata.com hosts excluded; owner device and automated browsers never send)");
  console.log(
    `Events: ${s.totalEvents} total, ${s.realEvents} counted; excluded dogfood ${s.excluded.dogfood}, ` +
      `non-prod host ${s.excluded.nonProdHost}, outside window ${s.excluded.outsideWindow}`,
  );
  printBucket("Whole window", s.window);
  const k = s.killBars;
  if (k.new || k.updated) console.log("\nKill bars");
  if (k.new) console.log(`  New (${k.new.since} → ${k.new.until}): ${k.new.returned} of ${k.new.openers} New openers came back (min ${k.new.min}) → ${k.new.kill ? "KILL" : "keep"}`);
  if (k.updated) console.log(`  Updated (${k.updated.since} → ${k.updated.until}): ${k.updated.openers} distinct Updated openers (min ${k.updated.min}) → ${k.updated.kill ? "KILL" : "keep"}`);
  for (const [w, b] of Object.entries(s.weeks)) console.log(`\nWeek of ${w} (Mon–Sun ET): ${b.digestReaders} distinct Daily Digest readers`);
  for (const [d, b] of Object.entries(s.days)) printBucket(`Day ${d} (ET)`, b);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
