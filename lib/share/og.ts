import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Per-page Open Graph / X images (Share, Oct 11 2026): 1200×630 JPEGs pre-made at build time by scripts/og-images.mjs
 * from each page's style C hero (centre crop on the art off-white). Any page without one falls back to the site card
 * (app/opengraph-image.png).
 */
export const OG_W = 1200;
export const OG_H = 630;
export const SITE_OG = "/opengraph-image.png";

export const ogPath = {
  article: (slug: string) => `/og/daily-digest/${slug}.jpg`,
  tool: (slug: string) => `/og/apps/${slug}.jpg`,
  digestIndex: () => "/og/daily-digest.jpg",
};

/** The image to put in og:image / twitter:image: the pre-made JPEG when the build made one, else the site card. */
export function ogImage(path: string, alt: string): { url: string; width: number; height: number; alt: string; type: string } {
  const made = existsSync(join(process.cwd(), "public", path));
  return made
    ? { url: path, width: OG_W, height: OG_H, alt, type: "image/jpeg" }
    : { url: SITE_OG, width: OG_W, height: OG_H, alt: "Alignata: small tools for busy people, and AI techniques in plain English.", type: "image/png" };
}

/** openGraph.images + twitter (summary_large_image) for one page. */
export function shareMeta(o: { title: string; description: string; image: ReturnType<typeof ogImage> }) {
  return {
    images: [o.image],
    twitter: { card: "summary_large_image" as const, title: o.title, description: o.description, images: [{ url: o.image.url, alt: o.image.alt }] },
  };
}

export { shareUrl } from "@/lib/share/url";
