import {
  DEFAULT_SCORECARD,
  STORAGE_KEY,
  type Pillar,
  type PillarId,
  type ScorecardData,
  type Status,
} from "./types";

const PILLAR_IDS: PillarId[] = ["linkedin", "investment", "build"];
const STATUSES: Status[] = ["red", "yellow", "green"];

function isStatus(value: unknown): value is Status {
  return typeof value === "string" && (STATUSES as string[]).includes(value);
}

function isPillarId(value: unknown): value is PillarId {
  return typeof value === "string" && (PILLAR_IDS as string[]).includes(value);
}

function normalizePillar(raw: unknown, fallback: Pillar): Pillar {
  if (!raw || typeof raw !== "object") return fallback;
  const p = raw as Record<string, unknown>;
  return {
    id: isPillarId(p.id) ? p.id : fallback.id,
    name: typeof p.name === "string" && p.name.trim() ? p.name : fallback.name,
    status: isStatus(p.status) ? p.status : fallback.status,
    lastOutcome:
      typeof p.lastOutcome === "string" ? p.lastOutcome : fallback.lastOutcome,
    updatedAt:
      typeof p.updatedAt === "string" ? p.updatedAt : new Date().toISOString(),
  };
}

export function normalizeScorecard(raw: unknown): ScorecardData {
  if (!raw || typeof raw !== "object") return structuredClone(DEFAULT_SCORECARD);
  const data = raw as Record<string, unknown>;
  const defaults = structuredClone(DEFAULT_SCORECARD);
  const incoming = Array.isArray(data.pillars) ? data.pillars : [];

  const pillars = defaults.pillars.map((fallback) => {
    const match =
      incoming.find(
        (item) =>
          item &&
          typeof item === "object" &&
          (item as Record<string, unknown>).id === fallback.id,
      ) ??
      incoming.find(
        (item) =>
          item &&
          typeof item === "object" &&
          typeof (item as Record<string, unknown>).name === "string" &&
          String((item as Record<string, unknown>).name).toLowerCase() ===
            fallback.name.toLowerCase(),
      );
    return normalizePillar(match, fallback);
  });

  return {
    title:
      typeof data.title === "string" && data.title.trim()
        ? data.title
        : defaults.title,
    subtitle:
      typeof data.subtitle === "string" ? data.subtitle : defaults.subtitle,
    updatedAt:
      typeof data.updatedAt === "string"
        ? data.updatedAt
        : new Date().toISOString(),
    pillars,
  };
}

export function loadScorecard(): ScorecardData {
  if (typeof window === "undefined") {
    return structuredClone(DEFAULT_SCORECARD);
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_SCORECARD);
    return normalizeScorecard(JSON.parse(raw));
  } catch {
    return structuredClone(DEFAULT_SCORECARD);
  }
}

export function saveScorecard(data: ScorecardData): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function exportScorecardJson(data: ScorecardData): string {
  return JSON.stringify(data, null, 2);
}

export function parseScorecardJson(text: string): ScorecardData {
  return normalizeScorecard(JSON.parse(text));
}
