import type { ChangeEvent } from "./types";

/** Parse KEY=VALUE / export KEY=VALUE lines, or a JSON object, into a flat string map. */
export function parseConfigBlob(text: string): Record<string, string> {
  const trimmed = text.trim();
  if (!trimmed) return {};

  try {
    const doc = JSON.parse(trimmed) as unknown;
    if (doc && typeof doc === "object" && !Array.isArray(doc)) {
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(doc as Record<string, unknown>)) {
        if (v === null || v === undefined) continue;
        out[k] =
          typeof v === "string" || typeof v === "number" || typeof v === "boolean"
            ? String(v)
            : JSON.stringify(v);
      }
      return out;
    }
  } catch {
    // fall through to env-style
  }

  const out: Record<string, string> = {};
  for (const line of trimmed.split(/\r?\n/)) {
    const raw = line.trim();
    if (!raw || raw.startsWith("#") || raw.startsWith("//")) continue;
    const cleaned = raw.replace(/^export\s+/i, "");
    const eq = cleaned.indexOf("=");
    if (eq <= 0) continue;
    const key = cleaned.slice(0, eq).trim();
    let val = cleaned.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (key) out[key] = val;
  }
  return out;
}

/** Diff before → after into config ChangeEvents for a service. */
export function diffConfigToEvents(
  beforeText: string,
  afterText: string,
  service: string,
  ts = new Date().toISOString(),
): ChangeEvent[] {
  const before = parseConfigBlob(beforeText);
  const after = parseConfigBlob(afterText);
  const keys = Array.from(
    new Set([...Object.keys(before), ...Object.keys(after)]),
  ).sort();
  const events: ChangeEvent[] = [];
  let i = 0;
  for (const key of keys) {
    const oldValue = before[key];
    const newValue = after[key];
    if (oldValue === newValue) continue;
    events.push({
      id: `cfg-diff-${i++}`,
      service: service.trim() || "unknown",
      kind: "config",
      ts,
      key,
      oldValue: oldValue ?? "(absent)",
      newValue: newValue ?? "(removed)",
      by: "config-diff",
    });
  }
  return events;
}
