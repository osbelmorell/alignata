"use client";

import { WhatChangedCardView } from "@/components/what-changed/WhatChangedCardView";
import { WhatChangedForm } from "@/components/what-changed/WhatChangedForm";
import { WhatChangedHistory } from "@/components/what-changed/WhatChangedHistory";
import {
  SAMPLE_AFTER,
  SAMPLE_BEFORE,
} from "@/components/what-changed/WhatChangedShared";

import { useEffect, useMemo, useState } from "react";
import { buildCard, presetToRange } from "@/lib/what-changed/buildCard";
import { diffConfigToEvents } from "@/lib/what-changed/configDiff";
import { parseChangeEvents } from "@/lib/what-changed/parse";
import { SAMPLE_ANCHOR_ISO, SAMPLE_EVENTS } from "@/lib/what-changed/sample";
import { loadHistory, prependCard } from "@/lib/what-changed/storage";
import type {
  ChangeEvent,
  ChangeEventKind,
  TimeWindowPreset,
  WhatChangedCard,
} from "@/lib/what-changed/types";
import { SAMPLE_SERVICES } from "@/lib/what-changed/types";

const ALL_KINDS: ChangeEventKind[] = ["deploy", "config", "flag", "upstream"];

type InputMode = "sample" | "diff" | "checklist";

