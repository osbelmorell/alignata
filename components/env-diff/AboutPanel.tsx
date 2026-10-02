"use client";

import { useState } from "react";

const PITCH =
  "Paste two setting lists and see what's missing, extra, or different — secrets stay masked so you can share the report.";
const WHAT =
  "Staging and live settings drift apart, and you usually find out mid-scare. Diffing raw lists by eye is slow and can leak secrets into chat.";
const WHY =
  "One shareable check: what's missing, extra, or changed, with secret-like keys flagged and values hidden. Stays in this browser.";
const HOW = [
  "Label the two sides (for example staging and live).",
  "Paste into each box — key lists, key=value lines, or Load sample.",
  "Run the diff.",
  "Read the counts (missing / extra / changed / secret-like) and the tables. Secret values stay masked.",
  "Copy a one-liner or the report for a thread.",
  "Open a recent snapshot to restore.",
];

export function AboutPanel({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="mb-4 overflow-hidden rounded-[var(--cb-radius-card-sm)] border border-[var(--cb-line)] bg-[var(--cb-surface)] shadow-[var(--cb-shadow)] sm:mb-6 sm:rounded-[var(--cb-radius-squircle)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left sm:px-5 sm:py-3"
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--cb-ink-muted)] sm:text-sm">
            About · How to use
          </p>
          <p className="mt-0.5 truncate text-sm text-[var(--cb-ink-muted)] sm:mt-1 sm:line-clamp-2 sm:text-sm">
            {PITCH}
          </p>
        </div>
        <span className="shrink-0 rounded-[var(--cb-radius-pill)] border border-[var(--cb-line)] bg-[var(--cb-bg)] px-2 py-0.5 text-sm font-medium text-[var(--cb-ink)] sm:px-2.5 sm:py-1 sm:text-sm">
          {open ? "Hide" : "Show"}
        </span>
      </button>
      {open ? (
        <div className="space-y-4 border-t border-[var(--cb-line)] px-3 py-3 text-base text-[var(--cb-ink-muted)] sm:px-5 sm:py-4">
          <div>
            <p className="text-sm font-semibold text-[var(--cb-ink-muted)]">
              Pitch
            </p>
            <p className="mt-1 leading-relaxed text-[var(--cb-ink)]">{PITCH}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--cb-ink-muted)]">
              What
            </p>
            <p className="mt-1 leading-relaxed text-[var(--cb-ink)]">{WHAT}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--cb-ink-muted)]">
              Why
            </p>
            <p className="mt-1 leading-relaxed text-[var(--cb-ink)]">{WHY}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--cb-ink-muted)]">
              How
            </p>
            <ol className="mt-2 list-decimal space-y-1.5 pl-5 leading-relaxed text-[var(--cb-ink)]">
              {HOW.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
        </div>
      ) : null}
    </section>
  );
}
