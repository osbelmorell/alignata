"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { AboutPanel } from "@/components/scorecard/AboutPanel";
import { PillarCard } from "@/components/scorecard/PillarCard";
import { formatScorecardDate } from "@/lib/scorecard/formatDate";
import {
  exportScorecardJson,
  normalizeScorecard,
  parseScorecardJson,
  saveScorecard,
} from "@/lib/scorecard/storage";
import {
  DEFAULT_SCORECARD,
  type PillarId,
  type ScorecardData,
  type Status,
} from "@/lib/scorecard/types";

const noSubscribe = () => () => {};
/** ?edit=1 → edit mode. false on the server and during hydration (same as before). */
const readEditParam = () => new URLSearchParams(window.location.search).get("edit") === "1";

export function Scorecard() {
  const [data, setData] = useState<ScorecardData>(DEFAULT_SCORECARD);
  const [hydrated, setHydrated] = useState(false);
  const editMode = useSyncExternalStore(noSubscribe, readEditParam, () => false);
  const [jsonOpen, setJsonOpen] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [loadSource, setLoadSource] = useState<"file" | "default">("default");

  useEffect(() => {
    let cancelled = false;

    async function loadShared() {
      try {
        const res = await fetch(`/scorecard.json?t=${Date.now()}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const raw = await res.json();
        const next = normalizeScorecard(raw);
        if (cancelled) return;
        setData(next);
        setJsonText(exportScorecardJson(next));
        setLoadSource("file");
      } catch {
        if (cancelled) return;
        // Shared file is the source of truth; fall back to packaged defaults
        // (not stale localStorage as primary) so Osbel always sees board intent.
        const fallback = structuredClone(DEFAULT_SCORECARD);
        setData(fallback);
        setJsonText(exportScorecardJson(fallback));
        setLoadSource("default");
      } finally {
        if (!cancelled) setHydrated(true);
      }
    }

    void loadShared();
    return () => {
      cancelled = true;
    };
  }, []);

  // In edit mode, keep the JSON box in step with `data` (adjusted during render
  // instead of setState in an effect; same trigger: data / hydrated / editMode change).
  const syncActive = hydrated && editMode;
  const [synced, setSynced] = useState({ data, active: false });
  if (synced.data !== data || synced.active !== syncActive) {
    setSynced({ data, active: syncActive });
    if (syncActive) setJsonText(exportScorecardJson(data));
  }

  useEffect(() => {
    if (!hydrated || !editMode) return;
    saveScorecard(data);
  }, [data, hydrated, editMode]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(id);
  }, [toast]);

  const flash = useCallback((message: string) => setToast(message), []);

  const updatePillar = useCallback(
    (id: PillarId, patch: Partial<{ status: Status; lastOutcome: string }>) => {
      if (!editMode) return;
      setData((prev) => ({
        ...prev,
        updatedAt: new Date().toISOString(),
        pillars: prev.pillars.map((p) =>
          p.id === id
            ? { ...p, ...patch, updatedAt: new Date().toISOString() }
            : p,
        ),
      }));
    },
    [editMode],
  );

  const overall = useMemo(() => {
    const order: Status[] = ["red", "yellow", "green"];
    const worst = data.pillars.reduce<Status>((acc, p) => {
      return order.indexOf(p.status) < order.indexOf(acc) ? p.status : acc;
    }, "green");
    return worst;
  }, [data.pillars]);

  const applyJson = () => {
    try {
      const next = parseScorecardJson(jsonText);
      setData({ ...next, updatedAt: new Date().toISOString() });
      setJsonError(null);
      flash("Scorecard updated from JSON");
    } catch (err) {
      setJsonError(err instanceof Error ? err.message : "Invalid JSON");
    }
  };

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(exportScorecardJson(data));
      flash("JSON copied");
    } catch {
      flash("Copy failed — use the JSON panel");
      if (editMode) setJsonOpen(true);
    }
  };

  const resetDefaults = () => {
    const fresh = structuredClone(DEFAULT_SCORECARD);
    fresh.updatedAt = new Date().toISOString();
    fresh.pillars = fresh.pillars.map((p) => ({
      ...p,
      updatedAt: new Date().toISOString(),
    }));
    setData(fresh);
    flash("Reset to v0 defaults");
  };

  const updatedLabel = hydrated
    ? formatScorecardDate(data.updatedAt, "full")
    : "…";

  const secondaryBtn =
    "rounded-[var(--cb-radius-pill)] border border-[var(--cb-line)] bg-[color-mix(in_srgb,var(--cb-line)_35%,white)] px-3 py-2 text-sm font-medium text-[var(--cb-ink)] hover:bg-[var(--cb-line)]";

  return (
    <div className="mx-auto w-full max-w-6xl px-3 py-3 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      {editMode && (
        <div
          role="status"
          className="mb-3 rounded-[var(--cb-radius-card-sm)] border border-[color-mix(in_srgb,var(--cb-clay)_50%,var(--cb-line))] bg-[color-mix(in_srgb,var(--cb-clay)_18%,white)] px-3 py-2 text-sm text-[var(--cb-olive-deep)] sm:mb-4 sm:text-sm"
        >
          <strong className="font-semibold">Edit mode</strong> — not the board
          source of truth; update{" "}
          <code className="font-mono text-sm sm:text-sm">
            public/scorecard.json
          </code>{" "}
          via git for Osbel.
        </div>
      )}

      {/* Pillars FIRST above the fold — primary job at ~390px */}
      <div className="grid gap-2.5 sm:gap-5 md:grid-cols-3">
        {data.pillars.map((pillar) => (
          <PillarCard
            key={pillar.id}
            pillar={pillar}
            readOnly={!editMode}
            onStatusChange={(status) => updatePillar(pillar.id, { status })}
            onOutcomeChange={(lastOutcome) =>
              updatePillar(pillar.id, { lastOutcome })
            }
          />
        ))}
      </div>

      {/* Demoted below fold: About, title/metadata, Copy JSON */}
      <div className="mt-6 sm:mt-10">
        <AboutPanel />

        <header className="mb-6 flex flex-col gap-4 border-b border-[var(--cb-line)] pb-6 sm:mb-8 sm:flex-row sm:items-end sm:justify-between sm:gap-6 sm:pb-8">
          <div>
            <p className="fx-tool-kicker">
              Bet A · Enterprise
            </p>
            <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-[var(--cb-ink)] sm:mt-2 sm:text-4xl">
              {data.title}
            </h1>
            <p className="mt-1.5 max-w-2xl text-base text-[var(--cb-ink-muted)] sm:mt-2">
              {data.subtitle}
            </p>
            <p className="mt-2 text-base text-[var(--cb-ink-muted)] sm:mt-3">
              Snapshot {updatedLabel}
              {" · "}
              Overall:{" "}
              <span className="font-semibold capitalize text-[var(--cb-ink)]">
                {overall}
              </span>
            </p>
            {!editMode && (
              <p className="mt-1 text-base text-[var(--cb-ink-muted)]">
                Updated{" "}
                {hydrated
                  ? formatScorecardDate(data.updatedAt)
                  : "…"}
                {loadSource === "default" && hydrated
                  ? " · (fallback defaults)"
                  : ""}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copyJson}
              className={editMode && jsonOpen ? secondaryBtn : "fx-btn-primary"}
            >
              Copy JSON
            </button>
            {editMode && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setJsonText(exportScorecardJson(data));
                    setJsonError(null);
                    setJsonOpen((v) => !v);
                  }}
                  className={secondaryBtn}
                >
                  {jsonOpen ? "Hide JSON" : "Paste / edit JSON"}
                </button>
                <button
                  type="button"
                  onClick={resetDefaults}
                  className="rounded-[var(--cb-radius-pill)] border border-[var(--cb-line)] bg-[var(--cb-surface)] px-3 py-2 text-sm font-medium text-[var(--cb-ink-muted)] hover:bg-[var(--cb-bg)]"
                >
                  Reset
                </button>
              </>
            )}
          </div>
        </header>

        {editMode && jsonOpen && (
          <section className="mb-8 rounded-[var(--cb-radius-squircle)] border border-[var(--cb-line)] bg-[var(--cb-surface)] p-4 shadow-[var(--cb-shadow)]">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-[var(--cb-ink)]">
                  Paste JSON
                </h2>
                <p className="text-base text-[var(--cb-ink-muted)]">
                  Edit statuses and lastOutcome, then Apply. Persists to
                  localStorage (edit mode only).
                </p>
              </div>
              <button
                type="button"
                onClick={applyJson}
                className="fx-btn-primary"
              >
                Apply JSON
              </button>
            </div>
            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              rows={14}
              spellCheck={false}
              className="w-full rounded-[var(--cb-radius-card-sm)] border border-[var(--cb-line)] bg-[color-mix(in_srgb,var(--cb-bg)_70%,white)] px-3 py-2 font-mono text-sm leading-relaxed text-[var(--cb-ink)] outline-none focus:border-[var(--cb-ink)] focus:bg-[var(--cb-surface)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--cb-ink)_12%,transparent)]"
            />
            {jsonError && (
              <p className="mt-2 text-sm text-[color-mix(in_srgb,var(--cb-danger)_45%,var(--ink))]">
                JSON error: {jsonError}
              </p>
            )}
          </section>
        )}
      </div>

      {toast && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-[var(--cb-radius-pill)] bg-[var(--cb-ink)] px-4 py-2 text-sm font-medium text-white shadow-[var(--cb-shadow)]"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
