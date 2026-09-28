import type {
  ChecklistItem,
  DecisionState,
  OpportunityCard,
} from "./types";
import { STATE_META } from "./types";

export const DESK_TZ = "America/New_York";

export function impliedUsd(
  deployableUsd: number | null,
  suggestedPct: number | null,
): number | null {
  if (deployableUsd == null || suggestedPct == null) return null;
  if (!Number.isFinite(deployableUsd) || !Number.isFinite(suggestedPct)) {
    return null;
  }
  return (deployableUsd * suggestedPct) / 100;
}

export function formatUsd(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const digits = Math.abs(n) >= 100 ? 0 : 2;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n);
}

export function formatPct(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${n}%`;
}

export function formatDeskTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    timeZone: DESK_TZ,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function thesisSnippet(thesis: string, max = 72): string {
  const t = thesis.replace(/\s+/g, " ").trim();
  if (!t) return "—";
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

export function parseMoney(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const cleaned = trimmed.replace(/[$,\s]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function parsePct(raw: string): number | null {
  const trimmed = raw.trim().replace(/%/g, "");
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function checklistBlock(items: ChecklistItem[]): string {
  if (!items.length) return "(none)";
  return items
    .map((item) => `${item.checked ? "[x]" : "[ ]"} ${item.label}`)
    .join("\n");
}

export function cardSummaryText(opts: {
  card: OpportunityCard;
  state: DecisionState | null;
  url: string;
}): string {
  const { card, state, url } = opts;
  const ticker = card.ticker.trim() || "UNTITLED";
  const implied = impliedUsd(card.deployableUsd, card.suggestedPct);
  const stateLabel = state ? STATE_META[state].short : "DRAFT";
  return [
    `${ticker}  ${stateLabel}  ${formatPct(card.suggestedPct)} of ${formatUsd(card.deployableUsd)} deployable  (~${formatUsd(implied)})`,
    card.thesis.trim() || "(no thesis)",
    `Page: ${url}`,
  ].join("\n");
}

export function shareableText(opts: {
  card: OpportunityCard;
  state: DecisionState | null;
  url: string;
}): string {
  const { card, state, url } = opts;
  const ticker = card.ticker.trim() || "UNTITLED";
  const implied = impliedUsd(card.deployableUsd, card.suggestedPct);
  const stateLabel = state ? STATE_META[state].short : "DRAFT";
  return [
    "Deploy Decision Card v0",
    `URL: ${url}`,
    "",
    `${ticker} · ${stateLabel} · ${formatPct(card.suggestedPct)} of ${formatUsd(card.deployableUsd)} deployable (~${formatUsd(implied)})`,
    "",
    "Thesis",
    card.thesis.trim() || "(none)",
    "",
    "Checklist",
    checklistBlock(card.checklist),
    "",
    "Markets: paste this URL + note into flags.",
    "v0 is this page URL + summary (localStorage only; no backend).",
  ].join("\n");
}
