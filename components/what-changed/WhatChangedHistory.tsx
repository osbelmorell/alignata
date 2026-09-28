"use client";

import { clearHistory } from "@/lib/what-changed/storage";
import type { WhatChangedCard } from "@/lib/what-changed/types";
import {
  cardClass,
  quietBtn,
  verdictClass,
  verdictLabel,
} from "@/components/what-changed/WhatChangedShared";

export function WhatChangedHistory({
  history,
  setHistory,
  setCard,
  setService,
  setStatus,
}: {
  history: WhatChangedCard[];
  setHistory: (cards: WhatChangedCard[]) => void;
  setCard: (card: WhatChangedCard) => void;
  setService: (s: string) => void;
  setStatus: (s: string) => void;
}) {
  return (
    <section className={`space-y-3 p-3 sm:p-4 ${cardClass}`}>
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-[var(--cb-ink)]">
          Recent cards ({history.length})
        </h2>
        {history.length > 0 && (
          <button
            type="button"
            onClick={() => {
              clearHistory();
              setHistory([]);
              setStatus("Cleared card history.");
            }}
            className={quietBtn}
          >
            Clear
          </button>
        )}
      </div>
      {history.length === 0 ? (
        <p className="text-sm text-[var(--cb-ink-muted)]">
          Recent cards stay in this browser.
        </p>
      ) : (
        <ul className="space-y-2">
          {history.map((h) => (
            <li key={h.id} className="min-w-0">
              <button
                type="button"
                onClick={() => {
                  setCard(h);
                  setService(h.service);
                  setStatus(
                    `Restored card ${h.service} · ${verdictLabel(h.decision.verdict)}`,
                  );
                }}
                className="flex w-full min-w-0 flex-col gap-2 rounded-[var(--cb-radius-card-sm)] border border-[var(--cb-line)] bg-[color-mix(in_srgb,var(--cb-bg)_55%,white)] px-3 py-2 text-left text-sm hover:border-[var(--cb-ink)] sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
              >
                <span className="min-w-0 break-words">
                  <span className="font-medium text-[var(--cb-ink)]">
                    {h.service}
                  </span>
                  <span className="text-[var(--cb-ink-muted)]">
                    {" "}
                    · {h.windowLabel} · {h.eventCount} events
                  </span>
                </span>
                <span
                  className={`shrink-0 self-start rounded-[var(--cb-radius-pill)] border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${verdictClass(h.decision.verdict)}`}
                >
                  {verdictLabel(h.decision.verdict)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
