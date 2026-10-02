// Engrave Merge golden tests (SPEC §9 AT-01, 03, 04, 05, 06, 07, 23, 24).
// Run: npm run test:engrave   (node --import tsx --test scripts/assert-engrave-merge.mjs)
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import assert from "node:assert/strict";
import test from "node:test";

import { process as emProcess } from "../lib/engrave-merge/process.ts";
import { mergeCsv, exceptionsCsv } from "../lib/engrave-merge/outputs.ts";
import opentype from "opentype.js";
import { charsetCheck, fontFrom } from "../lib/engrave-merge/glyphs.ts";
import { fingerprintOf } from "../lib/engrave-merge/fingerprint.ts";
import { FIXTURE_FINGERPRINTS } from "../lib/engrave-merge/fixtures.ts";
import { buildRecipe, parseRecipe } from "../lib/engrave-merge/recipe.ts";
import { validateEvent } from "../lib/engrave-merge/events.ts";
import { handleEvent } from "../lib/engrave-merge/handler.ts";
import { DEFAULT_SETTINGS } from "../lib/engrave-merge/types.ts";
import { computeKpis, parseLog } from "./engrave-merge-kpis.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const FX = join(root, "lib/engrave-merge/__fixtures__");
const read = (p) => readFileSync(join(FX, p), "utf8");
const cases = JSON.parse(read("cases.json")).cases;

const CFG_MAP = {
  include_shipped: "includeShipped",
  include_flagged: "includeFlagged",
  split_lines: "splitLines",
  line_columns: "lineColumns",
  char_limit: "charLimit",
  strip_numbers: "stripNumbers",
};

function runCase(c, text = read(c.fixture)) {
  const settings = {};
  let listing = null;
  for (const [k, v] of Object.entries(c.config || {})) {
    if (k === "listing") listing = v;
    else settings[CFG_MAP[k]] = v;
  }
  const recipe = c.recipe ? JSON.parse(read(c.recipe)) : null;
  const glyphCheck = c.charset ? charsetCheck(read(c.charset)) : null;
  return emProcess(text, { settings, explicit: Object.keys(settings), recipe, glyphCheck, listing });
}

let passed = 0;
test(`AT-01 golden cases (${cases.length})`, async (t) => {
  for (const c of cases) {
    await t.test(c.name, () => {
      const res = runCase(c);
      assert.equal(res.error, undefined, "unexpected WRONG_FILE");
      assert.equal(mergeCsv(res), read(`expected/${c.name}/expected_merge.csv`), "merge file bytes");
      assert.equal(exceptionsCsv(res), read(`expected/${c.name}/expected_exceptions.csv`), "problem list bytes");
      passed++;
    });
  }
  console.log(`# golden: ${passed}/${cases.length} PASS`);
  assert.equal(passed, cases.length);
});

test("Counts: ready + held = total items for every case (one per merge row)", () => {
  for (const c of cases) {
    const { stats, mergeRows, problems } = runCase(c);
    assert.equal(stats.ready_items, mergeRows.length, `${c.name} ready = merge rows`);
    assert.equal(stats.ready_items + stats.held_items, stats.total_items, `${c.name} ready + held = total`);
    if (!c.config?.listing) {
      assert.equal(stats.total_items, stats.item_count, `${c.name} total = items to make`);
      if (stats.held_items > 0) assert.ok(problems.some((p) => p.held), `${c.name} held items have problem rows`);
    }
    console.log(`# ${c.name}: ${stats.ready_items} ready for LightBurn · ${stats.held_items} need a look (total ${stats.total_items})`);
  }
});

test("AT-02 Sold Orders file → WRONG_FILE, no outputs", () => {
  const res = emProcess(read("fx07_wrong_file_SoldOrders.csv"));
  assert.equal(res.error, "WRONG_FILE");
  assert.equal(res.soldOrdersFile, true);
});

test("AT-03 BOM and LF-only endings give identical outputs", () => {
  for (const c of cases) {
    const base = runCase(c);
    const raw = read(c.fixture);
    for (const variant of ["\ufeff" + raw, raw.replace(/\r\n/g, "\n")]) {
      const r = runCase(c, variant);
      assert.equal(mergeCsv(r), mergeCsv(base), `${c.name} merge`);
      assert.equal(exceptionsCsv(r), exceptionsCsv(base), `${c.name} exceptions`);
    }
  }
});

test("AT-04 fingerprints equal fixture_fingerprints.json; constant list matches", async () => {
  const fps = JSON.parse(read("fixture_fingerprints.json")).fingerprints;
  for (const [file, fp] of Object.entries(fps)) {
    const res = emProcess(read(file));
    assert.equal(await fingerprintOf(res.orderIds), fp, file);
  }
  assert.deepEqual([...FIXTURE_FINGERPRINTS].sort(), Object.values(fps).sort());
});

test("AT-05 one-listing filter on fx01", () => {
  const res = emProcess(read("fx01_simple.csv"), { listing: "3000000001" });
  assert.equal(mergeCsv(res), read("expected/fx01_simple__one_listing/expected_merge.csv"));
});

test("AT-06 settings-file round trip (fx06) holds no buyer data", () => {
  const recipe = buildRecipe(DEFAULT_SETTINGS, {
    "3000000008": {
      itemName: "Engraved Birth Announcement Plaque",
      option1: "Color",
      textFields: ["Baby name", "Birth date", "Weight"],
      requiresPersonalization: true,
      charLimit: 24,
    },
  });
  const json = JSON.stringify(recipe, null, 2);
  for (const bad of ["Ima", "Fakename", "1000000", "01.02.2026"]) assert.ok(!json.includes(bad), bad);
  const back = parseRecipe(json, json.length).recipe;
  const res = emProcess(read("fx06_multifield_GUESS.csv"), { recipe: back });
  assert.equal(mergeCsv(res), read("expected/fx06_multifield_GUESS__recipe/expected_merge.csv"));
  assert.equal(exceptionsCsv(res), read("expected/fx06_multifield_GUESS__recipe/expected_exceptions.csv"));
  assert.equal(parseRecipe('{"tool":"other"}', 20).error, "not_ours");
  assert.equal(parseRecipe("{}", 300 * 1024).error, "too_big");
});

