/**
 * The small Markdown subset guides use (GUIDES.md): "### Heading" (→ h2 under the page H1), "- item" lists,
 * "1. item" lists, paragraphs, and inline **bold**, `code` and [text](href). Links: site paths ("/…") or https URLs
 * only; anything else stays literal text. Rendered by React (components/guides/GuideBody.tsx), never as raw HTML.
 */
export type GuideBlock =
  | { kind: "h2"; text: string }
  | { kind: "p"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; start: number; items: string[] };

export type Inline =
  | { kind: "text"; text: string }
  | { kind: "strong"; text: string }
  | { kind: "code"; text: string }
  | { kind: "link"; text: string; href: string };

export function parseGuideBody(body: string): GuideBlock[] {
  const blocks: GuideBlock[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) blocks.push({ kind: "p", text: para.join(" ") });
    para = [];
  };
  for (const raw of body.split("\n")) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    const h = /^#{2,3}\s+(.+)$/.exec(line);
    const ul = /^[-*]\s+(.+)$/.exec(line);
    const ol = /^(\d+)\.\s+(.+)$/.exec(line);
    const last = blocks[blocks.length - 1];
    if (h) {
      flush();
      blocks.push({ kind: "h2", text: h[1].trim() });
    } else if (ul) {
      flush();
      if (last?.kind === "ul" && !para.length) last.items.push(ul[1]);
      else blocks.push({ kind: "ul", items: [ul[1]] });
    } else if (ol) {
      flush();
      if (last?.kind === "ol") last.items.push(ol[2]);
      else blocks.push({ kind: "ol", start: Number(ol[1]), items: [ol[2]] });
    } else {
      para.push(line);
    }
  }
  flush();
  return blocks;
}

export function safeHref(href: string): string | null {
  if (/^\/(?!\/)[^\s]*$/.test(href)) return href;
  try {
    const u = new URL(href);
    return u.protocol === "https:" ? u.href : null;
  } catch {
    return null;
  }
}

const INLINE_RE = /\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]\n]+)\]\(([^)\s]+)\)/g;

export function parseInlineMd(text: string): Inline[] {
  const out: Inline[] = [];
  let at = 0;
  for (const m of text.matchAll(INLINE_RE)) {
    const i = m.index ?? 0;
    if (i > at) out.push({ kind: "text", text: text.slice(at, i) });
    if (m[1] !== undefined) out.push({ kind: "strong", text: m[1] });
    else if (m[2] !== undefined) out.push({ kind: "code", text: m[2] });
    else {
      const href = safeHref(m[4]);
      out.push(href ? { kind: "link", text: m[3], href } : { kind: "text", text: m[0] });
    }
    at = i + m[0].length;
  }
  if (at < text.length) out.push({ kind: "text", text: text.slice(at) });
  return out;
}

/** Plain text of a block (for tests / descriptions). */
export const plainInline = (text: string): string => parseInlineMd(text).map((s) => s.text).join("");
