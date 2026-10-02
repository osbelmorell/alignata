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
import { howManyLabel, summaryView } from "../lib/engrave-merge/summary.ts";
import { readCsv } from "../lib/engrave-merge/csv.ts";
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

test("Summary + on-screen problem list reconcile for every case", () => {
  for (const c of cases) {
    const res = runCase(c);
    const { stats, problems } = res;
    const incl = !!c.config?.include_flagged;
    const v = summaryView(res, incl);
    const sum = (f) => problems.filter(f).reduce((n, p) => n + p.counted, 0);
    assert.equal(sum((p) => p.held && p.inScope), stats.held_items, `${c.name}: How many (held rows) adds up to held`);
    assert.equal(sum((p) => !p.held && p.inScope), stats.flagged_in_merge_items, `${c.name}: How many (in-file rows) adds up to warning n`);
    assert.equal(v.showProblems, stats.exception_count > 0, `${c.name}: list + button follow exception_count`);
    assert.equal(v.note === "Everything is ready.", stats.exception_count === 0, `${c.name}: "Everything is ready." only with zero problems`);
    assert.equal(v.warning !== null, incl && stats.flagged_in_merge_items > 0, `${c.name}: warning when problem items are in the file`);
    if (stats.exception_count > 0) assert.notEqual(v.note, "Everything is ready.", `${c.name}: never "Everything is ready." with problems`);
    for (const p of problems) if (p.dup) assert.equal(p.counted, 0);
  }
});

test('fx05_exceptions: How many column reads "0, counted as 1" / "Duplicate, left out" and adds up to 6 held', () => {
  const res = runCase(cases.find((c) => c.name === "fx05_exceptions"));
  assert.equal(res.problems.length, 7, "7 problem rows");
  assert.deepEqual(res.problems.map(howManyLabel), ["0, counted as 1", "1", "1", "1", "1", "1", "Duplicate, left out"]);
  assert.equal(res.problems.reduce((n, p) => n + p.counted, 0), 6);
  const v = summaryView(res, false);
  assert.equal(v.countLine, "3 ready for LightBurn · 6 need a look");
  assert.equal(v.note, "Items that need a look are left out of the merge file. The problem list says why.");
  assert.equal(v.warning, null);
  assert.equal(v.showProblems, true);
  assert.equal(v.problems.length, 7);
});

test("fx05_exceptions__include_flagged: problem list + button visible and warning shown", () => {
  const res = runCase(cases.find((c) => c.name === "fx05_exceptions__include_flagged"));
  assert.equal(res.stats.exception_count, 7);
  assert.equal(res.stats.flagged_in_merge_items, 6);
  const v = summaryView(res, true);
  assert.equal(v.countLine, "9 in your merge file · 6 with problems");
  assert.equal(v.warning, "6 of these have problems. Check the problem list before you engrave.");
  assert.equal(v.showProblems, true, "problem list + Download problem list button visible");
  assert.equal(v.note, null, "no \"Everything is ready.\"");
});

test("Include-anyway warning: singular when exactly 1 item has a problem", () => {
  const stats = { exception_count: 1, ready_items: 3, held_items: 0, flagged_in_merge_items: 1 };
  const problems = [{ dup: false, badQty: false, qty: "1", counted: 1, held: false, inScope: true, problems: ["x"] }];
  const v = summaryView({ stats, problems }, true);
  assert.equal(v.countLine, "3 in your merge file · 1 with problems");
  assert.equal(v.warning, "1 of these has a problem. Check the problem list before you engrave.");
  assert.equal(v.showProblems, true);
  // OFF mode, zero problems → the only time "Everything is ready." shows
  assert.equal(summaryView({ stats: { ...stats, exception_count: 0, flagged_in_merge_items: 0 }, problems: [] }, false).note, "Everything is ready.");
});

