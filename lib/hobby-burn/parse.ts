import type { ProjectBurn } from "./types";

function num(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const cleaned = v.replace(/,/g, "").trim();
    if (cleaned !== "" && !Number.isNaN(Number(cleaned))) return Number(cleaned);
  }
  return 0;
}

function str(v: unknown, fallback = ""): string {
  if (v == null) return fallback;
  return String(v).trim();
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

function headerKey(h: string): string {
  return h.toLowerCase().replace(/[\s_-]+/g, "");
}

/** Map flexible Vercel-ish headers → project / deploys / gbHours */
function normalizeRow(raw: Record<string, unknown>): ProjectBurn | null {
  const keys = Object.keys(raw);
  const get = (...aliases: string[]) => {
    for (const a of aliases) {
      const want = headerKey(a);
      for (const k of keys) {
        if (headerKey(k) === want) return raw[k];
      }
    }
    return undefined;
  };

  const project = str(
    get(
      "project",
      "name",
      "projectname",
      "app",
      "service",
      "project name",
      "Project Name",
    ),
  );
  if (!project) return null;

  const deploys = num(
    get(
      "deploys",
      "builds",
      "deploy",
      "build",
      "count",
      "deployments",
      "buildcount",
      "deploycount",
    ),
  );

  const gbHours = num(
    get(
      "gbhours",
      "gb_hours",
      "gb-hours",
      "bandwidth",
      "gbh",
      "serverlessfunctionexecution",
      "execution",
    ),
  );

  if (deploys <= 0 && gbHours <= 0) return null;
  return {
    project,
    deploys: deploys > 0 ? deploys : 0,
    gbHours: gbHours > 0 ? gbHours : undefined,
  };
}

export function parseCsv(text: string): ProjectBurn[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]);
  const out: ProjectBurn[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    const raw: Record<string, unknown> = {};
    headers.forEach((h, idx) => {
      raw[h] = cols[idx];
    });
    const row = normalizeRow(raw);
    if (row) out.push(row);
  }
  return out;
}

export function parseIngest(text: string, filename?: string): ProjectBurn[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const name = (filename || "").toLowerCase();

  if (trimmed.startsWith("[")) {
    try {
      const arr = JSON.parse(trimmed) as Record<string, unknown>[];
      return arr.map(normalizeRow).filter((r): r is ProjectBurn => r != null);
    } catch {
      /* fall through */
    }
  }

  if (
    name.endsWith(".csv") ||
    trimmed.includes(",") ||
    /^project|name|builds|deploys/i.test(trimmed.split(/\r?\n/)[0] || "")
  ) {
    return parseCsv(trimmed);
  }

  // NDJSON
  const out: ProjectBurn[] = [];
  for (const line of trimmed.split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    try {
      const obj = JSON.parse(t) as Record<string, unknown>;
      const row = normalizeRow(obj);
      if (row) out.push(row);
    } catch {
      /* skip */
    }
  }
  return out;
}
