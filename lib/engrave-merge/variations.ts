import { decodeEntities } from "./entities";
import { PY_WS, flat, normLabel, pyStrip } from "./pytext";

/** Labels trusted as the start of a new "Label:value" pair (mirrors parse_reference.py). */
export const KNOWN_LABELS = new Set([
  "size", "style", "color", "colour", "material", "font", "font style", "font color",
  "finish", "design", "design options", "length", "width", "height", "thickness",
  "wood", "wood type", "metal", "metal type", "shape", "quantity", "set", "set size",
  "pack", "option", "options", "type", "glass type", "frame", "frame color",
  "color of name", "primary color", "secondary color", "accessory", "add on", "add-on",
  "gift wrap", "gift box", "engraving side", "side", "chain length", "ring size",
]);

const S = `[${PY_WS}]`;
export const PERS_LABEL_RE = new RegExp(`^personali[sz]ation(?:${S}*#?${S}*[0-9]+)?$`, "i");
const BARE_PERS_RE = /^personali[sz]ation$/i;
const BOUNDARY_SRC = ",[ \\t]*([^,:\\n]{1,40}):";
const FIRST_LABEL_RE = /^[ \t]*([^,:\n]{1,40}):/;
const LETTER_RE = new RegExp("^\\p{L}", "u");
const UPPER_RE = new RegExp("^\\p{Lu}", "u");
const WS_RUN = new RegExp(`${S}+`);

export interface Pair {
  label: string; // display label (flattened)
  value: string; // trimmed, inner newlines kept
  isText: boolean;
}

export function looksLikeLabel(label: string): boolean {
  const t = pyStrip(label);
  if (!t) return false;
  const first = Array.from(t)[0];
  if (!LETTER_RE.test(first) || !UPPER_RE.test(first)) return false;
  const words = t.split(WS_RUN).filter((w) => /[A-Za-z]/.test(w));
  return words.length >= 1 && words.length <= 5 && Array.from(t).length <= 40;
}

/**
 * Variations cell → label/value pairs (SPEC §5.4).
 * Returns ok=false when the cell does not start with "Label:" (UNREADABLE_OPTIONS).
 */
export function parseVariations(
  raw: string,
  textLabels: ReadonlySet<string> = new Set(),
  extraLabels: ReadonlySet<string> = new Set(),
): { pairs: Pair[]; ok: boolean } {
  const s = pyStrip(decodeEntities(raw));
  if (!s) return { pairs: [], ok: true };
  if (BARE_PERS_RE.test(s)) return { pairs: [{ label: "Personalization", value: "", isText: true }], ok: true };
  const m = FIRST_LABEL_RE.exec(s);
  if (!m) return { pairs: [], ok: false };

  const isText = (lbl: string) => {
    const n = normLabel(lbl);
    return PERS_LABEL_RE.test(n) || textLabels.has(n);
  };

  const firstLabel = m[1];
  const firstLabelStart = m[0].length - 1 - firstLabel.length;
  // [label start, value start, label]
  const starts: [number, number, string][] = [[firstLabelStart, m[0].length, firstLabel]];
  let curText = isText(firstLabel);
  const re = new RegExp(BOUNDARY_SRC, "g");
  re.lastIndex = m[0].length;
  let b: RegExpExecArray | null;
  while ((b = re.exec(s)) !== null) {
    const start = b.index;
    const end = b.index + b[0].length;
    if (start < starts[starts.length - 1][1]) continue;
    const lbl = b[1];
    const n = normLabel(lbl);
    const accept = curText
      ? PERS_LABEL_RE.test(n) || textLabels.has(n) || extraLabels.has(n)
      : KNOWN_LABELS.has(n) || extraLabels.has(n) || textLabels.has(n) || PERS_LABEL_RE.test(n) || looksLikeLabel(lbl);
    if (accept) {
      starts.push([start, end, lbl]);
      curText = isText(lbl);
    }
  }
  const pairs: Pair[] = starts.map(([, vs, lbl], i) => {
    const end = i + 1 < starts.length ? starts[i + 1][0] : s.length;
    return { label: flat(lbl), value: pyStrip(s.slice(vs, end)), isText: isText(lbl) };
  });
  return { pairs, ok: true };
}

/** Unique display labels found in a Variations cell (used by the "Item settings" UI). */
export function labelsIn(raw: string): string[] {
  const { pairs } = parseVariations(raw);
  return pairs.map((p) => p.label);
}
