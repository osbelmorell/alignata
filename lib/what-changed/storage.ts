import type { HistoryStore, WhatChangedCard } from "./types";

const KEY = "what-changed-card:v0";
const MAX_CARDS = 20;

export function loadHistory(): HistoryStore {
  if (typeof window === "undefined") {
    return { cards: [], updatedAt: new Date().toISOString() };
  }
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { cards: [], updatedAt: new Date().toISOString() };
    const parsed = JSON.parse(raw) as HistoryStore;
    if (!parsed.cards || !Array.isArray(parsed.cards)) {
      return { cards: [], updatedAt: new Date().toISOString() };
    }
    return parsed;
  } catch {
    return { cards: [], updatedAt: new Date().toISOString() };
  }
}

export function saveHistory(cards: WhatChangedCard[]): HistoryStore {
  const store: HistoryStore = {
    cards: cards.slice(0, MAX_CARDS),
    updatedAt: new Date().toISOString(),
  };
  if (typeof window !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(store));
  }
  return store;
}

export function prependCard(card: WhatChangedCard): HistoryStore {
  const prev = loadHistory().cards.filter((c) => c.id !== card.id);
  return saveHistory([card, ...prev]);
}

export function clearHistory(): HistoryStore {
  return saveHistory([]);
}
