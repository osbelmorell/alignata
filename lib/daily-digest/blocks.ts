/**
 * Parse Daily Digest article paragraphs (content/posts.ts) into render blocks
 * without touching the source copy.
 *
 * Author convention (generic, markdown-style):
 * - "## Title"  → <h2>,  "### Title" → <h3>
 * - "- item" / "* item" lines (consecutive) → <ul>
 * - "1. item" / "1) item" lines (consecutive) → <ol> (start number kept)
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
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; start: number; items: string[] };

export type ArticleSection = { heading: string; body: string[] };

const LEGACY_SET = new Set(LEGACY_SECTION_TITLES.map((t) => t.toLowerCase()));
const H3_RE = /^###\s+(.+)$/;
const H2_RE = /^##\s+(.+)$/;
const UL_RE = /^[-*]\s+(.*)$/;
const OL_RE = /^(\d+)[.)]\s+(.*)$/;

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
