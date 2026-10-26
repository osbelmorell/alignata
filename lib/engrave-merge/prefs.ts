/**
 * Local settings for the checklist and the one-name toggle.
 * localStorage key `em_prefs` holds only a boolean and field titles (listing id →
 * labels). Never buyer names, order text, order ids or file contents.
 * `em_iid` and `em_price` are untouched.
 */
export const PREFS_KEY = "em_prefs";

export interface EngravePrefs {
  oneNamePerCopy?: boolean;
  /** Listing id → engraving-text field titles the seller checked. Absent = auto. */
  fields: Record<string, string[]>;
}

const EMPTY: EngravePrefs = { fields: {} };

export interface PrefsStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

function cleanLabel(v: unknown): string | null {
  if (typeof v !== "string") return null;
  if (/[\r\n]/.test(v)) return null;
  const t = v.replace(/\s+/g, " ").trim();
  if (!t || t.length > 40) return null;
  return t;
}

export function readEngravePrefs(storage: PrefsStorage | null): EngravePrefs {
  if (!storage) return { fields: {} };
  let raw: unknown;
  try {
    const text = storage.getItem(PREFS_KEY);
    if (!text) return { fields: {} };
    raw = JSON.parse(text);
  } catch {
    return { fields: {} };
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { fields: {} };
  const o = raw as Record<string, unknown>;
  const out: EngravePrefs = { fields: {} };
  if (typeof o.oneNamePerCopy === "boolean") out.oneNamePerCopy = o.oneNamePerCopy;
  const fields = o.fields;
  if (fields && typeof fields === "object" && !Array.isArray(fields)) {
    for (const [lid, v] of Object.entries(fields as Record<string, unknown>).slice(0, 100)) {
      if (!/^[0-9]{1,20}$/.test(lid) || !Array.isArray(v)) continue;
      const labels = v.map(cleanLabel).filter((x): x is string => x !== null).slice(0, 20);
      out.fields[lid] = labels;
    }
  }
  return out;
}

export function writeEngravePrefs(storage: PrefsStorage | null, prefs: EngravePrefs): void {
  if (!storage) return;
  const fields: Record<string, string[]> = {};
  for (const [lid, labels] of Object.entries(prefs.fields || {}).slice(0, 100)) {
    if (!/^[0-9]{1,20}$/.test(lid)) continue;
    fields[lid] = (labels || []).map(cleanLabel).filter((x): x is string => x !== null).slice(0, 20);
  }
  const body: Record<string, unknown> = { v: 1, fields };
  if (typeof prefs.oneNamePerCopy === "boolean") body.oneNamePerCopy = prefs.oneNamePerCopy;
  try {
    storage.setItem(PREFS_KEY, JSON.stringify(body));
  } catch {
    /* storage blocked: the tool still works, the choice just isn't remembered */
  }
}

export function clearEngravePrefs(storage: PrefsStorage | null): void {
  if (!storage?.removeItem) return;
  try {
    storage.removeItem(PREFS_KEY);
  } catch {
    /* ignore */
  }
}

export function browserPrefsStorage(): PrefsStorage | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}

export { EMPTY as EMPTY_PREFS };
