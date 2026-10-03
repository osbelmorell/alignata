// Release gate: run before merging to main (`npm run test:release`). Fails while copy placeholders are still in.
import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { AUTHOR_BIO, BIO_PLACEHOLDER_MARKER } from "../lib/daily-digest/author.ts";

test("AUTHOR_BIO (lib/daily-digest/author.ts) is the approved bio, not the placeholder", () => {
  assert.ok(AUTHOR_BIO.trim().length > 0, "AUTHOR_BIO is empty");
  assert.ok(!AUTHOR_BIO.includes(BIO_PLACEHOLDER_MARKER), `AUTHOR_BIO is still the placeholder: "${AUTHOR_BIO}" (pending Product Copy, Brand Creator, Voice Gate)`);
  assert.ok(!/pending|tbd|todo|lorem/i.test(AUTHOR_BIO), `AUTHOR_BIO looks unfinished: "${AUTHOR_BIO}"`);
});

test("no placeholder marker anywhere that renders (app, components, content, lib, public)", () => {
  const hits = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(tsx?|mdx?|json|txt|xml|html|css)$/.test(e.name)) {
        if (p === join("lib", "daily-digest", "author.ts")) {
          // The marker constant itself may stay; only AUTHOR_BIO must not carry it (checked above).
          const rest = readFileSync(p, "utf8").replace(/export const BIO_PLACEHOLDER_MARKER = "BIO_PLACEHOLDER";/, "");
          if (rest.includes("BIO_PLACEHOLDER")) hits.push(p);
        } else if (readFileSync(p, "utf8").includes("BIO_PLACEHOLDER")) hits.push(p);
      }
    }
  };
  for (const d of ["app", "components", "content", "lib", "public"]) walk(d);
  assert.deepEqual(hits, [], `placeholder still in: ${hits.join(", ")}`);
});
