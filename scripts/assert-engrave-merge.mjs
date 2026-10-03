// Engrave Merge golden tests (SPEC §9 AT-01, 03, 04, 05, 06, 07, 23, 24).
// Run: npm run test:engrave   (node --import tsx --test scripts/assert-engrave-merge.mjs)
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import assert from "node:assert/strict";
import test from "node:test";

import { process as emProcess } from "../lib/engrave-merge/process.ts";
import { mergeCsv, exceptionsCsv } from "../lib/engrave-merge/outputs.ts";
import opentype from "opentype.js";
import { charsetCheck, fontFrom } from "../lib/engrave-merge/glyphs.ts";
import { fingerprintOf } from "../lib/engrave-merge/fingerprint.ts";
import { EXCLUDED_IIDS, FIXTURE_FINGERPRINTS, isExcludedIid } from "../lib/engrave-merge/fixtures.ts";
import { IID_KEY, initInstallId } from "../lib/engrave-merge/track.ts";
import { EngraveMergeDesk } from "../components/engrave-merge/EngraveMergeDesk.tsx";
import { buildRecipe, parseRecipe } from "../lib/engrave-merge/recipe.ts";
import { validateEvent } from "../lib/engrave-merge/events.ts";
import { handleEvent } from "../lib/engrave-merge/handler.ts";
import { DEFAULT_SETTINGS } from "../lib/engrave-merge/types.ts";
import { howManyLabel, summaryView } from "../lib/engrave-merge/summary.ts";
import { readCsv } from "../lib/engrave-merge/csv.ts";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SummaryPanel } from "../components/engrave-merge/SummaryPanel.tsx";
import { computeKpis, parseLog, readStore } from "./engrave-merge-kpis.mjs";
import { EM_KEY_PREFIX, appendEvent, eventKey } from "../lib/engrave-merge/store.ts";

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
    assert.equal(v.showDownload, stats.exception_count > 0 && !v.bothZero, `${c.name}: Download problem list follows the whole file's exception_count`);
    assert.equal(v.showProblems, problems.some((p) => p.inScope), `${c.name}: on-screen table follows this pick's rows`);
    if (!c.config?.listing) assert.equal(v.showProblems, stats.exception_count > 0, `${c.name}: All items: list + button follow exception_count`);
    assert.equal(v.note === "Everything is ready.", stats.exception_count === 0 && !v.bothZero, `${c.name}: "Everything is ready." only with zero problems (never on both-zero)`);
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
  assert.equal(v.countLine, "3 in your merge file · 1 with a problem");
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
    "3000000006": { countLine: "2 ready for LightBurn · 1 needs a look", rows: 1, labels: ["0, counted as 1"] },
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
  // other rows: 1 real item + 1 duplicate → counted by item: 1
  assert.equal(empty.note, "Everything you picked is ready. 1 other item in your file needs a look.");
  assert.equal(empty.showAllButton, true);
  const two = summaryView({ stats, problems: [other, { ...other, counted: 3 }] }, true);
  assert.equal(two.note, "Everything you picked is ready. 4 other items in your file need a look.");
  const dupOnlyElsewhere = summaryView({ stats, problems: [{ ...other, dup: true, counted: 0 }] }, false);
  assert.equal(dupOnlyElsewhere.note, "1 duplicate line was left out. The problem list shows it.");
  assert.notEqual(dupOnlyElsewhere.note, "Everything is ready.");
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
    assert.equal(v.note, "Everything you picked is ready. 2 other items in your file need a look.");
    assert.equal(v.showAllButton, true);
    assert.equal(v.countLine, incl ? "1 in your merge file" : "1 ready for LightBurn", "clean pick: no 0 part");
    assert.equal(exceptionsCsv(res), read("expected/fx03_multiline_commas__no_split/expected_exceptions.csv"), "download unfiltered");
    console.log(`# fx03 no_split Keychain incl=${incl}: ${v.countLine} | ${v.note}`);
  }

  // Structure (no browser harness in the repo, so react-dom/server + the element tree):
  const st = { splitLines: false };
  const allRes = emProcess(text, { settings: st, explicit: ["splitLines"] });
  const keyRes = emProcess(text, { settings: st, explicit: ["splitLines"], listing: key.lid });
  const props = (res, lid) => ({ view: summaryView(res, false), listings: all.listings, listing: lid, onListing: () => {}, onProblems: () => {}, onPrint: () => {} });
  const htmlAll = renderToStaticMarkup(createElement(SummaryPanel, props(allRes, "")));
  const htmlKey = renderToStaticMarkup(createElement(SummaryPanel, props(keyRes, key.lid)));
  // 1) Order: picker → count line → Updated line → downloads → note / Show all → table.
  for (const h of [htmlAll, htmlKey]) {
    const pos = ["data-which-items", "data-count-line", "data-updated", "data-download-problems"].map((k) => h.indexOf(k));
    assert.ok(pos.every((p, i) => p > 0 && (i === 0 || p > pos[i - 1])), "picker → count → Updated → downloads");
    for (const later of ["data-note-line", "data-warning-line", "data-show-all", "data-problem-list"])
      if (h.includes(later)) assert.ok(h.indexOf(later) > pos[3], `${later} below the downloads`);
  }
  // 2) Same position for the downloads: everything above them has the same structure and fixed-height
  //    classes in both picks; only the text and the selected option differ.
  const skeleton = (h) =>
    h
      .slice(0, h.indexOf("data-download-problems"))
      .replace(/ selected=""/g, "")
      .replace(/(<select[^>]*) title="[^"]*"/, "$1") // the select's title = the current pick's full title
      .replace(/>[^<]*</g, "><");
  assert.equal(skeleton(htmlAll), skeleton(htmlKey), "identical structure above Download problem list (All items vs Keychain)");
  assert.match(htmlAll, /data-count-line="true" tabindex="-1" class="h-6 truncate whitespace-nowrap/, "count line: one fixed line");
  assert.match(htmlAll, /data-updated="true" aria-live="polite" class="h-5 /, "Updated: fixed 20px, always reserved");
  assert.match(htmlAll, /<label class="flex min-w-0 flex-col/, "picker label can shrink (min-w-0)");
  const selectTag = htmlAll.match(/<select[^>]*>/)[0];
  assert.match(selectTag, /w-full min-w-0 whitespace-normal/, "picker: w-full min-w-0 whitespace-normal");
  assert.ok(!/truncate|nowrap|text-ellipsis|overflow-ellipsis/.test(selectTag + htmlAll.match(/<select[\s\S]*?<\/select>/)[0]), "no truncate / nowrap / ellipsis on the picker or its options");
  assert.ok(htmlAll.includes("data-problem-list") && !htmlKey.includes("data-problem-list"));
  assert.ok(htmlKey.includes(">Show all items<") && !htmlAll.includes(">Show all items<"));
  // Updated on/off does not change the structure above the buttons either.
  const htmlUpd = renderToStaticMarkup(createElement(SummaryPanel, { ...props(allRes, ""), updated: true }));
  assert.ok(htmlUpd.includes(">Updated<"));
  assert.equal(skeleton(htmlUpd), skeleton(htmlAll));
  // 3) "Show all items" resets the picker to All items ("").
  let picked = null;
  const tree = SummaryPanel.render({ ...props(keyRes, key.lid), onListing: (v) => { picked = v; } }, null);
  const find = (n) => {
    if (!n || typeof n !== "object") return null;
    if (Array.isArray(n)) { for (const c of n) { const f = find(c); if (f) return f; } return null; }
    if (n.props?.["data-show-all"] !== undefined) return n;
    return find(n.props?.children);
  };
  const btn = find(tree);
  assert.ok(btn, "Show all items button");
  assert.match(btn.props.className, /min-h-\[44px\]/, "≥ 44px tap target");
  btn.props.onClick();
  assert.equal(picked, "", "picker reset to All items");
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
  // No count line ever contains a 0 count, on either side, in any pick or mode.
  const zero = /(^|· )0 /;
  const shapes = new Set();
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
        assert.ok(!zero.test(v.countLine), `${name} incl=${incl} pick=${listing}: "${v.countLine}" has a 0 count`);
        shapes.add(v.countLine.replace(/\d+/g, "N"));
        if (v.problems.length > 0) {
          assert.ok(v.countLine.includes(" · ") || /need a look|with problems|left out/.test(v.countLine), `${name}: problem count shown next to rows`);
          assert.notEqual(v.note, "Everything is ready.");
        } else {
          assert.equal(v.showProblems, false);
        }
        assert.equal(v.showDownload, res.stats.exception_count > 0, `${name} pick=${listing}: download follows the whole file`);
        assert.equal(v.note === "Everything is ready.", res.stats.exception_count === 0 && !v.bothZero, `${name} pick=${listing}: "Everything is ready." only for a clean file (never on both-zero)`);
        checked++;
      }
    }
  }
  console.log(`# no-zero sweep: ${checked} views checked; count-line shapes: ${[...shapes].sort().join(" | ")}`);
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
  assert.equal(validateEvent({ v: 1, event: "price_intent", iid: "dog-" + iid, dogfood: false, props: {} }).event.dogfood, true);
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
      priceIntents: k.killBar.priceIntents,
      priceCardViews: k.priceCardViews,
      priceIntentRate: k.priceIntentRate,
      installsBackOnAnotherDay: k.installsBackOnAnotherDay,
      weeklyEngaged: k.weeklyEngaged,
      excluded: k.excluded,
    },
    expected,
  );
});

test("EXCLUDED_IIDS: owner/test devices are dropped by the server and ignored by the KPI script", async () => {
  assert.ok(Array.isArray(EXCLUDED_IIDS));
  const dev = "0b9d2c1e-1111-4222-8333-999999999999";
  assert.equal(isExcludedIid(dev, [dev]), true);
  assert.equal(isExcludedIid(iid, [dev]), false);
  assert.equal(isExcludedIid("", [dev]), false);
  // server: excluded iid → 204, skipped-filter (nothing stored); other iids go on to the store path
  const body = (who) => JSON.stringify({ v: 1, event: "price_intent", iid: who, dogfood: false, props: {} });
  const req = (who) => new Request("https://alignata.com/api/engrave-merge/e", { method: "POST", body: body(who) });
  const r1 = await handleEvent(req(dev), { excludedIids: [dev] });
  assert.equal(r1.status, 204);
  assert.equal(r1.headers.get("x-em-store"), "skipped-filter", "excluded device not stored");
  const r2 = await handleEvent(req(iid), { excludedIids: [dev] });
  assert.notEqual(r2.headers.get("x-em-store"), "skipped-filter", "other devices are not filtered");
  // KPI script
  const t = Date.parse("2026-10-05T14:00:00Z");
  const ev = (who, h, f) => ({ v: 1, event: "file_processed", iid: who, dogfood: false, props: { row_count: 9, item_count: 9, exception_count: 0, file_fingerprint: f }, ts: t + h * 3600e3, day: "2026-10-05", host: "alignata.com", prod: true });
  const k = computeKpis([ev(dev, 0, "d".repeat(64)), ev(iid, 2, "e".repeat(64))], t + 86400e3, [dev]);
  assert.equal(k.excluded.excludedIid, 1);
  assert.equal(k.killBar.distinctRealFiles, 1);
  assert.equal(k.t0, new Date(t + 2 * 3600e3).toISOString(), "an excluded device does not start the clock");
});

// The desk's source, split into its top-level handlers ("const name = ... \n  };").
const deskSrc = readFileSync(join(root, "components/engrave-merge/EngraveMergeDesk.tsx"), "utf8");
const handlerBody = (name) => {
  const start = deskSrc.indexOf(`  const ${name} = `);
  assert.ok(start >= 0, `handler ${name} exists`);
  return deskSrc.slice(start, deskSrc.indexOf("\n  };\n", start));
};

