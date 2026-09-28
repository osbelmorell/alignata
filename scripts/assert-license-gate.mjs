import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import assert from "node:assert/strict";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sample = JSON.parse(
  readFileSync(join(root, "public/fixtures/package-lock-sample.json"), "utf8"),
);

const DENY = [
  { re: /\bagpl/i, label: "AGPL" },
  { re: /\blgpl/i, label: "LGPL" },
  { re: /\bgpl/i, label: "GPL" },
  { re: /\bsspl\b/i, label: "SSPL" },
  { re: /commons\s*clause/i, label: "Commons Clause" },
];

function isDeny(license) {
  return DENY.some((p) => p.re.test(license || ""));
}

test("sample package-lock FAIL with GPL hit", () => {
  const pkgs = sample.packages;
  const hits = [];
  for (const [key, meta] of Object.entries(pkgs)) {
    if (!key) continue;
    const lic = meta.license || "unknown";
    if (isDeny(lic)) hits.push({ key, lic });
  }
  assert.equal(hits.length, 1);
  assert.match(hits[0].lic, /GPL/i);
  assert.ok(!isDeny("MIT"));
  assert.ok(isDeny("LGPL-2.1"));
  assert.ok(isDeny("AGPL-3.0"));
  assert.ok(isDeny("SSPL-1.0"));
  assert.ok(isDeny("MIT WITH Commons Clause"));
});
