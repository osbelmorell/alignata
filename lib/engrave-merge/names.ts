import { PY_WS, flat, pySplit, pyStrip } from "./pytext";

/**
 * One name per copy (board GO 2026-10-26).
 * A split happens only when Quantity is N and the text has exactly N names,
 * separated by newlines, by "1. 2. 3." numbering, or by commas, and every part
 * looks like a name. "Emma Grace Olivia" with no separators is ambiguous and
 * must be held — never auto-split.
 */

const S = `[${PY_WS}]`;
const NUM_MARK_SRC = `(?:(?<=${S})|^)([0-9]{1,2})[.)]${S}+`;
const LINE_NUM_RE = new RegExp(`^${S}*([0-9]{1,2})[.)]${S}+`);

export type NameDecision = { kind: "split"; names: string[] } | { kind: "ambiguous" } | { kind: "none" };

/** One word of a person's name: letters, apostrophes, hyphens; one trailing period (Mr.). */
export function isNameWord(w: string): boolean {
  if (!w || [...w].length > 30) return false;
  const core = w.endsWith(".") ? w.slice(0, -1) : w;
  if (!core) return false;
  const chars = [...core];
  if (!/^\p{L}/u.test(chars[0])) return false;
  return chars.every((ch) => /^\p{L}$/u.test(ch) || ch === "'" || ch === "\u2019" || ch === "-");
}

/** 1–3 name-words. Digits, commas and other punctuation are not a name. */
export function isNamePart(part: string): boolean {
  const words = pySplit(flat(part));
  return words.length >= 1 && words.length <= 3 && words.every(isNameWord);
}

export function detectCopyNames(raw: string, qty: number): NameDecision {
  if (qty < 2) return { kind: "none" };
  const text = pyStrip(raw || "");
  if (!text) return { kind: "none" };

  if (text.includes("\n")) {
    let lines = text.split("\n").map(pyStrip).filter((ln) => ln);
    const nums = lines.map((ln) => LINE_NUM_RE.exec(ln));
    if (lines.length >= 2 && nums.every(Boolean) && nums.every((x, i) => parseInt(x![1], 10) === i + 1)) {
      lines = lines.map((ln) => pyStrip(ln.replace(LINE_NUM_RE, "")));
    }
    if (lines.length === qty && lines.every(isNamePart)) return { kind: "split", names: lines.map(flat) };
    return { kind: "none" };
  }

  const re = new RegExp(NUM_MARK_SRC, "g");
  const marks: { start: number; end: number; n: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    marks.push({ start: m.index, end: m.index + m[0].length, n: parseInt(m[1], 10) });
    if (m[0].length === 0) re.lastIndex++;
  }
  if (marks.length >= 2 && marks[0].start === 0 && marks.every((x, i) => x.n === i + 1)) {
    const parts = marks.map((mk, i) => flat(text.slice(mk.end, i + 1 < marks.length ? marks[i + 1].start : text.length)));
    if (parts.length === qty && parts.every(isNamePart)) return { kind: "split", names: parts };
    return { kind: "none" };
  }

  if (text.includes(",")) {
    const parts = text.split(",").map(flat).filter((p) => p);
    if (parts.length === qty && parts.every(isNamePart)) return { kind: "split", names: parts };
    return { kind: "none" };
  }

  const words = pySplit(flat(text));
  // A one-letter initial ("Giftee R.") is one name, not a list. Unseparated
  // words are "maybe several names" only when every word is at least two letters
  // ("Emma Grace Olivia", "Mary Ann").
  if (words.length === qty && words.every(isListNameWord)) return { kind: "ambiguous" };
  return { kind: "none" };
}

function isListNameWord(w: string): boolean {
  if (!isNameWord(w)) return false;
  const core = w.endsWith(".") ? w.slice(0, -1) : w;
  return [...core].length >= 2;
}
