/**
 * Run: npx --yes tsx scripts/assert-board-tools.ts
 * Exercises real TS libs against fixtures.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleaveStripeCsv, normalizeDate } from "../lib/stripe-cleaver/cleave";
import { scanLockfile } from "../lib/license-gate/parse";

const root = join(process.cwd());

const stripe = readFileSync(join(root, "public/fixtures/stripe-sample.csv"), "utf8");
const qb = cleaveStripeCsv(stripe, "quickbooks");
assert.ok(qb.rows.length >= 4);
assert.ok(qb.feeCount >= 1);
assert.ok(qb.rows.some((r) => r.amount < 0 && r.kind === "fee"));
assert.equal(normalizeDate("09/02/2026"), "2026-09-02");
assert.ok(qb.csv.startsWith("Date,Description,Amount"));

const xero = cleaveStripeCsv(stripe, "xero");
assert.ok(xero.csv.startsWith("Date,Amount,Payee,Description,Reference"));

const lock = readFileSync(join(root, "public/fixtures/package-lock-sample.json"), "utf8");
const scan = scanLockfile(lock, "package-lock.json");
assert.equal(scan.status, "FAIL");
assert.equal(scan.format, "npm");
assert.ok(scan.hits.some((h) => /GPL/i.test(h.license)));

const clean = scanLockfile(
  JSON.stringify({
    lockfileVersion: 3,
    packages: {
      "": {},
      "node_modules/lodash": { version: "4.17.21", license: "MIT" },
    },
  }),
  "package-lock.json",
);
assert.equal(clean.status, "PASS");
assert.equal(clean.hits.length, 0);

console.log("assert-board-tools: OK");
