"use client";

import { useState } from "react";

const PITCH =
  "Drop your project lockfile and get a clear pass or fail, plus any copyleft hits you need to review — download the list when you want it.";
const WHAT =
  "License risk hides in dependency trees. People only find copyleft surprises late, when a deal or release is already on the clock.";
const WHY =
  "One drop → pass or fail, with the risky licenses listed. Cut the scavenger hunt before you ship. Stays in this browser.";
const HOW = [
  "Drop or choose your lockfile.",
  "Run the check (one black pill).",
  "Read pass or fail and any copyleft hits.",
  "Download the list if you need it in a thread.",
];

export function AboutPanel({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="mb-4 min-w-0 overflow-hidden rounded-[var(--cb-radius-card-sm)] border border-[var(--cb-line)] bg-[var(--cb-surface)] shadow-[var(--cb-shadow)] sm:mb-6 sm:rounded-[var(--cb-radius-squircle)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full min-w-0 items-center justify-between gap-3 px-3 py-2 text-left sm:px-5 sm:py-3"
      >
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--cb-ink-muted)] sm:text-[11px]">
            About · How to use
          </p>
          <p className="mt-0.5 truncate text-xs text-[var(--cb-ink-muted)] sm:mt-1 sm:line-clamp-2 sm:text-sm">
            {PITCH}
          </p>
        </div>
        <span className="shrink-0 rounded-[var(--cb-radius-pill)] border border-[var(--cb-line)] bg-[var(--cb-bg)] px-2 py-0.5 text-[11px] font-medium text-[var(--cb-ink)] sm:px-2.5 sm:py-1 sm:text-xs">
          {open ? "Hide" : "Show"}
        </span>
      </button>
      {open ? (
        <div className="space-y-4 border-t border-[var(--cb-line)] px-3 py-3 text-sm text-[var(--cb-ink-muted)] sm:px-5 sm:py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--cb-ink-muted)]">
              What
            </p>
            <p className="mt-1 leading-relaxed text-[var(--cb-ink)]">{WHAT}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--cb-ink-muted)]">
              Why
            </p>
            <p className="mt-1 leading-relaxed text-[var(--cb-ink)]">{WHY}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--cb-ink-muted)]">
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
