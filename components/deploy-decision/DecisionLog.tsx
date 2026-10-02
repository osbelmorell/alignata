"use client";

import type { DecisionLogEntry } from "@/lib/deploy-decision/types";
import { STATE_META } from "@/lib/deploy-decision/types";
import { formatDeskTime, formatPct, thesisSnippet } from "@/lib/deploy-decision/format";

interface DecisionLogProps {
  log: DecisionLogEntry[];
}

export function DecisionLog({ log }: DecisionLogProps) {
  const rows = [...log].sort(
    (a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp),
  );

  return (
    <section className="overflow-hidden rounded-[var(--cb-radius-card-sm)] border border-[var(--cb-line)] bg-[var(--cb-surface)] shadow-[var(--cb-shadow)] sm:rounded-[var(--cb-radius-squircle)]">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--cb-line)] px-4 py-2.5">
        <div>
          <h2 className="text-sm font-semibold text-[var(--cb-ink-muted)]">
            Log
          </h2>
          <p className="text-sm font-medium text-[var(--cb-ink)]">
            Append-only decisions
          </p>
        </div>
        <p className="font-mono text-sm text-[var(--cb-ink-muted)]">
          {rows.length} row{rows.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--cb-line)] text-sm text-[var(--cb-ink-muted)]">
              <th className="px-3 py-2 font-medium">Time (ET)</th>
              <th className="px-3 py-2 font-medium">Ticker</th>
              <th className="px-3 py-2 font-medium">State</th>
              <th className="px-3 py-2 font-medium">%</th>
              <th className="px-3 py-2 font-medium">Thesis</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const meta = STATE_META[row.state];
              return (
                <tr
                  key={row.id}
                  className="border-b border-[var(--cb-line)] last:border-0"
                >
                  <td className="whitespace-nowrap px-3 py-2 font-mono tabular-nums text-[var(--cb-ink-muted)]">
                    {formatDeskTime(row.timestamp)}
                  </td>
                  <td className="px-3 py-2 font-mono font-semibold text-[var(--cb-ink)]">
                    {row.ticker}
                    {row.example ? (
                      <span className="ml-1.5 rounded-[var(--cb-radius-pill)] border border-[var(--cb-line)] bg-[var(--cb-bg)] px-1.5 py-0.5 text-sm font-medium text-[var(--cb-ink-muted)]">
                        example
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-block rounded-[var(--cb-radius-pill)] border px-1.5 py-0.5 font-semibold ${meta.chip}`}
                    >
                      {meta.short}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono tabular-nums text-[var(--cb-ink)]">
                    {formatPct(row.suggestedPct)}
                  </td>
                  <td className="max-w-[18rem] px-3 py-2 text-[var(--cb-ink-muted)]">
                    {thesisSnippet(row.thesis)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="border-t border-[var(--cb-line)] px-4 py-2 text-base text-[var(--cb-ink-muted)]">
        Example rows are seeded for dogfood. They do not count toward the kill
        bar.
      </p>
    </section>
  );
}
