"use client";

import { AboutPanel } from "@/components/license-gate/AboutPanel";
import {
  cardClass,
  primaryBtn,
  quietBtn,
  secondaryBtn,
  textareaClass,
  warnClayBox,
} from "@/components/license-gate/deskShared";
import { hitsToCsv, scanLockfile } from "@/lib/license-gate/parse";
import { SAMPLE_FILENAME, SAMPLE_PACKAGE_LOCK } from "@/lib/license-gate/sample";
import { loadStore, recordScan } from "@/lib/license-gate/storage";
import type { ScanResult } from "@/lib/license-gate/types";
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

function licenseShortLabel(license: string): string {
  const upper = license.toUpperCase();
  if (upper.includes("LGPL")) return "LGPL";
  if (upper.includes("AGPL")) return "AGPL";
  if (upper.includes("GPL")) return "GPL";
  if (upper.includes("SSPL")) return "SSPL";
  if (/commons\s*clause/i.test(license)) return "Commons Clause";
  const token = license.trim().split(/[\s(/]/)[0];
  return token || license.trim() || "copyleft";
}

function failWhyLicenseName(hits: { license: string }[]): string | null {
  const labels = [...new Set(hits.map((h) => licenseShortLabel(h.license)))];
  if (labels.length === 1) return labels[0];
  return null;
}

export function LicenseGateDesk() {
  const [paste, setPaste] = useState("");
  const [filename, setFilename] = useState("");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [status, setStatus] = useState("Drop a lockfile or Load sample.");
  // Read localStorage once on the client; the !hydrated placeholder hides it until mounted.
  const [scanCount, setScanCount] = useState(() => loadStore().scanCount);
  const hydrated = useHydrated();
  const [dragOver, setDragOver] = useState(false);

  function run(text: string, name: string, note?: string) {
    if (!text.trim()) {
      setStatus("Paste or drop a lockfile first.");
      return;
    }
    const next = scanLockfile(text, name);
    setResult(next);
    setPaste(text);
    setFilename(name);
    const s = recordScan(next.status);
    setScanCount(s.scanCount);
    setStatus(
      note ||
        `${next.status} · ${next.format} · ${next.hits.length} deny hit(s) · ${next.scanned} packages`,
    );
  }

  function onFile(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => run(String(reader.result || ""), file.name, `Scanned ${file.name}`);
    reader.readAsText(file);
  }

  async function onLoadSample() {
    try {
      const res = await fetch("/fixtures/package-lock-sample.json");
      const text = res.ok ? await res.text() : SAMPLE_PACKAGE_LOCK;
      run(text, SAMPLE_FILENAME, "Sample lockfile loaded (has GPL hit).");
    } catch {
      run(SAMPLE_PACKAGE_LOCK, SAMPLE_FILENAME, "Sample lockfile loaded (has GPL hit).");
    }
  }

  if (!hydrated) {
    return (
      <div className="mx-auto w-full max-w-4xl min-w-0 px-3 py-8 text-[var(--cb-ink-muted)] sm:px-4 sm:py-10">
        Loading…
      </div>
    );
  }

  const pass = result?.status === "PASS";
  const hasResult = Boolean(result);
  const showFailCard =
    result?.status === "FAIL" && Boolean(result.hits.length > 0);
  const failLicenseName = showFailCard ? failWhyLicenseName(result!.hits) : null;
  const failWhy =
    failLicenseName !== null
      ? `These packages use ${failLicenseName} (a copyleft license). Shipping them can force you to open-source your linked code or take on license risk.`
      : "These packages use copyleft licenses. Shipping them can force you to open-source your linked code or take on license risk.";

  return (
    <div className="mx-auto w-full max-w-4xl min-w-0 px-5 pt-5 pb-10 text-[var(--cb-ink)] sm:px-6 sm:pt-10">
      <header className="mb-5 min-w-0 space-y-2 sm:mb-8">
        <p className="fx-tool-kicker">
          Build bet · Hobby · this browser only
        </p>
        <h1 className="break-words text-3xl font-semibold tracking-tight">
          License Risk Gate
        </h1>
        <p className="fx-tool-intro max-w-2xl">
          Drop a lockfile and see if license risk is a pass or fail.
        </p>
      </header>

      <section
        className={`mb-6 min-w-0 space-y-3 p-3 sm:mb-8 sm:p-4 ${cardClass}`}
      >
        <h2 className="text-sm font-medium">Drop lockfile</h2>
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
          className={`rounded-[var(--cb-radius-card-sm)] border border-dashed px-3 py-6 text-center text-sm ${
            dragOver
              ? "border-[var(--cb-olive)] bg-[color-mix(in_srgb,var(--cb-lime)_18%,white)]"
              : "border-[var(--cb-line)] bg-[color-mix(in_srgb,var(--cb-bg)_70%,white)] text-[var(--cb-ink-muted)]"
          }`}
        >
          Drop your lockfile, or{" "}
          <label className="cursor-pointer font-medium underline">
            browse
            <input
              type="file"
              accept=".json,.yaml,.yml,.lock,application/json,text/yaml,text/plain"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0] || null)}
            />
          </label>
        </div>
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap">
          {hasResult ? (
            <>
              <button
                type="button"
                className={primaryBtn}
                onClick={() => {
                  if (!result) return;
                  downloadText("license-gate-hits.csv", hitsToCsv(result));
                  setStatus("Downloaded the list.");
                }}
              >
                Download the list
              </button>
              <button
                type="button"
                className={secondaryBtn}
                onClick={() => run(paste, filename || "lockfile")}
              >
                Check again
              </button>
            </>
          ) : (
            <button
              type="button"
              className={primaryBtn}
              onClick={() => run(paste, filename || "lockfile")}
            >
              Run the check
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
              setFilename("");
              setResult(null);
              setStatus("Cleared.");
            }}
          >
            Clear
          </button>
        </div>
        <textarea
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          rows={5}
          spellCheck={false}
          className={textareaClass}
          placeholder='{"name":"…","lockfileVersion":3,"packages":{…}}'
        />
        <p className="min-w-0 text-sm text-[var(--cb-ink-muted)]">
          Local scans (dogfood): {scanCount}
        </p>
      </section>


      <section
        className={`mb-4 grid min-w-0 gap-3 p-3 sm:mb-6 sm:grid-cols-3 sm:p-4 ${cardClass}`}
      >
        <div className="min-w-0">
          <p className="text-sm text-[var(--cb-ink-muted)]">Verdict</p>
          <p className="text-2xl font-medium">
            {result ? (
              <span
                className={
                  pass
                    ? "inline-block rounded-[var(--cb-radius-pill)] border border-[color-mix(in_srgb,var(--cb-lime)_55%,var(--cb-line))] bg-[var(--cb-lime)] px-3 py-0.5 text-base font-semibold text-[var(--cb-lime-ink)]"
                    : "inline-block rounded-[var(--cb-radius-pill)] border border-[color-mix(in_srgb,var(--cb-danger)_45%,var(--cb-line))] bg-[color-mix(in_srgb,var(--cb-danger)_18%,white)] px-3 py-0.5 text-base font-semibold"
                }
              >
                {result.status}
              </span>
            ) : (
              "—"
            )}
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-sm text-[var(--cb-ink-muted)]">Deny hits</p>
          <p className="text-2xl font-medium">{result?.hits.length ?? 0}</p>
        </div>
        <div className="min-w-0">
          <p className="text-sm text-[var(--cb-ink-muted)]">Packages scanned</p>
          <p className="text-2xl font-medium">{result?.scanned ?? 0}</p>
        </div>
      </section>

      {showFailCard ? (
        <div
          className={`${warnClayBox} mb-4 min-w-0 space-y-3 break-words px-3 py-3 text-sm sm:mb-6 sm:px-4`}
        >
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-semibold text-[var(--cb-ink-muted)]">
              Why
            </p>
            <p>{failWhy}</p>
          </div>
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-semibold text-[var(--cb-ink-muted)]">
              Impact
            </p>
            <p>This project isn’t clear to ship until you fix or accept these hits.</p>
          </div>
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-semibold text-[var(--cb-ink-muted)]">
              Next
            </p>
            <p>
              Download the list, then review or replace those packages — or send the list to
              legal or eng.
            </p>
          </div>
        </div>
      ) : null}

      {result ? (
        <section
          className={`mb-6 min-w-0 space-y-3 p-3 sm:mb-8 sm:p-4 ${cardClass}`}
        >
          <h2 className="text-sm font-medium">
            {result.hits.length ? `Copyleft hits (${result.hits.length})` : "No deny hits"} ·{" "}
            {result.format}
          </h2>
          {result.hits.length === 0 ? (
            <p className="text-sm text-[var(--cb-ink-muted)]">
              Clean PASS — no GPL / AGPL / SSPL / Commons Clause / LGPL matches.
              {result.unknown
                ? ` (${result.unknown} package(s) have unknown license — not FAIL.)`
                : ""}
            </p>
          ) : (
            <ul className="max-h-72 min-w-0 space-y-2 overflow-y-auto text-sm">
              {result.hits.map((h) => (
                <li
                  key={`${h.package}@${h.version}`}
                  className="min-w-0 border-t border-[var(--cb-line)] py-2"
                >
                  <span className="break-words font-medium">{h.package}</span>
                  <span className="text-[var(--cb-ink-muted)]">
                    {" "}
                    @{h.version || "?"} · {h.license}
                  </span>
                  <div className="break-words text-sm text-[var(--cb-ink-muted)]">
                    {h.reason}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <p className="min-w-0 break-words text-base text-[var(--cb-ink-muted)]" role="status">
        {status}
      </p>
      <AboutPanel />

      <footer className="pt-6 text-center text-sm text-[var(--cb-ink-muted)]">
        This browser only · robots noindex · main on Vercel
      </footer>
    </div>
  );
}
