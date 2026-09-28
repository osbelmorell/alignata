"use client";

import type { Dispatch, SetStateAction } from "react";
import { AboutPanel } from "@/components/what-changed/AboutPanel";
import {
  SAMPLE_AFTER,
  SAMPLE_BEFORE,
  cardClass,
  inputClass,
  monoInputClass,
  primaryBtn,
  secondaryBtn,
} from "@/components/what-changed/WhatChangedShared";
import type {
  ChangeEvent,
  ChangeEventKind,
  TimeWindowPreset,
} from "@/lib/what-changed/types";
import { SAMPLE_EVENTS } from "@/lib/what-changed/sample";

const ALL_KINDS: ChangeEventKind[] = ["deploy", "config", "flag", "upstream"];

type InputMode = "sample" | "diff" | "checklist";

const KIND_LABEL: Record<ChangeEventKind, string> = {
  deploy: "Deploys",
  config: "Settings",
  flag: "Flags",
  upstream: "Upstreams",
};

export function WhatChangedForm(props: {
  mode: InputMode;
  setMode: (m: InputMode) => void;
  service: string;
  setService: (s: string) => void;
  services: string[];
  preset: TimeWindowPreset;
  setPreset: (p: TimeWindowPreset) => void;
  customFrom: string;
  setCustomFrom: (s: string) => void;
  customTo: string;
  setCustomTo: (s: string) => void;
  kinds: Record<ChangeEventKind, boolean>;
  toggleKind: (k: ChangeEventKind) => void;
  beforeCfg: string;
  setBeforeCfg: (s: string) => void;
  afterCfg: string;
  setAfterCfg: (s: string) => void;
  checkNotes: {
    deploy: string;
    config: string;
    flag: string;
    upstream: string;
  };
  setCheckNotes: Dispatch<
    SetStateAction<{
      deploy: string;
      config: string;
      flag: string;
      upstream: string;
    }>
  >;
  generate: () => void;
  setEvents: (e: ChangeEvent[]) => void;
  setStatus: (s: string) => void;
  paste: string;
  setPaste: (s: string) => void;
  onPasteIngest: () => void;
  status: string;
}) {
  const {
    mode,
    setMode,
    service,
    setService,
    services,
    preset,
    setPreset,
    customFrom,
    setCustomFrom,
    customTo,
    setCustomTo,
    kinds,
    toggleKind,
    beforeCfg,
    setBeforeCfg,
    afterCfg,
    setAfterCfg,
    checkNotes,
    setCheckNotes,
    generate,
    setEvents,
    setStatus,
    paste,
    setPaste,
    onPasteIngest,
    status,
  } = props;

  return (
    <>
      <header className="mb-6 min-w-0 space-y-2 sm:mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--cb-ink-muted)]">
          Build bet · Hobby · this browser only
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--cb-ink)]">
          What-Changed Card
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-[var(--cb-ink-muted)]">
          Build one card of what moved — deploys, settings, flags, upstreams —
          then mark go, hold, or verify. Copy it into a thread when you need it.
        </p>
      </header>

      <AboutPanel />

      <section className={`mb-4 space-y-4 p-3 sm:mb-6 sm:p-4 ${cardClass}`}>
        <div className="flex min-w-0 flex-wrap gap-2">
          {(
            [
              ["sample", "Sample / events"],
              ["diff", "Before → after settings"],
              ["checklist", "Change-type checklist"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setMode(id)}
              className={
                mode === id
                  ? "rounded-[var(--cb-radius-pill)] border border-[var(--cb-ink)] bg-[color-mix(in_srgb,var(--cb-ink)_8%,white)] px-3 py-1.5 text-xs font-semibold text-[var(--cb-ink)]"
                  : secondaryBtn
              }
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          <label className="block min-w-0 space-y-1 text-xs font-medium text-[var(--cb-ink-muted)]">
            Service
            <input
              list="service-list"
              value={service}
              onChange={(e) => setService(e.target.value)}
              className={inputClass}
              placeholder="api"
            />
            <datalist id="service-list">
              {services.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </label>
          <label className="block min-w-0 space-y-1 text-xs font-medium text-[var(--cb-ink-muted)]">
            Time window
            <select
              value={preset}
              onChange={(e) => setPreset(e.target.value as TimeWindowPreset)}
              className={inputClass}
            >
              <option value="1h">Last 1 hour</option>
              <option value="6h">Last 6 hours</option>
              <option value="24h">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="custom">Custom from → to</option>
            </select>
          </label>
        </div>
        {preset === "custom" && (
          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            <label className="block min-w-0 space-y-1 text-xs font-medium text-[var(--cb-ink-muted)]">
              From
              <input
                type="datetime-local"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block min-w-0 space-y-1 text-xs font-medium text-[var(--cb-ink-muted)]">
              To
              <input
                type="datetime-local"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className={inputClass}
              />
            </label>
          </div>
        )}

        {(mode === "sample" || mode === "checklist") && (
          <div className="min-w-0 space-y-2">
            <p className="text-xs font-medium text-[var(--cb-ink-muted)]">
              Change types in play
            </p>
            <div className="flex min-w-0 flex-wrap gap-3">
              {ALL_KINDS.map((k) => (
                <label
                  key={k}
                  className="flex cursor-pointer items-center gap-2 text-sm text-[var(--cb-ink)]"
                >
                  <input
                    type="checkbox"
                    checked={kinds[k]}
                    onChange={() => toggleKind(k)}
                    className="accent-[var(--cb-ink)]"
                  />
                  {KIND_LABEL[k]}
                </label>
              ))}
            </div>
          </div>
        )}

        {mode === "diff" && (
          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            <label className="block min-w-0 space-y-1 text-xs font-medium text-[var(--cb-ink-muted)]">
              Before settings
              <textarea
                value={beforeCfg}
                onChange={(e) => setBeforeCfg(e.target.value)}
                rows={8}
                className={monoInputClass}
              />
            </label>
            <label className="block min-w-0 space-y-1 text-xs font-medium text-[var(--cb-ink-muted)]">
              After settings
              <textarea
                value={afterCfg}
                onChange={(e) => setAfterCfg(e.target.value)}
                rows={8}
                className={monoInputClass}
              />
            </label>
          </div>
        )}

        {mode === "checklist" && (
          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            {kinds.deploy && (
              <label className="block min-w-0 space-y-1 text-xs font-medium text-[var(--cb-ink-muted)]">
                Deploy note
                <input
                  value={checkNotes.deploy}
                  onChange={(e) =>
                    setCheckNotes((n) => ({ ...n, deploy: e.target.value }))
                  }
                  className={inputClass}
                />
              </label>
            )}
            {kinds.config && (
              <label className="block min-w-0 space-y-1 text-xs font-medium text-[var(--cb-ink-muted)]">
                Settings note (key: old → new)
                <input
                  value={checkNotes.config}
                  onChange={(e) =>
                    setCheckNotes((n) => ({ ...n, config: e.target.value }))
                  }
                  className={inputClass}
                />
              </label>
            )}
            {kinds.flag && (
              <label className="block min-w-0 space-y-1 text-xs font-medium text-[var(--cb-ink-muted)]">
                Flag note (name: from → to)
                <input
                  value={checkNotes.flag}
                  onChange={(e) =>
                    setCheckNotes((n) => ({ ...n, flag: e.target.value }))
                  }
                  className={inputClass}
                />
              </label>
            )}
            {kinds.upstream && (
              <label className="block min-w-0 space-y-1 text-xs font-medium text-[var(--cb-ink-muted)]">
                Upstream note
                <input
                  value={checkNotes.upstream}
                  onChange={(e) =>
                    setCheckNotes((n) => ({ ...n, upstream: e.target.value }))
                  }
                  className={inputClass}
                />
              </label>
            )}
          </div>
        )}

        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <button type="button" onClick={generate} className={primaryBtn}>
            Generate card
          </button>
          <button
            type="button"
            onClick={() => {
              setEvents(SAMPLE_EVENTS);
              setService("api");
              setPreset("24h");
              setBeforeCfg(SAMPLE_BEFORE);
              setAfterCfg(SAMPLE_AFTER);
              setMode("sample");
              setStatus(`Reloaded ${SAMPLE_EVENTS.length} sample events.`);
            }}
            className={secondaryBtn}
          >
            Sample
          </button>
        </div>
      </section>

      {mode === "sample" && (
        <section className={`mb-4 space-y-3 p-3 sm:mb-6 sm:p-4 ${cardClass}`}>
          <h2 className="text-sm font-medium text-[var(--cb-ink)]">
            Paste change events (optional)
          </h2>
          <p className="text-xs leading-relaxed text-[var(--cb-ink-muted)]">
            Each event needs{" "}
            <code className="text-[var(--cb-ink)]">service</code>,{" "}
            <code className="text-[var(--cb-ink)]">kind</code>,{" "}
            <code className="text-[var(--cb-ink)]">ts</code>.
          </p>
          <textarea
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            rows={3}
            className={monoInputClass}
            placeholder='{"service":"api","kind":"deploy","ts":"2026-09-16T08:00:00Z","version":"1.0.0"}'
          />
          <button type="button" onClick={onPasteIngest} className={secondaryBtn}>
            Ingest paste
          </button>
        </section>
      )}

      {status ? (
        <p
          className="mb-4 min-w-0 break-words text-sm text-[var(--cb-ink-muted)] sm:mb-6"
          role="status"
        >
          {status}
        </p>
      ) : null}
    </>
  );
}
