import type { Digest, ProjectBurn, Store } from "./types";

const KEY = "hobby-deploy-burn-digest:v0";

function empty(): Store {
  return {
    rows: [],
    digests: [],
    lastPaste: "",
    updatedAt: new Date().toISOString(),
  };
}

export function loadStore(): Store {
  if (typeof window === "undefined") return empty();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as Store;
    if (!Array.isArray(parsed.rows)) return empty();
    return {
      rows: parsed.rows,
      digests: Array.isArray(parsed.digests) ? parsed.digests : [],
      lastPaste: typeof parsed.lastPaste === "string" ? parsed.lastPaste : "",
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    };
  } catch {
    return empty();
  }
}

export function saveStore(partial: {
  rows: ProjectBurn[];
  digests?: Digest[];
  lastPaste?: string;
}): Store {
  const prev = loadStore();
  const store: Store = {
    rows: partial.rows,
    digests: partial.digests ?? prev.digests,
    lastPaste: partial.lastPaste ?? prev.lastPaste,
    updatedAt: new Date().toISOString(),
  };
  if (typeof window !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(store));
  }
  return store;
}

export function clearStore(): Store {
  const store = empty();
  if (typeof window !== "undefined") {
    localStorage.removeItem(KEY);
  }
  return store;
}

export function prependDigest(digest: Digest, max = 10): Digest[] {
  const prev = loadStore();
  const digests = [digest, ...prev.digests.filter((d) => d.id !== digest.id)].slice(
    0,
    max,
  );
  saveStore({ rows: prev.rows, digests, lastPaste: prev.lastPaste });
  return digests;
}
