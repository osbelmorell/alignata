export type DecisionState = "approve" | "size" | "pass";

export interface ChecklistItem {
  id: string;
  label: string;
  checked: boolean;
}

export interface OpportunityCard {
  ticker: string;
  thesis: string;
  checklist: ChecklistItem[];
  /** Deployable capital the desk pasted in (USD). */
  deployableUsd: number | null;
  /** Suggested % of deployable. */
  suggestedPct: number | null;
}

export interface DecisionLogEntry {
  id: string;
  timestamp: string;
  ticker: string;
  state: DecisionState;
  thesis: string;
  suggestedPct: number | null;
  deployableUsd: number | null;
  impliedUsd: number | null;
  checklist: ChecklistItem[];
  /** Seeded demo row — does not count toward the kill bar. */
  example: boolean;
}

export interface PersistedState {
  version: 1;
  card: OpportunityCard;
  log: DecisionLogEntry[];
}

export const STORAGE_KEY = "deploy-decision-card-v0";

export const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { id: "thesis-clear", label: "Thesis clear", checked: false },
  { id: "invalidation-known", label: "Invalidation known", checked: false },
  { id: "size-vs-floor", label: "Size vs floor checked", checked: false },
];

export function emptyCard(): OpportunityCard {
  return {
    ticker: "",
    thesis: "",
    checklist: DEFAULT_CHECKLIST.map((item) => ({ ...item })),
    deployableUsd: null,
    suggestedPct: null,
  };
}

export const EXAMPLE_LOG: DecisionLogEntry[] = [
  {
    id: "example-nvda",
    timestamp: "2026-09-11T14:20:00.000Z",
    ticker: "NVDA",
    state: "size",
    thesis:
      "Inference demand still compounding; size vs 2% floor after the last run-up.",
    suggestedPct: 2,
    deployableUsd: 250000,
    impliedUsd: 5000,
    checklist: [
      { id: "thesis-clear", label: "Thesis clear", checked: true },
      { id: "invalidation-known", label: "Invalidation known", checked: true },
      { id: "size-vs-floor", label: "Size vs floor checked", checked: true },
    ],
    example: true,
  },
  {
    id: "example-unh",
    timestamp: "2026-09-12T18:05:00.000Z",
    ticker: "UNH",
    state: "pass",
    thesis:
      "Policy / opt-out noise; no incremental edge vs waiting for a cleaner invalidation.",
    suggestedPct: 0,
    deployableUsd: 250000,
    impliedUsd: 0,
    checklist: [
      { id: "thesis-clear", label: "Thesis clear", checked: true },
      { id: "invalidation-known", label: "Invalidation known", checked: false },
      { id: "size-vs-floor", label: "Size vs floor checked", checked: true },
    ],
    example: true,
  },
];

export function defaultState(): PersistedState {
  return {
    version: 1,
    card: emptyCard(),
    log: EXAMPLE_LOG.map((row) => ({
      ...row,
      checklist: row.checklist.map((item) => ({ ...item })),
    })),
  };
}

/** Clay Board CTA / chip tones — Approve = black primary; Size/Pass = soft grey secondary. Lime reserved for last-approve signal only. */
export const STATE_META: Record<
  DecisionState,
  { label: string; short: string; tone: string; btn: string; chip: string }
> = {
  approve: {
    label: "Approve",
    short: "APPROVE",
    // Lime signal for "last APPROVE" only (≤1–2 hits/screen)
    tone: "rounded-[var(--cb-radius-pill)] bg-[var(--cb-lime)] px-1.5 py-0.5 text-[var(--cb-lime-ink)]",
    btn: "fx-btn-primary border-transparent",
    chip: "border-[var(--cb-ink)] bg-[var(--cb-ink)] text-white",
  },
  size: {
    label: "Size",
    short: "SIZE",
    tone: "text-[var(--cb-ink-muted)]",
    btn: "border-[var(--cb-line)] bg-[color-mix(in_srgb,var(--cb-line)_45%,white)] text-[var(--cb-ink)] hover:bg-[var(--cb-line)]",
    chip: "border-[var(--cb-line)] bg-[color-mix(in_srgb,var(--cb-line)_40%,white)] text-[var(--cb-ink)]",
  },
  pass: {
    label: "Pass",
    short: "PASS",
    tone: "text-[var(--cb-ink-muted)]",
    btn: "border-[var(--cb-line)] bg-[var(--cb-surface)] text-[var(--cb-ink-muted)] hover:bg-[color-mix(in_srgb,var(--cb-line)_35%,white)]",
    chip: "border-[var(--cb-line)] bg-[var(--cb-bg)] text-[var(--cb-ink-muted)]",
  },
};

export const DECISION_STATES: DecisionState[] = ["approve", "size", "pass"];
