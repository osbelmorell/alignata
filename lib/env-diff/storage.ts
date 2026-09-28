import type { EnvDiffSnapshot, HistoryStore } from "./types";

const KEY = "env-diff-snapshot:v0";
const MAX_SNAPSHOTS = 20;

function emptyStore(): HistoryStore {
  return {
    snapshots: [],
    lastBefore: "",
    lastAfter: "",
    lastBeforeLabel: "staging",
    lastAfterLabel: "prod",
    updatedAt: new Date().toISOString(),
  };
}

export function loadStore(): HistoryStore {
  if (typeof window === "undefined") return emptyStore();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as HistoryStore;
    if (!parsed.snapshots || !Array.isArray(parsed.snapshots)) {
      return emptyStore();
    }
    return {
      ...emptyStore(),
      ...parsed,
      snapshots: parsed.snapshots,
    };
  } catch {
    return emptyStore();
  }
}

export function saveStore(partial: Partial<HistoryStore>): HistoryStore {
  const prev = loadStore();
  const store: HistoryStore = {
    snapshots: (partial.snapshots ?? prev.snapshots).slice(0, MAX_SNAPSHOTS),
    lastBefore: partial.lastBefore ?? prev.lastBefore,
    lastAfter: partial.lastAfter ?? prev.lastAfter,
    lastBeforeLabel: partial.lastBeforeLabel ?? prev.lastBeforeLabel,
    lastAfterLabel: partial.lastAfterLabel ?? prev.lastAfterLabel,
    updatedAt: new Date().toISOString(),
  };
  if (typeof window !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(store));
  }
  return store;
}

export function prependSnapshot(
  snap: EnvDiffSnapshot,
  pair: {
    before: string;
    after: string;
    beforeLabel: string;
    afterLabel: string;
  },
): HistoryStore {
  const prev = loadStore().snapshots.filter((s) => s.id !== snap.id);
  return saveStore({
    snapshots: [snap, ...prev],
    lastBefore: pair.before,
    lastAfter: pair.after,
    lastBeforeLabel: pair.beforeLabel,
    lastAfterLabel: pair.afterLabel,
  });
}

export function clearHistory(): HistoryStore {
  const prev = loadStore();
  return saveStore({
    snapshots: [],
    lastBefore: prev.lastBefore,
    lastAfter: prev.lastAfter,
    lastBeforeLabel: prev.lastBeforeLabel,
    lastAfterLabel: prev.lastAfterLabel,
  });
}
