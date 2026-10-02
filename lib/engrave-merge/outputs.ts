import { toCsv } from "./csv";
import { EXC_HEADER } from "./process";
import type { ProcessOk } from "./types";

/** Local date as YYYY-MM-DD (file names use the seller's local date). */
export function localDate(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function mergeCsv(res: ProcessOk): string {
  return toCsv(res.mergeHeader, res.mergeRows);
}

export function exceptionsCsv(res: ProcessOk): string {
  return toCsv(EXC_HEADER, res.excRows);
}

export const mergeFileName = (d = new Date()) => `engrave-merge-${localDate(d)}.csv`;
export const exceptionsFileName = (d = new Date()) => `engrave-merge-exceptions-${localDate(d)}.csv`;

/** UTF-8 without BOM (TextEncoder never writes one). */
export function downloadText(name: string, body: string, type = "text/csv;charset=utf-8") {
  const blob = new Blob([new TextEncoder().encode(body)], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