test("Duplicate-only file: problem list shows, nothing held, no warning", () => {
  const raw = read("fx01_simple.csv");
  const nl = raw.includes("\r\n") ? "\r\n" : "\n";
  const [head, ...rest] = raw.split(nl);
  const body = rest.join(nl).replace(/(\r?\n)+$/, "");
  const res = emProcess(head + nl + body + nl + body + nl);
  const base = emProcess(raw);
  assert.equal(base.stats.exception_count, 0, "fx01 has no problems on its own");
  assert.ok(res.problems.length > 0 && res.problems.every((p) => p.dup), "only duplicates");
  const v = summaryView(res, false);
  assert.equal(res.stats.held_items, 0);
  assert.equal(res.stats.ready_items, base.stats.ready_items);
  assert.equal(v.showProblems, true);
  assert.equal(v.warning, null);
  const n = res.problems.length;
  assert.equal(v.note, `${n} duplicate lines were left out. The problem list shows it.`);
  assert.ok(res.problems.every((p) => howManyLabel(p) === "Duplicate, left out"));
  const on = summaryView(emProcess(head + nl + body + nl + body + nl, { settings: { includeFlagged: true }, explicit: ["includeFlagged"] }), true);
  assert.equal(on.showProblems, true);
  assert.equal(on.warning, null);
  assert.equal(on.note, `${n} duplicate lines were left out. The problem list shows it.`);
});

test("Duplicate-only line: singular and plural, both include-anyway modes (synthetic)", () => {
  const dup = { dup: true, badQty: false, qty: "1", counted: 0, held: true, inScope: true, problems: ["Same item appears twice in the file"] };
  const stats = (k) => ({ exception_count: k, ready_items: 4, held_items: 0, flagged_in_merge_items: 0 });
  for (const incl of [false, true]) {
    const one = summaryView({ stats: stats(1), problems: [dup] }, incl);
    assert.equal(one.note, "1 duplicate line was left out. The problem list shows it.");
    assert.equal(one.warning, null);
    assert.equal(one.showProblems, true);
    const three = summaryView({ stats: stats(3), problems: [dup, dup, dup] }, incl);
    assert.equal(three.note, "3 duplicate lines were left out. The problem list shows it.");
    assert.notEqual(three.note, "Everything is ready.");
  }
  // mixed problems → not the duplicate-only line
  const mixed = summaryView({ stats: { ...stats(2), held_items: 1 }, problems: [dup, { ...dup, dup: false, counted: 1 }] }, false);
  assert.equal(mixed.note, "Items that need a look are left out of the merge file. The problem list says why.");
});

test('How many: blank quantity reads "Blank, counted as 1"', () => {
  const p = { dup: false, badQty: true, qty: "", counted: 1, held: true, inScope: true, problems: [] };
  assert.equal(howManyLabel(p), "Blank, counted as 1");
  assert.equal(howManyLabel({ ...p, qty: "0" }), "0, counted as 1");
  assert.equal(howManyLabel({ ...p, badQty: false, dup: true, counted: 0 }), "Duplicate, left out");
  // real file: blank Quantity cell
  const raw = read("fx01_simple.csv");
  const nl = raw.includes("\r\n") ? "\r\n" : "\n";
  const head = raw.split(nl)[0].split(",");
  const qi = head.indexOf("Quantity");
  const row = head.map((h, i) => (i === qi ? "" : h === "Order ID" ? "1000009991" : h === "Transaction ID" ? "2000009991" : h === "Listing ID" ? "3000009991" : h === "Item Name" ? "Test" : h === "Variations" ? "Personalization:Amy" : ""));
  const res = emProcess(head.join(",") + nl + row.join(",") + nl);
  assert.equal(res.problems.map(howManyLabel)[0], "Blank, counted as 1");
});

