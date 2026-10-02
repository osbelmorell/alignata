"use client";

import { useState } from "react";

const PITCH =
  "Walk a short checklist and get a clear go or no-go on whether an agent is ready to ship.";
const WHAT =
  "\u201cIs this agent ready?\u201d used to be a gut call. There\u2019s no shared list of what must pass before you ship.";
const WHY =
  "Score each must-have item. You only get go when every required item passes or doesn\u2019t apply. Any fail = no-go. Stays in this browser.";
const HOW = [
  "Name the agent and the date.",
  "Score each checklist item: Pass, Fail, or Doesn\u2019t apply. Add a note if you need one.",
  "Watch the badge flip to Go or No-go as you finish the required items.",
  "Load a sample pass or fail to see a finished example.",
  "Save, then copy for a thread.",
  "Open a recent save to restore; Clear resets the form.",
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
