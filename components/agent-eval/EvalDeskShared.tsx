"use client";

import type { AgentEval, ItemStatus } from "@/lib/agent-eval/types";

export const STATUS_OPTS: { value: ItemStatus; label: string }[] = [
  { value: "pass", label: "Pass" },
  { value: "fail", label: "Fail" },
  { value: "na", label: "Doesn't apply" },
  { value: "unset", label: "—" },
];

export const primaryBtn =
  "fx-btn-primary";

export const secondaryBtn =
  "rounded-[var(--cb-radius-pill)] border border-[var(--cb-line)] bg-[color-mix(in_srgb,var(--cb-line)_35%,white)] px-2.5 py-1.5 text-sm font-medium text-[var(--cb-ink)] hover:bg-[var(--cb-line)]";

export const quietBtn =
  "rounded-[var(--cb-radius-pill)] border border-[var(--cb-line)] bg-[var(--cb-surface)] px-2.5 py-1.5 text-sm font-medium text-[var(--cb-ink-muted)] hover:bg-[var(--cb-bg)] hover:text-[var(--cb-ink)]";

export const cardClass =
  "min-w-0 rounded-[var(--cb-radius-card-sm)] border border-[var(--cb-line)] bg-[var(--cb-surface)] shadow-[var(--cb-shadow)] sm:rounded-[var(--cb-radius-squircle)]";

export const inputClass =
  "w-full max-w-full rounded-[var(--cb-radius-card-sm)] border border-[var(--cb-line)] bg-[color-mix(in_srgb,var(--cb-bg)_70%,white)] px-3 py-2 text-sm text-[var(--cb-ink)] placeholder:text-[var(--cb-ink-muted)] outline-none focus:border-[var(--cb-ink)] focus:bg-[var(--cb-surface)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--cb-ink)_12%,transparent)]";

export const PLAIN_RULE =
  "Go only if every required item is Pass or Doesn't apply. No-go if any required item is Fail. Incomplete while any required item is still unset.";

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

export function verdictStyles(v: AgentEval["verdict"]) {
  if (v === "PASS") {
    return {
      badge:
        "border-[color-mix(in_srgb,var(--cb-lime)_55%,var(--cb-line))] bg-[var(--cb-lime)] text-[var(--cb-lime-ink)]",
      label: "GO",
    };
  }
  if (v === "FAIL") {
    return {
      badge:
        "border-[color-mix(in_srgb,var(--cb-danger)_40%,var(--cb-line))] bg-[color-mix(in_srgb,var(--cb-danger)_12%,white)] text-[color-mix(in_srgb,var(--cb-danger)_45%,var(--ink))]",
      label: "NO-GO",
    };
  }
  return {
    badge:
      "border-[var(--cb-line)] bg-[color-mix(in_srgb,var(--cb-line)_40%,white)] text-[var(--cb-ink-muted)]",
    label: "INCOMPLETE",
  };
}

export function statusBtnClass(active: boolean, status: ItemStatus) {
  const base =
    "min-w-11 rounded-[var(--cb-radius-pill)] border px-3 py-1 text-sm font-medium transition-colors";
  if (!active) {
    return `${base} border-[var(--cb-line)] bg-[var(--cb-surface)] text-[var(--cb-ink-muted)] hover:bg-[var(--cb-bg)] hover:text-[var(--cb-ink)]`;
  }
  if (status === "pass") {
    return `${base} border-[var(--cb-olive)] bg-[color-mix(in_srgb,var(--cb-olive)_14%,white)] text-[var(--cb-olive-deep)]`;
  }
  if (status === "fail") {
    return `${base} border-[var(--cb-danger)] bg-[color-mix(in_srgb,var(--cb-danger)_12%,white)] text-[color-mix(in_srgb,var(--cb-danger)_45%,var(--ink))]`;
  }
  if (status === "na") {
    return `${base} border-[var(--cb-line)] bg-[color-mix(in_srgb,var(--cb-line)_45%,white)] text-[var(--cb-ink)]`;
  }
  return `${base} fx-btn-selected text-[var(--cb-ink)]`;
}