test('"Which items" pick: on-screen table rows reconcile with the count (fx05, each listing)', () => {
  const text = read("fx05_exceptions.csv");
  const all = emProcess(text);
  const expected = {
    "3000000005": { countLine: "1 ready for LightBurn · 5 need a look", rows: 6, labels: ["1", "1", "1", "1", "1", "Duplicate, left out"] },
    "3000000006": { countLine: "2 ready for LightBurn · 1 need a look", rows: 1, labels: ["0, counted as 1"] },
  };
  for (const { lid } of all.listings) {
    for (const incl of [false, true]) {
      const res = emProcess(text, { listing: lid, settings: { includeFlagged: incl }, explicit: ["includeFlagged"] });
      const v = summaryView(res, incl);
      assert.ok(v.problems.every((p) => p.inScope), `${lid}: only this listing's rows`);
      const counted = v.problems.reduce((n, p) => n + p.counted, 0);
      assert.equal(counted, incl ? res.stats.flagged_in_merge_items : res.stats.held_items, `${lid} incl=${incl}: table adds up to the count`);
      assert.equal(res.stats.ready_items + res.stats.held_items, res.stats.total_items);
      assert.equal(exceptionsCsv(res), read("expected/fx05_exceptions/expected_exceptions.csv"), "downloaded problem list is never filtered");
      if (!incl) {
        assert.equal(v.countLine, expected[lid].countLine);
        assert.equal(v.problems.length, expected[lid].rows);
        assert.deepEqual(v.problems.map(howManyLabel), expected[lid].labels);
        assert.equal(v.showProblems, true);
      }
    }
  }
  // a pick with no problem rows while other lines have problems: table hidden, download still shown
  const stats = { exception_count: 2, ready_items: 2, held_items: 0, flagged_in_merge_items: 0 };
  const other = { dup: false, badQty: false, qty: "1", counted: 1, held: true, inScope: false, problems: ["x"] };
  const empty = summaryView({ stats, problems: [other, { ...other, dup: true, counted: 0 }] }, false);
  assert.equal(empty.showProblems, false);
  assert.equal(empty.showDownload, true);
  assert.equal(empty.problems.length, 0);
  assert.equal(empty.note, "This item is ready. 2 other lines in your file have problems. Pick All items to see them.");
  const one = summaryView({ stats: { ...stats, exception_count: 1 }, problems: [other] }, true);
  assert.equal(one.note, "This item is ready. 1 other line in your file has a problem. Pick All items to see them.");
  // whole file clean → the only time "Everything is ready." shows
  const clean = summaryView({ stats: { ...stats, exception_count: 0 }, problems: [] }, false);
  assert.equal(clean.note, "Everything is ready.");
  assert.equal(clean.showDownload, false);
});

test("fx03_multiline_commas__no_split, Keychain picked: download shows, no \"Everything is ready.\"", () => {
  const text = read("fx03_multiline_commas.csv");
  const all = emProcess(text, { settings: { splitLines: false }, explicit: ["splitLines"] });
  assert.equal(all.stats.exception_count, 2);
  const key = all.listings.find((l) => /keychain/i.test(l.itemName));
  assert.ok(key, "fx03 has a Keychain listing");
  for (const incl of [false, true]) {
    const st = { splitLines: false, includeFlagged: incl };
    const res = emProcess(text, { settings: st, explicit: Object.keys(st), listing: key.lid });
    const v = summaryView(res, incl);
    assert.equal(v.problems.length, 0, "Keychain itself has no problems");
    assert.equal(v.showProblems, false, "empty table hidden");
    assert.equal(v.showDownload, true, "Download problem list still shown");
    assert.notEqual(v.note, "Everything is ready.");
    assert.equal(v.note, "This item is ready. 2 other lines in your file have problems. Pick All items to see them.");
    assert.equal(exceptionsCsv(res), read("expected/fx03_multiline_commas__no_split/expected_exceptions.csv"), "download unfiltered");
    console.log(`# fx03 no_split Keychain incl=${incl}: ${v.countLine} | ${v.note}`);
  }
});

