import {
  DEFAULT_CHECKLIST,
  STORAGE_KEY,
  defaultState,
  type ChecklistItem,
  type DecisionLogEntry,
  type DecisionState,
  type OpportunityCard,
  type PersistedState,
} from "./types";
import { impliedUsd } from "./format";

const STATES: DecisionState[] = ["approve", "size", "pass"];

function isState(value: unknown): value is DecisionState {
  return typeof value === "string" && (STATES as string[]).includes(value);
}

function normalizeChecklist(raw: unknown): ChecklistItem[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return DEFAULT_CHECKLIST.map((item) => ({ ...item }));
  }
  const items: ChecklistItem[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const label = typeof r.label === "string" ? r.label.trim() : "";
    if (!label) continue;
    items.push({
      id: typeof r.id === "string" && r.id ? r.id : `c-${items.length}`,
      label,
      checked: Boolean(r.checked),
    });
  }
  return items.length
    ? items
    : DEFAULT_CHECKLIST.map((item) => ({ ...item }));
}

function normalizeCard(raw: unknown): OpportunityCard {
  const fallback = defaultState().card;
  if (!raw || typeof raw !== "object") return fallback;
  const c = raw as Record<string, unknown>;
  const deployableUsd =
    typeof c.deployableUsd === "number" && Number.isFinite(c.deployableUsd)
      ? c.deployableUsd
      : null;
  const suggestedPct =
    typeof c.suggestedPct === "number" && Number.isFinite(c.suggestedPct)
      ? c.suggestedPct
      : null;
  return {
    ticker: typeof c.ticker === "string" ? c.ticker : "",
    thesis: typeof c.thesis === "string" ? c.thesis : "",
    checklist: normalizeChecklist(c.checklist),
    deployableUsd,
    suggestedPct,
  };
}

function normalizeEntry(raw: unknown): DecisionLogEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const e = raw as Record<string, unknown>;
  if (!isState(e.state)) return null;
  const ticker = typeof e.ticker === "string" ? e.ticker.trim() : "";
  if (!ticker) return null;
  const deployableUsd =
    typeof e.deployableUsd === "number" && Number.isFinite(e.deployableUsd)
      ? e.deployableUsd
      : null;
  const suggestedPct =
    typeof e.suggestedPct === "number" && Number.isFinite(e.suggestedPct)
      ? e.suggestedPct
      : null;
  const implied =
    typeof e.impliedUsd === "number" && Number.isFinite(e.impliedUsd)
      ? e.impliedUsd
      : impliedUsd(deployableUsd, suggestedPct);
  return {
    id: typeof e.id === "string" && e.id ? e.id : `row-${Date.now()}`,
    timestamp:
      typeof e.timestamp === "string" && e.timestamp
        ? e.timestamp
        : new Date().toISOString(),
    ticker,
    state: e.state,
    thesis: typeof e.thesis === "string" ? e.thesis : "",
    suggestedPct,
    deployableUsd,
    impliedUsd: implied,
    checklist: normalizeChecklist(e.checklist),
    example: Boolean(e.example),
  };
}

export function normalizeState(raw: unknown): PersistedState {
  const fallback = defaultState();
  if (!raw || typeof raw !== "object") return fallback;
  const data = raw as Record<string, unknown>;
  const logRaw = Array.isArray(data.log) ? data.log : [];
  const log = logRaw
    .map(normalizeEntry)
    .filter((row): row is DecisionLogEntry => row !== null);
  return {
    version: 1,
    card: normalizeCard(data.card),
    log: log.length ? log : fallback.log,
  };
}

const SERVER_STATE = defaultState();
const listeners = new Set<() => void>();
let clientCache: { raw: string | null; state: PersistedState } | null = null;

function readClientState(): PersistedState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (clientCache && clientCache.raw === raw) return clientCache.state;
    const state = raw ? normalizeState(JSON.parse(raw)) : defaultState();
    clientCache = { raw, state };
    return state;
  } catch {
    const state = defaultState();
    clientCache = { raw: null, state };
    return state;
  }
}

export function loadState(): PersistedState {
  if (typeof window === "undefined") return SERVER_STATE;
  return readClientState();
}

export function saveState(state: PersistedState): void {
  if (typeof window === "undefined") return;
  const raw = JSON.stringify(state);
  window.localStorage.setItem(STORAGE_KEY, raw);
  clientCache = { raw, state };
  for (const listener of listeners) listener();
}

export function subscribeState(listener: () => void): () => void {
  listeners.add(listener);
  if (typeof window !== "undefined") {
    window.addEventListener("storage", listener);
  }
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", listener);
    }
  };
}

export function getClientSnapshot(): PersistedState {
  return readClientState();
}

export function getServerSnapshot(): PersistedState {
  return SERVER_STATE;
}

let asOfMs = 0;

export function subscribeAsOf(listener: () => void): () => void {
  void listener;
  return () => {};
}

export function getClientAsOf(): number {
  if (!asOfMs) asOfMs = Date.now();
  return asOfMs;
}

export function getServerAsOf(): number {
  return 0;
}
