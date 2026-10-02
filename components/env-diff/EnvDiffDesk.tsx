"use client";

import { AboutPanel } from "@/components/env-diff/AboutPanel";
import { EnvDiffResults } from "@/components/env-diff/EnvDiffResults";
import {
  cardClass,
  fmt,
  inputClass,
  primaryBtn,
  quietBtn,
  secondaryBtn,
  textareaClass,
} from "@/components/env-diff/deskShared";

import { useMemo, useState } from "react";
import { useHydrated } from "@/lib/useHydrated";
import { buildDiffSnapshot } from "@/lib/env-diff/diff";
import { copyText, snapshotToJson, snapshotToMarkdown } from "@/lib/env-diff/export";
import {
  SAMPLE_AFTER,
  SAMPLE_AFTER_LABEL,
  SAMPLE_BEFORE,
  SAMPLE_BEFORE_LABEL,
} from "@/lib/env-diff/sample";
import { clearHistory, loadStore, prependSnapshot } from "@/lib/env-diff/storage";
import type { EnvDiffSnapshot } from "@/lib/env-diff/types";

export function EnvDiffDesk() {
  // Read localStorage once on the client; the !hydrated placeholder hides it until mounted.
  const [initialStore] = useState(loadStore);
  const restore = Boolean(initialStore.lastBefore.trim() || initialStore.lastAfter.trim());
  const [beforeText, setBeforeText] = useState(
    restore ? initialStore.lastBefore || SAMPLE_BEFORE : SAMPLE_BEFORE,
  );
  const [afterText, setAfterText] = useState(
    restore ? initialStore.lastAfter || SAMPLE_AFTER : SAMPLE_AFTER,
  );
  const [beforeLabel, setBeforeLabel] = useState(
    restore ? initialStore.lastBeforeLabel || SAMPLE_BEFORE_LABEL : SAMPLE_BEFORE_LABEL,
  );
  const [afterLabel, setAfterLabel] = useState(
    restore ? initialStore.lastAfterLabel || SAMPLE_AFTER_LABEL : SAMPLE_AFTER_LABEL,
  );
  const [snap, setSnap] = useState<EnvDiffSnapshot | null>(null);
  const [history, setHistory] = useState<EnvDiffSnapshot[]>(initialStore.snapshots);
  const [status, setStatus] = useState(
    initialStore.snapshots.length
      ? `Loaded ${initialStore.snapshots.length} recent snapshot(s). Paste key lists or Load sample.`
      : "Paste two setting lists, or Load sample. Secret-like values stay masked.",
  );
  const hydrated = useHydrated();
  const [showUnchanged, setShowUnchanged] = useState(false);

  const secretRows = useMemo(
    () => (snap ? snap.rows.filter((r) => r.secretLike) : []),
    [snap],
  );

  function persist(next: EnvDiffSnapshot, note: string) {
    setSnap(next);
    const store = prependSnapshot(next, {
      before: beforeText,
      after: afterText,
      beforeLabel,
      afterLabel,
    });
    setHistory(store.snapshots);
    setStatus(note);
  }

  function onDiff() {
    if (!beforeText.trim() && !afterText.trim()) {
      setStatus("Paste at least one side (key list or key=value lines).");
      return;
    }
    const next = buildDiffSnapshot({
      beforeText,
      afterText,
      beforeLabel,
      afterLabel,
    });
    persist(
      next,
      `Snapshot ready · ${next.counts.missing} missing · ${next.counts.extra} extra · ${next.counts.changed} changed · ${next.counts.secretLike} secret-like`,
    );
  }

  function onLoadSample() {
    setBeforeText(SAMPLE_BEFORE);
    setAfterText(SAMPLE_AFTER);
    setBeforeLabel(SAMPLE_BEFORE_LABEL);
    setAfterLabel(SAMPLE_AFTER_LABEL);
    const next = buildDiffSnapshot({
      beforeText: SAMPLE_BEFORE,
      afterText: SAMPLE_AFTER,
      beforeLabel: SAMPLE_BEFORE_LABEL,
      afterLabel: SAMPLE_AFTER_LABEL,
    });
    persist(
      next,
      `Sample loaded · demos missing/extra/changed + secret-like keys`,
    );
  }

  async function onCopySummary() {
    if (!snap) return;
    const ok = await copyText(snap.summaryLine);
    setStatus(ok ? "Shareable one-liner copied." : "Copy failed.");
  }

  async function onCopyMd() {
    if (!snap) return;
    const ok = await copyText(snapshotToMarkdown(snap));
    setStatus(ok ? "Markdown report copied (values masked)." : "Copy failed.");
  }

  async function onCopyJson() {
    if (!snap) return;
    const ok = await copyText(snapshotToJson(snap));
    setStatus(ok ? "Report copied (values masked)." : "Copy failed.");
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
          Env Diff Snapshot
        </h1>
        <p className="fx-tool-intro max-w-2xl">
          Paste two setting lists and see what&apos;s missing, extra, or
          different — secrets stay masked so you can share the report.
        </p>
      </header>

      <section className={`mb-4 space-y-4 p-3 sm:mb-6 sm:p-4 ${cardClass}`}>
        <div className="grid min-w-0 grid-cols-2 gap-3">
          <label className="block min-w-0 space-y-1 text-sm text-[var(--cb-ink-muted)]">
            Before label
            <input
              value={beforeLabel}
              onChange={(e) => setBeforeLabel(e.target.value)}
              className={inputClass}
              placeholder="staging"
            />
          </label>
          <label className="block min-w-0 space-y-1 text-sm text-[var(--cb-ink-muted)]">
            After label
            <input
              value={afterLabel}
              onChange={(e) => setAfterLabel(e.target.value)}
              className={inputClass}
              placeholder="live"
            />
          </label>
        </div>

        <div className="flex min-w-0 flex-col gap-3 sm:grid sm:grid-cols-2">
          <label className="block min-w-0 space-y-1 text-sm text-[var(--cb-ink-muted)]">
            Before ({beforeLabel || "before"}) — key lists or key=value lines
            <textarea
              value={beforeText}
              onChange={(e) => setBeforeText(e.target.value)}
              rows={4}
              spellCheck={false}
              className={`${textareaClass} sm:min-h-[18rem]`}
              placeholder={"NODE_ENV\nDATABASE_URL\nSTRIPE_SECRET_KEY"}
            />
          </label>
          <label className="block min-w-0 space-y-1 text-sm text-[var(--cb-ink-muted)]">
            After ({afterLabel || "after"}) — key lists or key=value lines
            <textarea
              value={afterText}
              onChange={(e) => setAfterText(e.target.value)}
              rows={4}
              spellCheck={false}
              className={`${textareaClass} sm:min-h-[18rem]`}
              placeholder={"NODE_ENV\nDATABASE_URL\nSENTRY_DSN"}
            />
          </label>
        </div>

        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <button type="button" onClick={onDiff} className={primaryBtn}>
            Run the diff
          </button>
          <div className="flex min-w-0 flex-wrap gap-2">
            <button type="button" onClick={onLoadSample} className={secondaryBtn}>
              Load sample
            </button>
          </div>
        </div>
        <p className="text-base text-[var(--cb-ink-muted)]">
          Tip: key-only lists work. Secret-like values stay masked in the
          report.
        </p>
      </section>

      {status ? (
        <p
          className="mb-4 min-w-0 break-words text-base text-[var(--cb-ink)] sm:mb-6"
          role="status"
        >
          {status}
        </p>
      ) : null}

      {snap ? (
        <EnvDiffResults
          snap={snap}
          secretRows={secretRows}
          showUnchanged={showUnchanged}
          setShowUnchanged={setShowUnchanged}
          onCopySummary={onCopySummary}
          onCopyMd={onCopyMd}
          onCopyJson={onCopyJson}
        />
      ) : null}

      <section className={`mb-6 space-y-3 p-3 sm:mb-8 sm:p-4 ${cardClass}`}>
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-medium text-[var(--cb-ink)]">
            Recent snapshots ({history.length})
          </h2>
          {history.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                clearHistory();
                setHistory([]);
                setStatus("Cleared local data.");
              }}
              className={quietBtn}
            >
              Clear
            </button>
          ) : null}
        </div>
        {history.length === 0 ? (
          <p className="text-base text-[var(--cb-ink-muted)]">
            Diffs are saved here (this browser). Last paste pair is restored on
            reload.
          </p>
        ) : (
          <ul className="space-y-2">
            {history.map((h) => (
              <li key={h.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSnap(h);
                    setBeforeLabel(h.beforeLabel);
                    setAfterLabel(h.afterLabel);
                    setStatus(`Restored ${h.beforeLabel} → ${h.afterLabel}`);
                  }}
                  className="flex w-full min-w-0 flex-wrap items-center justify-between gap-2 rounded-[var(--cb-radius-card-sm)] border border-[var(--cb-line)] bg-[var(--cb-bg)] px-3 py-2 text-left text-sm hover:bg-[color-mix(in_srgb,var(--cb-line)_40%,white)]"
                >
                  <span className="min-w-0 break-words">
                    <span className="font-medium text-[var(--cb-ink)]">
                      {h.beforeLabel} → {h.afterLabel}
                    </span>
                    <span className="text-[var(--cb-ink-muted)]">
                      {" "}
                      · {h.counts.missing}m / {h.counts.extra}e /{" "}
                      {h.counts.changed}c / {h.counts.secretLike} secret-like
                    </span>
                  </span>
                  <span className="shrink-0 text-sm text-[var(--cb-ink-muted)]">
                    {fmt(h.generatedAt)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <AboutPanel />
    </div>
  );
}