test("A settings re-run sends no event; only page open, file load, downloads, print and the price card do", () => {
  // Every sendEvent call in the desk, by event name: exactly these eight, once each (pro_interest_tap is gone).
  const calls = [...deskSrc.matchAll(/sendEvent\(iidRef\.current, "([a-z_]+)"/g)].map((m) => m[1]).sort();
  assert.deepEqual(calls, ["cutsheet_printed", "exceptions_downloaded", "file_processed", "merge_downloaded", "page_open", "price_card_view", "price_dismiss", "price_intent"]);
  // The re-run path: setters, font, settings file, Updated flash, picker, Start over → no event.
  for (const h of ["markUpdated", "setS", "setL", "toggleText", "onFont", "onLoadRecipe", "onStartOver", "onIncludeShipped"])
    assert.ok(!handlerBody(h).includes("sendEvent"), `${h} sends no event`);
  // The results are derived (useMemo) from process(); neither process nor summary can reach the tracker.
  for (const f of ["lib/engrave-merge/process.ts", "lib/engrave-merge/summary.ts"])
    assert.ok(!/from "\.\/track"|sendEvent/.test(readFileSync(join(root, f), "utf8")), `${f} has no tracking`);
  const memo = deskSrc.slice(deskSrc.indexOf("const result = useMemo("), deskSrc.indexOf("const ok: ProcessOk"));
  assert.ok(memo.includes("runProcess(") && !memo.includes("sendEvent"));
});

test("Start over keeps em_iid and sends no event", () => {
  const body = handlerBody("onStartOver");
  assert.ok(!/localStorage|IID_KEY|iidRef|sendEvent/.test(body), "Start over never touches the install id or events");
  for (const s of ["setFile(null)", "setSettings(DEFAULT_SETTINGS)", "setListingCfg({})", "setExtraLabels([])", "setListing(\"\")", "setFont(null)"])
    assert.ok(body.includes(s), `Start over clears: ${s}`);
  assert.ok(body.includes("window.scrollTo({ top: 0") && body.includes("fileInput.current?.focus("), "back to top, drop zone focused");
  // em_iid survives a reload after Start over: initInstallId reuses the stored id.
  const store = new Map();
  globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)) };
  try {
    const first = initInstallId("");
    assert.equal(store.get(IID_KEY), first);
    assert.equal(initInstallId(""), first, "same id next time");
  } finally {
    delete globalThis.localStorage;
  }
});

