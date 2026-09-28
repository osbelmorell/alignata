import type { ChangeEvent, ChangeEventKind } from "./types";

const KINDS = new Set<ChangeEventKind>(["deploy", "config", "flag", "upstream"]);

function asEvent(raw: unknown, idx: number): ChangeEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const service = String(o.service || "").trim();
  const kind = String(o.kind || "").trim() as ChangeEventKind;
  const ts = String(o.ts || o.timestamp || "").trim();
  if (!service || !KINDS.has(kind) || !ts) return null;
  return {
    id: String(o.id || `paste-${idx}`),
    service,
    kind,
    ts,
    version: o.version != null ? String(o.version) : undefined,
    sha: o.sha != null ? String(o.sha) : undefined,
    env: o.env != null ? String(o.env) : undefined,
    by: o.by != null ? String(o.by) : undefined,
    key: o.key != null ? String(o.key) : undefined,
    oldValue: o.oldValue != null ? String(o.oldValue) : undefined,
    newValue: o.newValue != null ? String(o.newValue) : undefined,
    flag: o.flag != null ? String(o.flag) : undefined,
    fromState: o.fromState != null ? String(o.fromState) : undefined,
    toState: o.toState != null ? String(o.toState) : undefined,
    dependency: o.dependency != null ? String(o.dependency) : undefined,
    status: o.status != null ? String(o.status) : undefined,
    depVersion: o.depVersion != null ? String(o.depVersion) : undefined,
    note: o.note != null ? String(o.note) : undefined,
  };
}

/** Parse JSON array, single object, or NDJSON / JSONL of change events. */
export function parseChangeEvents(text: string): ChangeEvent[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  // Try whole-document JSON first (array or object)
  try {
    const doc = JSON.parse(trimmed) as unknown;
    if (Array.isArray(doc)) {
      return doc
        .map((row, i) => asEvent(row, i))
        .filter((e): e is ChangeEvent => e != null);
    }
    const one = asEvent(doc, 0);
    return one ? [one] : [];
  } catch {
    // fall through to NDJSON
  }

  const out: ChangeEvent[] = [];
  const lines = trimmed.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("//") || line.startsWith("#")) continue;
    try {
      const row = JSON.parse(line) as unknown;
      const ev = asEvent(row, i);
      if (ev) out.push(ev);
    } catch {
      // skip bad line
    }
  }
  return out;
}
