const KEY = "stripe-cleaver:v1";

type Store = {
  importCount: number;
  lastPreset: "quickbooks" | "xero";
};

function empty(): Store {
  return { importCount: 0, lastPreset: "quickbooks" };
}

export function loadStore(): Store {
  if (typeof window === "undefined") return empty();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as Partial<Store>;
    return {
      importCount: Number(parsed.importCount) || 0,
      lastPreset: parsed.lastPreset === "xero" ? "xero" : "quickbooks",
    };
  } catch {
    return empty();
  }
}

export function bumpImport(preset: "quickbooks" | "xero"): Store {
  const cur = loadStore();
  const next: Store = {
    importCount: cur.importCount + 1,
    lastPreset: preset,
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}
