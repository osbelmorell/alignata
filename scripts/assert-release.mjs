// Release gate: run before merging to main (`npm run test:release`). Fails while copy placeholders are still in.
import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync, readdirSync } from "node:fs";
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

/* ---------- Copy placeholders (company pages SPEC §7: QA greps the build; zero "[…]" placeholders reach production) ---------- */
// A copy placeholder is an ALL-CAPS word or phrase in square brackets, exactly as Product Copy writes them:
// [LEGAL ENTITY NAME], [CONTACT EMAIL], [DATE], [GOVERNING STATE], ...
export const PLACEHOLDER_RE = /\[[A-Z][A-Z0-9 ]*[A-Z0-9]\]/g;
const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");

function placeholderHits() {
  const hits = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(tsx?|mdx?|json|txt|xml|html|css)$/.test(e.name)) {
        // lib/**/*.md are engineering docs (SPEC.md), never rendered; everything else under these folders can render.
        if (p.startsWith(`lib${"/"}`) && /\.mdx?$/.test(e.name)) continue;
        const raw = readFileSync(p, "utf8");
        const text = /\.(tsx?|css)$/.test(e.name) ? stripComments(raw) : raw;
        const found = [...new Set(text.match(PLACEHOLDER_RE) || [])];
        if (found.length) hits.push(`${p}: ${found.join(", ")}`);
      }
    }
  };
  for (const d of ["app", "components", "content", "lib", "public"]) walk(d);
  return hits;
}

test("self-check: the placeholder pattern catches copy placeholders and nothing else", () => {
  const m = (s) => s.match(PLACEHOLDER_RE) || [];
  assert.deepEqual(m("© 2026 [LEGAL ENTITY NAME] · Email [CONTACT EMAIL]. Last updated [DATE]. Laws of [GOVERNING STATE]."), ["[LEGAL ENTITY NAME]", "[CONTACT EMAIL]", "[DATE]", "[GOVERNING STATE]"]);
  assert.deepEqual(m('const a: string[] = []; /[A-Z]/.test(x); x[0]; [Link](/apps); ["a", "b"]'), []);
  assert.equal(stripComments("// [COPY] note\nconst x = 1; /* [DATE] */ const u = \"https://a\";").includes("["), false);
});

test("no copy placeholder ([LEGAL ENTITY NAME], [CONTACT EMAIL], [DATE], [GOVERNING STATE], …) in anything that renders", () => {
  const hits = placeholderHits();
  assert.deepEqual(hits, [], `copy placeholders still in:\n  ${hits.join("\n  ")}`);
});

test("built pages (npm run build first): no copy placeholder, no 'Paramount', no 'blog' in any prerendered page", () => {
  const root = join(".next", "server", "app");
  assert.ok(existsSync(root), "no build output: run `npm run build` before `npm run test:release`");
  const pages = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(".html")) pages.push(p);
    }
  };
  walk(root);
  assert.ok(pages.length > 40, `prerendered pages found: ${pages.length}`);
  const bad = [];
  for (const p of pages) {
    const html = readFileSync(p, "utf8");
    const route = "/" + p.slice(root.length + 1).replace(/\.html$/, "").replace(/(^|\/)index$/, "");
    const found = [...new Set(html.match(PLACEHOLDER_RE) || [])];
    if (/paramount/i.test(html)) found.push("Paramount");
    if (/\bblog/i.test(html)) found.push("blog");
    if (found.length) bad.push(`${route}: ${found.join(", ")}`);
  }
  assert.deepEqual(bad, [], `built pages that fail the release grep:\n  ${bad.join("\n  ")}`);
});

test("self-hosted fonts (HANDOFF-COMPANY §6): no Google Fonts in source, built pages or CSS; the woff2 files are ours", () => {
  const GOOGLE = /fonts\.googleapis\.com|fonts\.gstatic\.com|next\/font\/google/;
  const layout = readFileSync(join("app", "layout.tsx"), "utf8");
  assert.ok(!/from "next\/font\/google"|https?:\/\/fonts\.(googleapis|gstatic)\.com/.test(layout) && layout.includes('from "next/font/local"'), "app/layout.tsx loads fonts with next/font/local");
  for (const f of ["Inter-latin-wght.woff2", "InterTight-latin-600.woff2", "OFL.txt"]) assert.ok(existsSync(join("app", "fonts", f)), `app/fonts/${f}`);
  const built = join(".next", "server", "app");
  assert.ok(existsSync(built), "no build output: run `npm run build` before `npm run test:release`");
  const files = [];
  const walk = (dir, ext) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p, ext);
      else if (ext.some((x) => e.name.endsWith(x))) files.push(p);
    }
  };
  walk(built, [".html"]);
  walk(join(".next", "static"), [".css"]);
  const hits = files.filter((p) => GOOGLE.test(readFileSync(p, "utf8")));
  assert.deepEqual(hits, [], "no page or stylesheet references Google Fonts (no <link>, no preconnect, no @import)");
  const css = files.filter((p) => p.endsWith(".css")).map((p) => readFileSync(p, "utf8")).join("\n");
  const srcs = [...css.matchAll(/@font-face\s*{[^}]*src:\s*url\(([^)]+)\)/g)].map((m) => m[1].replace(/["']/g, ""));
  assert.ok(srcs.length >= 2, `@font-face rules found: ${srcs.length}`);
  for (const s of srcs) assert.match(s, /^(\/_next\/static\/media\/|\.\.\/media\/)[^/]+\.woff2$/, `font served from our own origin (relative to /_next/static/css): ${s}`);
  const home = readFileSync(join(built, "index.html"), "utf8");
  const preloads = [...home.matchAll(/<link rel="preload" href="([^"]+)" as="font"/g)].map((m) => m[1]);
  assert.ok(preloads.length >= 2 && preloads.every((h) => h.startsWith("/_next/static/media/")), `font preloads are same-origin: ${preloads.join(" ")}`);
});
