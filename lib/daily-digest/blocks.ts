/**
 * Parse Daily Digest article paragraphs (content/posts.ts) into render blocks
 * without touching the source copy.
 *
 * Author convention (generic, markdown-style):
 * - "## Title"  → <h2>,  "### Title" → <h3>
 * - "- item" / "* item" lines (consecutive) → <ul>
 * - "1. item" / "1) item" lines (consecutive) → <ol> (start number kept)
 * - "---" (or "***") on its own line → section break (<hr>)
 * - "| a | b |" lines (consecutive) → <table>; the first row is the header, a "|---|" row after it is skipped
 * - inline "**bold**" → <strong>; a whole line wrapped in single "*…*" → <em> paragraph
 * - anything else → <p>
 * Each paragraph string may hold one line or several lines separated by "\n".
 *
 * Back-compat fallback: a bare line that exactly matches a legacy technique
 * section title (optionally with a trailing colon) also renders as <h2>, so
 * older articles whose copy can't change still get headings. Not required.
 */

export const LEGACY_SECTION_TITLES = [
  "The problem",
  "The technique",
  "What we saw",
  "Limits",
  "Try it",
] as const;

export type ArticleBlock =
  | { kind: "heading"; level: 2 | 3; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "rule" }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; start: number; items: string[] }
  | { kind: "table"; head: string[]; rows: string[][] };

export type ArticleSection = { heading: string; body: string[] };

const LEGACY_SET = new Set(LEGACY_SECTION_TITLES.map((t) => t.toLowerCase()));
const H3_RE = /^###\s+(.+)$/;
const H2_RE = /^##\s+(.+)$/;
const UL_RE = /^[-*]\s+(.*)$/;
const OL_RE = /^(\d+)[.)]\s+(.*)$/;
const RULE_RE = /^(?:-{3,}|\*{3,})$/;
const TABLE_RE = /^\|.*\|$/;
const TABLE_SEP_RE = /^\|(?:\s*:?-{3,}:?\s*\|)+$/;

function tableCells(line: string): string[] {
  return line
    .slice(1, -1)
    .split("|")
    .map((c) => c.trim());
}

function heading(line: string): { level: 2 | 3; text: string } | null {
  const h3 = H3_RE.exec(line);
  if (h3) return { level: 3, text: h3[1].trim() };
  const h2 = H2_RE.exec(line);
  if (h2) return { level: 2, text: h2[1].trim() };
  const bare = line.replace(/:$/, "").trim();
  if (LEGACY_SET.has(bare.toLowerCase())) return { level: 2, text: bare };
  return null;
}

export function parseArticle(paragraphs: string[]): ArticleBlock[] {
  const lines = paragraphs.flatMap((p) =>
    p
      .split(/\n+/)
      .map((l) => l.trim())
      .filter(Boolean),
  );

  const blocks: ArticleBlock[] = [];
  for (const line of lines) {
    if (RULE_RE.test(line)) {
      blocks.push({ kind: "rule" });
      continue;
    }
    if (TABLE_RE.test(line)) {
      const prev = blocks[blocks.length - 1];
      if (prev?.kind === "table") {
        if (!(prev.rows.length === 0 && TABLE_SEP_RE.test(line))) prev.rows.push(tableCells(line));
      } else {
        blocks.push({ kind: "table", head: tableCells(line), rows: [] });
      }
      continue;
    }
    const h = heading(line);
    if (h) {
      blocks.push({ kind: "heading", ...h });
      continue;
    }
    const last = blocks[blocks.length - 1];
    const ul = UL_RE.exec(line);
    if (ul) {
      if (last?.kind === "ul") last.items.push(ul[1]);
      else blocks.push({ kind: "ul", items: [ul[1]] });
      continue;
    }
    const ol = OL_RE.exec(line);
    if (ol) {
      if (last?.kind === "ol") last.items.push(ol[2]);
      else blocks.push({ kind: "ol", start: Number(ol[1]), items: [ol[2]] });
      continue;
    }
    blocks.push({ kind: "paragraph", text: line });
  }
  return blocks;
}

/** Optional structured body: each section's heading is always an <h2>. */
export function parseSections(sections: ArticleSection[]): ArticleBlock[] {
  return sections.flatMap((s) => [
    { kind: "heading", level: 2, text: s.heading.replace(/^#+\s*/, "").trim() } as ArticleBlock,
    ...parseArticle(s.body),
  ]);
}

/**
 * Inline Markdown links inside a block's text: "[label](https://…)".
 * Only absolute http(s) URLs are accepted; anything else (other schemes,
 * relative paths, malformed syntax) stays as literal text. Labels and URLs are
 * returned as plain strings and rendered by React, so nothing is injected as HTML.
 */
export type InlineSegment =
  | { kind: "text"; text: string }
  | { kind: "strong"; text: string }
  | { kind: "em"; text: string }
  | { kind: "link"; text: string; href: string };

const STRONG_RE = /\*\*(?=\S)([^*\n]+?)(?<=\S)\*\*/g;
const WHOLE_EM_RE = /^\*(?!\*)(?=\S)([^*\n]+?)(?<=\S)\*$/;

/** Plain text → text / strong / em segments ("**bold**"; a whole line in single "*…*" is emphasis). */
function emphasis(text: string): InlineSegment[] {
  const em = WHOLE_EM_RE.exec(text);
  if (em) return [{ kind: "em", text: em[1] }];
  const out: InlineSegment[] = [];
  let cursor = 0;
  for (const m of text.matchAll(STRONG_RE)) {
    const start = m.index ?? 0;
    if (start > cursor) out.push({ kind: "text", text: text.slice(cursor, start) });
    out.push({ kind: "strong", text: m[1] });
    cursor = start + m[0].length;
  }
  if (cursor < text.length) out.push({ kind: "text", text: text.slice(cursor) });
  return out;
}

const INLINE_LINK_RE = /\[([^\[\]\n]+)\]\((https?:\/\/[^\s()<>"'`]+|\/daily-digest\/[a-z0-9-]+)\)/gi;
/** Internal Daily Digest links: site-relative "/daily-digest/<slug>" only (same tab; nothing else relative). */
const INTERNAL_DIGEST_RE = /^\/daily-digest\/[a-z0-9-]+$/;

function safeHttpUrl(raw: string): string | null {
  if (INTERNAL_DIGEST_RE.test(raw)) return raw;
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.href;
  } catch {
    return null;
  }
}

export function parseInline(text: string): InlineSegment[] {
  const out: InlineSegment[] = [];
  let cursor = 0;
  for (const m of text.matchAll(INLINE_LINK_RE)) {
    const start = m.index ?? 0;
    const label = m[1].trim();
    const href = safeHttpUrl(m[2]);
    if (!href || !label) continue;
    if (start > cursor) out.push(...emphasis(text.slice(cursor, start)));
    out.push({ kind: "link", text: label, href });
    cursor = start + m[0].length;
  }
  if (cursor < text.length) out.push(...emphasis(text.slice(cursor)));
  return out;
}

/** Plain-text form of a block's text: links collapse to their label only. */
export function toPlainText(text: string): string {
  return parseInline(text)
    .map((s) => s.text)
    .join("");
}
