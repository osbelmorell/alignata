/**
 * RFC 4180 CSV reader that mirrors Python's csv module (default dialect, non-strict):
 * quoted cells may contain commas, quotes ("") and newlines; CR, LF and CRLF end records;
 * completely empty lines are skipped (like csv.DictReader).
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  // states: 0 start-of-field, 1 in-field, 2 in-quoted, 3 quote-in-quoted
  let state = 0;
  let fieldStarted = false;
  const endRecord = () => {
    if (fieldStarted || row.length > 0) {
      row.push(field);
      rows.push(row);
    }
    row = [];
    field = "";
    state = 0;
    fieldStarted = false;
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (state === 2) {
      if (c === '"') state = 3;
      else field += c;
      continue;
    }
    if (state === 3) {
      if (c === '"') {
        field += '"';
        state = 2;
        continue;
      }
      // closing quote seen: fall through to normal handling
      state = 1;
    }
    if (c === ",") {
      row.push(field);
      field = "";
      state = 0;
      fieldStarted = true;
      continue;
    }
    if (c === "\r" || c === "\n") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      endRecord();
      continue;
    }
    if (state === 0 && c === '"') {
      state = 2;
      fieldStarted = true;
      continue;
    }
    field += c;
    state = 1;
    fieldStarted = true;
  }
  if (state !== 0 || fieldStarted || row.length > 0) endRecord();
  return rows;
}

export interface CsvTable {
  header: string[];
  rows: Record<string, string>[];
}

/** Header-keyed rows (strips a leading BOM). Missing cells become "". */
export function readCsv(text: string): CsvTable {
  if (text.startsWith("\ufeff")) text = text.slice(1);
  const all = parseCsv(text);
  if (all.length === 0) return { header: [], rows: [] };
  const header = all[0];
  const rows = all.slice(1).map((cells) => {
    const o: Record<string, string> = {};
    header.forEach((h, i) => {
      o[h] = cells[i] ?? "";
    });
    return o;
  });
  return { header, rows };
}

/** Python csv.writer(lineterminator="\r\n") with QUOTE_MINIMAL. */
export function toCsv(header: string[], rows: string[][]): string {
  const cell = (v: string) => (/[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const line = (r: string[]) => (r.length === 1 && r[0] === "" ? '""' : r.map(cell).join(","));
  return [header, ...rows].map((r) => line(r) + "\r\n").join("");
}
