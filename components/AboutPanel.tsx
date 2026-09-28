"use client";

import { useState } from "react";
import { ORIENTATION } from "@/lib/orientation";

export function AboutPanel({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const { pitch, what, why, how } = ORIENTATION;

  return (
    <section className="mb-6 overflow-hidden rounded-[var(--cb-radius-squircle)] border border-[var(--cb-line)] bg-[var(--cb-surface)] shadow-[var(--cb-shadow)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left sm:px-5"
      >
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--cb-ink-muted)]">
            About · How to use
          </p>
          <p className="mt-1 line-clamp-2 text-sm text-[var(--cb-ink-muted)]">
            {pitch}
          </p>
        </div>
        <span className="shrink-0 rounded-[var(--cb-radius-pill)] border border-[var(--cb-line)] bg-[var(--cb-bg)] px-2.5 py-1 text-xs font-medium text-[var(--cb-ink)]">
          {open ? "Hide" : "Show"}
        </span>
      </button>
      {open ? (
        <div className="space-y-4 border-t border-[var(--cb-line)] px-4 py-4 text-sm text-[var(--cb-ink-muted)] sm:px-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--cb-ink-muted)]">
              Pitch
            </p>
            <p className="mt-1 leading-relaxed text-[var(--cb-ink)]">{pitch}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--cb-ink-muted)]">
              What
            </p>
            <p className="mt-1 leading-relaxed text-[var(--cb-ink)]">{what}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--cb-ink-muted)]">
              Why
            </p>
            <p className="mt-1 leading-relaxed text-[var(--cb-ink)]">{why}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--cb-ink-muted)]">
              How
            </p>
            <ol className="mt-2 list-decimal space-y-1.5 pl-5 leading-relaxed text-[var(--cb-ink)]">
              {how.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
        </div>
      ) : null}
    </section>
  );
}
