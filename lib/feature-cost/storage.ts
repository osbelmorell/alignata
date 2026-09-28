import type { CostEvent, Store } from "./types";

const KEY = "llm-feature-cost-tag:v0";

export function loadStore(): Store {
  if (typeof window === "undefined") {
    return { events: [], updatedAt: new Date().toISOString() };
  }
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { events: [], updatedAt: new Date().toISOString() };
    const parsed = JSON.parse(raw) as Store;
    if (!parsed.events || !Array.isArray(parsed.events)) {
      return { events: [], updatedAt: new Date().toISOString() };
    }
    return parsed;
  } catch {
    return { events: [], updatedAt: new Date().toISOString() };
  }
}

export function saveStore(events: CostEvent[]): Store {
  const store: Store = { events, updatedAt: new Date().toISOString() };
  if (typeof window !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(store));
  }
  return store;
}

export function clearStore(): Store {
  return saveStore([]);
}
