/**
 * Parse env paste into a flat string map.
 * Accepts:
 * - KEY=VALUE / export KEY=VALUE lines
 * - JSON object of keys → values
 * - Key-only lists (one KEY per line) — values stored as ""
 */
export function parseEnvBlob(text: string): Record<string, string> {
  const trimmed = text.trim();
  if (!trimmed) return {};

  try {
    const doc = JSON.parse(trimmed) as unknown;
    if (doc && typeof doc === "object" && !Array.isArray(doc)) {
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(doc as Record<string, unknown>)) {
        if (v === null || v === undefined) {
          out[k] = "";
          continue;
        }
        out[k] =
          typeof v === "string" ||
          typeof v === "number" ||
          typeof v === "boolean"
            ? String(v)
            : JSON.stringify(v);
      }
      return out;
    }
    if (Array.isArray(doc)) {
      const out: Record<string, string> = {};
      for (const item of doc) {
        if (typeof item === "string" && item.trim()) out[item.trim()] = "";
        else if (item && typeof item === "object" && "key" in item) {
          const o = item as { key: unknown; value?: unknown };
          const key = String(o.key || "").trim();
          if (key) out[key] = o.value != null ? String(o.value) : "";
        }
      }
      return out;
    }
  } catch {
    // fall through to line-oriented
  }

  const out: Record<string, string> = {};
  for (const line of trimmed.split(/\r?\n/)) {
    const raw = line.trim();
    if (!raw || raw.startsWith("#") || raw.startsWith("//")) continue;
    const cleaned = raw.replace(/^export\s+/i, "");
    const eq = cleaned.indexOf("=");
    if (eq <= 0) {
      // Key-only line (or comma-separated keys)
      for (const part of cleaned.split(/[,;\s]+/)) {
        const key = part.trim();
        if (key && /^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) out[key] = "";
      }
      continue;
    }
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
