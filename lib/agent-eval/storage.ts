import type { AgentEval, HistoryStore } from "./types";

const KEY = "agent-eval-go-no-go:v0";
const MAX_EVALS = 20;

function emptyStore(): HistoryStore {
  return {
    evals: [],
    lastEval: null,
    updatedAt: new Date().toISOString(),
  };
}

export function loadStore(): HistoryStore {
  if (typeof window === "undefined") return emptyStore();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as HistoryStore;
    if (!parsed.evals || !Array.isArray(parsed.evals)) {
      return emptyStore();
    }
    return {
      ...emptyStore(),
      ...parsed,
      evals: parsed.evals.slice(0, MAX_EVALS),
    };
  } catch {
    return emptyStore();
  }
}

export function saveStore(partial: Partial<HistoryStore>): HistoryStore {
  const prev = loadStore();
  const store: HistoryStore = {
    evals: (partial.evals ?? prev.evals).slice(0, MAX_EVALS),
    lastEval:
      partial.lastEval !== undefined ? partial.lastEval : prev.lastEval,
    updatedAt: new Date().toISOString(),
  };
  if (typeof window !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(store));
  }
  return store;
}

export function saveEval(evalRecord: AgentEval): HistoryStore {
  const prev = loadStore().evals.filter((e) => e.id !== evalRecord.id);
  return saveStore({
    evals: [evalRecord, ...prev],
    lastEval: evalRecord,
  });
}

export function clearHistory(): HistoryStore {
  return saveStore({ evals: [], lastEval: null });
}