export function WhatChangedDesk() {
  const [events, setEvents] = useState<ChangeEvent[]>(SAMPLE_EVENTS);
  const [service, setService] = useState<string>("api");
  const [preset, setPreset] = useState<TimeWindowPreset>("24h");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [kinds, setKinds] = useState<Record<ChangeEventKind, boolean>>({
    deploy: true,
    config: true,
    flag: true,
    upstream: true,
  });
  const [mode, setMode] = useState<InputMode>("sample");
  const [beforeCfg, setBeforeCfg] = useState(SAMPLE_BEFORE);
  const [afterCfg, setAfterCfg] = useState(SAMPLE_AFTER);
  /** Checklist freeform notes (one line each) when synthesizing without sample filter */
  const [checkNotes, setCheckNotes] = useState({
    deploy: "1.48.2 (a3f91c2) production by maya@acme.io",
    config: "RATE_LIMIT_RPM: 600 → 900",
    flag: "checkout_v2: 10% → 50%",
    upstream: "payments-gateway degraded (2026.09.12)",
  });
  const [card, setCard] = useState<WhatChangedCard | null>(null);
  const [history, setHistory] = useState<WhatChangedCard[]>([]);
  const [paste, setPaste] = useState("");
  const [status, setStatus] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [demoNow] = useState(() => new Date(SAMPLE_ANCHOR_ISO).getTime());

  useEffect(() => {
    const store = loadHistory();
    setHistory(store.cards);
    setHydrated(true);
    setStatus(
      store.cards.length
        ? `Loaded ${store.cards.length} saved card(s) · ${SAMPLE_EVENTS.length} sample events ready.`
        : `${SAMPLE_EVENTS.length} sample events loaded — pick a flow and generate.`,
    );
  }, []);

  const services = useMemo(() => {
    const fromEvents = Array.from(new Set(events.map((e) => e.service))).sort();
    return Array.from(
      new Set([...SAMPLE_SERVICES, ...fromEvents, service].filter(Boolean)),
    );
  }, [events, service]);

  const enabledKinds = ALL_KINDS.filter((k) => kinds[k]);

  function toggleKind(k: ChangeEventKind) {
    setKinds((prev) => ({ ...prev, [k]: !prev[k] }));
  }

  function persistCard(next: WhatChangedCard, note: string) {
    setCard(next);
    const store = prependCard(next);
    setHistory(store.cards);
    setStatus(note);
  }

  function range() {
    return presetToRange(
      preset,
      customFrom || undefined,
      customTo || undefined,
      demoNow,
    );
  }

  /** Flow A: sample (+ window + checklist kinds filter) */
  function generateFromSample() {
    const svc = service.trim();
    if (!svc) {
      setStatus("Enter or select a service name.");
      return;
    }
    if (!enabledKinds.length) {
      setStatus("Check at least one change type.");
      return;
    }
    const { from, to, label } = range();
    const next = buildCard({
      service: svc,
      events,
      windowLabel: label,
      from,
      to,
      now: new Date(demoNow),
      kinds: enabledKinds,
    });
    persistCard(
      next,
      `Sample card for ${svc} · ${next.eventCount} event(s) · ${next.decision.verdict === "no-go" ? "hold" : next.decision.verdict}`,
    );
  }

  /** Flow B: before/after settings paste → settings-only card */
  function generateFromDiff() {
    const svc = service.trim() || "api";
    const ts = new Date(demoNow).toISOString();
    const diffs = diffConfigToEvents(beforeCfg, afterCfg, svc, ts);
    if (!diffs.length) {
      setStatus("No settings differences found between before and after.");
      return;
    }
    const { from, to } = range();
    const next = buildCard({
      service: svc,
      events: diffs,
      windowLabel: "Settings before → after",
      from,
      to,
      now: new Date(demoNow),
      kinds: ["config"],
    });
    persistCard(
      next,
      `Settings card · ${diffs.length} key change(s) · ${next.decision.verdict === "no-go" ? "hold" : next.decision.verdict}`,
    );
  }

  /** Flow C: checklist → synthesize rows from notes (+ optional sample merge) */
  function generateFromChecklist() {
    const svc = service.trim() || "api";
    if (!enabledKinds.length) {
      setStatus("Check at least one change type.");
      return;
    }
    const ts = new Date(demoNow).toISOString();
    const synthetic: ChangeEvent[] = [];
    let i = 0;
    if (kinds.deploy && checkNotes.deploy.trim()) {
      const m = checkNotes.deploy.trim();
      const ver = m.match(/([\w.-]+)\s*\(([\da-f]+)\)/i);
      synthetic.push({
        id: `chk-d-${i++}`,
        service: svc,
        kind: "deploy",
        ts,
        version: ver?.[1] || m.slice(0, 40),
        sha: ver?.[2],
        env: /prod/i.test(m) ? "production" : "unknown",
        by: (m.match(/by\s+(\S+)/i) || [])[1] || "checklist",
        note: m,
      });
    }
    if (kinds.config && checkNotes.config.trim()) {
      const m = checkNotes.config.trim();
      const parts = m.split(/→|->/).map((s) => s.trim());
      const keyPart = parts[0]?.split(":") || [];
      synthetic.push({
        id: `chk-c-${i++}`,
        service: svc,
        kind: "config",
        ts,
        key: (keyPart[0] || "CONFIG").trim(),
        oldValue: (keyPart[1] || parts[0] || "?").trim(),
        newValue: (parts[1] || "?").trim(),
        by: "checklist",
      });
    }
    if (kinds.flag && checkNotes.flag.trim()) {
      const m = checkNotes.flag.trim();
      const parts = m.split(/→|->/).map((s) => s.trim());
      const name = (parts[0]?.split(":")[0] || "flag").trim();
      const fromState = (parts[0]?.includes(":")
        ? parts[0].split(":").slice(1).join(":").trim()
        : "?") as string;
      synthetic.push({
        id: `chk-f-${i++}`,
        service: svc,
        kind: "flag",
        ts,
        flag: name,
        fromState,
        toState: parts[1] || "?",
        by: "checklist",
      });
    }
    if (kinds.upstream && checkNotes.upstream.trim()) {
      const m = checkNotes.upstream.trim();
      const name = m.split(/\s+/)[0] || "dependency";
      synthetic.push({
        id: `chk-u-${i++}`,
        service: svc,
        kind: "upstream",
        ts,
        dependency: name,
        status: /degrad|down|fail/i.test(m) ? "degraded" : "changed",
        note: m,
      });
    }
    if (!synthetic.length) {
      setStatus("Add a short note for each checked change type.");
      return;
    }
    const { from, to } = range();
    const next = buildCard({
      service: svc,
      events: synthetic,
      windowLabel: "Checklist",
      from,
      to,
      now: new Date(demoNow),
      kinds: enabledKinds,
    });
    persistCard(
      next,
      `Checklist card · ${synthetic.length} change(s) · ${next.decision.verdict === "no-go" ? "hold" : next.decision.verdict}`,
    );
  }

  function generate() {
    if (mode === "diff") generateFromDiff();
    else if (mode === "checklist") generateFromChecklist();
    else generateFromSample();
  }

  function onPasteIngest() {
    const parsed = parseChangeEvents(paste);
    if (!parsed.length) {
      setStatus(
        "Paste JSON array or NDJSON change events (service, kind, ts required).",
      );
      return;
    }
    setEvents(parsed);
    setMode("sample");
    setStatus(`Ingested ${parsed.length} events from paste.`);
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
      <WhatChangedForm
        mode={mode}
        setMode={setMode}
        service={service}
        setService={setService}
        services={services}
        preset={preset}
        setPreset={setPreset}
        customFrom={customFrom}
        setCustomFrom={setCustomFrom}
        customTo={customTo}
        setCustomTo={setCustomTo}
        kinds={kinds}
        toggleKind={toggleKind}
        beforeCfg={beforeCfg}
        setBeforeCfg={setBeforeCfg}
        afterCfg={afterCfg}
        setAfterCfg={setAfterCfg}
        checkNotes={checkNotes}
        setCheckNotes={setCheckNotes}
        generate={generate}
        setEvents={setEvents}
        setStatus={setStatus}
        paste={paste}
        setPaste={setPaste}
        onPasteIngest={onPasteIngest}
        status={status}
      />
      {card ? (
        <WhatChangedCardView card={card} setStatus={setStatus} />
      ) : null}

      <WhatChangedHistory
        history={history}
        setHistory={setHistory}
        setCard={setCard}
        setService={setService}
        setStatus={setStatus}
      />

      <footer className="pt-6 text-center text-xs text-[var(--cb-ink-muted)]">
        Client-side only · robots noindex · main branch only on Vercel
      </footer>
    </div>
  );
}
