"use client";

import { cardClass, money, pct } from "@/components/feature-cost/CostDeskShared";
import type { CostEvent } from "@/lib/feature-cost/types";
import { ALERT_THRESHOLD, dailyFeatureRollup } from "@/lib/feature-cost/rollup";

type Row = ReturnType<typeof dailyFeatureRollup>[number];

export function CostDeskTiles({
  events,
  total,
  alerts,
}: {
  events: CostEvent[];
  total: number;
  alerts: Row[];
}) {
  return (
    <section
      className={`mb-4 grid min-w-0 gap-3 p-3 sm:mb-6 sm:grid-cols-3 sm:p-4 ${cardClass}`}
    >
      <div className="min-w-0">
        <p className="text-sm text-[var(--cb-ink-muted)]">Events</p>
        <p className="text-2xl font-medium text-[var(--cb-ink)]">
          {events.length}
        </p>
      </div>
      <div className="min-w-0">
        <p className="text-sm text-[var(--cb-ink-muted)]">Total cost</p>
        <p className="text-2xl font-medium text-[var(--cb-ink)]">
          {money(total)}
        </p>
      </div>
      <div className="min-w-0">
        <p className="text-sm text-[var(--cb-ink-muted)]">≥40% alerts</p>
        <p
          className={`text-2xl font-medium ${
            alerts.length
              ? "text-[color-mix(in_srgb,var(--cb-danger)_45%,var(--ink))]"
              : "text-[var(--cb-olive-deep)]"
          }`}
        >
          {alerts.length}
        </p>
      </div>
    </section>
  );
}

export function CostDeskAlertBanner({ alerts }: { alerts: Row[] }) {
  if (!alerts.length) return null;
  return (
    <div
      className="mb-4 min-w-0 break-words rounded-[var(--cb-radius-card-sm)] border border-[color-mix(in_srgb,var(--cb-danger)_40%,var(--cb-line))] bg-[color-mix(in_srgb,var(--cb-danger)_12%,white)] px-3 py-3 text-sm text-[color-mix(in_srgb,var(--cb-danger)_45%,var(--ink))] sm:mb-6 sm:px-4"
      role="alert"
    >
      <strong className="font-semibold text-[var(--cb-ink)]">Alert:</strong>{" "}
      {alerts.map((a) => `${a.feature} (${pct(a.share)})`).join(", ")} ≥{" "}
      {pct(ALERT_THRESHOLD)} of spend.
    </div>
  );
}

export function CostDeskTable({ rollup }: { rollup: Row[] }) {
  return (
    <section className="min-w-0 space-y-3">
      <h2 className="text-sm font-medium text-[var(--cb-ink)]">
        Daily rollup by feature
      </h2>
      {!rollup.length ? (
        <p className="text-sm text-[var(--cb-ink-muted)]">No events yet.</p>
      ) : (
        <div className={`overflow-x-auto ${cardClass}`}>
          <table className="w-full min-w-[28rem] text-left text-sm">
            <thead className="bg-[color-mix(in_srgb,var(--cb-bg)_70%,white)] text-sm text-[var(--cb-ink-muted)]">
              <tr>
                <th className="px-3 py-2 font-medium">Feature</th>
                <th className="px-3 py-2 font-medium">Cost (USD)</th>
                <th className="px-3 py-2 font-medium">Share</th>
                <th className="px-3 py-2 font-medium">Events</th>
                <th className="px-3 py-2 font-medium">Days</th>
              </tr>
            </thead>
            <tbody>
              {rollup.map((r) => (
                <tr
                  key={r.feature}
                  className={`border-t border-[var(--cb-line)] ${
                    r.alert
                      ? "bg-[color-mix(in_srgb,var(--cb-danger)_10%,white)]"
                      : "bg-[var(--cb-surface)]"
                  }`}
                >
                  <td className="px-3 py-2 font-medium text-[var(--cb-ink)]">
                    {r.feature}
                    {r.alert ? (
                      <span className="ml-2 rounded-[var(--cb-radius-pill)] border border-[color-mix(in_srgb,var(--cb-danger)_35%,var(--cb-line))] bg-[color-mix(in_srgb,var(--cb-danger)_12%,white)] px-1.5 py-0.5 text-sm font-semibold text-[color-mix(in_srgb,var(--cb-danger)_45%,var(--ink))]">
                        40%+
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-[var(--cb-ink)]">
                    {money(r.totalCostUsd)}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-[var(--cb-ink)]">
                    {pct(r.share)}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-[var(--cb-ink)]">
                    {r.events}
                  </td>
                  <td className="px-3 py-2 text-sm text-[var(--cb-ink-muted)]">
                    {r.byDay.map((d) => d.day.slice(5)).join(" · ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
