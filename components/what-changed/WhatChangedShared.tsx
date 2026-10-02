"use client";

import type { ReactNode } from "react";

export const primaryBtn =
  "fx-btn-primary";

export const secondaryBtn =
  "rounded-[var(--cb-radius-pill)] border border-[var(--cb-line)] bg-[color-mix(in_srgb,var(--cb-line)_35%,white)] px-2.5 py-1.5 text-sm font-medium text-[var(--cb-ink)] hover:bg-[var(--cb-line)]";

export const quietBtn =
  "rounded-[var(--cb-radius-pill)] border border-[var(--cb-line)] bg-[var(--cb-surface)] px-2.5 py-1.5 text-sm font-medium text-[var(--cb-ink-muted)] hover:bg-[var(--cb-bg)] hover:text-[var(--cb-ink)]";

export const cardClass =
  "min-w-0 rounded-[var(--cb-radius-card-sm)] border border-[var(--cb-line)] bg-[var(--cb-surface)] shadow-[var(--cb-shadow)] sm:rounded-[var(--cb-radius-squircle)]";

export const inputClass =
  "w-full max-w-full min-w-0 rounded-[var(--cb-radius-card-sm)] border border-[var(--cb-line)] bg-[color-mix(in_srgb,var(--cb-bg)_70%,white)] px-3 py-2 text-sm text-[var(--cb-ink)] placeholder:text-[var(--cb-ink-muted)] outline-none focus:border-[var(--cb-ink)] focus:bg-[var(--cb-surface)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--cb-ink)_12%,transparent)]";

export const monoInputClass =
  "w-full max-w-full min-w-0 rounded-[var(--cb-radius-card-sm)] border border-[var(--cb-line)] bg-[color-mix(in_srgb,var(--cb-bg)_70%,white)] px-3 py-2 font-mono text-sm text-[var(--cb-ink)] placeholder:text-[var(--cb-ink-muted)] outline-none focus:border-[var(--cb-ink)] focus:bg-[var(--cb-surface)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--cb-ink)_12%,transparent)]";

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

/** User-facing label: prefer go / hold / verify over go / no-go. */
export function verdictLabel(v: string) {
  if (v === "no-go") return "hold";
  return v;
}

export function verdictClass(v: string) {
  if (v === "go") {
    return "border-[color-mix(in_srgb,var(--cb-lime)_55%,var(--cb-line))] bg-[var(--cb-lime)] text-[var(--cb-lime-ink)]";
  }
  if (v === "no-go") {
    return "border-[color-mix(in_srgb,var(--cb-danger)_40%,var(--cb-line))] bg-[color-mix(in_srgb,var(--cb-danger)_12%,white)] text-[color-mix(in_srgb,var(--cb-danger)_45%,var(--ink))]";
  }
  return "border-[var(--cb-line)] bg-[color-mix(in_srgb,var(--cb-bg)_80%,white)] text-[var(--cb-ink-muted)]";
}

export function CardSection({
  title,
  empty,
  children,
}: {
  title: string;
  empty: boolean;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <h3 className="mb-2 text-sm font-medium text-[var(--cb-ink-muted)]">
        {title}
      </h3>
      {empty ? (
        <p className="text-sm text-[var(--cb-ink-muted)]">None in this window.</p>
      ) : (
        children
      )}
    </div>
  );
}

export const SAMPLE_BEFORE = `RATE_LIMIT_RPM=600
FEATURE_CACHE_TTL_SEC=60
LOG_LEVEL=info
CHECKOUT_V2=10%
`;

export const SAMPLE_AFTER = `RATE_LIMIT_RPM=900
FEATURE_CACHE_TTL_SEC=30
LOG_LEVEL=debug
CHECKOUT_V2=50%
NEW_METRIC_ENDPOINT=https://metrics.acme.io/v1
`;
