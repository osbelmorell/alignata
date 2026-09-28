import type { CostEvent, FeatureRollup } from "./types";

const ALERT_SHARE = 0.4;

export function dailyFeatureRollup(events: CostEvent[]): FeatureRollup[] {
  const map = new Map<string, FeatureRollup>();
  let total = 0;

  for (const e of events) {
    total += e.costUsd;
    let row = map.get(e.feature);
    if (!row) {
      row = {
        feature: e.feature,
        totalCostUsd: 0,
        totalTokens: 0,
        events: 0,
        byDay: [],
        share: 0,
        alert: false,
      };
      map.set(e.feature, row);
    }
    row.totalCostUsd += e.costUsd;
    row.totalTokens += e.tokens || 0;
    row.events += 1;
    const day = e.ts.slice(0, 10);
    let d = row.byDay.find((x) => x.day === day);
    if (!d) {
      d = { day, feature: e.feature, costUsd: 0, tokens: 0, events: 0 };
      row.byDay.push(d);
    }
    d.costUsd += e.costUsd;
    d.tokens += e.tokens || 0;
    d.events += 1;
  }

  const denom = total > 0 ? total : 1;
  const rows = [...map.values()].map((r) => {
    r.byDay.sort((a, b) => a.day.localeCompare(b.day));
    r.share = r.totalCostUsd / denom;
    r.alert = r.share >= ALERT_SHARE;
    return r;
  });
  rows.sort((a, b) => b.totalCostUsd - a.totalCostUsd);
  return rows;
}

export const ALERT_THRESHOLD = ALERT_SHARE;
