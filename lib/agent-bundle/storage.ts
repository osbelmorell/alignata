import { SAMPLE_BUNDLES } from "./sample";
import type { Bundle, Store } from "./types";

const KEY = "agent-bundle-tag:v0";

function emptyStore(): Store {
  return { bundles: [], updatedAt: new Date().toISOString(), seeded: false };
}

export function loadStore(): Store {
  if (typeof window === "undefined") return emptyStore();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const seeded: Store = {
        bundles: [...SAMPLE_BUNDLES],
        updatedAt: new Date().toISOString(),
        seeded: true,
      };
      localStorage.setItem(KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw) as Store;
    if (!parsed.bundles || !Array.isArray(parsed.bundles)) return emptyStore();
    return parsed;
  } catch {
    return emptyStore();
  }
}

export function saveStore(bundles: Bundle[]): Store {
  const store: Store = {
    bundles,
    updatedAt: new Date().toISOString(),
    seeded: true,
  };
  if (typeof window !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(store));
  }
  return store;
}

export function appendBundle(bundle: Bundle): Store {
  const current = loadStore();
  const next = [...current.bundles, bundle];
  return saveStore(next);
}

export function clearStore(): Store {
  const store = emptyStore();
  if (typeof window !== "undefined") {
    localStorage.removeItem(KEY);
  }
  return store;
}

export function resetToSample(): Store {
  return saveStore([...SAMPLE_BUNDLES]);
}
