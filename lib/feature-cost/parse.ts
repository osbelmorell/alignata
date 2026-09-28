import type { CostEvent } from "./types";

function num(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) {
    return Number(v);
  }
  return 0;
}

function str(v: unknown, fallback = ""): string {
  if (v == null) return fallback;
  return String(v).trim();
}

function normalize(raw: Record<string, unknown>): CostEvent | null {
  const feature = str(raw.feature ?? raw.tag ?? raw.name);
  if (!feature) return null;
  const costUsd = num(raw.costUsd ?? raw.cost ?? raw.usd ?? raw.amount);
  const tokens = num(raw.tokens ?? raw.token_count ?? raw.prompt_tokens);
  let ts = str(raw.ts ?? raw.timestamp ?? raw.date ?? raw.day);
  if (!ts) ts = new Date().toISOString();
  // Prefer day precision for rollups
  const day = ts.slice(0, 10);
  return {
    ts: day,
    feature,
    costUsd,
    tokens,
    model: str(raw.model) || undefined,
  };
}

export function parseNdjson(text: string): CostEvent[] {
  const out: CostEvent[] = [];
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    try {
      const obj = JSON.parse(t) as Record<string, unknown>;
      const ev = normalize(obj);
      if (ev) out.push(ev);
    } catch {
      // skip bad lines
    }
  }
  return out;
}

/** Minimal CSV: header required. Supports feature,costUsd|cost,tokens?,ts|date|day?,model? */
export function parseCsv(text: string): CostEvent[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const out: CostEvent[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    const raw: Record<string, unknown> = {};
    headers.forEach((h, idx) => {
      raw[h] = cols[idx];
    });
    // map common aliases already handled in normalize via keys
    if (raw.cost != null && raw.costusd == null) raw.costUsd = raw.cost;
    if (raw.date != null && raw.ts == null) raw.ts = raw.date;
    if (raw.day != null && raw.ts == null) raw.ts = raw.day;
    if (raw.tag != null && raw.feature == null) raw.feature = raw.tag;
    const ev = normalize(raw);
    if (ev) out.push(ev);
  }
  return out;
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQ = !inQ;
      continue;
    }
    if (c === "," && !inQ) {
      result.push(cur.trim());
      cur = "";
      continue;
    }
    cur += c;
  }
  result.push(cur.trim());
  return result;
}

export function parseIngest(text: string, filename?: string): CostEvent[] {
  const name = (filename || "").toLowerCase();
  const trimmed = text.trim();
  if (name.endsWith(".csv") || (!trimmed.startsWith("{") && trimmed.includes(","))) {
    // Prefer CSV if header-like first line
    const first = trimmed.split(/\r?\n/)[0]?.toLowerCase() || "";
    if (first.includes("feature") || first.includes("cost") || name.endsWith(".csv")) {
      return parseCsv(trimmed);
    }
  }
  if (trimmed.startsWith("[")) {
    try {
      const arr = JSON.parse(trimmed) as Record<string, unknown>[];
      return arr.map(normalize).filter((e): e is CostEvent => e != null);
    } catch {
      return parseNdjson(trimmed);
    }
  }
  return parseNdjson(trimmed);
}
