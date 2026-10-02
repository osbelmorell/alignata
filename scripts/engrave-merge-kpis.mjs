#!/usr/bin/env node
// Engrave Merge kill-bar + outcome metrics (SPEC §8.5, §8.6). READ-ONLY.
//
//   npm run engrave:kpis                       # reads Upstash Redis (em:ev:<day> lists)
//   npm run engrave:kpis -- --file log.jsonl   # reads a JSON-lines event log instead
//   add --json for machine-readable output
//
// Store env vars (same names the Vercel Marketplace Upstash/KV integration injects):
//   KV_REST_API_URL + KV_REST_API_READ_ONLY_TOKEN (preferred) or KV_REST_API_TOKEN,
//   or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN.
// Only SCAN and LRANGE are issued. Nothing is written.
//
// Excluded everywhere: dogfood installs (dog- ids / dogfood:true), hosts other than
// alignata.com (previews, localhost), and bundled fixture fingerprints.
//
// KPI rule (CEO): T0 = the first real file_processed, INCLUDING a small file (< 3 orders,
// sent as small_file: true with no fingerprint). Small files start the 14-day clock but do
// NOT count toward the 15 distinct real files (only fingerprints are counted).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
// The ONE fixture-fingerprint list (shared with the server event filter). Needs tsx: npm run engrave:kpis.
import { EXCLUDED_IIDS, isExcludedIid, isFixtureFingerprint } from "../lib/engrave-merge/fixtures.ts";
// The ONE key prefix/pattern (shared with the event store writer).
import { EVENT_KEY_MATCH } from "../lib/engrave-merge/store.ts";

export const PROD_HOST = "alignata.com";
const DAY_MS = 24 * 60 * 60 * 1000;
export const WINDOW_DAYS = 14;
export const BAR = { distinctRealFiles: 15, returningInstalls: 3, proInterestTaps: 1 };

export function parseLog(text) {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => JSON.parse(l));
}

const fpOf = (e) => (e.props && typeof e.props.file_fingerprint === "string" ? e.props.file_fingerprint : null);

/** Monday (YYYY-MM-DD) of the Mon–Sun week containing an America/New_York day string. */
export function weekOf(day) {
  const d = new Date(`${day}T00:00:00Z`);
  const back = (d.getUTCDay() + 6) % 7;
  return new Date(d.getTime() - back * DAY_MS).toISOString().slice(0, 10);
}

