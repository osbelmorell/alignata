"use client";

import { AboutPanel } from "@/components/agent-eval/AboutPanel";
import {
  EvalDeskMeta,
  EvalDeskSections,
} from "@/components/agent-eval/EvalDeskMeta";
import {
  EvalDeskExport,
  EvalDeskHistory,
} from "@/components/agent-eval/EvalDeskHistoryPanel";

import { useState } from "react";
import { useHydrated } from "@/lib/useHydrated";
import {
  blankEval,
  computeVerdict,
} from "@/lib/agent-eval/eval";
import {
  copyText,
  downloadText,
  evalToJson,
  evalToMarkdown,
} from "@/lib/agent-eval/export";
import { sampleFailEval, samplePassEval } from "@/lib/agent-eval/sample";
import { clearHistory, loadStore, saveEval } from "@/lib/agent-eval/storage";
import type { AgentEval } from "@/lib/agent-eval/types";

export function EvalDesk() {
  // Read localStorage once on the client; the !hydrated placeholder hides it until mounted.
  const [initialStore] = useState(loadStore);
  const [current, setCurrent] = useState<AgentEval>(() =>
    initialStore.lastEval ? computeVerdict(initialStore.lastEval) : blankEval(),
  );
  const [history, setHistory] = useState<AgentEval[]>(initialStore.evals);
  const [status, setStatus] = useState(
    initialStore.lastEval
      ? `Restored last save · ${initialStore.evals.length} recent in localStorage.`
      : "Score the checklist. Rule: any required Fail → no-go. Load a sample pass or fail to demo.",
  );
  const hydrated = useHydrated();

  function update(next: AgentEval, note?: string) {
    const scored = computeVerdict(next);
    setCurrent(scored);
    if (note) setStatus(note);
  }

  function onSave() {
    const scored = computeVerdict({
      ...current,
      name: current.name.trim() || "Untitled",
    });
    const store = saveEval(scored);
    setCurrent(scored);
    setHistory(store.evals);
    setStatus(`Saved to recent · ${store.evals.length} kept locally.`);
  }

  function onClear() {
    update(
      blankEval({ name: "", date: new Date().toISOString().slice(0, 10) }),
      "Cleared checklist. Recent history untouched.",
    );
  }

  function onClearHistory() {
    const store = clearHistory();
    setHistory(store.evals);
    setStatus("Recent saves cleared from localStorage.");
  }

  function onLoadSample(kind: "pass" | "fail") {
    const sample = kind === "pass" ? samplePassEval() : sampleFailEval();
    update(
      sample,
      kind === "pass"
        ? "Sample go loaded — all required Pass / Doesn't apply."
        : "Sample no-go loaded — required Fail(s) in the checklist.",
    );
  }

  function onLoadRecent(ev: AgentEval) {
    update(computeVerdict(ev), `Loaded recent: ${ev.name || ev.id}`);
  }

  async function onCopyJson() {
    const ok = await copyText(evalToJson(current));
    setStatus(ok ? "JSON copied." : "Copy failed.");
  }

  async function onCopyMd() {
    const ok = await copyText(evalToMarkdown(current));
    setStatus(ok ? "Markdown copied." : "Copy failed.");
  }

  function onDownloadJson() {
    const slug = (current.name || "eval")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40);
    downloadText(
      `agent-eval-${slug || "export"}-${current.date}.json`,
      evalToJson(current),
      "application/json",
    );
    setStatus("JSON download started.");
  }

  function onDownloadMd() {
    const slug = (current.name || "eval")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40);
    downloadText(
      `agent-eval-${slug || "export"}-${current.date}.md`,
      evalToMarkdown(current),
      "text/markdown",
    );
    setStatus("Markdown download started.");
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
          Build bet · Hobby · client-side only
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--cb-ink)]">
          Agent Eval Go/No-Go
        </h1>
        <p className="fx-tool-intro max-w-2xl">
          Walk a short checklist and get a clear go or no-go on whether an agent
          is ready to ship. Export JSON or markdown; recent saves stay in
          localStorage.
        </p>
      </header>

      <EvalDeskMeta
        current={current}
        update={update}
        onSave={onSave}
        onLoadSample={onLoadSample}
        onClear={onClear}
      />

      {status ? (
        <p
          className="mb-4 min-w-0 break-words rounded-[var(--cb-radius-card-sm)] border border-[var(--cb-line)] bg-[var(--cb-surface)] px-3 py-2 text-base text-[var(--cb-ink)] shadow-[var(--cb-shadow)] sm:mb-6"
          role="status"
        >
          {status}
        </p>
      ) : null}

      <EvalDeskSections current={current} update={update} />

      <EvalDeskExport
        current={current}
        onCopyJson={onCopyJson}
        onDownloadJson={onDownloadJson}
        onCopyMd={onCopyMd}
        onDownloadMd={onDownloadMd}
      />

      <EvalDeskHistory
        history={history}
        onClearHistory={onClearHistory}
        onLoadRecent={onLoadRecent}
      />

      <AboutPanel />
    </div>
  );
}
