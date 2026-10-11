/**
 * Build step (runs before `next build`): pre-make the per-page 1200×630 Open Graph JPEGs in public/og/ from each
 * style C hero: every Daily Digest article, every tool story and the /daily-digest index. Centre crop ("cover") on
 * the art off-white #FDFAF5. Output is generated (gitignored); a missing source just means that page falls back to the
 * site card (lib/share/og.ts).
 */
import { mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import sharp from "sharp";
import { posts } from "../content/posts.ts";
import { heroImage } from "../lib/daily-digest/meta.ts";
import { getApps, toolArt, TOOL_STORY } from "../lib/apps.ts";
import { ogPath, OG_W, OG_H } from "../lib/share/og.ts";

const jobs = [
  ...posts.map((p) => [heroImage(p).src, ogPath.article(p.slug)]),
  ...getApps().filter((a) => TOOL_STORY[a.id] && toolArt(a.id).art).map((a) => [toolArt(a.id).art, ogPath.tool(a.id)]),
  ["/art/digest-hero-sticker.webp", ogPath.digestIndex()],
];
let made = 0;
for (const [src, out] of jobs) {
  const from = join("public", src);
  if (!existsSync(from)) { console.warn(`og-images: no ${from}, ${out} falls back to the site card`); continue; }
  const to = join("public", out);
  mkdirSync(dirname(to), { recursive: true });
  await sharp(from).resize(OG_W, OG_H, { fit: "cover", position: "centre" }).flatten({ background: "#FDFAF5" }).jpeg({ quality: 84, mozjpeg: true }).toFile(to);
  made++;
}
console.log(`og-images: ${made} of ${jobs.length} OG JPEGs in public/og/`);
