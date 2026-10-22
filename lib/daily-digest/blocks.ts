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
 * - inline "**bold**" → <strong>; inline "*emphasis*" (and a whole line wrapped in single "*…*") → <em>
 * - inline "`code`" → <code>; a fenced ``` block → <pre><code>. Nothing inside either is autolinked.
 * - inline "[label](https://…)" or "[label](/daily-digest/<slug>)" → link; a bare https? URL or
 *   "/daily-digest/<slug>" (as in Sources) → a link whose visible text is that URL.
 *   Bare URLs are left as text when they sit in code, name a loopback or private host
 *   (localhost, 127.0.0.1, RFC1918, link-local), or are the target of an HTTP method
 *   ("POST https://…"), which is an example call rather than a page.
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
  | { kind: "table"; head: string[]; rows: string[][] }
  | { kind: "code"; text: string };

export type ArticleSection = { heading: string; body: string[] };

const LEGACY_SET = new Set(LEGACY_SECTION_TITLES.map((t) => t.toLowerCase()));
const H3_RE = /^###\s+(.+)$/;
const H2_RE = /^##\s+(.+)$/;
const UL_RE = /^[-*]\s+(.*)$/;
const OL_RE = /^(\d+)[.)]\s+(.*)$/;
const RULE_RE = /^(?:-{3,}|\*{3,})$/;
const TABLE_RE = /^\|.*\|$/;
const TABLE_SEP_RE = /^\|(?:\s*:?-{3,}:?\s*\|)+$/;
/** A fenced code block opens with ``` or ```lang on its own line and closes with ```. */
const FENCE_OPEN_RE = /^```\S*$/;

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
  const lines = paragraphs.flatMap((p) => p.split("\n"));

  const blocks: ArticleBlock[] = [];
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (FENCE_OPEN_RE.test(trimmed)) {
      let close = -1;
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].trim() === "```") {
          close = j;
          break;
        }
      }
      if (close !== -1) {
        blocks.push({ kind: "code", text: lines.slice(i + 1, close).join("\n") });
        i = close;
        continue;
      }
    }
    if (!trimmed) continue;
    const line = trimmed;
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
 * Inline Markdown inside a block's text.
 * - "[label](https://…)" or "[label](/daily-digest/<slug>)" → link. Only absolute http(s) URLs and
 *   site-relative Daily Digest paths are accepted; anything else stays literal text.
 * - A bare http(s) URL, or a bare "/daily-digest/<slug>", becomes a link whose visible text is that
 *   URL (Sources lines). Trailing sentence punctuation stays outside the link. A bare URL stays
 *   text when its host is loopback or private, or when an HTTP method sits immediately before it
 *   ("POST https://…"), because that is an example call, not a page to open.
 * - "`code`" → <code>. URLs and other marks inside the span stay literal text.
 * - "**bold**" → <strong>. "*emphasis*" → <em>, including a whole line wrapped in single asterisks.
 *   Stray asterisks with spaces around them ("2 * 3 * 4") stay text.
 * Labels and URLs are returned as plain strings and rendered by React, so nothing is injected as HTML.
 */
export type InlineSegment =
  | { kind: "text"; text: string }
  | { kind: "strong"; text: string }
  | { kind: "em"; text: string }
  | { kind: "code"; text: string }
  | { kind: "link"; text: string; href: string };

/** "**bold**" or inline "*emphasis*" (a whole line of "*…*" is one emphasis segment). */
const MARK_RE = /\*\*(?=\S)([^*\n]+?)(?<=\S)\*\*|(?<!\*)\*(?!\*)(?=\S)([^*\n]+?)(?<=\S)\*(?!\*)/g;

/** Plain text → text / strong / em segments. Stray asterisks ("2 * 3 * 4") stay text. */
function emphasis(text: string): InlineSegment[] {
  const out: InlineSegment[] = [];
  let cursor = 0;
  for (const m of text.matchAll(MARK_RE)) {
    const start = m.index ?? 0;
    if (start > cursor) out.push({ kind: "text", text: text.slice(cursor, start) });
    out.push(m[1] !== undefined ? { kind: "strong", text: m[1] } : { kind: "em", text: m[2] });
    cursor = start + m[0].length;
  }
  if (cursor < text.length) out.push({ kind: "text", text: text.slice(cursor) });
  return out;
}

