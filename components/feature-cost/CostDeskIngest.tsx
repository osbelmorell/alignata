"use client";

import {
  cardClass,
  inputClass,
  primaryBtn,
  quietBtn,
  secondaryBtn,
} from "@/components/feature-cost/CostDeskShared";
import type { CostEvent } from "@/lib/feature-cost/types";
import { SAMPLE_EVENTS } from "@/lib/feature-cost/sample";

export function CostDeskIngest({
  paste,
  setPaste,
  status,
  onFile,
  onPasteIngest,
  persist,
  clearStore,
}: {
  paste: string;
  setPaste: (v: string) => void;
  status: string;
  onFile: (file: File | null) => void;
  onPasteIngest: () => void;
  persist: (next: CostEvent[], note: string) => void;
  clearStore: () => void;
}) {
  return (
    <section className={`mb-6 space-y-3 p-3 sm:mb-8 sm:p-4 ${cardClass}`}>
      <h2 className="text-sm font-medium text-[var(--cb-ink)]">Ingest</h2>
      <textarea
        value={paste}
        onChange={(e) => setPaste(e.target.value)}
        placeholder='{"ts":"2026-09-14","feature":"research","costUsd":12.5,"tokens":800000}'
        rows={3}
        className={`min-h-24 ${inputClass}`}
      />
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <button type="button" className={primaryBtn} onClick={onPasteIngest}>
          Show the bill by feature
        </button>
        <p className="min-w-0 break-words text-base text-[var(--cb-ink-muted)]">
          {status}
        </p>
      </div>
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap">
        <div className="flex min-w-0 flex-wrap gap-2">
          <label className={`cursor-pointer ${secondaryBtn}`}>
            Upload
            <input
              type="file"
              accept=".ndjson,.jsonl,.json,.csv,text/csv,application/json"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0] || null)}
            />
          </label>
          <button
            type="button"
            className={secondaryBtn}
            onClick={() =>
              persist(
                SAMPLE_EVENTS,
                `Loaded ${SAMPLE_EVENTS.length} sample events (research trips the alert).`,
              )
            }
          >
            Load sample
          </button>
          <button
            type="button"
            className={quietBtn}
            onClick={() => {
              clearStore();
              persist([], "Cleared local data.");
            }}
          >
            Clear
          </button>
        </div>
      </div>
      <p className="text-base leading-relaxed text-[var(--cb-ink-muted)]">
        Each row needs a <code className="text-[var(--cb-ink)]">feature</code>{" "}
        name and a <code className="text-[var(--cb-ink)]">cost (USD)</code> (+
        optional date, tokens, model). CSV needs a header row. JSON: one object
        per line.
      </p>
    </section>
  );
}
