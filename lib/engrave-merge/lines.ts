import { PY_WS, flat, pyStrip } from "./pytext";

const S = `[${PY_WS}]`;
const NUM_MARK_SRC = `(?:(?<=${S})|^)([0-9]{1,2})[.)]${S}+`;
const LINE_NUM_RE = new RegExp(`^${S}*([0-9]{1,2})[.)]${S}+`);

/**
 * Personalization text → Line 1…N (SPEC §5.5). textFields are raw values (newlines kept).
 */
export function splitLines(textFields: string[], stripNumbers: boolean): string[] {
  if (textFields.length > 1) return textFields.map(flat);
  if (textFields.length === 0 || !pyStrip(textFields[0])) return [];
  const t = pyStrip(textFields[0]);
  if (t.includes("\n")) {
    let lines = t
      .split("\n")
      .filter((ln) => pyStrip(ln))
      .map(pyStrip);
    const nums = lines.map((ln) => LINE_NUM_RE.exec(ln));
    if (
      stripNumbers &&
      lines.length >= 2 &&
      nums.every(Boolean) &&
      nums.every((x, i) => parseInt(x![1], 10) === i + 1)
    ) {
      lines = lines.map((ln) => pyStrip(ln.replace(LINE_NUM_RE, "")));
    }
    return lines.map(flat);
  }
  const re = new RegExp(NUM_MARK_SRC, "g");
  const marks: { start: number; end: number; n: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(t)) !== null) {
    marks.push({ start: m.index, end: m.index + m[0].length, n: parseInt(m[1], 10) });
    if (m[0].length === 0) re.lastIndex++;
  }
  if (
    stripNumbers &&
    marks.length >= 2 &&
    marks[0].start === 0 &&
    marks.every((x, i) => x.n === i + 1)
  ) {
    return marks.map((mk, i) => flat(t.slice(mk.end, i + 1 < marks.length ? marks[i + 1].start : t.length)));
  }
  return [flat(t)];
}