const fontPath = join(FX, "fonts/test-ascii.ttf");
test("AT-07 font check with an ASCII-only TTF (opentype.js)", { skip: !existsSync(fontPath) }, () => {
  const buf = readFileSync(fontPath);
  const font = fontFrom(opentype, buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  assert.ok(font.check(65) && !font.check(0xeb), "subset has A but not ë");
  const res = emProcess(read("fx05_exceptions.csv"), { glyphCheck: font.check });
  assert.equal(mergeCsv(res), read("expected/fx05_exceptions__ascii_font/expected_merge.csv"));
  assert.equal(exceptionsCsv(res), read("expected/fx05_exceptions__ascii_font/expected_exceptions.csv"));
});

const iid = "0b9d2c1e-1111-4222-8333-444455556666";
const fp = "a".repeat(64);
const post = (body, headers = {}) =>
  handleEvent(new Request("https://alignata.com/api/engrave-merge/e", { method: "POST", body, headers }));

test("AT-23 event API validation", async () => {
  const ok = { v: 1, event: "file_processed", iid, dogfood: false, props: { row_count: 9, item_count: 9, exception_count: 7, file_fingerprint: fp } };
  assert.equal(validateEvent(ok).ok, true);
  assert.equal(validateEvent({ ...ok, props: { ...ok.props, file_name: "x.csv" } }).ok, false, "unknown prop");
  assert.equal(validateEvent({ ...ok, extra: 1 }).ok, false, "unknown key");
  assert.equal(validateEvent({ ...ok, props: { ...ok.props, row_count: "9" } }).ok, false, "string count");
  assert.equal(validateEvent({ ...ok, props: { ...ok.props, row_count: 100001 } }).ok, false, "count range");
  assert.equal(validateEvent({ ...ok, props: { row_count: 1, small_file: true, file_fingerprint: fp } }).ok, false, "fp xor small");
  assert.equal(validateEvent({ ...ok, iid: "bob" }).ok, false, "iid");
  assert.equal(validateEvent({ v: 1, event: "pro_interest_tap", iid: "dog-" + iid, dogfood: false, props: {} }).event.dogfood, true);
  assert.equal((await post(JSON.stringify(ok))).status, 204, "valid → 204 (no store configured)");
  assert.equal((await post(JSON.stringify({ ...ok, extra: 1 }))).status, 400);
  assert.equal((await post(JSON.stringify({ ...ok, props: { ...ok.props, row_count: "9" } }))).status, 400);
  assert.equal((await post(JSON.stringify({ ...ok, pad: "x".repeat(1100) }))).status, 400, "> 1 KB");
  assert.equal((await post("not json")).status, 400);
});

test("KPI rule: a real small file starts T0 but does not count as a distinct real file", () => {
  const H = 60 * 60 * 1000;
  const t = Date.parse("2026-10-05T14:00:00Z");
  const ev = (i, event, props, h) => ({ v: 1, event, iid: `0b9d2c1e-1111-4222-8333-00000000000${i}`, dogfood: false, props, ts: t + h * H, day: "2026-10-05", host: "alignata.com", prod: true });
  const events = [
    ev(1, "file_processed", { row_count: 2, item_count: 2, exception_count: 0, small_file: true }, 0),
    ev(2, "file_processed", { row_count: 9, item_count: 9, exception_count: 0, file_fingerprint: "b".repeat(64) }, 5),
    ev(3, "file_processed", { row_count: 9, item_count: 9, exception_count: 0, file_fingerprint: "c".repeat(64) }, 6),
    ev(4, "file_processed", { row_count: 1, item_count: 1, exception_count: 0, small_file: true }, 7),
  ];
  const k = computeKpis(events, t + 24 * H);
  assert.equal(k.t0, new Date(t).toISOString(), "small file starts the clock");
  assert.equal(k.windowEnd, new Date(t + 14 * 24 * H).toISOString());
  assert.equal(k.killBar.distinctRealFiles, 2, "small files are not distinct real files");
  assert.equal(k.smallFiles, 2);
  assert.equal(k.status, "IN_WINDOW");
  // only small files → clock still starts, 0 distinct real files
  const only = computeKpis([events[0]], t + H);
  assert.equal(only.t0, new Date(t).toISOString());
  assert.equal(only.killBar.distinctRealFiles, 0);
});

test("AT-24 KPI script on a synthetic event log", () => {
  const events = parseLog(readFileSync(join(root, "scripts/fixtures/engrave-merge-events.sample.jsonl"), "utf8"));
  const k = computeKpis(events);
  const expected = JSON.parse(readFileSync(join(root, "scripts/fixtures/engrave-merge-events.expected.json"), "utf8"));
  assert.deepEqual(
    {
      t0: k.t0,
      distinctRealFiles: k.killBar.distinctRealFiles,
      returningInstalls: k.killBar.returningInstalls,
      proInterestTaps: k.killBar.proInterestTaps,
      installsBackOnAnotherDay: k.installsBackOnAnotherDay,
      weeklyEngaged: k.weeklyEngaged,
      excluded: k.excluded,
    },
    expected,
  );
});
