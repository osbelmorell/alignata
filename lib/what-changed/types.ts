export type ChangeEventKind = "deploy" | "config" | "flag" | "upstream";

export type ChangeEvent = {
  id: string;
  service: string;
  kind: ChangeEventKind;
  ts: string; // ISO timestamp
  /** deploy */
  version?: string;
  sha?: string;
  env?: string;
  by?: string;
  /** config */
  key?: string;
  oldValue?: string;
  newValue?: string;
  /** feature flag */
  flag?: string;
  fromState?: string;
  toState?: string;
  /** upstream / dependency */
  dependency?: string;
  status?: string;
  depVersion?: string;
  note?: string;
};

export type DeployRow = {
  version?: string;
  sha?: string;
  env?: string;
  by?: string;
  ts: string;
};

export type ConfigRow = {
  key: string;
  oldValue?: string;
  newValue?: string;
  ts: string;
  by?: string;
};

export type FlagRow = {
  flag: string;
  fromState?: string;
  toState?: string;
  ts: string;
  by?: string;
};

export type UpstreamRow = {
  dependency: string;
  status?: string;
  depVersion?: string;
  note?: string;
  ts: string;
};

export type DecisionVerdict = "go" | "no-go" | "verify";

export type Decision = {
  verdict: DecisionVerdict;
  summary: string;
  checks: string[];
};

export type WhatChangedCard = {
  id: string;
  service: string;
  windowLabel: string;
  from: string;
  to: string;
  generatedAt: string;
  deploys: DeployRow[];
  config: ConfigRow[];
  flags: FlagRow[];
  upstreams: UpstreamRow[];
  decision: Decision;
  eventCount: number;
};

export type TimeWindowPreset = "1h" | "6h" | "24h" | "7d" | "custom";

export type HistoryStore = {
  cards: WhatChangedCard[];
  updatedAt: string;
};

export const SAMPLE_SERVICES = ["api", "web", "workers"] as const;
