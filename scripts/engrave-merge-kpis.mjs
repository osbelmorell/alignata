#!/usr/bin/env node
// Engrave Merge kill-bar + outcome metrics (SPEC §8.5, §8.6). READ-ONLY.
//
//   npm run engrave:kpis                       # reads Upstash Redis (em:ev:<day> lists)
//   npm run engrave:kpis -- --file log.jsonl   # reads a JSON-lines event log instead
//   add --json for machine-readable output
//
// The same aggregates (counts only, no raw events) are public at GET /api/engrave-merge/stats
// so a weekly report can read them without store credentials.
//
// Store env vars (same names the Vercel Marketplace Upstash/KV integration injects):
//   KV_REST_API_URL + KV_REST_API_READ_ONLY_TOKEN (preferred) or KV_REST_API_TOKEN,
//   or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN.
// Only SCAN and LRANGE are issued. Nothing is written.
//
// Excluded everywhere: dogfood installs (dog- ids / dogfood:true), hosts other than
// alignata.com (previews, localhost), EXCLUDED_IIDS, and bundled fixture fingerprints.
//
// KPI rule (CEO): T0 = the first real file_processed, INCLUDING a small file (< 3 orders,
// sent as small_file: true with no fingerprint). Small files start the 14-day clock but do
// NOT count toward the 15 distinct real files (only fingerprints are counted).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { readEvents } from "../lib/engrave-merge/store.ts";
import { BAR, computeKpis, parseLog } from "../lib/engrave-merge/kpis.ts";

export { BAR, PROD_HOST, WINDOW_DAYS, computeKpis, parseLog, weekOf } from "../lib/engrave-merge/kpis.ts";

export async function readStore(env = process.env) {
  return readEvents(env);
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
  console.log(`  3. "I'd pay $29" taps:         ${k.killBar.priceIntents}  from ${k.priceIntentInstalls} installs (price_intent; kill if 0)`);
  console.log(
    `  Price card seen:               ${k.priceCardViews}  by ${k.priceCardViewInstalls} installs; rate ` +
      (k.priceIntentRate === null ? "n/a" : `${Math.round(k.priceIntentRate * 100)}%`) + " (price_intent / price_card_view, distinct installs)",
  );
  console.log(`  Installs back on another day:  ${k.installsBackOnAnotherDay}`);
  console.log(`  Small files (<3 orders, no fingerprint): ${k.smallFiles}`);
  if (k.ship) {
    console.log("  Custom options + one name per copy (all real files, counts only):");
    console.log(`    files with 2+ text fields:  ${k.ship.multifieldFiles}`);
    console.log(`    files where a name list was split: ${k.ship.nameSplitFiles}`);
    console.log(`    files held as ambiguous names:    ${k.ship.nameAmbiguousFiles}`);
    console.log(`    price_intent taps (all real):    ${k.ship.priceIntents}`);
  }
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
