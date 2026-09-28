"use client";

import type { ReactNode } from "react";
import type { DiffCategory, DiffRow } from "@/lib/env-diff/types";

export const primaryBtn =
  "w-full rounded-[var(--cb-radius-pill)] bg-[var(--cb-ink)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 sm:w-auto";

export const secondaryBtn =
  "rounded-[var(--cb-radius-pill)] border border-[var(--cb-line)] bg-[color-mix(in_srgb,var(--cb-line)_35%,white)] px-2.5 py-1.5 text-xs font-medium text-[var(--cb-ink)] hover:bg-[var(--cb-line)]";

export const quietBtn =
  "rounded-[var(--cb-radius-pill)] border border-[var(--cb-line)] bg-[var(--cb-surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--cb-ink-muted)] hover:bg-[var(--cb-bg)] hover:text-[var(--cb-ink)]";

export const cardClass =
  "min-w-0 rounded-[var(--cb-radius-card-sm)] border border-[var(--cb-line)] bg-[var(--cb-surface)] shadow-[var(--cb-shadow)] sm:rounded-[var(--cb-radius-squircle)]";

export const inputClass =
  "w-full max-w-full min-w-0 rounded-[var(--cb-radius-card-sm)] border border-[var(--cb-line)] bg-[color-mix(in_srgb,var(--cb-bg)_70%,white)] px-3 py-2 text-sm text-[var(--cb-ink)] placeholder:text-[var(--cb-ink-muted)] outline-none focus:border-[var(--cb-ink)] focus:bg-[var(--cb-surface)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--cb-ink)_12%,transparent)]";

export const textareaClass =
  "w-full max-w-full min-w-0 rounded-[var(--cb-radius-card-sm)] border border-[var(--cb-line)] bg-[color-mix(in_srgb,var(--cb-bg)_70%,white)] px-3 py-2 font-mono text-xs text-[var(--cb-ink)] placeholder:text-[var(--cb-ink-muted)] outline-none focus:border-[var(--cb-ink)] focus:bg-[var(--cb-surface)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--cb-ink)_12%,transparent)]";

export const CATEGORY_META: Record<DiffCategory, { title: string }> = {
  missing: { title: "Missing in after" },
  extra: { title: "Extra in after" },
  changed: { title: "Changed values" },
  unchanged: { title: "Unchanged" },
};

/** Quiet warn/clay surface — never lime — for secret-like accents. */
export const warnClayBox =
  "rounded-[var(--cb-radius-card-sm)] border border-[color-mix(in_srgb,var(--cb-clay-deep)_35%,var(--cb-line))] bg-[color-mix(in_srgb,var(--cb-clay)_22%,var(--cb-surface))] text-[var(--cb-ink)]";

export const warnClayPill =
  "inline-block rounded-[var(--cb-radius-pill)] border border-[color-mix(in_srgb,var(--cb-clay-deep)_40%,var(--cb-line))] bg-[color-mix(in_srgb,var(--cb-clay)_18%,var(--cb-surface))] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--cb-ink-muted)]";

export function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function CountPill({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        highlight
          ? `${warnClayBox} px-3 py-2 text-center`
          : "rounded-[var(--cb-radius-card-sm)] border border-[var(--cb-line)] bg-[color-mix(in_srgb,var(--cb-bg)_70%,white)] px-3 py-2 text-center text-[var(--cb-ink)]"
      }
    >
      <div className="text-lg font-semibold tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-[var(--cb-ink-muted)]">
        {label}
      </div>
    </div>
  );
}

export function CardSection({
  title,
  empty,
  hint,
  children,
}: {
  title: string;
  empty: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <h3 className="mb-1 text-xs font-medium uppercase tracking-wider text-[var(--cb-ink-muted)]">
        {title}
      </h3>
      {hint ? (
        <p className="mb-2 text-xs text-[var(--cb-ink-muted)]">{hint}</p>
      ) : null}
      {empty ? (
        <p className="text-sm text-[var(--cb-ink-muted)]">None.</p>
      ) : (
        children
      )}
    </div>
  );
}

export function RowTable({
  rows,
  beforeLabel,
  afterLabel,
}: {
  rows: DiffRow[];
  beforeLabel: string;
  afterLabel: string;
}) {
  return (
    <div className="min-w-0 overflow-x-auto rounded-[var(--cb-radius-card-sm)] border border-[var(--cb-line)]">
      <table className="w-full min-w-0 text-left text-sm sm:min-w-[28rem]">
        <thead className="bg-[color-mix(in_srgb,var(--cb-bg)_70%,white)] text-xs uppercase tracking-wider text-[var(--cb-ink-muted)]">
          <tr>
            <th className="px-3 py-2 font-medium">Key</th>
            <th className="px-3 py-2 font-medium">{beforeLabel}</th>
            <th className="px-3 py-2 font-medium">{afterLabel}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={`${r.category}-${r.key}`}
              className="border-t border-[var(--cb-line)] font-mono text-xs sm:text-sm"
            >
              <td className="min-w-0 break-words px-3 py-2 text-[var(--cb-ink)]">
                {r.key}
                {r.secretLike ? (
                  <span className={`ml-1 ${warnClayPill}`}>secret</span>
                ) : null}
              </td>
              <td className="break-words px-3 py-2 text-[var(--cb-ink-muted)]">
                {r.beforeMasked}
              </td>
              <td className="break-words px-3 py-2 text-[var(--cb-ink)]">
                {r.afterMasked}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
