"use client";

import { AboutPanel } from "@/components/feature-cost/AboutPanel";
import { CostDeskIngest } from "@/components/feature-cost/CostDeskIngest";
import {
  CostDeskAlertBanner,
  CostDeskTable,
  CostDeskTiles,
} from "@/components/feature-cost/CostDeskRollup";

import { useEffect, useMemo, useState } from "react";
import { parseIngest } from "@/lib/feature-cost/parse";
import { ALERT_THRESHOLD, dailyFeatureRollup } from "@/lib/feature-cost/rollup";
import { clearStore, loadStore, saveStore } from "@/lib/feature-cost/storage";
import type { CostEvent } from "@/lib/feature-cost/types";
import { pct } from "@/components/feature-cost/CostDeskShared";

export function CostDesk() {
  const [events, setEvents] = useState<CostEvent[]>([]);
  const [paste, setPaste] = useState("");
  const [status, setStatus] = useState("Load sample or paste spend rows.");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const store = loadStore();
    setEvents(store.events);
    setHydrated(true);
    if (store.events.length) {
      setStatus(`Loaded ${store.events.length} events from this browser.`);
    }
  }, []);

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
      persist(parsed, `Ingested ${parsed.length} events from ${file.name}.`);
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
    persist(parsed, `Ingested ${parsed.length} events from paste.`);
  }

  if (!hydrated) {
    return (
      <div className="mx-auto w-full max-w-4xl min-w-0 px-3 py-8 text-[var(--cb-ink-muted)] sm:px-4 sm:py-10">
        Loading…
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl min-w-0 px-3 py-8 text-[var(--cb-ink)] sm:px-4 sm:py-10">
      <header className="mb-6 min-w-0 space-y-2 sm:mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--cb-ink-muted)]">
          Build bet · Hobby · this browser only
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--cb-ink)]">
          Feature-Cost Tag
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-[var(--cb-ink-muted)]">
          See which product feature is burning the AI bill, day by day — and get
          a heads-up when one feature eats ≥ {pct(ALERT_THRESHOLD)} of spend. No
          accounts — data stays in this browser.
        </p>
      </header>

      <AboutPanel />

      <CostDeskTiles events={events} total={total} alerts={alerts} />
      <CostDeskAlertBanner alerts={alerts} />
      <CostDeskIngest
        paste={paste}
        setPaste={setPaste}
        status={status}
        onFile={onFile}
        onPasteIngest={onPasteIngest}
        persist={persist}
        clearStore={clearStore}
      />
      <CostDeskTable rollup={rollup} />

      <footer className="pt-6 text-center text-xs text-[var(--cb-ink-muted)]">
        Client-side only · robots noindex · main branch only on Vercel
      </footer>
    </div>
  );
}