test("Page order at load: nothing but the drop zone and a collapsed Settings row above Make merge file (620px rule)", () => {
  const html = renderToStaticMarkup(createElement(EngraveMergeDesk));
  const at = (needle) => {
    const i = html.indexOf(needle);
    assert.ok(i >= 0, `${needle} rendered`);
    return i;
  };
  const order = ["data-dropzone", "Where do I find this file?", "data-settings", "data-primary", 'role="status"', "How to use this in LightBurn", "data-start-over"];
  const pos = order.map(at);
  assert.deepEqual([...pos].sort((a, b) => a - b), pos, `order: ${order.join(" → ")}`);
  const settingsTag = html.slice(html.lastIndexOf("<details", at("data-settings")), html.indexOf(">", at("data-settings")));
  assert.ok(!/\sopen(=|\s|>|$)/.test(settingsTag), "Settings collapsed by default");
  assert.ok(html.indexOf("data-item-settings") > at("data-settings") && html.indexOf("data-item-settings") < at("data-primary"), "Item settings inside Settings");
  assert.equal((html.match(/rounded-\[var\(--cb-radius-pill\)\][^"]*bg-\[var\(--cb-ink\)\]/g) || []).length, 1, "one black pill");
  assert.ok(!/data-start-over[^>]*radius-pill/.test(html), "Start over is not a pill");
  // Measured bottom of Make merge file at 390×844 is checked in the browser e2e (≤ 620px).
});

test("Redis keys: every key Engrave Merge writes or reads starts with the em: prefix", async () => {
  assert.equal(EM_KEY_PREFIX, "em:");
  const sent = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    const body = JSON.parse(init.body);
    const cmds = Array.isArray(body[0]) ? body : [body]; // pipeline (writer) or single command (KPI reader)
    sent.push(...cmds);
    const cmd = cmds[0][0];
    const result = cmd === "SCAN" ? ["0", [eventKey("2026-10-02")]] : cmd === "LRANGE" ? [] : "OK";
    return new Response(JSON.stringify(Array.isArray(body[0]) ? cmds.map(() => ({ result: "OK" })) : { result }), { status: 200 });
  };
  try {
    assert.equal(await appendEvent({ url: "https://kv.invalid", token: "t" }, "2026-10-02", "{}"), true);
    await readStore({ KV_REST_API_URL: "https://kv.invalid", KV_REST_API_READ_ONLY_TOKEN: "t" });
  } finally {
    globalThis.fetch = realFetch;
  }
  // Key argument per command: RPUSH/EXPIRE/LRANGE key = args[1]; SCAN … MATCH <pattern>.
  const keys = sent.map((c) => (c[0] === "SCAN" ? c[c.indexOf("MATCH") + 1] : c[1]));
  assert.deepEqual(sent.map((c) => c[0]), ["RPUSH", "EXPIRE", "SCAN", "LRANGE"], "only these commands");
  for (const k of keys) assert.ok(k.startsWith(EM_KEY_PREFIX), `key ${k} starts with ${EM_KEY_PREFIX}`);
  assert.ok(!sent.some((c) => c.includes("MATCH") && c[c.indexOf("MATCH") + 1] === "*"), "never scans the whole store");
  // The prefix comes from the one constant, and nothing else in the repo talks to a Redis/KV store.
  assert.ok(readFileSync(join(root, "lib/engrave-merge/store.ts"), "utf8").includes("${EM_KEY_PREFIX}ev:"));
  const allowed = new Set(["lib/engrave-merge/store.ts", "scripts/engrave-merge-kpis.mjs", "scripts/assert-engrave-merge.mjs"]);
  // The site tracker's reader (site:ev:* only, never em:*) is the one other client; its own tests check its keys.
  for (const f of ["scripts/site-baseline.mjs", "scripts/assert-site.mjs"]) {
    const src = readFileSync(join(root, f), "utf8");
    assert.ok(src.includes("site:ev:") && !/["'`]em:/.test(src), `${f} uses only site:ev: keys`);
    allowed.add(f);
  }
  const hits = [];
  const walk = (dir) => {
    for (const e of readdirSync(join(root, dir), { withFileTypes: true })) {
      const rel = `${dir}/${e.name}`;
      if (e.isDirectory()) walk(rel);
      else if (/\.(m?[jt]sx?)$/.test(e.name) && /KV_REST_API|UPSTASH_REDIS|@upstash\/redis|@vercel\/kv/.test(readFileSync(join(root, rel), "utf8")) && !allowed.has(rel)) hits.push(rel);
    }
  };
  for (const d of ["app", "components", "lib", "scripts"]) walk(d);
  assert.deepEqual(hits, [], "no other Redis/KV client in the repo");
});

test("Event endpoint: x-em-store header for every path (status 204, empty body), one safe log line", async () => {
  const env = ["KV_REST_API_URL", "KV_REST_API_TOKEN", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"];
  const saved = Object.fromEntries(env.map((k) => [k, process.env[k]]));
  const realFetch = globalThis.fetch;
  const realLog = console.log;
  const logs = [];
  const calls = [];
  let mode = "ok";
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), body: JSON.parse(init.body) });
    if (mode === "throw") throw new Error("network down");
    if (mode === "500") return new Response("{}", { status: 500 });
    return new Response(JSON.stringify([{ result: 1 }, { result: 1 }]), { status: 200 });
  };
  console.log = (...a) => logs.push(a.join(" "));
  const dogIid = "dog-" + iid;
  const ev = (extra = {}) =>
    new Request("https://alignata.com/api/engrave-merge/e", {
      method: "POST",
      body: JSON.stringify({ v: 1, event: "page_open", iid: dogIid, dogfood: true, props: {}, ...extra }),
    });
  const check = async (req, want) => {
    const r = await handleEvent(req);
    assert.equal(r.status, 204);
    assert.equal(await r.text(), "", "empty body");
    assert.equal(r.headers.get("x-em-store"), want);
    return r;
  };
  try {
    for (const k of env) delete process.env[k];
    await check(ev(), "skipped-config");
    process.env.KV_REST_API_URL = "https://kv.invalid";
    process.env.KV_REST_API_TOKEN = "t";
    await check(ev(), "stored"); // dogfood events ARE stored (flagged dogfood: true)
    const stored = JSON.parse(calls.at(-1).body[0][2]);
    assert.equal(stored.dogfood, true);
    assert.ok(calls.at(-1).body[0][1].startsWith("em:ev:"));
    mode = "500";
    await check(ev(), "error");
    mode = "throw";
    await check(ev(), "error");
    mode = "ok";
    const n = calls.length;
    const fixture = new Request("https://alignata.com/api/engrave-merge/e", {
      method: "POST",
      body: JSON.stringify({ v: 1, event: "file_processed", iid, dogfood: false, props: { row_count: 9, item_count: 9, exception_count: 0, file_fingerprint: FIXTURE_FINGERPRINTS[0] } }),
    });
    await check(fixture, "skipped-filter");
    assert.equal(calls.length, n, "filtered events never reach the store");
    const bad = await handleEvent(new Request("https://alignata.com/api/engrave-merge/e", { method: "POST", body: "nope" }));
    assert.equal(bad.status, 400);
  } finally {
    globalThis.fetch = realFetch;
    console.log = realLog;
    for (const k of env) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  }
  // Log lines: exactly "[engrave-merge] event <name> <result>", never an id or a value.
  assert.deepEqual(logs, [
    "[engrave-merge] event page_open skipped-config",
    "[engrave-merge] event page_open stored",
    "[engrave-merge] event page_open error",
    "[engrave-merge] event page_open error",
    "[engrave-merge] event file_processed skipped-filter",
  ]);
  assert.ok(!logs.some((l) => l.includes(iid) || l.includes("dog-")));
});

test("Picker label cut and Settings row length", async () => {
  const { COPY } = await import("../lib/engrave-merge/copy.ts");
  const long = "Personalized Engraved Wooden Cutting Board with Custom Family Name and Established Date, Walnut Maple or Cherry, Gift for Mom";
  const title140 = (long + " Housewarming Wedding").slice(0, 140);
  assert.equal(title140.length, 140);
  const { PICKER_LABEL_PX, labelWidthPx } = await import("../lib/engrave-merge/copy.ts");
  const opt = COPY.whichOneShort(title140, "3000000001");
  assert.match(opt, /… \(3000000001\)$/, "ends with … (listing ID)");
  const cut = opt.replace(/… \(3000000001\)$/, "");
  assert.ok(title140.startsWith(cut) && /\s/.test(title140[cut.length] ?? " "), "cut at a word break");
  // one line in the 358px select at 390 (WebKit wraps past ~305px of text)
  const titles = [title140, "Personalized Cutting Board - Custom Engraved Family Name", "PERSONALIZED CUTTING BOARD CUSTOM ENGRAVED FAMILY NAME WALNUT", "WWWW MMMM WWWW MMMM WWWW MMMM WWWW", "Supercalifragilisticexpialidociousnameboardsignwood", "Tabla de cortar grabada personalizada con nombre de familia y fecha"];
  for (const t of titles) {
    const l = COPY.whichOneShort(t, "3000000001");
    assert.ok(labelWidthPx(l) <= PICKER_LABEL_PX, `${l}: ${labelWidthPx(l)}px fits one line`);
    assert.match(l, /\(3000000001\)$/);
  }
  assert.equal(COPY.whichOneShort("Personalized Cutting Board - Custom Engraved Family Name", "3000000001"), "Personalized Cutting… (3000000001)", "fx01 Cutting Board");
  assert.equal(COPY.whichOneShort("Supercalifragilisticexpialidociousnameboardsignwood", "3000000001").endsWith("… (3000000001)"), true, "one very long word is cut by letters");
  assert.equal(COPY.whichOneShort("Custom Engraved Keychain", "3000000002"), "Custom Engraved Keychain (3000000002)", "short titles unchanged");
  assert.equal(COPY.settingsRow(0), "Settings · Standard");
  assert.equal(COPY.settingsRow(3), "Settings · 3 changed");
  for (const n of [0, 1, 9, 12, 99]) assert.ok(COPY.settingsRow(n).length <= 35);
});

test("Nothing to engrave: with and without hidden shipped orders", () => {
  const raw = read("fx01_simple.csv");
  const { header, rows } = readCsv(raw);
  const q = (v) => (/[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const line = (r) => header.map((h) => q(r[h] ?? "")).join(",");
  const allShipped = [header.map(q).join(","), ...rows.map((r) => line({ ...r, "Date Shipped": "09/30/2026" }))].join("\n") + "\n";
  // shipped-orders setting OFF (default): every row hidden → both lines
  const hid = emProcess(allShipped);
  assert.equal(hid.stats.hidden_shipped, rows.length);
  const v1 = summaryView(hid, false);
  assert.equal(v1.countLine, "Nothing to engrave in this file.");
  assert.equal(v1.note, "Orders already shipped are hidden.");
  assert.equal(v1.showIncludeShipped, true, "button shown when shipped rows are hidden");
  assert.equal(v1.showAllButton, false);
  // the panel: outlined 44px button like Show all items (not the black pill); tap → onIncludeShipped
  const panel = (view, extra = {}) => ({ view, listings: hid.listings, listing: "", onListing: () => {}, onProblems: () => {}, onPrint: () => {}, ...extra });
  const html = renderToStaticMarkup(createElement(SummaryPanel, panel(v1)));
  const btnTag = html.match(/<button[^>]*data-include-shipped[^>]*>/)[0];
  assert.match(btnTag, /min-h-\[44px\][^"]*rounded-xl border/, "outlined 44px, same class as Show all items");
  assert.ok(!/radius-pill|bg-\[var\(--cb-ink\)\]/.test(btnTag), "not a black pill");
  assert.match(html, />Include shipped orders</);
  assert.ok(!html.includes("data-count-line"), "both-zero: no count line");
  const normal = renderToStaticMarkup(createElement(SummaryPanel, panel(summaryView(emProcess(read("fx01_simple.csv")), false))));
  assert.match(normal, /data-count-line="true" tabindex="-1"/, "count line focusable (tabIndex -1) for the focus after the tap");
  let flipped = 0;
  const tree = SummaryPanel.render(panel(v1, { onIncludeShipped: () => flipped++ }), null);
  const find = (n) => {
    if (!n || typeof n !== "object") return null;
    if (Array.isArray(n)) { for (const c of n) { const f = find(c); if (f) return f; } return null; }
    if (n.props?.["data-include-shipped"] !== undefined) return n;
    return find(n.props?.children);
  };
  find(tree).props.onClick();
  assert.equal(flipped, 1, "tap calls onIncludeShipped once");
  assert.equal(summaryView(hid, true).countLine, "Nothing to engrave in this file.");
  // setting ON: the same rows are kept and ready
  const shown = emProcess(allShipped, { settings: { includeShipped: true }, explicit: ["includeShipped"] });
  assert.equal(summaryView(shown, false).countLine, `${rows.length} ready for LightBurn`);
  // no rows hidden (header only): first line only, never "Everything is ready."
  const empty = emProcess(header.map(q).join(",") + "\n");
  assert.ok(!empty.error, "header-only file still loads");
  assert.equal(empty.stats.hidden_shipped, 0);
  const v2 = summaryView(empty, false);
  assert.equal(v2.countLine, "Nothing to engrave in this file.");
  assert.equal(v2.note, null);
  assert.equal(v2.showIncludeShipped, false, "no button when nothing is hidden");
  assert.ok(!renderToStaticMarkup(createElement(SummaryPanel, { view: v2, listings: [], listing: "", onListing() {}, onProblems() {}, onPrint() {} })).includes("data-include-shipped"));
  // files with items never show it, even with hidden shipped rows
  const mixed = emProcess(read("fx04_mixed_shipped.csv"));
  if (mixed.stats.hidden_shipped > 0) assert.equal(summaryView(mixed, false).showIncludeShipped, false);
  // the desk wires the button to the Settings toggle itself: setS("includeShipped", true), no event
  const body = handlerBody("onIncludeShipped");
  assert.ok(body.includes('setS("includeShipped", true)') && !body.includes("sendEvent"));
});

test("EXCLUDED_IIDS includes Product's no-flag test visit → x-em-store: skipped-filter", async () => {
  const product = "55ac19e0-0d84-445a-8b0f-d4d4357bd965";
  assert.ok(EXCLUDED_IIDS.includes(product));
  const realLog = console.log;
  console.log = () => {};
  try {
    const r = await handleEvent(
      new Request("https://alignata.com/api/engrave-merge/e", {
        method: "POST",
        body: JSON.stringify({ v: 1, event: "page_open", iid: product, dogfood: false, props: {} }),
      }),
    ); // default list, no override
    assert.equal(r.status, 204);
    assert.equal(r.headers.get("x-em-store"), "skipped-filter");
  } finally {
    console.log = realLog;
  }
});

test("Both-zero (fx08: every order shipped) vs fx09 (5 ready rows with blank text) vs fx04", () => {
  const fx08 = emProcess(read("fx08-all-shipped.csv"));
  const v = summaryView(fx08, false);
  assert.equal(v.bothZero, true);
  assert.equal(v.countLine, "Nothing to engrave in this file.");
  assert.equal(v.note, "Orders already shipped are hidden.");
  assert.equal(v.showIncludeShipped, true);
  assert.equal(v.showDownload, false);
  assert.equal(v.showAllButton, false);
  assert.equal(v.warning, null);
  assert.equal(summaryView(fx08, true).bothZero, true, "include-anyway ON: still both-zero");
  const html = renderToStaticMarkup(createElement(SummaryPanel, { view: v, listings: fx08.listings, listing: "", onListing() {}, onProblems() {}, onPrint() {} }));
  assert.ok(!html.includes("<select"), "picker hidden");
  assert.ok(!html.includes("data-actions") && !html.includes("Print cut sheet") && !html.includes("Download problem list"), "no Print cut sheet / downloads");
  assert.ok(!html.includes("Everything is ready."));
  assert.match(html, /<div data-both-zero="true"[^>]*><div data-status-lines="true" role="status"[^>]*><p[^>]*>Nothing to engrave in this file\.<\/p><p[^>]*>Orders already shipped are hidden\.<\/p><\/div><button[^>]*data-include-shipped/, "role=status (2 lines only) in the count line's spot, Include shipped orders after it");
  assert.ok(!html.includes("data-count-line"), "count line hidden (never 0 ready)");
  assert.ok(html.indexOf("data-both-zero") < html.indexOf("data-updated"), "20px Updated slot kept, under the block");
  assert.equal((html.match(/data-include-shipped/g) || []).length, 1);
  assert.match(deskSrc, /const nothingToMake = !!view && view\.nothingToMake;/);
  assert.match(deskSrc, /const hideHint = nothingToMake && status\.text === COPY\.statusReady;/, "hint hidden on both-zero");
  assert.match(deskSrc, /\{hideHint \? "" : status\.text\}/);
  // the desk hides Make merge file in this state and never downloads/counts a 0-row merge file
  assert.match(deskSrc, /\{!nothingToMake && \(\s*<button type="button" data-primary/, "Make merge file hidden on both-zero");
  // include shipped → 6 ready, back to normal
  const on = emProcess(read("fx08-all-shipped.csv"), { settings: { includeShipped: true }, explicit: ["includeShipped"] });
  const von = summaryView(on, false);
  assert.equal(von.bothZero, false);
  assert.equal(von.countLine, "6 ready for LightBurn");
  assert.equal(von.note, "Everything is ready.");
  assert.equal(von.showIncludeShipped, false);
  // fx09: NOT both-zero (blank-text rows are ready rows, like fx05's Blank Coaster Set)
  const v9 = summaryView(emProcess(read("fx09-no-engravable.csv")), false);
  assert.equal(v9.bothZero, false);
  assert.equal(v9.countLine, "5 ready for LightBurn");
  assert.equal(v9.note, "Everything is ready.");
  assert.equal(v9.showIncludeShipped, false);
  // fx04 (some shipped, some not): never both-zero, no button
  const v4 = summaryView(emProcess(read("fx04_mixed_shipped.csv")), false);
  assert.equal(v4.bothZero, false);
  assert.equal(v4.showIncludeShipped, false);
  assert.notEqual(v4.countLine, "Nothing to engrave in this file.");
});

test("merge_downloaded never fires with 0 rows (sendEvent guard)", async () => {
  const { sendEvent } = await import("../lib/engrave-merge/track.ts");
  const sent = [];
  const saved = { nav: globalThis.navigator, fetch: globalThis.fetch };
  Object.defineProperty(globalThis, "navigator", { value: { sendBeacon: (u) => (sent.push(u), true) }, configurable: true, writable: true });
  globalThis.fetch = async (u) => (sent.push(u), new Response(null, { status: 204 }));
  try {
    sendEvent("dog-" + iid, "merge_downloaded", { file_fingerprint: fp, merge_row_count: 0 });
    sendEvent("dog-" + iid, "merge_downloaded", { file_fingerprint: fp });
    assert.equal(sent.length, 0, "0 rows (or missing) → nothing sent");
    sendEvent("dog-" + iid, "merge_downloaded", { file_fingerprint: fp, merge_row_count: 6 });
    sendEvent("dog-" + iid, "page_open");
    assert.equal(sent.length, 2, "real downloads and other events still go out");
  } finally {
    Object.defineProperty(globalThis, "navigator", { value: saved.nav, configurable: true, writable: true });
    globalThis.fetch = saved.fetch;
  }
});

test("Re-list: Engrave Merge card has the About fields; robots + sitemap list only listed pages", async () => {
  const apps = JSON.parse(readFileSync(join(root, "public/apps.json"), "utf8")).apps;
  const em = apps.find((a) => a.id === "engrave-merge");
  assert.ok(em, "card present");
  assert.deepEqual(Object.keys(em).sort(), Object.keys(apps[0]).sort(), "same shape as the other cards");
  assert.equal(em.blurb, "Turn Etsy orders into a LightBurn file, ready to engrave.");
  assert.equal(em.how.length, 4);
  assert.equal(em.how[0], "In Etsy, download the \u201cOrder Items\u201d file.");
  assert.equal(em.how[1], "Drop it here and tap \u201cMake merge file\u201d.");
  assert.doesNotMatch(readFileSync(join(root, "app/engrave-merge/page.tsx"), "utf8"), /robots|noindex/);
  const robots = (await import("../app/robots.ts")).default();
  assert.deepEqual(robots, { rules: { userAgent: "*", allow: "/" }, sitemap: "https://alignata.com/sitemap.xml" });
  const urls = (await import("../app/sitemap.ts")).default().map((e) => e.url);
  const { posts } = await import("../content/posts.ts");
  // Tool stories /apps/<slug> (CEO, Oct 3): every tool with a story; Deploy Decision Card has none.
  const stories = urls.filter((u) => /^https:\/\/alignata\.com\/apps\/[a-z0-9-]+$/.test(u));
  assert.equal(stories.length, apps.length - 1, "one story per listed tool except Deploy Decision Card");
  assert.ok(!stories.includes("https://alignata.com/apps/deploy-decision-card"), "no Deploy Decision story");
  // Published guides /guides/<slug> (Oct 3): drafts never.
  const { guideSitemapEntries } = await import("../lib/guides/guides.ts");
  const guides = urls.filter((u) => u.startsWith("https://alignata.com/guides/"));
  assert.deepEqual(guides, guideSitemapEntries().map((e) => e.url));
  // Company pages (Oct 3): the shipped ones only (content/company.ts COMPANY_PATHS; /terms is held).
  const { COMPANY_PATHS } = await import("../content/company.ts");
  const company = urls.filter((u) => COMPANY_PATHS.some((p) => u === `https://alignata.com${p}`));
  assert.deepEqual(company, COMPANY_PATHS.map((p) => `https://alignata.com${p}`));
  assert.equal(urls.length, 2 + apps.length + stories.length + 1 + posts.length + company.length + guides.length);
  assert.equal(new Set(urls).size, urls.length, "no duplicates");
  for (const u of ["https://alignata.com", "https://alignata.com/apps", "https://alignata.com/engrave-merge", "https://alignata.com/daily-digest"]) assert.ok(urls.includes(u), u);
  for (const p of posts) assert.ok(urls.includes(`https://alignata.com/daily-digest/${p.slug}`));
  assert.ok(!urls.some((u) => /\/(blog|llm-digest)(\/|$)/.test(u)), "no redirect-only paths");
  for (const u of urls) assert.match(u, /^https:\/\/alignata\.com(\/[a-z0-9-]+)*$/, "kebab paths on alignata.com");
});


function caseInput(c) {
  const settings = {};
  for (const [k, v] of Object.entries(c.config || {})) if (k !== "listing") settings[CFG_MAP[k]] = v;
  return { text: read(c.fixture), settings };
}

// Synthetic two-listing file: A (3000000001) has 2 good orders; B (3000000002) only has Quantity-0 orders (held).
function synthNoReady(bRows) {
  const raw = read("fx01_simple.csv");
  const nl = raw.includes("\r\n") ? "\r\n" : "\n";
  const head = raw.split(nl)[0].split(",").map((h) => h.replace(/^"|"$/g, ""));
  const row = (o, lid, name, qty) =>
    head.map((h) => ({ "Order ID": o, "Transaction ID": `2${o}`, "Listing ID": lid, "Item Name": name, Quantity: qty, Variations: `Personalization:${o}`, "Sale Date": "09/20/26" })[h] ?? "")
      .map((v) => `"${v}"`).join(",");
  const rows = [row("100001", "3000000001", "Cutting Board", "1"), row("100002", "3000000001", "Cutting Board", "1")];
  for (let i = 0; i < bRows; i++) rows.push(row(`10010${i}`, "3000000002", "Keychain", "0"));
  return head.map((h) => `"${h}"`).join(",") + nl + rows.join(nl) + nl;
}

test('Grammar: "1 needs a look" (singular) and "{n} need a look" (plural), count line and clean-pick line', async () => {
  const { COPY } = await import("../lib/engrave-merge/copy.ts");
  assert.equal(COPY.countNeedLook(1), "1 needs a look");
  assert.equal(COPY.countNeedLook(2), "2 need a look");
  assert.equal(COPY.summaryPickReadyOthers(1), "Everything you picked is ready. 1 other item in your file needs a look.");
  assert.equal(COPY.summaryPickReadyOthers(2), "Everything you picked is ready. 2 other items in your file need a look.");
  // fx05 Blank Coaster pick (3000000006) and fx06 (all items + its one listing): n = 1
  const fx05 = read("fx05_exceptions.csv");
  assert.equal(summaryView(emProcess(fx05, { listing: "3000000006" }), false).countLine, "2 ready for LightBurn · 1 needs a look");
  const fx06 = read("fx06_multifield_GUESS.csv");
  assert.equal(summaryView(emProcess(fx06), false).countLine, "2 ready for LightBurn · 1 needs a look");
  assert.equal(summaryView(emProcess(fx06, { listing: "3000000008" }), false).countLine, "2 ready for LightBurn · 1 needs a look");
  // synthetic n = 1 and n = 2
  assert.equal(summaryView(emProcess(synthNoReady(1)), false).countLine, "2 ready for LightBurn · 1 needs a look");
  assert.equal(summaryView(emProcess(synthNoReady(2)), false).countLine, "2 ready for LightBurn · 2 need a look");
  // clean pick, others need a look: n = 1 and n = 2
  assert.equal(summaryView(emProcess(synthNoReady(1), { listing: "3000000001" }), false).note, "Everything you picked is ready. 1 other item in your file needs a look.");
  assert.equal(summaryView(emProcess(synthNoReady(2), { listing: "3000000001" }), false).note, "Everything you picked is ready. 2 other items in your file need a look.");
  // sweep: never "1 need a look" / "1 other items" anywhere
  for (const c of cases) {
    const { text, settings } = caseInput(c);
    const base = emProcess(text, { settings, explicit: Object.keys(settings) });
    if (!base.listings) continue; // fx07 wrong file
    for (const lid of [undefined, ...base.listings.map((l) => l.lid)]) {
      for (const incl of [false, true]) {
        const v = summaryView(emProcess(text, { listing: lid, settings: { ...settings, includeFlagged: incl }, explicit: [...Object.keys(settings), "includeFlagged"] }), incl);
        assert.doesNotMatch(`${v.countLine} ${v.note ?? ""}`, /\b1 need a look|\b1 other items/, `${c.name} ${lid} ${incl}`);
      }
    }
  }
});

test("0 ready rows for a pick while problems remain: no Make merge file / hint / Print cut sheet; note points to the problem list", () => {
  for (const b of [1, 2]) {
    const res = emProcess(synthNoReady(b), { listing: "3000000002" });
    assert.equal(res.stats.ready_items, 0);
    assert.equal(res.stats.merge_row_count, 0);
    const v = summaryView(res, false);
    assert.equal(v.noReady, true);
    assert.equal(v.bothZero, false);
    assert.equal(v.countLine, b === 1 ? "1 item needs a look" : "2 items need a look", "Copy's line; no 0 in the count line");
    assert.equal(v.note, "Nothing is ready to engrave yet. The problem list says why.");
    assert.equal(v.warning, null);
    assert.equal(v.showAllButton, false);
    assert.equal(v.showProblems, true);
    assert.equal(v.showDownload, true, "Download problem list stays (the line points to it)");
    assert.equal(v.problems.length, b);
    const html = renderToStaticMarkup(createElement(SummaryPanel, { view: v, listings: res.listings, listing: "3000000002", onListing() {}, onProblems() {}, onPrint() {} }));
    assert.ok(!html.includes("Print cut sheet"), "Print cut sheet hidden");
    assert.match(html, /data-download-problems/);
    assert.match(html, /data-count-line="true"[^>]*>(1 item needs a look|2 items need a look)<\/p>/, "count line in its usual spot");
    assert.ok(html.includes("Nothing is ready to engrave yet. The problem list says why."), "the line is shown");
    assert.ok(html.indexOf("data-count-line") < html.indexOf("Nothing is ready to engrave yet"), "line under the count");
  }
  // other picks / All items keep everything
  for (const lid of [undefined, "3000000001"]) assert.equal(summaryView(emProcess(synthNoReady(1), { listing: lid }), false).noReady, false);
  // include-anyway ON: the flagged items go in the merge file, so there is something to make
  assert.equal(summaryView(emProcess(synthNoReady(1), { listing: "3000000002", settings: { includeFlagged: true }, explicit: ["includeFlagged"] }), true).noReady, false);
  // only fx10's Recipe Box pick (include-anyway OFF) is 0-ready; fx08 both-zero is its own state
  for (const c of cases) {
    const res = runCase(c);
    if (!res.listings) continue; // fx07 wrong file
    assert.equal(summaryView(res, !!caseInput(c).settings.includeFlagged).noReady, c.name === "fx10_zero_ready_listing__listing_b", c.name);
  }
  // desk: hidden primary + hint, and Make merge file never makes a 0-row file
  assert.match(deskSrc, /\{!nothingToMake && \(\s*<button type="button" data-primary/);
  assert.match(deskSrc, /if \(ok\.stats\.merge_row_count === 0\) return;/);
});

test("Copy: no placeholder text ships", async () => {
  const { COPY } = await import("../lib/engrave-merge/copy.ts");
  const call = (f) => { for (const args of [[1, "x"], [["x"]], ["x", 1]]) { try { return [String(f(...args))]; } catch { /* other signature */ } } return []; };
  const strings = Object.values(COPY).flatMap((v) => (typeof v === "string" ? [v] : Array.isArray(v) ? v : typeof v === "function" ? [...call(v), String(v)] : []));
  for (const t of strings) assert.doesNotMatch(String(t), /PENDING|placeholder|TODO|\[COPY/i, t);
});


test("fx10 Recipe Box (3000000011): 0 ready, 5 need a look → the 0-ready lines, NOT the both-zero screen", () => {
  const c = cases.find((x) => x.name === "fx10_zero_ready_listing__listing_b");
  const res = runCase(c);
  assert.equal(res.stats.ready_items, 0);
  assert.equal(res.stats.merge_row_count, 0);
  assert.equal(mergeCsv(res), read("expected/fx10_zero_ready_listing__listing_b/expected_merge.csv"), "header-only golden");
  const v = summaryView(res, false);
  assert.equal(v.noReady, true);
  assert.equal(v.bothZero, false, "not the empty-file screen");
  assert.equal(v.countLine, "5 items need a look");
  assert.equal(v.note, "Nothing is ready to engrave yet. The problem list says why.");
  assert.equal(v.showIncludeShipped, false);
  assert.equal(v.showDownload, true);
  assert.equal(v.problems.length, 5);
  assert.equal(v.problems.reduce((n, p) => n + p.counted, 0), 5, "table adds up to 5");
  const html = renderToStaticMarkup(createElement(SummaryPanel, { view: v, listings: res.listings, listing: "3000000011", onListing() {}, onProblems() {}, onPrint() {} }));
  assert.ok(!html.includes("data-both-zero") && !html.includes("Nothing to engrave in this file."), "no both-zero block");
  assert.ok(!html.includes("Print cut sheet"));
  assert.match(html, /data-count-line="true"[^>]*>5 items need a look<\/p>/);
  assert.ok(html.includes("Nothing is ready to engrave yet. The problem list says why."));
  assert.match(html, /data-download-problems/);
  assert.match(html, /data-which-items/, "picker stays (to pick something else)");
  // All items, Pet Tag pick and include-anyway are normal
  const all = summaryView(runCase(cases.find((x) => x.name === "fx10_zero_ready_listing")), false);
  assert.equal(all.noReady, false);
  assert.equal(all.countLine, "3 ready for LightBurn · 5 need a look");
  const a = summaryView(runCase(cases.find((x) => x.name === "fx10_zero_ready_listing__listing_a")), false);
  assert.equal(a.noReady, false);
  assert.equal(a.countLine, "3 ready for LightBurn");
  assert.equal(a.note, "Everything you picked is ready. 5 other items in your file need a look.");
  const inc = summaryView(runCase(cases.find((x) => x.name === "fx10_zero_ready_listing__listing_b_include_flagged")), true);
  assert.equal(inc.noReady, false, "include-anyway ON: 5 in the merge file");
  assert.equal(inc.countLine, "5 in your merge file · 5 with problems");
});

test("Picker labels: whole label (with … (id)) ≤ 40 characters and ≤ one line, for every listing in every fixture", async () => {
  const { COPY, PICKER_LABEL_PX, PICKER_LABEL_CHARS, labelWidthPx } = await import("../lib/engrave-merge/copy.ts");
  assert.equal(PICKER_LABEL_CHARS, 40);
  let n = 0;
  for (const f of readdirSync(FX).filter((x) => x.endsWith(".csv"))) {
    const res = emProcess(read(f));
    for (const l of res.listings || []) {
      const label = COPY.whichOneShort(l.itemName, l.lid);
      assert.ok(label.length <= 40, `${f} ${l.lid}: "${label}" = ${label.length} chars`);
      assert.ok(labelWidthPx(label) <= PICKER_LABEL_PX, `${label}: one line`);
      assert.ok(label.endsWith(`(${l.lid})`));
      if (label !== COPY.whichOne(l.itemName, l.lid)) {
        const cut = label.replace(` (${l.lid})`, "").replace(/…$/, "");
        assert.ok(l.itemName.startsWith(cut) && /\s/.test(l.itemName[cut.length] ?? " "), `${label}: cut at a word break`);
      }
      n++;
    }
  }
  assert.ok(n >= 15, `${n} labels checked`);
  assert.equal(COPY.whichOneShort("Personalized Engraved Wooden Recipe Box with Family Name - Fake Test Item", "3000000011"), "Personalized Engraved… (3000000011)");
});


test('Include-anyway ON: "1 with a problem" (n = 1), "{n} with problems" (n = 2)', async () => {
  const { COPY } = await import("../lib/engrave-merge/copy.ts");
  assert.equal(COPY.countWithProblems(1), "1 with a problem");
  assert.equal(COPY.countWithProblems(2), "2 with problems");
  const one = (lid) => summaryView(emProcess(synthNoReady(1), { listing: lid, settings: { includeFlagged: true }, explicit: ["includeFlagged"] }), true).countLine;
  const two = (lid) => summaryView(emProcess(synthNoReady(2), { listing: lid, settings: { includeFlagged: true }, explicit: ["includeFlagged"] }), true).countLine;
  assert.equal(one(undefined), "3 in your merge file · 1 with a problem");
  assert.equal(two(undefined), "4 in your merge file · 2 with problems");
  // fx06 has exactly one problem item
  assert.equal(summaryView(emProcess(read("fx06_multifield_GUESS.csv"), { settings: { includeFlagged: true }, explicit: ["includeFlagged"] }), true).countLine, "3 in your merge file · 1 with a problem");
});

test("fx11 shipped listing pick (3000000012): Nothing to engrave in this listing; no Make merge file / hint / Print; 0 events", async () => {
  const { COPY } = await import("../lib/engrave-merge/copy.ts");
  assert.equal(COPY.shippedPickOthers(1), "1 other item needs a look.");
  assert.equal(COPY.shippedPickOthers(2), "2 other items need a look.");
  const c = cases.find((x) => x.name === "fx11_shipped_listing_pick__shipped_listing");
  const res = runCase(c);
  assert.equal(res.stats.ready_items, 0);
  assert.equal(res.stats.merge_row_count, 0);
  assert.equal(mergeCsv(res), read("expected/fx11_shipped_listing_pick__shipped_listing/expected_merge.csv"));
  const v = summaryView(res, false);
  assert.equal(v.shippedPick, true);
  assert.equal(v.bothZero, false);
  assert.equal(v.noReady, false);
  assert.equal(v.nothingToMake, true);
  assert.equal(v.countLine, "Nothing to engrave in this listing.");
  assert.equal(v.note, "Orders already shipped are hidden.");
  assert.equal(v.othersNote, "2 other items need a look.", "short note, this screen only");
  assert.equal(v.showIncludeShipped, true);
  assert.equal(v.showAllButton, true);
  assert.equal(v.showDownload, true, "as on a clean pick: the file has problems");
  assert.equal(v.showProblems, false);
  assert.equal(v.warning, null);
  // include-anyway ON: same screen (nothing in this listing either way)
  const vin = summaryView(emProcess(read(c.fixture), { listing: "3000000012", settings: { includeFlagged: true }, explicit: ["includeFlagged"] }), true);
  assert.equal(vin.shippedPick, true);
  assert.equal(vin.countLine, "Nothing to engrave in this listing.");
  const html = renderToStaticMarkup(createElement(SummaryPanel, { view: v, listings: res.listings, listing: "3000000012", onListing() {}, onProblems() {}, onPrint() {} }));
  const order = ["data-which-items", 'data-shipped-pick="true"', 'data-status-lines="true" role="status"', "Nothing to engrave in this listing.", "Orders already shipped are hidden.", "data-include-shipped", "data-others-note", "data-show-all", "data-download-problems"].map((k) => html.indexOf(k));
  assert.ok(order.every((i) => i >= 0), `all present: ${order}`);
  assert.deepEqual([...order].sort((a, b) => a - b), order, "picker → 2 status lines → Include shipped orders → note → Show all items → Download problem list");
  assert.ok(!html.includes("data-updated"), "no Updated slot on this screen");
  assert.ok(!html.includes("data-actions"), "the usual downloads row is not used on this screen");
  assert.equal((html.match(/data-download-problems/g) || []).length, 1);
  const block = html.slice(html.indexOf("data-shipped-pick"), html.indexOf("</section>"));
  assert.match(block, /class="space-y-2"/, "stacked 8px apart");
  for (const k of ["data-include-shipped", "data-show-all", "data-download-problems"]) assert.match(block, new RegExp(`<button type="button" ${k}="true" class="flex w-fit min-h-\\[44px\\][^"]*border border-\\[var\\(--cb-ink\\)\\] bg-\\[var\\(--cb-surface\\)\\]`), `${k}: outlined 44px, not a pill`);
  assert.ok(!html.includes("data-count-line"), "no count line");
  assert.ok(!html.includes("Print cut sheet"));
  assert.ok(!html.includes("data-both-zero"));
  assert.ok(!/rounded-full|bg-\[var\(--cb-ink\)\]/.test(html), "no black pill on the panel");
  const visible = html.replace(/<select[\s\S]*?<\/select>/, "").replace(/<[^>]+>/g, " ");
  assert.doesNotMatch(visible, /(^|[^\d])0([^\d]|$)/, "no 0 count visible");
  assert.equal((html.match(/Everything you picked is ready/g) || []).length, 0, "the clean-pick line is not on this screen");
  // after Include shipped orders: 2 ready + the clean-pick note; the file matches the golden
  const on = runCase(cases.find((x) => x.name === "fx11_shipped_listing_pick__shipped_listing_include_shipped"));
  const von = summaryView(on, false);
  assert.equal(von.shippedPick, false);
  assert.equal(von.countLine, "2 ready for LightBurn");
  assert.equal(von.note, "Everything you picked is ready. 2 other items in your file need a look.");
  assert.equal(mergeCsv(on), read("expected/fx11_shipped_listing_pick__shipped_listing_include_shipped/expected_merge.csv"));
  // All items and the other picks are normal
  const all = summaryView(runCase(cases.find((x) => x.name === "fx11_shipped_listing_pick")), false);
  assert.equal(all.shippedPick, false);
  assert.equal(all.countLine, "4 ready for LightBurn · 2 need a look");
  // only this pick (default + include-anyway) is a shipped pick across all cases
  for (const x of cases) {
    const r = runCase(x);
    if (!r.listings) continue;
    assert.equal(summaryView(r, !!x.config?.include_flagged).shippedPick, x.name === "fx11_shipped_listing_pick__shipped_listing", x.name);
  }
  // desk: Make merge file / hint follow nothingToMake; Print cut sheet never fires cutsheet_printed on a 0-row merge
  assert.match(deskSrc, /if \(!ok \|\| ok\.stats\.merge_row_count === 0\) return; \/\/ nothing to make: no cut sheet, no event/);
});

test("RULE: nothing to make → no Make merge file, no Print cut sheet (every case, every pick, both modes)", () => {
  for (const c of cases) {
    const { text, settings } = caseInput(c);
    const base = emProcess(text, { settings, explicit: Object.keys(settings) });
    if (!base.listings) continue;
    for (const lid of [undefined, ...base.listings.map((l) => l.lid)]) {
      for (const incl of [false, true]) {
        const r = emProcess(text, { listing: lid, settings: { ...settings, includeFlagged: incl }, explicit: [...Object.keys(settings), "includeFlagged"] });
        const v = summaryView(r, incl);
        assert.equal(v.nothingToMake, r.stats.merge_row_count === 0, `${c.name} ${lid} ${incl}`);
        const html = renderToStaticMarkup(createElement(SummaryPanel, { view: v, listings: r.listings, listing: lid ?? "", onListing() {}, onProblems() {}, onPrint() {} }));
        assert.equal(html.includes("Print cut sheet"), r.stats.merge_row_count > 0, `${c.name} ${lid} ${incl}: Print cut sheet`);
      }
    }
  }
});


test('role="status": both-zero (fx08), all-shipped listing pick (fx11), 0-ready pick (fx10); downloads row unchanged elsewhere', () => {
  const render = (name, incl = false) => {
    const c = cases.find((x) => x.name === name);
    const res = runCase(c);
    const v = summaryView(res, incl);
    return { v, html: renderToStaticMarkup(createElement(SummaryPanel, { view: v, listings: res.listings, listing: c.config?.listing ?? "", onListing() {}, onProblems() {}, onPrint() {} })) };
  };
  const statusTexts = (html) => [...html.matchAll(/<(\w+)[^>]*role="status"[^>]*>([\s\S]*?)<\/\1>/g)].map((m) => m[2].replace(/<[^>]+>/g, "|"));
  const bz = render("fx08-all-shipped");
  assert.equal(bz.v.bothZero, true);
  assert.match(bz.html, /<div data-both-zero="true" class="[^"]*"><div data-status-lines="true" role="status"/);
  assert.ok(statusTexts(bz.html).some((t) => t.includes("Nothing to engrave in this file.") && t.includes("Orders already shipped are hidden.")));
  assert.match(bz.html, /data-updated/, "both-zero keeps its 20px Updated slot");
  const sp = render("fx11_shipped_listing_pick__shipped_listing");
  assert.equal(sp.v.shippedPick, true);
  assert.match(sp.html, /<div data-shipped-pick="true" class="[^"]*"><div data-status-lines="true" role="status"/);
  assert.ok(statusTexts(sp.html).some((t) => t.includes("Nothing to engrave in this listing.") && t.includes("Orders already shipped are hidden.")));
  const nr = render("fx10_zero_ready_listing__listing_b");
  assert.equal(nr.v.noReady, true);
  assert.match(nr.html, /<p data-count-line="true" role="status" tabindex="-1"[^>]*>5 items need a look<\/p>/, "count line is a status");
  assert.match(nr.html, /<span data-note-line="true" role="status"[^>]*>Nothing is ready to engrave yet\. The problem list says why\.<\/span>/, "note is a status");
  // fx10: downloads row stays in its usual place (count line → Updated → downloads → note)
  const pos = ["data-count-line", "data-updated", "data-actions", "data-download-problems", "Nothing is ready to engrave yet"].map((k) => nr.html.indexOf(k));
  assert.deepEqual([...pos].sort((a, b) => a - b), pos);
  // other screens: no extra status roles, usual downloads row
  for (const name of ["fx05_exceptions", "fx10_zero_ready_listing__listing_a", "fx11_shipped_listing_pick", "fx01_simple"]) {
    const o = render(name);
    assert.ok(!/role="status"/.test(o.html), `${name}: no status role`);
    assert.match(o.html, /data-actions/, `${name}: usual downloads row`);
    assert.match(o.html, /data-updated/, `${name}: Updated slot`);
  }
});

/** Every role="status" element in static markup, with its balanced inner HTML. */
function statusRegions(html) {
  const out = [];
  for (const m of html.matchAll(/<(\w+)\b[^>]*\brole="status"[^>]*>/g)) {
    const tag = m[1];
    const re = new RegExp(`<${tag}\\b[^>]*>|</${tag}>`, "g");
    re.lastIndex = m.index + m[0].length;
    let depth = 1, end = -1, t;
    while ((t = re.exec(html))) {
      depth += t[0].startsWith("</") ? -1 : 1;
      if (depth === 0) { end = t.index; break; }
    }
    assert.ok(end > 0, `unclosed <${tag} role="status">`);
    const inner = html.slice(m.index + m[0].length, end);
    out.push({ open: m[0], inner, text: inner.replace(/<[^>]+>/g, "|").replace(/\|+/g, "|").replace(/^\||\|$/g, "") });
  }
  return out;
}
const INTERACTIVE = /<(button|a|input|select|textarea|option|details|summary|label)\b|\b(tabindex|href|contenteditable|onclick)=|\brole="(button|link|checkbox|switch|menuitem|tab|textbox|combobox|option)"/i;

test('role="status" regions hold only text: no button or other interactive element inside (fx08, fx11 pick, fx10 Recipe Box)', () => {
  const render = (name, incl = false) => {
    const c = cases.find((x) => x.name === name);
    const res = runCase(c);
    const v = summaryView(res, incl);
    return renderToStaticMarkup(createElement(SummaryPanel, { view: v, listings: res.listings, listing: c.config?.listing ?? "", onListing() {}, onProblems() {}, onPrint() {} }));
  };
  const want = {
    "fx08-all-shipped": [["Nothing to engrave in this file.|Orders already shipped are hidden."], "data-include-shipped"],
    fx11_shipped_listing_pick__shipped_listing: [["Nothing to engrave in this listing.|Orders already shipped are hidden."], "data-show-all"],
    fx10_zero_ready_listing__listing_b: [["5 items need a look", "Nothing is ready to engrave yet. The problem list says why."], "data-download-problems"],
  };
  for (const [name, [texts, btn]] of Object.entries(want)) {
    for (const incl of [false, true]) {
      if (incl && name.startsWith("fx10")) continue; // include-anyway ON is a different (non 0-ready) screen
      const html = render(name, incl);
      const regions = statusRegions(html);
      assert.deepEqual(regions.map((r) => r.text), texts, `${name} incl=${incl}: status text`);
      for (const r of regions) {
        assert.ok(!INTERACTIVE.test(r.inner), `${name}: interactive element inside role=status: ${r.inner}`);
        // the region element itself is not a control (count line is only a programmatic focus target, tabindex -1)
        assert.ok(!/<(button|a|input|select|textarea)\b/.test(r.open) && !/tabindex="(?!-1")/.test(r.open), `${name}: region is not a control`);
      }
      assert.ok(html.includes(btn), `${name}: ${btn} still rendered (outside the status region)`);
    }
  }
  // fx11 pick: Include shipped orders, the note, Show all items and Download problem list are siblings after the status block
  const sp = render("fx11_shipped_listing_pick__shipped_listing");
  const kids = sp.match(/<div data-shipped-pick="true"[^>]*>([\s\S]*)$/)[1];
  assert.match(kids, /^<div data-status-lines="true" role="status"[^>]*>(?:<p[^>]*>[^<]*<\/p>){2}<\/div><button[^>]*data-include-shipped[^>]*>Include shipped orders<\/button><p data-others-note[^>]*>2 other items need a look\.<\/p><button[^>]*data-show-all[^>]*>Show all items<\/button><button[^>]*data-download-problems[^>]*>Download problem list<\/button><\/div>/);
  // the helper itself catches a button inside a status region
  assert.ok(INTERACTIVE.test(statusRegions('<div role="status"><p>x</p><button>y</button></div>')[0].inner));
});

test("Event endpoint: preview deploys don't store (VERCEL_ENV=preview → 204 skipped-preview, no KV write); production stores; filters unchanged", async () => {
  const saved = { ...process.env };
  const realFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (u) => (calls.push(String(u)), new Response(JSON.stringify([{ result: 1 }, { result: 1 }]), { status: 200 }));
  const req = (who = iid, extra = {}) =>
    new Request("https://alignata-git-x.vercel.app/api/engrave-merge/e", { method: "POST", body: JSON.stringify({ v: 1, event: "page_open", iid: who, dogfood: false, props: {}, ...extra }) });
  try {
    process.env.KV_REST_API_URL = "https://kv.invalid";
    process.env.KV_REST_API_TOKEN = "t";
    process.env.VERCEL_ENV = "preview";
    const r = await handleEvent(req());
    assert.equal(r.status, 204);
    assert.equal(await r.text(), "");
    assert.equal(r.headers.get("x-em-store"), "skipped-preview");
    assert.equal((await handleEvent(req(EXCLUDED_IIDS[0]))).headers.get("x-em-store"), "skipped-filter", "EXCLUDED_IIDS still filtered first");
    assert.equal((await handleEvent(new Request("https://x/api/engrave-merge/e", { method: "POST", body: "nope" }))).status, 400, "still validated");
    assert.equal(calls.length, 0, "preview: no KV write");
    for (const v of ["production", undefined]) {
      if (v === undefined) delete process.env.VERCEL_ENV;
      else process.env.VERCEL_ENV = v;
      assert.equal((await handleEvent(req())).headers.get("x-em-store"), "stored", `VERCEL_ENV=${v}: stored`);
      assert.equal((await handleEvent(req(EXCLUDED_IIDS[0]))).headers.get("x-em-store"), "skipped-filter");
    }
    assert.equal(calls.length, 2);
  } finally {
    globalThis.fetch = realFetch;
    process.env = saved;
  }
});

/* ---------- "I'd pay" price card (Phase 1 interest test, Oct 3 2026; SPEC §8.7) ---------- */

const priceMem = (init = {}) => {
  const m = new Map(Object.entries(init));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m };
};
const REAL_IID = "0b9d2c1e-1111-4222-8333-000000000abc";

test("price card: validator accepts price_card_view / price_intent / price_dismiss with no props; pro_interest_tap is gone", () => {
  for (const event of ["price_card_view", "price_intent", "price_dismiss"]) {
    const v = validateEvent({ v: 1, event, iid: REAL_IID, dogfood: false, props: {} });
    assert.equal(v.ok, true, event);
    assert.deepEqual(v.event.props, {});
    assert.equal(validateEvent({ v: 1, event, iid: REAL_IID, dogfood: false, props: { answer: "pay" } }).reason, "unknown_prop:answer", `${event}: no props`);
    assert.equal(validateEvent({ v: 1, event, iid: REAL_IID, dogfood: false, props: { files: 4 } }).ok, false, `${event}: the file count is never sent`);
  }
  assert.equal(validateEvent({ v: 1, event: "pro_interest_tap", iid: REAL_IID, dogfood: false, props: {} }).reason, "bad_event", "HANDOFF §1.4: removed");
});

const SAMPLE_FP = (() => {
  const r = emProcess(readFileSync(join(root, "public/fixtures/engrave-merge/sample.csv"), "utf8"), { settings: DEFAULT_SETTINGS, explicit: Object.keys(DEFAULT_SETTINGS), recipe: { tool: "engrave-merge", recipeVersion: 1, extraLabels: [], listings: {} }, glyphCheck: null });
  return fingerprintOf(r.orderIds);
})();

test("price card count (HANDOFF §1.3): once per new upload when its file is made; ≥3-order files de-duplicated by fp prefix; never sample/fixture/excluded; capped at 4", async () => {
  const { countMade, isRealFile, readPrice, PRICE_KEY, SHOW_FROM_FILE } = await import("../lib/engrave-merge/price.ts");
  assert.equal(PRICE_KEY, "em_price");
  assert.equal(SHOW_FROM_FILE, 4);
  const fp = (c) => c.repeat(64);
  const up = (uploadId, f = {}) => ({ uploadId, source: "upload", fingerprint: fp("a"), orderCount: 5, ...f });
  assert.equal(isRealFile(up(1), REAL_IID), true);
  assert.equal(isRealFile(up(1, { source: "sample" }), REAL_IID), false, "the sample button");
  assert.equal(isRealFile(up(1, { fingerprint: FIXTURE_FINGERPRINTS[2] }), REAL_IID), false, "a bundled fixture fingerprint");
  assert.equal(isRealFile(up(1, { fingerprint: await SAMPLE_FP }), REAL_IID), false, "the sample file dropped by hand");
  assert.equal(isRealFile(up(1), EXCLUDED_IIDS[0] ?? "x", EXCLUDED_IIDS.length ? undefined : ["x"]), false, "an excluded device");
  // the mock's gates: ×5 downloads = 1, settings change = 1 (same upload), re-upload = 1, sample = 0, fixture = 0, small ×2 = 2
  const s = priceMem();
  const counted = new Set();
  for (let i = 0; i < 5; i++) countMade(s, up(1), REAL_IID, counted);
  assert.equal(readPrice(s).files, 1, "5 downloads of one upload (incl. after a settings change) = 1");
  countMade(s, up(2), REAL_IID, counted);
  assert.equal(readPrice(s).files, 1, "the same ≥3-order file uploaded again = still 1 (fp prefix)");
  countMade(s, up(3, { source: "sample", fingerprint: await SAMPLE_FP }), REAL_IID, counted);
  countMade(s, up(4, { fingerprint: FIXTURE_FINGERPRINTS[0] }), REAL_IID, counted);
  assert.equal(readPrice(s).files, 1, "sample and fixture = 0");
  countMade(s, up(5, { fingerprint: null, orderCount: 2 }), REAL_IID, counted);
  countMade(s, up(6, { fingerprint: null, orderCount: 2 }), REAL_IID, counted);
  assert.equal(readPrice(s).files, 3, "a small file counts once per upload (2 uploads = 2)");
  assert.deepEqual(JSON.parse(s.m.get("em_price")), { v: 1, files: 3, fps: ["a".repeat(16)], seenDays: [], answer: null }, "exactly the five fields; fp prefixes only for ≥3-order files");
  countMade(s, up(7, { fingerprint: fp("b") }), REAL_IID, counted);
  assert.deepEqual(JSON.parse(s.m.get("em_price")), { v: 1, files: 4, fps: [], seenDays: [], answer: null }, "4th real file: fps emptied");
  countMade(s, up(8, { fingerprint: fp("c") }), REAL_IID, counted);
  assert.equal(readPrice(s).files, 4, "capped at 4");
  assert.deepEqual([...s.m.keys()], ["em_price"], "one key");
  // tampered / unknown / blocked → fresh, never throws
  const fresh = { v: 1, files: 0, fps: [], seenDays: [], answer: null };
  assert.deepEqual(readPrice(priceMem({ em_price: '{"v":1,"files":"9","fps":["zz",1],"seenDays":["x"],"answer":"maybe","email":"a@b.c"}' })), fresh);
  assert.deepEqual(readPrice(priceMem({ em_price: "not json" })), fresh);
  assert.deepEqual(readPrice(priceMem({ em_price: '{"v":2,"files":4}' })), fresh);
  assert.deepEqual(readPrice({ getItem() { throw new Error("blocked"); } }), fresh);
  assert.deepEqual(readPrice(priceMem({ em_price: JSON.stringify({ v: 1, files: 4, fps: ["a".repeat(16)], seenDays: [], answer: null }) })).fps, [], "fps never kept at 4");
});

test("price card show rule: files ≥ 4, no answer, < 3 seen days, not today; storage blocked → never; any answer stops it", async () => {
  const { answerBlock, readPrice, shouldShowCard, viewBlock } = await import("../lib/engrave-merge/price.ts");
  const markSeen = (st, d) => viewBlock(st, d, () => {});
  const at = (files, extra = {}) => priceMem({ em_price: JSON.stringify({ v: 1, files, fps: [], seenDays: [], answer: null, ...extra }) });
  const day = "2026-10-03";
  assert.equal(shouldShowCard(at(3), day), false, "3 real files: no card");
  const s = at(4);
  assert.equal(shouldShowCard(s, day), true, "4th real file: the card");
  markSeen(s, day);
  assert.equal(shouldShowCard(s, day), false, "once per device-local day (across tabs and reloads)");
  markSeen(s, "2026-10-04");
  assert.equal(shouldShowCard(s, "2026-10-05"), true);
  markSeen(s, "2026-10-05");
  assert.equal(shouldShowCard(s, "2026-10-06"), false, "seen on 3 days without an answer: never again");
  const t = at(4);
  assert.equal(answerBlock(t, "no", () => {}).sent, true);
  assert.deepEqual(answerBlock(t, "pay", () => {}), { sent: false, show: "no" }, "first answer wins");
  assert.equal(readPrice(t).answer, "no");
  assert.equal(shouldShowCard(t, "2026-10-09"), false, "any answer stops it for good");
  const blocked = { getItem: () => JSON.stringify({ v: 1, files: 4, fps: [], seenDays: [], answer: null }), setItem() { throw new Error("QuotaExceeded"); } };
  assert.equal(shouldShowCard(blocked, day), false, "storage blocked → the card never shows");
  assert.equal(shouldShowCard(null, day), false, "no storage → never");
});

test("price card cross-tab view block (HANDOFF §1.3, QA FAIL 10:02): re-read, today seen → nothing; else write today FIRST, then send; 1 view per install per day", async () => {
  const { viewBlock, readPrice, shouldShowCard } = await import("../lib/engrave-merge/price.ts");
  const shared = priceMem({ em_price: JSON.stringify({ v: 1, files: 4, fps: [], seenDays: [], answer: null }) });
  const day = "2026-10-03";
  assert.equal(shouldShowCard(shared, day), true, "tab A renders the card (below the fold, not seen yet)");
  assert.equal(shouldShowCard(shared, day), true, "tab B renders the card too");
  const sent = [];
  const tab = (name) => () => viewBlock(shared, day, () => sent.push([name, readPrice(shared).seenDays.includes(day)]));
  assert.equal(tab("A")(), true, "A reaches 50% first: sends");
  assert.deepEqual(sent, [["A", true]], "today is already written when the view goes out (write first, then send)");
  assert.equal(tab("B")(), false, "B reaches 50% later: re-read finds today, sends nothing");
  assert.equal(tab("A")(), false);
  assert.equal(sent.length, 1, "1 price_card_view per install per device-local day across tabs");
  assert.equal(viewBlock(shared, "2026-10-04", () => sent.push(["A", true])), true, "a new local day can send again");
  assert.deepEqual(readPrice(shared).seenDays, [day, "2026-10-04"]);
  // Storage blocked (from the start, or while the card is open): the write isn't verified → nothing is sent, nothing throws.
  const json = JSON.stringify({ v: 1, files: 4, fps: [], seenDays: [], answer: null });
  for (const store of [
    { getItem: () => json, setItem() { throw new Error("QuotaExceeded"); } },
    { getItem: () => json, setItem() {} }, // a write that silently doesn't land
    { getItem() { throw new Error("SecurityError"); }, setItem() { throw new Error("SecurityError"); } },
    null,
  ]) assert.equal(viewBlock(store, day, () => sent.push(["blocked", true])), false);
  assert.equal(sent.length, 2, "blocked storage: no view event");
});

test("price card cross-tab answer block (HANDOFF §1.3): re-read answer; set → nothing sent, stored state shown; else write first, then send; 1 answer per install ever", async () => {
  const { answerBlock, readPrice } = await import("../lib/engrave-merge/price.ts");
  const at = () => priceMem({ em_price: JSON.stringify({ v: 1, files: 4, fps: [], seenDays: ["2026-10-03"], answer: null }) });
  // The §1.7 "then B taps" rows: A answers first, B's stale card taps second.
  for (const [first, second] of [["pay", "pay"], ["no", "pay"], ["pay", "no"], ["no", "no"]]) {
    const shared = at();
    const sent = [];
    const send = (tab) => (x) => sent.push([tab, x, readPrice(shared).answer]);
    assert.deepEqual(answerBlock(shared, first, send("A")), { sent: true, show: first }, `A taps ${first}`);
    assert.deepEqual(sent, [["A", first, first]], "the answer is stored before the event goes out");
    assert.deepEqual(answerBlock(shared, second, send("B")), { sent: false, show: first }, `A ${first}, then B ${second}: B sends nothing and shows A's answer (${first === "pay" ? "thanks" : "card closed"})`);
    assert.equal(sent.length, 1, "exactly 1 answer per install");
    assert.equal(readPrice(shared).answer, first, "the first answer is kept");
  }
  const json = JSON.stringify({ v: 1, files: 4, fps: [], seenDays: [], answer: null });
  for (const a of ["pay", "no"]) {
    const sent = [];
    const r = answerBlock({ getItem: () => json, setItem() { throw new Error("blocked"); } }, a, (x) => sent.push(x));
    assert.deepEqual(r, { sent: false, show: a }, `storage blocked while the card is open: ${a} → no event, the UI still shows ${a === "pay" ? "thanks" : "closed"}`);
    assert.deepEqual(answerBlock(null, a, (x) => sent.push(x)), { sent: false, show: a });
    assert.equal(sent.length, 0);
  }
});

test("price card lock (HANDOFF §1.3): every block runs inside navigator.locks.request('em_price') when present; a rejected request falls back once, never twice", async () => {
  const { withPriceLock, PRICE_KEY } = await import("../lib/engrave-merge/price.ts");
  let n = 0;
  const names = [];
  withPriceLock(() => n++, { request: (name, cb) => { names.push(name); return Promise.resolve(cb()); } });
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual([n, names], [1, [PRICE_KEY]], "Web Locks: the block runs once, under the em_price lock");
  n = 0;
  withPriceLock(() => n++, { request: () => Promise.reject(new Error("lock unavailable")) });
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(n, 1, "rejected before running → falls back once");
  n = 0;
  withPriceLock(() => { n++; throw new Error("block threw"); }, { request: (_name, cb) => new Promise((res) => res(cb())) });
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(n, 1, "ran under the lock, then rejected → never runs twice");
  n = 0;
  withPriceLock(() => n++, { request() { throw new Error("sync throw"); } });
  assert.equal(n, 1, "a throwing request runs the block directly");
  n = 0;
  withPriceLock(() => n++, null);
  assert.equal(n, 1, "no Web Locks: runs directly (the synchronous re-read is the fallback)");
  // Serialised: two tabs' view blocks queued on one lock → 1 view.
  const { viewBlock } = await import("../lib/engrave-merge/price.ts");
  const shared = priceMem({ em_price: JSON.stringify({ v: 1, files: 4, fps: [], seenDays: [], answer: null }) });
  let tail = Promise.resolve();
  const lock = { request: (_name, cb) => (tail = tail.then(cb)) };
  const views = [];
  withPriceLock(() => viewBlock(shared, "2026-10-03", () => views.push("A")), lock);
  withPriceLock(() => viewBlock(shared, "2026-10-03", () => views.push("B")), lock);
  await tail;
  assert.deepEqual(views, ["A"], "simultaneous views under the lock → 1 price_card_view");
  // Same-instant answers (QA 10:38 gate B): A pays, B taps No thanks, both queued on the lock → exactly 1 answer, and
  // B (second) sends nothing and shows A's stored answer. Also pay vs pay → 1 intent.
  const { answerBlock } = await import("../lib/engrave-merge/price.ts");
  for (const [a1, a2] of [["pay", "no"], ["no", "pay"], ["pay", "pay"]]) {
    const st = priceMem({ em_price: JSON.stringify({ v: 1, files: 4, fps: [], seenDays: ["2026-10-03"], answer: null }) });
    const answers = [];
    const shown = {};
    withPriceLock(() => { shown.A = answerBlock(st, a1, (x) => answers.push(["A", x])).show; }, lock);
    withPriceLock(() => { shown.B = answerBlock(st, a2, (x) => answers.push(["B", x])).show; }, lock);
    await tail;
    assert.deepEqual(answers, [["A", a1]], `${a1} vs ${a2} at once, with Web Locks → exactly 1 answer`);
    assert.deepEqual(shown, { A: a1, B: a1 }, "both tabs show the stored answer");
  }
  const blocks = readFileSync("lib/engrave-merge/price.ts", "utf8");
  for (const fn of ["viewBlock", "answerBlock"]) {
    const body = blocks.slice(blocks.indexOf(`export function ${fn}(`), blocks.indexOf("\n}\n", blocks.indexOf(`export function ${fn}(`)));
    assert.ok(!/\bawait\b|\.then\(|async /.test(body), `${fn}: one synchronous block (no await)`);
  }
});

test("price card Desk wiring (HANDOFF §1.3): view + answer only via the locked blocks; storage listener swaps / closes and never sends", () => {
  const desk = readFileSync("components/engrave-merge/EngraveMergeDesk.tsx", "utf8");
  assert.equal((desk.match(/"price_card_view"/g) || []).length, 1, "one price_card_view send site");
  assert.match(desk, /const sendView = \(\) => viewBlock\(localArea\(\), localDay\(\), \(\) => sendEvent\(iidRef\.current, "price_card_view"\)\);/);
  assert.match(handlerBody("onPriceSeen"), /withPriceLock\(sendView\)/, "the 50% view runs the view block under the lock");
  const answer = handlerBody("onPriceAnswer");
  assert.match(answer, /withPriceLock\(\(\) => \{\s*if \(needView\) sendView\(\);\s*const r = answerBlock\(/, "a tap: view (if not yet) then answer, in one locked block");
  assert.ok(answer.includes('x === "pay" ? sendEvent(iidRef.current, "price_intent") : sendEvent(iidRef.current, "price_dismiss")') && answer.includes("showAnswer(r.show)"), "sends through answerBlock only; shows the stored or tapped answer");
  const listener = desk.slice(desk.indexOf('window.addEventListener("storage"') - 400, desk.indexOf('window.removeEventListener("storage"'));
  assert.ok(listener.includes("e.key !== PRICE_KEY") && listener.includes("storedAnswer(localArea())") && listener.includes("showAnswer(a, "), "storage listener on em_price");
  assert.ok(!/sendEvent|viewBlock|answerBlock/.test(listener), "the listener never sends an event");
});

test("price card cross-tab focus rule (§1.3, UX Lead 10:39): another tab's answer moves focus ONLY if it was inside the card before the swap", async () => {
  const { shouldMoveFocus } = await import("../lib/engrave-merge/price.ts");
  // A tiny tree: body > [main > make, picker], [card > yes, no], [footer > about].
  const node = (name, kids = []) => { const n = { name, kids, contains: (x) => x === n || kids.some((k) => k.contains(x)) }; return n; };
  const yes = node("I'd pay $29"), no = node("No thanks"), card = node("card", [yes, no]);
  const make = node("Make merge file"), picker = node("order picker"), about = node("footer About");
  const body = node("body", [node("main", [make, picker]), card, node("footer", [about])]);
  // Branch 1: focus was inside the card → move (pay → thanks line, no → count line).
  for (const active of [yes, no, card]) assert.equal(shouldMoveFocus(true, card, active), true, `inside the card (${active.name}) → focus moves`);
  // Branch 2: focus anywhere else → stays put (QA's preview start states: Make merge file, order picker, footer link, nothing focused).
  for (const active of [make, picker, about, body, null, undefined]) assert.equal(shouldMoveFocus(true, card, active), false, `focus on ${active?.name ?? String(active)} → stays put`);
  assert.equal(shouldMoveFocus(true, null, yes), false, "no card on screen → nothing to move from");
  // A tap in this tab itself is unchanged: focus always moves.
  for (const active of [yes, make, body, null]) assert.equal(shouldMoveFocus(false, card, active), true, "own tap → focus moves as always");
});

test("price card cross-tab focus wiring: the listener reads card.contains(activeElement) BEFORE the swap; both focus moves keep preventScroll", () => {
  const desk = readFileSync("components/engrave-merge/EngraveMergeDesk.tsx", "utf8");
  const listener = desk.slice(desk.indexOf("const onStorage = (e: StorageEvent) => {"), desk.indexOf('window.addEventListener("storage"'));
  assert.match(listener, /showAnswer\(a, shouldMoveFocus\(true, document\.querySelector\("\[data-price-card\]"\), document\.activeElement\)\)/, "focus decision is taken from the live card before showAnswer swaps it");
  const show = handlerBody("showAnswer");
  assert.match(show, /const showAnswer = \(a: PriceAnswer, moveFocus = true\) =>/, "own taps default to moving focus");
  assert.match(show, /setPriceFocus\(moveFocus\)/, "thanks line focus follows the rule");
  assert.match(show, /if \(a === "no" && moveFocus\) setTimeout\(\(\) => summaryRef\.current\?\.querySelector<HTMLElement>\("\[data-count-line\]"\)\?\.focus\(\{ preventScroll: true \}\)/, "No → count line only when focus moves, preventScroll");
  assert.match(handlerBody("onPriceAnswer"), /showAnswer\(r\.show\);/, "a tap in this tab is unchanged (always moves focus)");
  assert.match(desk, /<PriceCard mode=\{priceMode\} focusThanks=\{priceFocus\}/);
  const card = readFileSync("components/engrave-merge/PriceCard.tsx", "utf8");
  assert.match(card, /if \(mode === "thanks" && focusThanks\) thanksRef\.current\?\.focus\(\{ preventScroll: true \}\);/, "thanks line focus only with focusThanks, preventScroll");
});

test("price card dogfood (RESOLVED 9:31 AM ET): dog- iid or site_dogfood=1 → no count, no card, no card event, em_price untouched; same flag on every event", async () => {
  const { isDogfoodRun } = await import("../lib/engrave-merge/price.ts");
  const sess = (v) => ({ getItem: (k) => (k === "site_dogfood" ? v : null) });
  assert.equal(isDogfoodRun(`dog-${REAL_IID}`, sess(null)), true, "a dog- install id (also a leftover one)");
  assert.equal(isDogfoodRun(REAL_IID, sess("1")), true, "site_dogfood only");
  assert.equal(isDogfoodRun(REAL_IID, sess(null)), false, "control");
  assert.equal(isDogfoodRun(REAL_IID, { getItem() { throw new Error("blocked"); } }), false, "never throws");
  // The desk returns before counting / deciding when it's a dogfood run.
  const primary = handlerBody("onPrimary");
  const gate = primary.indexOf("isDogfoodRun(iidRef.current, tabSession())");
  assert.ok(gate > 0 && gate < primary.indexOf("countMade(") && gate < primary.indexOf("shouldShowCard("), "dogfood check comes first");
  assert.match(primary, /if \(!made \|\| isDogfoodRun\(iidRef\.current, tabSession\(\)\)\) return;/);
  // sendEvent's dogfood flag = the same rule (Product yes 9:43 AM ET)
  const { sendEvent } = await import("../lib/engrave-merge/track.ts");
  const saved = { window: globalThis.window, navigator: Object.getOwnPropertyDescriptor(globalThis, "navigator") };
  const sent = [];
  try {
    globalThis.window = { sessionStorage: sess("1"), localStorage: priceMem() };
    Object.defineProperty(globalThis, "navigator", { value: { sendBeacon: (_u, blob) => (blob.text().then((t) => sent.push(JSON.parse(t))), true) }, configurable: true });
    sendEvent(REAL_IID, "file_processed", { row_count: 3, item_count: 3, exception_count: 0, small_file: true });
    globalThis.window = { sessionStorage: sess(null), localStorage: priceMem() };
    sendEvent(REAL_IID, "page_open");
    await new Promise((r) => setTimeout(r, 20));
    assert.deepEqual(sent.map((e) => [e.event, e.dogfood]), [["file_processed", true], ["page_open", false]]);
  } finally {
    globalThis.window = saved.window;
    if (saved.navigator) Object.defineProperty(globalThis, "navigator", saved.navigator);
  }
});

test("price card UI: copy verbatim, soft pill + text button (no black pill), no sale words; old 'I'd pay for unlimited batches' gone", async () => {
  const { PriceCard } = await import("../components/engrave-merge/PriceCard.tsx");
  const { COPY } = await import("../lib/engrave-merge/copy.ts");
  assert.equal(COPY.priceLine, "Engrave Merge is free for now. We're thinking of keeping your first 3 files free, then a one-time $29. Would you pay that?");
  assert.equal(COPY.priceYes, "I'd pay $29");
  assert.equal(COPY.priceNo, "No thanks");
  assert.equal(COPY.priceThanks, "Thanks, that helps. It's still free, so keep using it.");
  assert.ok(!("proButton" in COPY) && !("proThanks" in COPY), "old button copy removed");
  const card = renderToStaticMarkup(createElement(PriceCard, { mode: "card", onSeen() {}, onAnswer() {} }));
  assert.ok(card.includes("Engrave Merge is free for now. We&#x27;re thinking of keeping your first 3 files free, then a one-time <span class=\"whitespace-nowrap\">$29</span>. Would you pay that?"));
  assert.ok(/<button type="button" data-price-yes="true" class="[^"]*min-h-\[44px\][^"]*bg-\[#ECE7DE\][^"]*">I&#x27;d pay \$29<\/button>/.test(card), "soft pill, ≥ 44px");
  assert.ok(/<button type="button" data-price-no="true" class="[^"]*min-h-\[44px\][^"]*underline[^"]*">No thanks<\/button>/.test(card), "text button, ≥ 44px");
  assert.ok(!/bg-\[var\(--cb-ink\)\]|#111110"|fx-pill|fx-primary/.test(card.replace("text-[#111110]", "")), "never black");
  assert.ok(!/\b(buy|checkout|pay now|charge|charged|receipt|email)\b/i.test(card), "no sale words");
  assert.equal((card.match(/\$29/g) || []).length, 2, "the line and the soft pill");
  assert.ok(card.includes("free for now"), "'free for now' in the same card as the price");
  assert.equal(renderToStaticMarkup(createElement(PriceCard, { mode: null, onSeen() {}, onAnswer() {} })), "");
  assert.ok(renderToStaticMarkup(createElement(PriceCard, { mode: "thanks", onSeen() {}, onAnswer() {} })).includes(">Thanks, that helps. It&#x27;s still free, so keep using it.</p>"));
  const html = renderToStaticMarkup(createElement(EngraveMergeDesk));
  assert.ok(!html.includes("unlimited batches") && !html.includes("data-price-card"), "first paint: no old button, no card");
  assert.ok(!/stripe|checkout|payment/i.test(readFileSync(join(root, "lib/engrave-merge/price.ts"), "utf8").replace(/no checkout|no payment|Nothing is sold[^\n]*/gi, "")), "no payment code");
});

test("price card wiring: counted when the file is made (once per upload), after the done scroll settles; sticky offset; answers", async () => {
  const load = deskSrc.slice(deskSrc.indexOf("const loadText = useCallback("), deskSrc.indexOf("const readFile = useCallback("));
  assert.ok(!/countMade|countUpload|shouldShowCard/.test(load), "loading a file never counts");
  assert.equal((load.match(/uploadId: \+\+uploadSeq\.current/g) || []).length, 2, "every load (ok or failed) is a new upload id");
  assert.ok(handlerBody("onSample").includes(', "sample");'), "the sample button loads with source = sample");
  const primary = handlerBody("onPrimary");
  const dl = primary.indexOf("downloadText(mergeFileName()");
  const settle = primary.indexOf("scrollSettled()");
  assert.ok(dl > 0 && primary.indexOf("window.scrollTo(") > dl && settle > primary.indexOf("window.scrollTo("), "file first, then the done scroll, then wait for it to settle");
  assert.ok(primary.indexOf("countMade(") > settle && primary.indexOf("shouldShowCard(") > primary.indexOf("countMade("), "count, then decide, only after the scroll settled");
  assert.ok(primary.includes("priceCounted.current"), "one count per upload id in this page");
  assert.match(primary, /document\.querySelector\('nav\[aria-label="Apps"\]'\)\?\.getBoundingClientRect\(\)\.height/, "measures the sticky All tools bar at scroll time");
  const { doneScrollTop } = await import("../lib/engrave-merge/price.ts");
  assert.equal(doneScrollTop(500, 1000, 57), 1500 - 73, "390: bar 57 → Make merge file top at 73");
  assert.equal(doneScrollTop(500, 1000, 64.2), 1500 - 81, "1280: bar ~65 → top 81 (ceil)");
  assert.equal(doneScrollTop(10, 0, 65), 0, "never above the page top");
  for (const h of ["markUpdated", "setS", "setL", "toggleText", "onFont", "onLoadRecipe", "onIncludeShipped", "onProblems", "onPrint", "onStartOver"])
    assert.ok(!/countMade|shouldShowCard/.test(handlerBody(h)), `${h}: no count, no card`);
  const answer = handlerBody("onPriceAnswer");
  assert.ok(answer.indexOf("sendView()") < answer.indexOf("answerBlock("), "a tap before 50% still counts as seen first (views ≥ answers)");
  assert.match(handlerBody("showAnswer"), /if \(a === "no" && moveFocus\) setTimeout\(\(\) => summaryRef\.current\?\.querySelector<HTMLElement>\("\[data-count-line\]"\)\?\.focus/, "No thanks → focus to the count line");
  const card = deskSrc.indexOf("<PriceCard ");
  assert.ok(card > deskSrc.indexOf("<SummaryPanel") && card < deskSrc.indexOf("{COPY.guide}"), "below the results, before How to use this in LightBurn");
});

test("KPI: kill bar item 3 counts price_intent (not the legacy pro_interest_tap); rate = intent / view installs", () => {
  const t = Date.parse("2026-10-05T14:00:00Z");
  const ev = (event, who, h, props = {}) => ({ v: 1, event, iid: who, dogfood: false, props, ts: t + h * 3600e3, day: "2026-10-05", host: "alignata.com", prod: true });
  const a = "0b9d2c1e-1111-4222-8333-00000000000a";
  const b = "0b9d2c1e-1111-4222-8333-00000000000b";
  const base = [ev("file_processed", a, 0, { row_count: 9, item_count: 9, exception_count: 0, file_fingerprint: "e".repeat(64) })];
  const legacy = computeKpis([...base, ev("pro_interest_tap", a, 1)], t + 20 * 86400e3);
  assert.equal(legacy.killBar.priceIntents, 0, "a legacy pro tap no longer counts");
  assert.ok(legacy.killIf.some((k) => k.includes("price_intent")));
  const k = computeKpis([...base, ev("price_card_view", a, 1), ev("price_card_view", b, 1), ev("price_intent", a, 2), ev("price_dismiss", b, 2)], t + 86400e3);
  assert.equal(k.killBar.priceIntents, 1);
  assert.equal(k.priceCardViews, 2);
  assert.equal(k.priceIntentRate, 0.5);
});
