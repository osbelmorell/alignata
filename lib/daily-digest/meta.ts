import type { Post, PostHero, PostKind, PostTag } from "@/content/posts";
import { getPostsNewestFirst } from "@/content/posts";
import { parseArticle, parseSections, toPlainText, type ArticleBlock } from "@/lib/daily-digest/blocks";

export const READ_WPM = 230;

export function postTag(post: Post): PostTag {
  return post.tag ?? "Technique";
}

/** Byline kind; omitted = "technique". */
export function postKind(post: Post): PostKind {
  return post.kind ?? "technique";
}

export function postHero(post: Post): PostHero {
  return post.hero;
}

/** One <img> worth of attributes, plus the pad colour the slot is filled with (art is never cropped). */
export type ArtImage = { src: string; width: number; height: number; alt: string; pad: string };

/** Sticker art is 1920×1080 (16:9). */
export const ART_W = 1920;
export const ART_H = 1080;

/** Story hero: the article's one sticker file. */
export function heroImage(post: Post): ArtImage {
  const h = postHero(post);
  return { src: h.src, width: ART_W, height: ART_H, alt: h.alt, pad: h.pad };
}

/** Card art: the exact same file, size and alt as the hero (SPEC v2 §3: same image, so the morph pairs). */
export function cardImage(post: Post): ArtImage {
  return heroImage(post);
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