/** Bare http(s) URL (IPv6 hosts included), or a site-relative Daily Digest path, outside a Markdown link. */
const BARE_LINK_RE = /https?:\/\/(?:\[[0-9a-f:.]+\]|[^\s<>"'`()[\]]+)[^\s<>"'`()[\]]*|\/daily-digest\/[a-z0-9-]+/gi;

/** An example call ("POST https://…"), not a citation. Case-sensitive so the English word "head" stays a link. */
const REQUEST_TARGET_RE = /(?:^|\s)(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+$/;

/** Turn leftover plain-text URLs into links. Sentence punctuation after a URL stays text. */
function autolink(text: string): InlineSegment[] {
  const out: InlineSegment[] = [];
  let cursor = 0;
  for (const m of text.matchAll(BARE_LINK_RE)) {
    const start = m.index ?? 0;
    let raw = m[0];
    const trail = /[.,;:!?]+$/.exec(raw);
    if (trail) raw = raw.slice(0, -trail[0].length);
    if (!raw || isPrivateHttpUrl(raw) || REQUEST_TARGET_RE.test(text.slice(0, start))) continue;
    const href = safeHttpUrl(raw);
    if (!href) continue;
    if (start > cursor) out.push({ kind: "text", text: text.slice(cursor, start) });
    out.push({ kind: "link", text: raw, href });
    cursor = start + raw.length;
  }
  if (cursor < text.length) out.push({ kind: "text", text: text.slice(cursor) });
  return out;
}

/**
 * Loopback and non-public hosts: localhost, 127.0.0.0/8, 0.0.0.0/8, RFC1918, link-local,
 * and IPv6 loopback, unique-local (fc00::/7), and link-local (fe80::/10).
 */
function isPrivateHostname(hostname: string): boolean {
  let host = hostname.toLowerCase().replace(/\.$/, "");
  if (host.startsWith("[") && host.endsWith("]")) host = host.slice(1, -1);
  const zone = host.indexOf("%");
  if (zone !== -1) host = host.slice(0, zone);
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (host === "::1" || host === "::" || host === "0.0.0.0") return true;
  const mapped = /^::ffff:(.+)$/.exec(host);
  if (mapped && isPrivateIPv4(mapped[1])) return true;
  if (host.includes(":")) {
    const first = host.startsWith(":") ? 0 : Number.parseInt(host.split(":")[0] || "0", 16);
    if (Number.isNaN(first)) return false;
    if ((first & 0xfe00) === 0xfc00) return true;
    if ((first & 0xffc0) === 0xfe80) return true;
    return false;
  }
  return isPrivateIPv4(host);
}

function isPrivateIPv4(host: string): boolean {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!m) return false;
  const oct = m.slice(1).map((x) => Number(x));
  if (oct.some((n) => n > 255)) return false;
  const [a, b] = oct;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 169 && b === 254) return true;
  return false;
}

function isPrivateHttpUrl(raw: string): boolean {
  if (raw.startsWith("/")) return false;
  try {
    return isPrivateHostname(new URL(raw).hostname);
  } catch {
    return false;
  }
}

/** Emphasis first, then bare URLs in the remaining text (a URL inside bold or emphasis stays words). */
function decorate(text: string): InlineSegment[] {
  return emphasis(text).flatMap((seg) => (seg.kind === "text" ? autolink(seg.text) : [seg]));
}

/** Inline code first, then a Markdown link. A span of `code` is opaque: no link, bold, or emphasis inside it. */
const INLINE_TOKEN_RE = /`([^`\n]+)`|\[([^\[\]\n]+)\]\((https?:\/\/[^\s()<>"'`]+|\/daily-digest\/[a-z0-9-]+)\)/gi;
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
  for (const m of text.matchAll(INLINE_TOKEN_RE)) {
    const start = m.index ?? 0;
    if (m[1] !== undefined) {
      if (start > cursor) out.push(...decorate(text.slice(cursor, start)));
      out.push({ kind: "code", text: m[1] });
      cursor = start + m[0].length;
      continue;
    }
    const label = m[2].trim();
    const href = safeHttpUrl(m[3]);
    if (!href || !label) continue;
    if (start > cursor) out.push(...decorate(text.slice(cursor, start)));
    out.push({ kind: "link", text: label, href });
    cursor = start + m[0].length;
  }
  if (cursor < text.length) out.push(...decorate(text.slice(cursor)));
  return out;
}

/** Plain-text form of a block's text: links collapse to their label only. */
export function toPlainText(text: string): string {
  return parseInline(text)
    .map((s) => s.text)
    .join("");
}