// Synthetic duplicate-only files built from fx01 (no real problems): d = 1 and d = 3.
function dupOnlyFile(d) {
  const raw = read("fx01_simple.csv");
  const nl = raw.includes("\r\n") ? "\r\n" : "\n";
  const { header, rows } = readCsv(raw);
  const q = (v) => (/[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const line = (r) => header.map((h) => q(r[h] ?? "")).join(",");
  const extra = rows.slice(0, d);
  return [header.map(q).join(","), ...rows.map(line), ...extra.map(line)].join(nl) + nl;
}

test("Duplicate-only count lines: OFF and ON, singular and plural (no 0 next to the table)", () => {
  const expected = {
    1: {
      off: "3 ready for LightBurn · 1 duplicate left out",
      on: "3 in your merge file · 1 duplicate left out",
      note: "1 duplicate line was left out. The problem list shows it.",
    },
    3: {
      off: "3 ready for LightBurn · 3 duplicates left out",
      on: "3 in your merge file · 3 duplicates left out",
      note: "3 duplicate lines were left out. The problem list shows it.",
    },
  };
  for (const d of [1, 3]) {
    const text = dupOnlyFile(d);
    for (const incl of [false, true]) {
      const res = emProcess(text, { settings: { includeFlagged: incl }, explicit: ["includeFlagged"] });
      assert.equal(res.problems.length, d);
      assert.ok(res.problems.every((p) => p.dup));
      assert.equal(res.stats.held_items + res.stats.flagged_in_merge_items, 0, "no real problems");
      const v = summaryView(res, incl);
      assert.equal(v.countLine, incl ? expected[d].on : expected[d].off);
      assert.equal(v.note, expected[d].note);
      assert.equal(v.warning, null);
      assert.equal(v.showProblems, true);
      assert.equal(v.problems.length, d);
    }
  }
});

test("Sweep: no count line reads 0 while the on-screen table has rows (all cases, both modes, every listing pick)", () => {
  const inputs = [
    ...cases.map((c) => ({ name: c.name, text: read(c.fixture), c })),
    { name: "dup_only_1", text: dupOnlyFile(1), c: {} },
    { name: "dup_only_3", text: dupOnlyFile(3), c: {} },
  ];
  // The problem side of the count line (after "·") must never be 0 next to a table with rows.
  // A 0 on the ready side ("0 ready for LightBurn · 6 need a look") is a true count and allowed.
  const zero = /· 0 /;
  let readyZero = 0;
  let checked = 0;
  for (const { name, text, c } of inputs) {
    const recipe = c.recipe ? JSON.parse(read(c.recipe)) : null;
    const glyphCheck = c.charset ? charsetCheck(read(c.charset)) : null;
    const base = { ...(c.config || {}) };
    delete base.listing;
    const settings = Object.fromEntries(Object.entries(base).map(([k, v]) => [CFG_MAP[k], v]));
    const lids = [null, ...emProcess(text).listings.map((l) => l.lid)];
    for (const incl of [false, true]) {
      for (const listing of lids) {
        const st = { ...settings, includeFlagged: incl };
        const res = emProcess(text, { settings: st, explicit: Object.keys(st), recipe, glyphCheck, listing });
        const v = summaryView(res, incl);
        if (v.problems.length > 0) {
          assert.ok(!zero.test(v.countLine), `${name} incl=${incl} pick=${listing}: "${v.countLine}" next to ${v.problems.length} rows`);
          assert.notEqual(v.note, "Everything is ready.");
          if (/^0 /.test(v.countLine)) readyZero++;
        } else {
          assert.equal(v.showProblems, false);
        }
        assert.equal(v.showDownload, res.stats.exception_count > 0, `${name} pick=${listing}: download follows the whole file`);
        assert.equal(v.note === "Everything is ready.", res.stats.exception_count === 0, `${name} pick=${listing}: "Everything is ready." only for a clean file`);
        checked++;
      }
    }
  }
  console.log(`# no-zero sweep: ${checked} views checked; ${readyZero} with 0 on the ready side (allowed)`);
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
