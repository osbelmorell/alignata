export type DiffCategory = "missing" | "extra" | "changed" | "unchanged";

export type DiffRow = {
  key: string;
  beforeValue: string | null;
  afterValue: string | null;
  beforeMasked: string;
  afterMasked: string;
  category: DiffCategory;
  secretLike: boolean;
};

export type DiffCounts = {
  missing: number;
  extra: number;
  changed: number;
  unchanged: number;
  secretLike: number;
  total: number;
};

export type EnvDiffSnapshot = {
  id: string;
  beforeLabel: string;
  afterLabel: string;
  generatedAt: string;
  counts: DiffCounts;
  rows: DiffRow[];
  /** One-liner for Slack / status; values already masked. */
  summaryLine: string;
};

export type HistoryStore = {
  snapshots: EnvDiffSnapshot[];
  lastBefore: string;
  lastAfter: string;
  lastBeforeLabel: string;
  lastAfterLabel: string;
  updatedAt: string;
};
