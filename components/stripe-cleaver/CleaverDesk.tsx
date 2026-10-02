"use client";

import { AboutPanel } from "@/components/stripe-cleaver/AboutPanel";
import {
  cardClass,
  primaryBtn,
  quietBtn,
  secondaryBtn,
  textareaClass,
} from "@/components/stripe-cleaver/deskShared";
import { cleaveStripeCsv } from "@/lib/stripe-cleaver/cleave";
import { SAMPLE_STRIPE_CSV } from "@/lib/stripe-cleaver/sample";
import { bumpImport, loadStore } from "@/lib/stripe-cleaver/storage";
import type { BooksPreset, CleaveResult } from "@/lib/stripe-cleaver/types";
import { useState } from "react";
import { useHydrated } from "@/lib/useHydrated";

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const softSelectedBtn =
  "rounded-[var(--cb-radius-pill)] border border-[var(--cb-ink)] bg-[color-mix(in_srgb,var(--cb-ink)_8%,white)] px-3 py-1.5 text-sm font-semibold text-[var(--cb-ink)]";

export function CleaverDesk() {
  // Read localStorage once on the client; the !hydrated placeholder hides it until mounted.
  const [initialStore] = useState(loadStore);
  const [paste, setPaste] = useState("");
  const [preset, setPreset] = useState<BooksPreset>(initialStore.lastPreset);
  const [result, setResult] = useState<CleaveResult | null>(null);
  const [status, setStatus] = useState("Drop a Stripe payout file or Load sample.");
  const [importCount, setImportCount] = useState(initialStore.importCount);
  const hydrated = useHydrated();
  const [dragOver, setDragOver] = useState(false);

  const hasRows = Boolean(result && result.rows.length > 0);
  const booksLabel = preset === "quickbooks" ? "QuickBooks" : "Xero";

  function run(text: string, note?: string) {
    if (!text.trim()) {
      setStatus("Drop or choose a Stripe payout file first.");
      return;
    }
    const next = cleaveStripeCsv(text, preset);
    setResult(next);
    setPaste(text);
    setStatus(
      note ||
        (next.rows.length
          ? `Ready — ${next.rows.length} books row${next.rows.length === 1 ? "" : "s"} from your payout file.`
          : "No usable rows in that payout file. Try another export or Load sample."),
    );
  }

  function onFile(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () =>
      run(String(reader.result || ""), `Loaded ${file.name}`);
    reader.readAsText(file);
  }

  function onDownload() {
    if (!result?.rows.length) {
      setStatus("Nothing to download — run the cleaver first.");
      return;
    }
    const tag = preset === "quickbooks" ? "quickbooks" : "xero";
    downloadText(`stripe-books-${tag}.csv`, result.csv);
    const s = bumpImport(preset);
    setImportCount(s.importCount);
    setStatus(`Downloaded for ${booksLabel} · ${s.importCount} local download${s.importCount === 1 ? "" : "s"}.`);
  }

  async function onLoadSample() {
    try {
      const res = await fetch("/fixtures/stripe-sample.csv");
      run(
        res.ok ? await res.text() : SAMPLE_STRIPE_CSV,
        "Sample payout file loaded.",
      );
    } catch {
      run(SAMPLE_STRIPE_CSV, "Sample payout file loaded.");
    }
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
        <h1 className="break-words text-3xl font-semibold tracking-tight">
          Stripe Payout Cleaver
        </h1>
        <p className="fx-tool-intro max-w-2xl">
          Turn a Stripe payout file into a books-ready download.
        </p>
      </header>

      <section
        className={`mb-6 min-w-0 space-y-3 p-3 sm:mb-8 sm:p-4 ${cardClass}`}
      >
        <h2 className="text-sm font-medium">Drop / paste</h2>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            onFile(e.dataTransfer.files?.[0] || null);
          }}
          className={`rounded-[var(--cb-radius-card-sm)] border border-dashed px-3 py-5 text-center text-base ${
            dragOver
              ? "border-[var(--cb-olive)] bg-[color-mix(in_srgb,var(--cb-lime)_18%,white)]"
              : "border-[var(--cb-line)] bg-[color-mix(in_srgb,var(--cb-bg)_70%,white)] text-[var(--cb-ink-muted)]"
          }`}
        >
          Drop Stripe payout file here, or{" "}
          <label className="cursor-pointer font-medium underline">
            browse
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0] || null)}
            />
          </label>
        </div>
        <textarea
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          rows={4}
          spellCheck={false}
          className={textareaClass}
          placeholder="Paste payout rows here…"
        />
        <div className="flex min-w-0 flex-wrap gap-2">
          {(["quickbooks", "xero"] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setPreset(id);
                if (paste.trim()) setResult(cleaveStripeCsv(paste, id));
              }}
              className={preset === id ? softSelectedBtn : secondaryBtn}
            >
              {id === "quickbooks" ? "QuickBooks" : "Xero"}
            </button>
          ))}
        </div>
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap">
          {hasRows ? (
            <>
              <button type="button" className={primaryBtn} onClick={onDownload}>
                Download for {booksLabel}
              </button>
              <button
                type="button"
                className={secondaryBtn}
                onClick={() => run(paste)}
              >
                Run the cleaver
              </button>
            </>
          ) : (
            <button
              type="button"
              className={primaryBtn}
              onClick={() => run(paste)}
            >
              Run the cleaver
            </button>
          )}
          <button type="button" className={secondaryBtn} onClick={onLoadSample}>
            Load sample
          </button>
          <button
            type="button"
            className={quietBtn}
            onClick={() => {
              setPaste("");
              setResult(null);
              setStatus("Cleared.");
            }}
          >
            Clear
          </button>
        </div>
      </section>

      <p className="mb-6 min-w-0 break-words text-base text-[var(--cb-ink-muted)]" role="status">
        {status}
      </p>

      <AboutPanel />

      <section
        className={`mb-4 grid min-w-0 gap-3 p-3 sm:mb-6 sm:grid-cols-3 sm:p-4 ${cardClass}`}
      >
        <div className="min-w-0">
          <p className="text-sm text-[var(--cb-ink-muted)]">Rows cleaned</p>
          <p className="text-2xl font-medium">{result?.rows.length ?? 0}</p>
        </div>
        <div className="min-w-0">
          <p className="text-sm text-[var(--cb-ink-muted)]">Fee rows</p>
          <p className="text-2xl font-medium">{result?.feeCount ?? 0}</p>
        </div>
        <div className="min-w-0">
          <p className="text-sm text-[var(--cb-ink-muted)]">Local downloads</p>
          <p className="text-2xl font-medium">{importCount}</p>
        </div>
      </section>

      {result ? (
        <section
          className={`mb-6 min-w-0 space-y-3 p-3 sm:mb-8 sm:p-4 ${cardClass}`}
        >
          <h2 className="text-sm font-medium">
            Preview ({result.rows.length}) · {booksLabel}
          </h2>
          {!result.rows.length ? (
            <p className="text-sm text-[var(--cb-ink-muted)]">
              No usable rows — try another payout file or Load sample.
            </p>
          ) : (
            <ul className="max-h-64 min-w-0 space-y-1 overflow-y-auto text-sm">
              {result.rows.slice(0, 40).map((r, i) => (
                <li
                  key={`${r.date}-${i}`}
                  className="flex min-w-0 justify-between gap-2 border-t border-[var(--cb-line)] py-1.5"
                >
                  <span className="min-w-0 break-words">
                    <span className="tabular-nums text-[var(--cb-ink-muted)]">
                      {r.date}
                    </span>{" "}
                    {r.description}
                    {r.kind === "fee" ? " · fee" : ""}
                  </span>
                  <span
                    className={`shrink-0 tabular-nums ${
                      r.amount < 0 ? "text-[color-mix(in_srgb,var(--cb-danger)_45%,var(--ink))]" : ""
                    }`}
                  >
                    {r.amount.toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
