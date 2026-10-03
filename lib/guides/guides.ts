import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Metadata } from "next";

/**
 * Guides (/guides/<slug>): content-driven, one Markdown file per guide in content/guides/<slug>.md (Product Copy drops
 * copy there). Frontmatter: title, dek, datePublished (YYYY-MM-DD), draft (true | false), tool (the app row at the end,
 * an apps.json id), ref (the ?ref= tag on that tool's Open). Optional: updated (YYYY-MM-DD, sitemap lastmod).
 * - draft: true → the page still renders (so QA can see it) but is noindex, nofollow, not in the sitemap, linked nowhere.
 * - draft: false → indexable, in sitemap.xml with lastmod, listed in the Guides block on its tool's story page.
 * Read at build time only (every guide page is static).
 */
export type Guide = {
  slug: string;
  title: string;
  dek: string;
  datePublished: string;
  updated?: string;
  draft: boolean;
  tool: string;
  ref: string;
  body: string;
};

export const GUIDES_DIR = join(process.cwd(), "content", "guides");
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function unquote(v: string): string {
  const t = v.trim();
  if (t.length >= 2 && t.startsWith('"') && t.endsWith('"')) return JSON.parse(t) as string;
  return t;
}

/** Parse one guide file. Throws on a malformed file so a bad drop fails the build, not the page. */
export function parseGuide(slug: string, text: string): Guide {
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(text.replace(/\r\n/g, "\n"));
  if (!m) throw new Error(`guide ${slug}: missing frontmatter`);
  const fm: Record<string, string> = {};
  for (const line of m[1].split("\n")) {
    if (!line.trim()) continue;
    const i = line.indexOf(":");
    if (i < 1) throw new Error(`guide ${slug}: bad frontmatter line "${line}"`);
    fm[line.slice(0, i).trim()] = unquote(line.slice(i + 1));
  }
  const need = (k: string) => {
    if (!fm[k]) throw new Error(`guide ${slug}: frontmatter "${k}" is required`);
    return fm[k];
  };
  if (!SLUG_RE.test(slug)) throw new Error(`guide ${slug}: slug must be kebab-case`);
  const datePublished = need("datePublished");
  if (!DATE_RE.test(datePublished)) throw new Error(`guide ${slug}: datePublished must be YYYY-MM-DD`);
  if (fm.updated && !DATE_RE.test(fm.updated)) throw new Error(`guide ${slug}: updated must be YYYY-MM-DD`);
  const draft = need("draft");
  if (draft !== "true" && draft !== "false") throw new Error(`guide ${slug}: draft must be true or false`);
  return {
    slug,
    title: need("title"),
    dek: need("dek"),
    datePublished,
    ...(fm.updated ? { updated: fm.updated } : {}),
    draft: draft === "true",
    tool: need("tool"),
    ref: need("ref"),
    body: m[2].trim(),
  };
}

/** Every guide in a folder (drafts included), oldest first, then by slug. */
export function loadGuides(dir: string = GUIDES_DIR): Guide[] {
  let files: string[] = [];
  try {
    files = readdirSync(dir).filter((f) => f.endsWith(".md"));
  } catch {
    return [];
  }
  return files
    .map((f) => parseGuide(f.replace(/\.md$/, ""), readFileSync(join(dir, f), "utf8")))
    .sort((a, b) => a.datePublished.localeCompare(b.datePublished) || a.slug.localeCompare(b.slug));
}

export const getGuides = (): Guide[] => loadGuides();
export const getGuide = (slug: string, guides: Guide[] = getGuides()): Guide | undefined => guides.find((g) => g.slug === slug);
export const publishedGuides = (guides: Guide[] = getGuides()): Guide[] => guides.filter((g) => !g.draft);
export const guidePath = (g: Pick<Guide, "slug">): string => `/guides/${g.slug}`;
/** Where the guide's app-row Open goes: the tool route plus ?ref=<ref>. */
export const guideToolHref = (toolUrl: string, g: Pick<Guide, "ref">): string => `${toolUrl}?ref=${encodeURIComponent(g.ref)}`;

const SITE = "https://alignata.com";
export const GUIDE_AUTHOR = "Alignata";

/** schema.org Article: author = Organization "Alignata". */
export function guideJsonLd(g: Guide): Record<string, unknown> {
  const url = `${SITE}${guidePath(g)}`;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: g.title,
    description: g.dek,
    datePublished: g.datePublished,
    ...(g.updated ? { dateModified: g.updated } : {}),
    url,
    mainEntityOfPage: url,
    author: { "@type": "Organization", name: GUIDE_AUTHOR, url: SITE },
  };
}

/** Sitemap rows for published guides only, each with lastmod (updated, else datePublished). */
export function guideSitemapEntries(guides: Guide[] = getGuides()): { url: string; lastModified: string }[] {
  return publishedGuides(guides).map((g) => ({ url: `${SITE}${guidePath(g)}`, lastModified: g.updated ?? g.datePublished }));
}

/** Page metadata. Drafts: robots noindex, nofollow. Published: no robots (site default: indexable on production). */
export function guideMetadata(g: Guide): Metadata {
  return {
    title: g.title,
    description: g.dek,
    alternates: { canonical: guidePath(g) },
    openGraph: { type: "article", title: g.title, description: g.dek, url: guidePath(g), siteName: "Alignata", publishedTime: g.datePublished },
    ...(g.draft ? { robots: { index: false, follow: false } } : {}),
  };
}
