import type { Post, PostHero, PostTag } from "@/content/posts";
import { getPostsNewestFirst } from "@/content/posts";
import { parseArticle, parseSections, toPlainText, type ArticleBlock } from "@/lib/daily-digest/blocks";

/** Shared fallback art for articles without their own hero (SPEC §11). Alt is one plain sentence. */
export const FALLBACK_HERO: PostHero = {
  image: "fallback-tile",
  alt: "Three stacked rounded blocks in cream, grey and black, with a small lime-green ball on top.",
};

export const READ_WPM = 230;

export function postTag(post: Post): PostTag {
  return post.tag ?? "Technique";
}

export function postHero(post: Post): PostHero {
  return post.hero ?? FALLBACK_HERO;
}

/** One <img> worth of attributes. */
export type ArtImage = { src: string; srcSet?: string; width: number; height: number; alt: string };

/** Article hero, 16:9: the 1600×900 file, or the legacy 640/1280 pair. */
export function heroImage(post: Post): ArtImage {
  const h = postHero(post);
  if ("src" in h) return { src: h.src, width: 1600, height: 900, alt: h.alt };
  return { src: `/art/${h.image}-1280.webp`, srcSet: `/art/${h.image}-640.webp 640w, /art/${h.image}-1280.webp 1280w`, width: 1280, height: 720, alt: h.alt };
}

/** Card art, shown 16:9 (SPEC §7, CEO call Oct 2): the 1600×900 hero, or the legacy 16:9 pair. The 4:3 cardSrc crops stay on disk, unused. */
export function cardImage(post: Post): ArtImage {
  return { ...heroImage(post) };
}

export function postCardDek(post: Post): string {
  return toPlainText(post.cardDek ?? post.dek);
}

/** The article body exactly as rendered (paragraphs, then optional sections). */
export function bodyBlocks(post: Post): ArticleBlock[] {
  return [...parseArticle(post.paragraphs ?? []), ...(post.sections ? parseSections(post.sections) : [])];
}

function blockText(b: ArticleBlock): string[] {
  switch (b.kind) {
    case "heading":
    case "paragraph":
      return [toPlainText(b.text)];
    case "ul":
    case "ol":
      return b.items.map(toPlainText);
    default:
      return [];
  }
}

/** Real words in the rendered body: headings, paragraphs and list items (link labels only, no URLs or markers). */
export function wordCount(post: Post): number {
  return bodyBlocks(post)
    .flatMap(blockText)
    .join(" ")
    .split(/\s+/)
    .filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

/** SPEC §8 (v1.2): words / 230, rounded, at least 1. */
export function readMinutes(post: Post): number {
  return Math.max(1, Math.round(wordCount(post) / READ_WPM));
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-10-02" → "Oct 2" (string math, no time zone). */
export function shortDate(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}`;
}

/** "Technique · Oct 2 · 2 min read" */
export function postMeta(post: Post): string {
  return `${postTag(post)} · ${shortDate(post.date)} · ${readMinutes(post)} min read`;
}

/** Next article = the next older one in the index order; the oldest wraps to the newest. */
export function nextPost(slug: string): Post | undefined {
  const list = getPostsNewestFirst();
  const i = list.findIndex((p) => p.slug === slug);
  if (i < 0 || list.length < 2) return undefined;
  return list[(i + 1) % list.length];
}
