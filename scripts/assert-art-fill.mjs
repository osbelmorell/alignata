/**
 * Art fill (Oct 12 2026): card + story-hero art fills its slot, no letterbox bars.
 * 1) CSS contract (always runs, via test:site): cover, 16:9 slots, desktop feed heights net of the 12px + 12px art inset.
 * 2) Rendered check (runs when ART_FILL_URL is set and playwright is installed, e.g. `npm i --no-save playwright`):
 *    loads home, /daily-digest, one story page and one tool story at 390/768/1280/1440 in Chromium and WebKit and fails
 *    if any visible art image would leave a gap over 2px between the painted art and its slot (or cover-crop > 2px a side).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = (f) => readFileSync(f, "utf8");

test("art fill: card + hero art cover a 16:9 slot (no contain, no 4:3 slot)", () => {
  const a = css("app/appstore.css");
  const r = css("app/restyle-c.css");
  assert.match(a, /\.fx-scard-art img, \.fx-story-hero img \{[^}]*object-fit: cover;[^}]*object-position: var\(--art-focus, 50% 50%\)/);
  assert.match(a, /\.fx-scard-art \{ margin: 0; aspect-ratio: 16 \/ 9;/, "phone card slot is 16:9 (art is 16:9)");
  assert.match(a, /\.fx-story-hero \{ margin: 0 auto; width: 100%; aspect-ratio: 16 \/ 9;/, "story hero slot is 16:9");
  assert.ok(!/aspect-ratio: 4 \/ 3/.test(a), "no 4:3 art slots left");
  assert.ok(!/\.fx-(scard-art|story-hero)[^{]*img[^{]*\{[^}]*object-fit: contain/.test(a + r), "no contain on art");
  assert.match(a, /\.fx-feed \.fx-scard-art \{ aspect-ratio: auto; height: calc\(\(\(100cqi - 24px\) \/ 2 - 24px\) \* 9 \/ 16\); \}/, "paired card height = art width (half feed - 24px inset) x 9/16");
  assert.match(a, /\.fx-feed \.fx-scard\.fx-lead \.fx-scard-art \{ height: calc\(\(\(100cqi - 11 \* 24px\) \/ 12 \* 7 \+ 6 \* 24px - 24px\) \* 9 \/ 16\); \}/, "lead height = art width (7 cols - 24px inset) x 9/16");
  assert.match(r, /\.fx-scard-art > \.fx-ph, \.fx-story-hero > \.fx-ph \{ background: var\(--ph, none\) var\(--art-focus, 50% 50%\) \/ cover no-repeat; \}/, "blur placeholder covers too");
  assert.match(r, /\.fx-scard-art \{ margin: 12px 12px 0;/, "12px art inset unchanged");
  assert.match(a, /\n\.fx-scard-art \{ width: calc\(100% - 24px\); align-self: flex-start; \}/, "art width = card - inset (WebKit aspect-ratio in flex cards)");
});

const BASE = process.env.ART_FILL_URL;
let pw = null;
if (BASE) { try { pw = await import("playwright"); } catch { pw = null; } }

test("art fill (rendered): no letterbox gap over 2px", { skip: !BASE ? "set ART_FILL_URL to run" : !pw ? "playwright not installed" : false, timeout: 600000 }, async () => {
  const pages = ["/", "/daily-digest", "/daily-digest/stop-picking-tools-that-are-down", "/daily-digest/check-for-cut-off-answers", "/apps/license-gate"];
  const bad = [];
  for (const engine of [pw.chromium, pw.webkit]) {
    const browser = await engine.launch();
    for (const path of pages) for (const width of [390, 768, 1280, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      await page.goto(BASE + path, { waitUntil: "networkidle" });
      await page.evaluate(() => document.querySelectorAll(".fx-scard-art img, .fx-story-hero img").forEach((i) => (i.loading = "eager")));
      await page.waitForFunction(() => [...document.querySelectorAll(".fx-scard-art img, .fx-story-hero img")].every((i) => i.complete && i.naturalWidth), null, { timeout: 30000 });
      const gaps = await page.evaluate(() => [...document.querySelectorAll(".fx-scard-art img, .fx-story-hero img")].flatMap((i) => {
        const r = i.getBoundingClientRect(), f = i.closest("figure").getBoundingClientRect();
        if (!r.width || !r.height) return [];
        const fit = getComputedStyle(i).objectFit, ir = i.naturalWidth / i.naturalHeight;
        // painted art box inside the img element
        let pw2 = r.width, ph = r.height;
        if (fit === "contain") { if (ir > r.width / r.height) ph = r.width / ir; else pw2 = r.height * ir; }
        else if (fit !== "cover" && fit !== "fill") { pw2 = Math.min(r.width, i.naturalWidth); ph = Math.min(r.height, i.naturalHeight); }
        // gap = slot (figure) minus painted art, per axis, split evenly (centred) + any img-vs-figure offset
        const gy = Math.max(f.height - ph, 0) / 2, gx = Math.max(f.width - pw2, 0) / 2;
        // cover on a slot that drifted off the art ratio crops instead: flag that too (> 2px per side)
        const cx = fit === "cover" ? Math.max(r.height * ir - r.width, 0) / 2 : 0, cy = fit === "cover" ? Math.max(r.width / ir - r.height, 0) / 2 : 0;
        return gy > 2 || gx > 2 || cx > 2 || cy > 2 ? [{ src: i.currentSrc.split("/").pop(), fit, gx: +gx.toFixed(1), gy: +gy.toFixed(1), cx: +cx.toFixed(1), cy: +cy.toFixed(1) }] : [];
      }));
      for (const g of gaps) bad.push(`${engine.name()} ${path} @${width}: ${g.src} ${g.fit} gap x=${g.gx} y=${g.gy} crop x=${g.cx} y=${g.cy}`);
      await page.close();
    }
    await browser.close();
  }
  assert.deepEqual(bad, [], `letterbox gaps > 2px:\n${bad.join("\n")}`);
});
