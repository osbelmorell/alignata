"use client";

import { STATUS_META, type Pillar, type Status } from "@/lib/scorecard/types";
import { formatScorecardDate } from "@/lib/scorecard/formatDate";

interface PillarCardProps {
  pillar: Pillar;
  readOnly?: boolean;
  onStatusChange?: (status: Status) => void;
  onOutcomeChange?: (lastOutcome: string) => void;
}

const STATUSES: Status[] = ["red", "yellow", "green"];

export function PillarCard({
  pillar,
  readOnly = false,
  onStatusChange,
  onOutcomeChange,
}: PillarCardProps) {
  const meta = STATUS_META[pillar.status];

  if (readOnly) {
    // Compact read-only: name + RYG on one row, one-line outcome, small timestamp
    return (
      <article
        className={`rounded-[var(--cb-radius-card-sm)] border border-[var(--cb-line)] bg-[var(--cb-surface)] p-3 shadow-[var(--cb-shadow)] ring-1 sm:rounded-[var(--cb-radius-squircle)] sm:p-5 ${meta.ring}`}
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="truncate text-base font-semibold tracking-tight text-[var(--cb-ink)] sm:text-xl">
            {pillar.name}
          </h2>
          <span
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-[var(--cb-radius-pill)] px-2.5 py-0.5 text-[11px] font-semibold sm:gap-2 sm:px-3 sm:py-1 sm:text-xs ${meta.bg} ${meta.text}`}
          >
            <span
              className={`h-2 w-2 rounded-full sm:h-2.5 sm:w-2.5 ${meta.dot}`}
            />
            {meta.label}
          </span>
        </div>

        <p className="mt-1.5 line-clamp-1 text-sm leading-snug text-[var(--cb-ink)] sm:mt-2 sm:line-clamp-2 sm:leading-relaxed">
          {pillar.lastOutcome}
        </p>

        <p className="mt-1 text-[10px] text-[var(--cb-ink-muted)] sm:mt-2 sm:text-[11px]">
          Updated{" "}
          {formatScorecardDate(pillar.updatedAt)}
        </p>
      </article>
    );
  }

  // Full edit UI
  return (
    <article
      className={`flex flex-col rounded-[var(--cb-radius-squircle)] border border-[var(--cb-line)] bg-[var(--cb-surface)] p-6 shadow-[var(--cb-shadow)] ring-1 ${meta.ring}`}
    >
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--cb-ink-muted)]">
            Pillar
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-[var(--cb-ink)]">
            {pillar.name}
          </h2>
        </div>
        <span
          className={`inline-flex items-center gap-2 rounded-[var(--cb-radius-pill)] px-3 py-1 text-xs font-semibold ${meta.bg} ${meta.text}`}
        >
          <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />
          {meta.label}
        </span>
      </div>

      <div className="mb-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--cb-ink-muted)]">
          Status
        </p>
        <div className="flex gap-2">
          {STATUSES.map((status) => {
            const s = STATUS_META[status];
            const active = pillar.status === status;
            return (
              <button
                key={status}
                type="button"
                onClick={() => onStatusChange?.(status)}
                className={`flex-1 rounded-[var(--cb-radius-pill)] border px-2 py-2 text-xs font-semibold transition ${
                  active
                    ? `${s.bg} ${s.text} border-transparent ring-2 ${s.ring}`
                    : "border-[var(--cb-line)] bg-[color-mix(in_srgb,var(--cb-bg)_70%,white)] text-[var(--cb-ink-muted)] hover:bg-[var(--cb-bg)]"
                }`}
                aria-pressed={active}
              >
                <span
                  className={`mr-1.5 inline-block h-2 w-2 rounded-full ${s.dot}`}
                />
                {status}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-1 flex-col">
        <span className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--cb-ink-muted)]">
          Last outcome
        </span>
        <textarea
          value={pillar.lastOutcome}
          onChange={(e) => onOutcomeChange?.(e.target.value)}
          rows={3}
          className="min-h-[5.5rem] flex-1 resize-y rounded-[var(--cb-radius-card-sm)] border border-[var(--cb-line)] bg-[color-mix(in_srgb,var(--cb-bg)_70%,white)] px-3 py-2.5 text-sm leading-relaxed text-[var(--cb-ink)] outline-none transition focus:border-[var(--cb-ink)] focus:bg-[var(--cb-surface)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--cb-ink)_12%,transparent)]"
          placeholder="One-line outcome for the board…"
        />
      </div>

      <p className="mt-3 text-[11px] text-[var(--cb-ink-muted)]">
        Updated{" "}
        {formatScorecardDate(pillar.updatedAt)}
      </p>
    </article>
  );
}
