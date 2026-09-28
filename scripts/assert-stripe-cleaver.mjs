import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import assert from "node:assert/strict";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sample = readFileSync(join(root, "public/fixtures/stripe-sample.csv"), "utf8");

function splitCsvLine(line) {
  const result = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; continue; }
      inQ = !inQ; continue;
    }
    if (c === "," && !inQ) { result.push(cur.trim()); cur = ""; continue; }
    cur += c;
  }
  result.push(cur.trim());
  return result;
}

function normalizeDate(raw) {
  const s = (raw || "").trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const us = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (us) {
    let y = Number(us[3]); if (y < 100) y += 2000;
    return `${y}-${String(Number(us[1])).padStart(2,"0")}-${String(Number(us[2])).padStart(2,"0")}`;
  }
  return s.slice(0, 10);
}

test("stripe sample fixture normalizes dates and strips junk", () => {
  const lines = sample.split(/\r?\n/).filter((l) => l.trim());
  const headers = splitCsvLine(lines[0]);
  assert.ok(headers.includes("Created"));
  const rows = lines.slice(1).map((l) => {
    const cols = splitCsvLine(l);
    const o = {};
    headers.forEach((h, i) => (o[h] = cols[i] ?? ""));
    return o;
  });
  const data = rows.filter((r) => r.Description && !/^total$/i.test(r.Description) && !/starting balance/i.test(r.Description || Object.values(r).join(" ")));
  assert.equal(data.length, 4);
  assert.equal(normalizeDate("09/02/2026"), "2026-09-02");
  assert.equal(normalizeDate("2026-09-01 14:22:11"), "2026-09-01");
  const fee = Number(data[0].Fee);
  assert.ok(fee > 0);
  assert.ok(-Math.abs(fee) < 0);
});
