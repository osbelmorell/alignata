// Build step (runs before next build): responsive variants of every /art webp into public/art/_r/ (gitignored),
// and tiny blur previews into lib/art/blur.json (committed; `--check` fails if it drifts from public/art).
import { readdirSync, mkdirSync, existsSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import sharp from "sharp";
import { ART_WIDTHS, ICON_WIDTHS, variantPath } from "../lib/art/variants.ts";

const ROOT = new URL("../public/", import.meta.url).pathname;
const ART = join(ROOT, "art");
const MANIFEST = new URL("../lib/art/blur.json", import.meta.url).pathname;
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return f === "_r" ? [] : statSync(p).isDirectory() ? walk(p) : p.endsWith(".webp") ? [p] : []; });

const blur = {};
for (const file of walk(ART).sort()) {
  const src = "/" + relative(ROOT, file);
  const img = sharp(file);
  const { width } = await img.metadata();
  const widths = (width >= 1920 ? ART_WIDTHS : ICON_WIDTHS).filter((w) => w < width);
  for (const w of widths) {
    const out = join(ROOT, variantPath(src, w).slice(1));
    if (existsSync(out) && statSync(out).mtimeMs >= statSync(file).mtimeMs) continue;
    mkdirSync(dirname(out), { recursive: true });
    await sharp(file).resize({ width: w }).webp({ quality: 74, effort: 6 }).toFile(out);
  }
  const tiny = await sharp(file).resize({ width: 16 }).webp({ quality: 40 }).toBuffer();
  blur[src] = { w: width, b: `data:image/webp;base64,${tiny.toString("base64")}` };
}
const json = JSON.stringify(blur, null, 1) + "\n";
if (process.argv.includes("--check")) {
  if (readFileSync(MANIFEST, "utf8") !== json) { console.error("lib/art/blur.json is stale: run npm run art:variants"); process.exit(1); }
} else writeFileSync(MANIFEST, json);
console.log(`art variants: ${Object.keys(blur).length} images`);
