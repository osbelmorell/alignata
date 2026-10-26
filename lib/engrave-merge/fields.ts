import { flat, normLabel } from "./pytext";
import { KNOWN_LABELS, PERS_LABEL_RE } from "./variations";

/**
 * Custom-options columns (board GO 2026-10-26).
 * Etsy's 2026 multi-field CSV shape is NOT verified. These helpers only classify
 * labels the existing Label:value parser already found. They never invent a column
 * from a guess about Etsy's export. fx06_multifield_GUESS stays a guess.
 *
 * A non-personalization label is auto-treated as engraving text only when its
 * values vary and at least one is multi-word (or longer than 15 characters).
 * A repeated value, or a set of short single words (Black/Blue, or Emma/Noah/Olivia),
 * is not auto-treated — the checklist decides. Single-word names and colors look
 * the same, so guessing would engrave the wrong column.
 */

/** The joined Personalization column already holds this. Don't add a second one. */
export const BARE_PERS_RE = /^personali[sz]ation$/i;

export function isConfidentFreeText(values: string[]): boolean {
  const nonempty = values.map((v) => flat(v)).filter((v) => v);
  if (nonempty.length < 2) return false;
  const distinct = [...new Set(nonempty)];
  // A value that shows up twice is a fixed option (Matte, Matte), not engraving text.
  if (distinct.length !== nonempty.length) return false;
  // Short single words are ambiguous: colors and one-word names look identical.
  const singleShort = distinct.every((v) => !/\s/.test(v) && [...v].length <= 12);
  if (singleShort) return false;
  return distinct.some((v) => /\s/.test(v) || [...v].length > 15);
}

export interface LabelPair {
  label: string;
  value: string;
  isText: boolean;
}

/** Display labels, per listing, that are confident free text. Explicit recipe fields are not passed in. */
export function confidentTextLabels(rows: { lid: string; pairs: LabelPair[] }[]): Map<string, string[]> {
  const buckets = new Map<string, Map<string, { display: string; values: string[] }>>();
  for (const row of rows) {
    let per = buckets.get(row.lid);
    if (!per) {
      per = new Map();
      buckets.set(row.lid, per);
    }
    for (const p of row.pairs) {
      const n = normLabel(p.label);
      if (!n || p.isText || PERS_LABEL_RE.test(n) || KNOWN_LABELS.has(n)) continue;
      let b = per.get(n);
      if (!b) {
        b = { display: p.label, values: [] };
        per.set(n, b);
      }
      b.values.push(p.value);
    }
  }
  const out = new Map<string, string[]>();
  for (const [lid, per] of buckets) {
    const labels: string[] = [];
    for (const b of per.values()) if (isConfidentFreeText(b.values)) labels.push(b.display);
    if (labels.length) out.set(lid, labels);
  }
  return out;
}

/**
 * One column per non-bare text field, in first-seen order, then recipe-only titles.
 * Bare "Personalization" is skipped: %11 already is that column.
 */
export function fieldColumns(
  items: { dup: boolean; textPairs: { label: string }[]; recipeFields?: string[] }[],
): string[] {
  const cols: string[] = [];
  const seen = new Set<string>();
  const add = (label: string) => {
    const n = normLabel(label);
    if (!n || BARE_PERS_RE.test(n) || seen.has(n)) return;
    seen.add(n);
    cols.push(flat(label));
  };
  for (const it of items) {
    if (it.dup) continue;
    for (const p of it.textPairs) add(p.label);
  }
  for (const it of items) {
    if (it.dup) continue;
    for (const f of it.recipeFields || []) add(f);
  }
  return cols;
}

/**
 * Blank sides of a multi-field order. A field counts as empty only when its label
 * is on this row (value blank) or the seller's checklist names it and this row
 * already has another checklist field. Other orders are not used to invent a
 * missing side — that would mis-read a one-box personalization row.
 */
export function blankFieldLabels(
  textPairs: { label: string; value: string }[],
  recipeFields: string[] | undefined,
  isBlank: (value: string) => boolean,
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (label: string) => {
    const n = normLabel(label);
    if (!n || seen.has(n)) return;
    seen.add(n);
    out.push(label);
  };
  if (textPairs.length >= 2) {
    for (const p of textPairs) if (isBlank(p.value)) push(p.label);
  }
  const wanted = (recipeFields || []).filter((f) => f && !BARE_PERS_RE.test(normLabel(f)));
  if (wanted.length >= 2) {
    const present = new Set(textPairs.map((p) => normLabel(p.label)));
    if (wanted.some((f) => present.has(normLabel(f)))) {
      for (const f of wanted) {
        const pair = textPairs.find((p) => normLabel(p.label) === normLabel(f));
        if (!pair || isBlank(pair.value)) push(pair?.label || f);
      }
    }
  }
  return out;
}
