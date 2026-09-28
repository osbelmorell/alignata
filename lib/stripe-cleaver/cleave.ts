import { parseCsv, pick, toCsv } from "./csv";
import type { BooksPreset, BooksRow, CleaveResult, StripeTxn } from "./types";

const JUNK_RE =
  /^(total|totals|summary|balance|starting balance|ending balance|opening balance|closing balance)$/i;

function parseAmount(raw: string): number | null {
  if (raw == null || raw === "") return null;
  const cleaned = raw.replace(/[$,\s]/g, "").replace(/^\((.+)\)$/, "-$1");
  if (cleaned === "" || cleaned === "-" || cleaned === ".") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** Normalize common Stripe / bank date strings → YYYY-MM-DD */
export function normalizeDate(raw: string): string {
  const s = (raw || "").trim();
  if (!s) return "";
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const us = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (us) {
    let y = Number(us[3]);
    if (y < 100) y += 2000;
    const m = String(Number(us[1])).padStart(2, "0");
    const d = String(Number(us[2])).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const ymd = s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})/);
  if (ymd) {
    return `${ymd[1]}-${String(Number(ymd[2])).padStart(2, "0")}-${String(Number(ymd[3])).padStart(2, "0")}`;
  }
  const t = Date.parse(s);
  if (!Number.isNaN(t)) {
    const dt = new Date(t);
    const y = dt.getUTCFullYear();
    const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
    const d = String(dt.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return s.slice(0, 10);
}

function isJunkRow(row: Record<string, string>, desc: string, type: string): boolean {
  if (JUNK_RE.test(desc) || JUNK_RE.test(type)) return true;
  const vals = Object.values(row).join(" ").toLowerCase();
  if (/\b(total|summary)\b/.test(vals) && !desc) return true;
  return false;
}

export function parseStripeRows(text: string): {
  txns: StripeTxn[];
  stripped: number;
  sourceCount: number;
} {
  const { rows } = parseCsv(text);
  const txns: StripeTxn[] = [];
  let stripped = 0;
  for (const row of rows) {
    const description = pick(
      row,
      "Description",
      "description",
      "Name",
      "name",
      "Memo",
      "memo",
    );
    const type = pick(
      row,
      "Type",
      "type",
      "Reporting Category",
      "reporting_category",
      "Category",
    );
    const dateRaw = pick(
      row,
      "Created",
      "created",
      "Date",
      "date",
      "Available On",
      "available_on",
      "Arrival Date",
      "arrival_date",
      "Created (UTC)",
    );
    const currency = (
      pick(row, "Currency", "currency", "Presentment Currency") || "usd"
    ).toLowerCase();

    if (isJunkRow(row, description, type)) {
      stripped++;
      continue;
    }

    const amount = parseAmount(
      pick(row, "Amount", "amount", "Gross", "gross", "Charge", "charge"),
    );
    const feeRaw = pick(row, "Fee", "fee", "Fees", "fees", "Stripe Fee");
    const fee = parseAmount(feeRaw) ?? 0;
    const netRaw = pick(row, "Net", "net", "Net Amount", "net_amount");
    let net = parseAmount(netRaw);

    if (amount == null && net == null) {
      stripped++;
      continue;
    }

    const amt = amount ?? (net != null ? net + Math.abs(fee) : 0);
    if (net == null) net = amt - Math.abs(fee);

    const date = normalizeDate(dateRaw);
    if (!date) {
      stripped++;
      continue;
    }

    txns.push({
      date,
      description: description || type || "Stripe transaction",
      type: type || "",
      currency,
      amount: amt,
      fee: Math.abs(fee),
      net,
    });
  }
  return { txns, stripped, sourceCount: rows.length };
}

function booksRowsFromTxns(txns: StripeTxn[]): BooksRow[] {
  const rebuilt: BooksRow[] = [];
  for (const t of txns) {
    const baseDesc = t.description || t.type || "Stripe transaction";
    rebuilt.push({
      date: t.date,
      description: baseDesc,
      amount: t.amount,
      kind: /payout|transfer/i.test(t.type) ? "payout" : "other",
    });
    if (t.fee > 0) {
      rebuilt.push({
        date: t.date,
        description: `Stripe fee — ${baseDesc}`,
        amount: -Math.abs(t.fee),
        kind: "fee",
      });
    }
  }
  return rebuilt;
}

function formatAmount(n: number): string {
  return n.toFixed(2);
}

export function exportBooksCsv(rows: BooksRow[], preset: BooksPreset): string {
  if (preset === "quickbooks") {
    return toCsv(
      ["Date", "Description", "Amount"],
      rows.map((r) => [r.date, r.description, formatAmount(r.amount)]),
    );
  }
  return toCsv(
    ["Date", "Amount", "Payee", "Description", "Reference"],
    rows.map((r) => [
      r.date,
      formatAmount(r.amount),
      "Stripe",
      r.description,
      r.kind,
    ]),
  );
}

export function cleaveStripeCsv(text: string, preset: BooksPreset): CleaveResult {
  const { txns, stripped, sourceCount } = parseStripeRows(text);
  const rows = booksRowsFromTxns(txns);
  const feeCount = rows.filter((r) => r.kind === "fee").length;
  return {
    preset,
    rows,
    sourceCount,
    strippedCount: stripped,
    feeCount,
    csv: exportBooksCsv(rows, preset),
  };
}
