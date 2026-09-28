"use client";

import { useState } from "react";

const PITCH =
  "Weekday feed of AI news worth knowing, plus techniques that actually worked. Searchable list with a shareable link for each post.";
const WHAT =
  "Daily digests used to disappear in chat. The board needs a lasting feed URL and a per-day post link you can forward after each weekday run.";
const WHY =
  "One place to read and share the weekday digest without digging through chat. No login.";
const HOW = [
  "Open AI Digest — newest first.",
  "Search title, summary, tags, or body.",
  "Scroll or tap Load more for older posts.",
  "Open a post for the full write-up, sources, and links.",
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
              Pitch
            </p>
            <p className="mt-1 leading-relaxed text-[var(--cb-ink)]">{PITCH}</p>
          </div>
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
