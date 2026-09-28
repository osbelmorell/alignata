export type CostEvent = {
  ts: string; // ISO day or timestamp
  feature: string;
  tokens?: number;
  costUsd: number;
  model?: string;
};

export type FeatureDay = {
  day: string; // YYYY-MM-DD
  feature: string;
  costUsd: number;
  tokens: number;
  events: number;
};

export type FeatureRollup = {
  feature: string;
  totalCostUsd: number;
  totalTokens: number;
  events: number;
  byDay: FeatureDay[];
  /** share of total cost across all features */
  share: number;
  alert: boolean; // share >= 0.4
};

export type Store = {
  events: CostEvent[];
  updatedAt: string;
};
