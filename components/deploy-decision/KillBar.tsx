"use client";

import type { DecisionLogEntry } from "@/lib/deploy-decision/types";

const WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
const BAR = 3;

interface KillBarProps {
  log: DecisionLogEntry[];
  asOfMs: number;
}

export function KillBar({ log, asOfMs }: KillBarProps) {
  const real = log.filter((row) => !row.example);
  const inWindow =
    asOfMs === 0
      ? 0
      : real.filter((row) => asOfMs - Date.parse(row.timestamp) <= WINDOW_MS)
          .length;

  let status: string;
  let tone: string;
  if (inWindow >= BAR) {
    status = "bar met";
    // Lime signal for on-track only
    tone =
      "rounded-[var(--cb-radius-pill)] bg-[var(--cb-lime)] px-1.5 py-0.5 font-semibold text-[var(--cb-lime-ink)]";
  } else if (inWindow === 0) {
    status = "below bar — kill if still zero after 2 weeks of live flags";
    tone = "font-semibold text-[var(--ink)]";
  } else {
    status = `below bar (${inWindow}/${BAR})`;
    tone = "font-semibold text-[var(--cb-olive-deep)]";
  }

  return (
    <footer className="border-t border-[var(--cb-line)] bg-[var(--cb-surface)] px-4 py-3">
      <div className="mx-auto flex max-w-6xl flex-col gap-1 text-base leading-relaxed text-[var(--cb-ink-muted)] sm:flex-row sm:items-center sm:justify-between">
        <p>
          Kill bar = ≥{BAR} Osbel decisions in 14 days. Kill if zero after 2
          weeks of live flags.
        </p>
        <p className="font-mono tabular-nums">
          <span className={tone}>
            {inWindow} real / 14d · {status}
          </span>
          <span className="text-[var(--cb-ink-muted)]">
            {" "}
            · {real.length} real all-time · examples excluded
          </span>
        </p>
      </div>
    </footer>
  );
}
