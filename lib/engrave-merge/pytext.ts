/**
 * Small helpers that mirror the Python string semantics used by the reference parser
 * (fixtures/parse_reference.py), so the TypeScript port stays byte-identical.
 */

/** Characters Python's str.isspace() / re `\s` treat as whitespace. */
export const PY_WS =
  "\\t\\n\\v\\f\\r\\x1c-\\x1f \\x85\\xa0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000";

const WS_RUN = new RegExp(`[${PY_WS}]+`, "g");
const WS_ONE = new RegExp(`^[${PY_WS}]$`);
const LEAD = new RegExp(`^[${PY_WS}]+`);
const TRAIL = new RegExp(`[${PY_WS}]+$`);

/** Python str.strip() */
export function pyStrip(s: string): string {
  return s.replace(LEAD, "").replace(TRAIL, "");
}

/** Python str.split() with no arguments. */
export function pySplit(s: string): string[] {
  const t = pyStrip(s);
  return t ? t.split(WS_RUN) : [];
}

export function isPySpace(ch: string): boolean {
  return WS_ONE.test(ch);
}

/** "Flatten": collapse every whitespace run (newlines included) to one space and trim. */
export function flat(s: string): string {
  return pyStrip(s.replace(WS_RUN, " "));
}

/** Whitespace-collapsed, lower-cased label used for comparisons. */
export function normLabel(s: string): string {
  return pyStrip(s.replace(WS_RUN, " ")).toLowerCase();
}

/** Approximation of Python str.casefold() (full case folding via upper → lower). */
export function casefold(s: string): string {
  return s.toUpperCase().toLowerCase();
}

/** Compare strings by Unicode code point, like Python's str ordering. */
export function cmpCodePoints(a: string, b: string): number {
  if (a === b) return 0;
  const A = Array.from(a);
  const B = Array.from(b);
  const n = Math.min(A.length, B.length);
  for (let i = 0; i < n; i++) {
    const x = A[i].codePointAt(0)!;
    const y = B[i].codePointAt(0)!;
    if (x !== y) return x < y ? -1 : 1;
  }
  return A.length === B.length ? 0 : A.length < B.length ? -1 : 1;
}

/** Number of Unicode code points. */
export function cpLength(s: string): number {
  let n = 0;
  for (const _ of s) n++; // eslint-disable-line @typescript-eslint/no-unused-vars
  return n;
}

export function isAsciiDigits(s: string): boolean {
  return /^[0-9]+$/.test(s);
}

/**
 * Python's num_key: digit strings sort numerically before everything else;
 * other strings sort by code point after them.
 */
export function cmpNumKey(a: string, b: string): number {
  const x = pyStrip(a || "");
  const y = pyStrip(b || "");
  const xd = isAsciiDigits(x);
  const yd = isAsciiDigits(y);
  if (xd && yd) {
    const xs = x.replace(/^0+(?=\d)/, "");
    const ys = y.replace(/^0+(?=\d)/, "");
    if (xs.length !== ys.length) return xs.length < ys.length ? -1 : 1;
    return xs < ys ? -1 : xs > ys ? 1 : 0;
  }
  if (xd) return -1;
  if (yd) return 1;
  return cmpCodePoints(x, y);
}
