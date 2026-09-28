"use client";

import {
  cardClass,
  fmt,
  quietBtn,
  secondaryBtn,
  verdictStyles,
} from "@/components/agent-eval/EvalDeskShared";
import type { AgentEval } from "@/lib/agent-eval/types";

export function EvalDeskExport({
  current,
  onCopyJson,
  onDownloadJson,
  onCopyMd,
  onDownloadMd,
}: {
  current: AgentEval;
  onCopyJson: () => void;
  onDownloadJson: () => void;
  onCopyMd: () => void;
  onDownloadMd: () => void;
}) {
  return (
    <section className={`mb-6 space-y-3 p-3 sm:mb-8 sm:p-4 ${cardClass}`}>
      <h2 className="text-sm font-semibold text-[var(--cb-ink)]">Export</h2>
      <div className="flex min-w-0 flex-wrap gap-2">
        <button type="button" onClick={onCopyJson} className={secondaryBtn}>
          Copy JSON
        </button>
        <button type="button" onClick={onDownloadJson} className={quietBtn}>
          Download JSON
        </button>
        <button type="button" onClick={onCopyMd} className={secondaryBtn}>
          Copy Markdown
        </button>
        <button type="button" onClick={onDownloadMd} className={quietBtn}>
          Download Markdown
        </button>
      </div>
      <p className="text-xs text-[var(--cb-ink-muted)]">
        Updated {fmt(current.updatedAt)} · id {current.id.slice(0, 8)}…
      </p>
    </section>
  );
}

export function EvalDeskHistory({
  history,
  onClearHistory,
  onLoadRecent,
}: {
  history: AgentEval[];
  onClearHistory: () => void;
  onLoadRecent: (ev: AgentEval) => void;
}) {
  return (
    <section className={`mb-4 space-y-3 p-3 sm:p-4 ${cardClass}`}>
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-[var(--cb-ink)]">
          Recent saves ({history.length})
        </h2>
        {history.length > 0 ? (
          <button
            type="button"
            onClick={onClearHistory}
            className="text-xs text-[var(--cb-ink-muted)] hover:text-[var(--cb-ink)]"
          >
            Clear history
          </button>
        ) : null}
      </div>
      {history.length === 0 ? (
        <p className="text-sm text-[var(--cb-ink-muted)]">
          No saved checklists yet. Score + Save to recent.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--cb-line)]">
          {history.map((ev) => {
            const hvs = verdictStyles(ev.verdict);
            return (
              <li
                key={ev.id}
                className="flex min-w-0 flex-col gap-2 py-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-[var(--cb-ink)]">
                    {ev.name || "(unnamed)"}
                  </p>
                  <p className="text-xs text-[var(--cb-ink-muted)]">
                    {ev.date} · {fmt(ev.updatedAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`rounded-[var(--cb-radius-pill)] border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${hvs.badge}`}
                  >
                    {hvs.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => onLoadRecent(ev)}
                    className={quietBtn}
                  >
                    Load
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