export function computeKpis(events, now = Date.now(), excludedIids = EXCLUDED_IIDS) {
  const excluded = { dogfood: 0, nonProdHost: 0, fixture: 0, excludedIid: 0 };
  const real = [];
  for (const e of events) {
    if (e.dogfood === true || String(e.iid || "").startsWith("dog-")) excluded.dogfood++;
    else if (e.host !== PROD_HOST) excluded.nonProdHost++;
    else if (isExcludedIid(e.iid, excludedIids)) excluded.excludedIid++;
    else if (isFixtureFingerprint(fpOf(e))) excluded.fixture++;
    else real.push(e);
  }
  real.sort((a, b) => a.ts - b.ts);
  // Any real file starts the clock, small files included (CEO rule).
  const firstFile = real.find((e) => e.event === "file_processed");
  const t0 = firstFile ? firstFile.ts : null;
  const end = t0 === null ? null : t0 + WINDOW_DAYS * DAY_MS;
  const inWin = t0 === null ? [] : real.filter((e) => e.ts >= t0 && e.ts < end);

  const files = inWin.filter((e) => e.event === "file_processed");
  // Distinct real files = fingerprints only; small files never count here.
  const fps = new Set(files.map(fpOf).filter(Boolean));
  const smallFiles = files.filter((e) => e.props && e.props.small_file === true).length;

  const perIid = new Map();
  for (const e of files) {
    const fp = fpOf(e);
    if (!fp) continue;
    const s = perIid.get(e.iid) || { days: new Set(), fps: new Set() };
    s.days.add(e.day);
    s.fps.add(fp);
    perIid.set(e.iid, s);
  }
  const returningInstalls = [...perIid.values()].filter((s) => s.days.size >= 2 && s.fps.size >= 2).length;

  const anyDays = new Map();
  for (const e of inWin) {
    const s = anyDays.get(e.iid) || new Set();
    s.add(e.day);
    anyDays.set(e.iid, s);
  }
  const installsBackOnAnotherDay = [...anyDays.values()].filter((s) => s.size >= 2).length;

  const taps = inWin.filter((e) => e.event === "pro_interest_tap");
  const proInterestTaps = taps.length;
  const proInterestInstalls = new Set(taps.map((e) => e.iid)).size;

  // Weekly engaged sellers (all real events, not only the kill-bar window)
  const wk = new Map();
  for (const e of real) {
    if (e.event !== "merge_downloaded" || !fpOf(e)) continue;
    const w = weekOf(e.day);
    const m = wk.get(w) || new Map();
    const s = m.get(e.iid) || new Set();
    s.add(e.day);
    m.set(e.iid, s);
    wk.set(w, m);
  }
  const weeklyEngaged = Object.fromEntries(
    [...wk.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([w, m]) => [w, [...m.values()].filter((s) => s.size >= 2).length]),
  );

  const kill = [];
  if (t0 !== null) {
    if (fps.size < BAR.distinctRealFiles) kill.push(`distinct real files ${fps.size} < ${BAR.distinctRealFiles}`);
    if (returningInstalls < BAR.returningInstalls) kill.push(`returning installs ${returningInstalls} < ${BAR.returningInstalls}`);
    if (proInterestTaps < BAR.proInterestTaps) kill.push(`pro-interest taps ${proInterestTaps} = 0`);
  }
  const status = t0 === null ? "NOT_STARTED" : now < end ? "IN_WINDOW" : kill.length ? "KILL" : "PASS";

  return {
    t0: t0 === null ? null : new Date(t0).toISOString(),
    windowEnd: end === null ? null : new Date(end).toISOString(),
    status,
    killBar: { distinctRealFiles: fps.size, returningInstalls, proInterestTaps },
    killIf: kill,
    proInterestInstalls,
    smallFiles,
    installsBackOnAnotherDay,
    weeklyEngaged,
    excluded,
    totalEvents: events.length,
    realEvents: real.length,
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
        "or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN, or pass --file log.jsonl.",
    );
  }
  const keys = new Set();
  let cursor = "0";
  do {
    const [next, batch] = await redis(url, token, ["SCAN", cursor, "MATCH", EVENT_KEY_MATCH, "COUNT", "1000"]);
    batch.forEach((k) => keys.add(k));
    cursor = String(next);
  } while (cursor !== "0");
  const events = [];
  for (const k of [...keys].sort()) {
    const lines = await redis(url, token, ["LRANGE", k, "0", "-1"]);
    for (const l of lines) {
      try {
        events.push(JSON.parse(l));
      } catch {
        /* skip malformed */
      }
    }
  }
  return events;
}

function print(k) {
  const fmtNY = (iso) =>
    iso
      ? new Date(iso).toLocaleString("en-US", { timeZone: "America/New_York", dateStyle: "medium", timeStyle: "short" }) + " ET"
      : "not started (no real file yet)";
  console.log("Engrave Merge KPIs (fixtures, dogfood, excluded devices and non-alignata.com hosts excluded)");
  console.log(`  T0 (first real file):          ${fmtNY(k.t0)}`);
  if (k.windowEnd) console.log(`  Kill-bar window ends:          ${fmtNY(k.windowEnd)}`);
  console.log(`  Status:                        ${k.status}`);
  console.log(`  1. Distinct real files:        ${k.killBar.distinctRealFiles}  (kill if < ${BAR.distinctRealFiles})`);
  console.log(`  2. Returning installs:         ${k.killBar.returningInstalls}  (≥2 days AND ≥2 files; kill if < ${BAR.returningInstalls})`);
  console.log(`  3. "I'd pay" taps:             ${k.killBar.proInterestTaps}  from ${k.proInterestInstalls} installs (kill if 0)`);
  console.log(`  Installs back on another day:  ${k.installsBackOnAnotherDay}`);
  console.log(`  Small files (<3 orders, no fingerprint): ${k.smallFiles}`);
  console.log("  Weekly engaged sellers (merge downloads on ≥2 days in a Mon–Sun week):");
  const weeks = Object.entries(k.weeklyEngaged);
  if (!weeks.length) console.log("    (none yet)");
  for (const [w, n] of weeks) console.log(`    week of ${w}: ${n}`);
  if (k.killIf.length) console.log(`  Kill conditions met: ${k.killIf.join("; ")}`);
  console.log(
    `  Events: ${k.totalEvents} total, ${k.realEvents} real; excluded dogfood ${k.excluded.dogfood}, ` +
      `non-prod host ${k.excluded.nonProdHost}, fixture ${k.excluded.fixture}, excluded device ${k.excluded.excludedIid}`,
  );
}

async function main() {
  const args = process.argv.slice(2);
  const fi = args.indexOf("--file");
  const events = fi >= 0 ? parseLog(readFileSync(args[fi + 1], "utf8")) : await readStore();
  const k = computeKpis(events);
  if (args.includes("--json")) console.log(JSON.stringify(k, null, 2));
  else print(k);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
}
