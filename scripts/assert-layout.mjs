// Rendered layout checks (real browsers on the built site). Run after `npm run build`: npm run test:layout.
// Featured (lead) cards on / and /daily-digest: the art keeps a 12px inset on all four sides at every desktop width
// 900-1100 (QA #13: a taller text column left 14-97px under the art from 900 to ~1030px), in Chromium and WebKit.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { chromium, webkit } from "playwright";

const PORT = 3417;
const BASE = `http://127.0.0.1:${PORT}`;
let server;

before(async () => {
  assert.ok(existsSync(new URL("../.next/BUILD_ID", import.meta.url)), "no build output: run npm run build first");
  server = spawn("npx", ["next", "start", "-p", String(PORT), "-H", "127.0.0.1"], { stdio: "ignore", detached: true });
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(BASE + "/")).ok) return; } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error("next start did not come up");
});
after(() => { try { process.kill(-server.pid); } catch {} });

const WIDTHS = Array.from({ length: 21 }, (_, i) => 900 + i * 10);
for (const [name, engine] of [["chromium", chromium], ["webkit", webkit]]) {
  test(`lead card art inset is 12px on all sides, 900-1100px, ${name}`, async () => {
    const browser = await engine.launch();
    const bad = [];
    try {
      for (const path of ["/", "/daily-digest"]) {
        const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
        await page.goto(BASE + path, { waitUntil: "load" });
        for (const w of WIDTHS) {
          await page.setViewportSize({ width: w, height: 900 });
          const leads = await page.evaluate(() => [...document.querySelectorAll(".fx-scard.fx-lead")].map((c) => {
            const k = c.getBoundingClientRect(), a = c.querySelector(".fx-scard-art").getBoundingClientRect();
            const t = c.querySelector(".fx-scard-text").getBoundingClientRect();
            return { top: a.top - k.top, left: a.left - k.left, bottom: k.bottom - a.bottom, gap: t.left - a.right };
          }));
          assert.ok(leads.length > 0, `${path} has a lead card`);
          leads.forEach((m, i) => {
            for (const [side, v] of Object.entries(m)) if (side !== "gap" && Math.abs(v - 12) > 0.5) bad.push(`${path} lead ${i} @${w}: ${side} ${v.toFixed(2)}`);
          });
        }
        await page.close();
      }
    } finally { await browser.close(); }
    assert.deepEqual(bad, [], "every lead inset is 12px");
  });
}
