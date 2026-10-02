"use client";

import { AboutPanel } from "@/components/feature-cost/AboutPanel";
import { CostDeskIngest } from "@/components/feature-cost/CostDeskIngest";
import {
  CostDeskAlertBanner,
  CostDeskTable,
  CostDeskTiles,
} from "@/components/feature-cost/CostDeskRollup";

import { useMemo, useState } from "react";
import { useHydrated } from "@/lib/useHydrated";
import { parseIngest } from "@/lib/feature-cost/parse";
import { ALERT_THRESHOLD, dailyFeatureRollup } from "@/lib/feature-cost/rollup";
import { clearStore, loadStore, saveStore } from "@/lib/feature-cost/storage";
import type { CostEvent } from "@/lib/feature-cost/types";
import { pct } from "@/components/feature-cost/CostDeskShared";

export function CostDesk() {
  // Read localStorage once on the client; the !hydrated placeholder hides it until mounted.
  const [initialStore] = useState(loadStore);
  const [events, setEvents] = useState<CostEvent[]>(initialStore.events);
  const [paste, setPaste] = useState("");
  const [status, setStatus] = useState(
    initialStore.events.length
      ? `Loaded ${initialStore.events.length} events from this browser.`
      : "Load sample or paste spend rows.",
  );
  const hydrated = useHydrated();

  const rollup = useMemo(() => dailyFeatureRollup(events), [events]);
  const total = rollup.reduce((s, r) => s + r.totalCostUsd, 0);
  const alerts = rollup.filter((r) => r.alert);

  function persist(next: CostEvent[], note: string) {
    setEvents(next);
    saveStore(next);
    setStatus(note);
  }

  function onFile(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      const parsed = parseIngest(text, file.name);
      if (!parsed.length) {
        setStatus(`No events parsed from ${file.name}.`);
        return;
      }
      persist(parsed, `Loaded ${parsed.length} events from ${file.name}.`);
    };
    reader.readAsText(file);
  }

  function onPasteIngest() {
    const parsed = parseIngest(paste);
    if (!parsed.length) {
      setStatus(
        "Paste JSON lines or CSV with a feature name and cost (USD) header.",
      );
      return;
    }
    persist(parsed, `Loaded ${parsed.length} events from your paste.`);
  }

  if (!hydrated) {
    return (
      <div className="mx-auto w-full max-w-4xl min-w-0 px-3 py-8 text-[var(--cb-ink-muted)] sm:px-4 sm:py-10">
        Loading…
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl min-w-0 px-5 pt-5 pb-10 text-[var(--cb-ink)] sm:px-6 sm:pt-10">
      <header className="mb-5 min-w-0 space-y-2 sm:mb-8">
        <p className="fx-tool-kicker">
          Build bet · Hobby · this browser only
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--cb-ink)]">
          Feature-Cost Tag
        </h1>
        <p className="fx-tool-intro max-w-2xl">
          See which product feature is burning the AI bill, day by day — and get
          a heads-up when one feature eats ≥ {pct(ALERT_THRESHOLD)} of spend. No
          accounts — data stays in this browser.
        </p>
      </header>

      <CostDeskIngest
        paste={paste}
        setPaste={setPaste}
        status={status}
        onFile={onFile}
        onPasteIngest={onPasteIngest}
        persist={persist}
        clearStore={clearStore}
      />
      <CostDeskAlertBanner alerts={alerts} />
      <CostDeskTiles events={events} total={total} alerts={alerts} />
      <CostDeskTable rollup={rollup} />

      <AboutPanel />
    </div>
  );
}
