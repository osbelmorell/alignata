"use client";

import { AboutPanel } from "@/components/hobby-burn/AboutPanel";

import { useMemo, useState } from "react";
import { useHydrated } from "@/lib/useHydrated";
import { makeDigest } from "@/lib/hobby-burn/digest";
import {
  copyText,
  digestToJson,
  digestToMarkdown,
  downloadText,
} from "@/lib/hobby-burn/export";
import { parseIngest } from "@/lib/hobby-burn/parse";
import { SAMPLE_CSV, SAMPLE_ROWS } from "@/lib/hobby-burn/sample";
import {
  clearStore,
  loadStore,
  prependDigest,
  saveStore,
} from "@/lib/hobby-burn/storage";
import type { Digest, ProjectBurn } from "@/lib/hobby-burn/types";

const primaryBtn =
  "rounded-[var(--cb-radius-pill)] bg-[var(--cb-ink)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90";

const secondaryBtn =
  "rounded-[var(--cb-radius-pill)] border border-[var(--cb-line)] bg-[color-mix(in_srgb,var(--cb-line)_35%,white)] px-2.5 py-1.5 text-xs font-medium text-[var(--cb-ink)] hover:bg-[var(--cb-line)]";

const quietBtn =
  "rounded-[var(--cb-radius-pill)] border border-[var(--cb-line)] bg-[var(--cb-surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--cb-ink-muted)] hover:bg-[var(--cb-bg)] hover:text-[var(--cb-ink)]";

const cardClass =
  "min-w-0 rounded-[var(--cb-radius-card-sm)] border border-[var(--cb-line)] bg-[var(--cb-surface)] shadow-[var(--cb-shadow)] sm:rounded-[var(--cb-radius-squircle)]";

const inputClass =
  "w-full max-w-full min-w-0 rounded-[var(--cb-radius-card-sm)] border border-[var(--cb-line)] bg-[color-mix(in_srgb,var(--cb-bg)_70%,white)] px-3 py-2 font-mono text-xs text-[var(--cb-ink)] placeholder:text-[var(--cb-ink-muted)] outline-none focus:border-[var(--cb-ink)] focus:bg-[var(--cb-surface)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--cb-ink)_12%,transparent)]";

const fieldClass =
  "min-w-0 rounded-[var(--cb-radius-card-sm)] border border-[var(--cb-line)] bg-[color-mix(in_srgb,var(--cb-bg)_70%,white)] px-3 py-2 text-sm text-[var(--cb-ink)] placeholder:text-[var(--cb-ink-muted)] outline-none focus:border-[var(--cb-ink)] focus:bg-[var(--cb-surface)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--cb-ink)_12%,transparent)]";

function pct(n: number) {
  return `${(n * 100).toFixed(0)}%`;
}

export function BurnDigestDesk() {
  // Read localStorage once on the client; the !hydrated placeholder hides it until mounted.
  const [initialStore] = useState(loadStore);
  const restored = initialStore.rows.length > 0;
  const [rows, setRows] = useState<ProjectBurn[]>(restored ? initialStore.rows : SAMPLE_ROWS);
  const [paste, setPaste] = useState(restored ? initialStore.lastPaste : SAMPLE_CSV);
  const [digests, setDigests] = useState<Digest[]>(restored ? initialStore.digests : []);
  const [status, setStatus] = useState(
    restored
      ? `Restored ${initialStore.rows.length} project(s) from local data.`
      : `Demo: ${SAMPLE_ROWS.length} sample projects loaded.`,
  );
  const hydrated = useHydrated();

  const [manualProject, setManualProject] = useState("");
  const [manualDeploys, setManualDeploys] = useState("");
  const [manualGb, setManualGb] = useState("");

  const digest = useMemo(
    () => (rows.length ? makeDigest(rows, "This week") : null),
    [rows],
  );

  function persist(
    nextRows: ProjectBurn[],
    note: string,
    nextPaste?: string,
    alsoSaveDigest?: boolean,
  ) {
    setRows(nextRows);
    const d = nextRows.length ? makeDigest(nextRows, "This week") : null;
    let nextDigests = digests;
    if (alsoSaveDigest && d) {
      nextDigests = prependDigest(d);
      setDigests(nextDigests);
    }
    saveStore({
      rows: nextRows,
      digests: nextDigests,
      lastPaste: nextPaste ?? paste,
    });
    if (nextPaste !== undefined) setPaste(nextPaste);
    setStatus(note);
  }

  function onFile(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      const parsed = parseIngest(text, file.name);
      if (!parsed.length) {
        setStatus(
          `No projects parsed from ${file.name}. Need project + deploy count.`,
        );
        return;
      }
      persist(
        parsed,
        `Ingested ${parsed.length} row(s) from ${file.name}.`,
        text,
        true,
      );
    };
    reader.readAsText(file);
  }

  function onPasteIngest() {
    const parsed = parseIngest(paste);
    if (!parsed.length) {
      setStatus(
        "Paste a usage list with project name + deploys (optional hours).",
      );
      return;
    }
    persist(parsed, `Ingested ${parsed.length} row(s) from paste.`, paste, true);
  }

  function addManual() {
    const project = manualProject.trim();
    const deploys = Number(manualDeploys);
    const gbHours = manualGb.trim() === "" ? undefined : Number(manualGb);
    if (!project || !Number.isFinite(deploys) || deploys < 0) {
      setStatus("Manual row needs a project name and a non-negative deploy count.");
      return;
    }
    if (gbHours !== undefined && (!Number.isFinite(gbHours) || gbHours < 0)) {
      setStatus("Hours must be a non-negative number.");
      return;
    }
    const next = [
      ...rows.filter((r) => r.project.toLowerCase() !== project.toLowerCase()),
      {
        project,
        deploys,
        gbHours,
      },
    ];
    persist(next, `Added/updated ${project} (${deploys} deploys).`, undefined, true);
    setManualProject("");
    setManualDeploys("");
    setManualGb("");
  }

  async function copyOneLiner() {
    if (!digest) return;
    const ok = await copyText(digest.oneLiner);
    setStatus(
      ok
        ? "Copied weekly one-liner."
        : "Clipboard blocked — select the one-liner instead.",
    );
  }

  async function copyMarkdown() {
    if (!digest) return;
    const ok = await copyText(digestToMarkdown(digest));
    setStatus(ok ? "Copied markdown digest." : "Clipboard blocked.");
  }

  if (!hydrated) {
    return (
      <div className="mx-auto w-full max-w-4xl min-w-0 px-3 py-8 text-[var(--cb-ink-muted)] sm:px-4 sm:py-10">
        Loading…
      </div>
    );
  }

  const topBurner = digest?.rows.find((r) => r.isTop)?.project ?? "—";

  return (
    <div className="mx-auto w-full max-w-4xl min-w-0 px-3 py-8 text-[var(--cb-ink)] sm:px-4 sm:py-10">
      <header className="mb-6 min-w-0 space-y-2 sm:mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--cb-ink-muted)]">
          Build bet · Hobby · this browser only
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--cb-ink)]">
          Hobby Deploy Burn Digest
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-[var(--cb-ink-muted)]">
          Paste this week’s usage list (or type counts) and see which project
          burned the free deploy window — plus a one-liner ready for chat.
        </p>
      </header>

      <AboutPanel />

      <section
        className={`mb-4 grid min-w-0 gap-3 p-3 sm:mb-6 sm:grid-cols-3 sm:p-4 ${cardClass}`}
      >
        <div className="min-w-0">
          <p className="text-xs text-[var(--cb-ink-muted)]">Projects</p>
          <p className="text-2xl font-medium text-[var(--cb-ink)]">
            {digest?.rows.length ?? 0}
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-xs text-[var(--cb-ink-muted)]">Total deploys</p>
          <p className="text-2xl font-medium text-[var(--cb-ink)]">
            {digest?.totalDeploys ?? 0}
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-xs text-[var(--cb-ink-muted)]">Top burner</p>
          <p className="truncate text-2xl font-medium text-[var(--cb-ink)]">
            {topBurner}
          </p>
        </div>
      </section>

      {digest ? (
        <div className="mb-4 min-w-0 break-words rounded-[var(--cb-radius-card-sm)] border border-[color-mix(in_srgb,var(--cb-lime)_55%,var(--cb-line))] bg-[color-mix(in_srgb,var(--cb-lime)_28%,white)] px-3 py-3 text-sm text-[var(--cb-lime-ink)] sm:mb-6 sm:px-4">
          <strong className="font-semibold">Weekly one-liner:</strong>{" "}
          {digest.oneLiner}
        </div>
      ) : null}

      <section className={`mb-6 space-y-3 p-3 sm:mb-8 sm:p-4 ${cardClass}`}>
        <h2 className="text-sm font-medium text-[var(--cb-ink)]">Ingest</h2>
        <p className="text-xs leading-relaxed text-[var(--cb-ink-muted)]">
          Flexible columns:{" "}
          <code className="text-[var(--cb-ink)]">project</code>/
          <code className="text-[var(--cb-ink)]">name</code>,{" "}
          <code className="text-[var(--cb-ink)]">builds</code>/
          <code className="text-[var(--cb-ink)]">deploys</code>/
          <code className="text-[var(--cb-ink)]">count</code>, optional{" "}
          <code className="text-[var(--cb-ink)]">hours</code>. JSON array /
          NDJSON also work.
        </p>
        <textarea
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          rows={7}
          spellCheck={false}
          className={inputClass}
          placeholder={"project,deploys,hours\napi,48,12.4"}
        />
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <button type="button" className={primaryBtn} onClick={onPasteIngest}>
            Parse paste
          </button>
          <div className="flex min-w-0 flex-wrap gap-2">
            <label className={`cursor-pointer ${secondaryBtn}`}>
              Upload file
              <input
                type="file"
                accept=".csv,.json,.jsonl,.ndjson,text/csv,application/json"
                className="hidden"
                onChange={(e) => onFile(e.target.files?.[0] || null)}
              />
            </label>
            <button
              type="button"
              className={secondaryBtn}
              onClick={() =>
                persist(
                  SAMPLE_ROWS,
                  `Loaded ${SAMPLE_ROWS.length} sample projects.`,
                  SAMPLE_CSV,
                  true,
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
                setRows([]);
                setDigests([]);
                setPaste("");
                setStatus("Cleared local data.");
              }}
            >
              Clear
            </button>
          </div>
        </div>

        <div className="border-t border-[var(--cb-line)] pt-3">
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--cb-ink-muted)]">
            Manual row
          </h3>
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap">
            <input
              value={manualProject}
              onChange={(e) => setManualProject(e.target.value)}
              placeholder="Project name"
              className={`w-full flex-1 ${fieldClass}`}
            />
            <input
              value={manualDeploys}
              onChange={(e) => setManualDeploys(e.target.value)}
              placeholder="Deploys"
              type="number"
              min={0}
              className={`w-full sm:w-28 ${fieldClass}`}
            />
            <input
              value={manualGb}
              onChange={(e) => setManualGb(e.target.value)}
              placeholder="Hours (opt)"
              type="number"
              min={0}
              step="0.1"
              className={`w-full sm:w-36 ${fieldClass}`}
            />
            <button type="button" className={secondaryBtn} onClick={addManual}>
              Add / update
            </button>
          </div>
        </div>
      </section>

      <section className={`mb-6 overflow-hidden sm:mb-8 ${cardClass}`}>
        <div className="flex min-w-0 flex-col gap-2 border-b border-[var(--cb-line)] px-3 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-4">
          <h2 className="text-sm font-medium text-[var(--cb-ink)]">
            Digest table
          </h2>
          <div className="flex min-w-0 flex-wrap gap-2">
            <button
              type="button"
              disabled={!digest}
              className={`${secondaryBtn} disabled:opacity-40`}
              onClick={copyOneLiner}
            >
              Copy one-liner
            </button>
            <button
              type="button"
              disabled={!digest}
              className={`${quietBtn} disabled:opacity-40`}
              onClick={copyMarkdown}
            >
              Copy markdown
            </button>
            <button
              type="button"
              disabled={!digest}
              className={`${quietBtn} disabled:opacity-40`}
              onClick={() => {
                if (!digest) return;
                downloadText(
                  `hobby-burn-${digest.createdAt.slice(0, 10)}.json`,
                  digestToJson(digest),
                  "application/json",
                );
                setStatus("Downloaded JSON digest.");
              }}
            >
              Export JSON
            </button>
            <button
              type="button"
              disabled={!digest}
              className={`${quietBtn} disabled:opacity-40`}
              onClick={() => {
                if (!digest) return;
                const next = prependDigest(digest);
                setDigests(next);
                setStatus("Saved digest to history.");
              }}
            >
              Save digest
            </button>
          </div>
        </div>
        {!digest || !digest.rows.length ? (
          <p className="px-3 py-8 text-center text-sm text-[var(--cb-ink-muted)] sm:px-4">
            No rows yet — load sample or ingest a usage list.
          </p>
        ) : (
          <div className="min-w-0 overflow-x-auto">
            <table className="w-full min-w-0 text-left text-sm sm:min-w-[28rem]">
              <thead className="bg-[color-mix(in_srgb,var(--cb-bg)_70%,white)] text-xs uppercase tracking-wide text-[var(--cb-ink-muted)]">
                <tr>
                  <th className="px-3 py-2 font-medium sm:px-4">Project</th>
                  <th className="px-3 py-2 text-right font-medium sm:px-4">
                    Deploys
                  </th>
                  <th className="px-3 py-2 text-right font-medium sm:px-4">
                    Share
                  </th>
                  <th className="px-3 py-2 text-right font-medium sm:px-4">
                    Hours
                  </th>
                </tr>
              </thead>
              <tbody>
                {digest.rows.map((r) => (
                  <tr
                    key={r.project}
                    className={
                      r.isTop
                        ? "border-t border-[var(--cb-line)] bg-[color-mix(in_srgb,var(--cb-lime)_22%,white)]"
                        : "border-t border-[var(--cb-line)] bg-[var(--cb-surface)]"
                    }
                  >
                    <td className="min-w-0 px-3 py-2.5 font-medium text-[var(--cb-ink)] sm:px-4">
                      <span className="break-words">{r.project}</span>
                      {r.isTop ? (
                        <span className="ml-2 inline-block rounded-[var(--cb-radius-pill)] border border-[color-mix(in_srgb,var(--cb-lime)_55%,var(--cb-line))] bg-[var(--cb-lime)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--cb-lime-ink)]">
                          top burner
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-[var(--cb-ink)] sm:px-4">
                      {r.deploys}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-[var(--cb-ink)] sm:px-4">
                      {pct(r.share)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-[var(--cb-ink-muted)] sm:px-4">
                      {r.gbHours > 0 ? r.gbHours.toFixed(1) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-[var(--cb-line)] text-[var(--cb-ink-muted)]">
                  <td className="px-3 py-2 font-medium sm:px-4">Total</td>
                  <td className="px-3 py-2 text-right tabular-nums sm:px-4">
                    {digest.totalDeploys}
                  </td>
                  <td className="px-3 py-2 text-right sm:px-4">100%</td>
                  <td className="px-3 py-2 text-right tabular-nums sm:px-4">
                    {digest.totalGbHours > 0
                      ? digest.totalGbHours.toFixed(1)
                      : "—"}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      {digests.length > 0 ? (
        <section className={`mb-6 space-y-2 p-3 sm:mb-8 sm:p-4 ${cardClass}`}>
          <h2 className="text-sm font-medium text-[var(--cb-ink)]">
            Recent digests
          </h2>
          <ul className="space-y-2 text-sm text-[var(--cb-ink-muted)]">
            {digests.slice(0, 5).map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  className="w-full min-w-0 break-words rounded-[var(--cb-radius-card-sm)] border border-[var(--cb-line)] px-3 py-2 text-left hover:bg-[var(--cb-bg)]"
                  onClick={() => {
                    setRows(
                      d.rows.map((r) => ({
                        project: r.project,
                        deploys: r.deploys,
                        gbHours: r.gbHours || undefined,
                      })),
                    );
                    setStatus(
                      `Restored digest from ${d.createdAt.slice(0, 10)}.`,
                    );
                  }}
                >
                  <span className="text-[var(--cb-ink-muted)]">
                    {d.createdAt.slice(0, 10)}
                  </span>
                  {" · "}
                  <span className="text-[var(--cb-ink)]">{d.oneLiner}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="min-w-0 break-words text-xs text-[var(--cb-ink-muted)]">
        {status}
      </p>

      <footer className="pt-6 text-center text-xs text-[var(--cb-ink-muted)]">
        Client-side only · robots noindex · main branch only on Vercel
      </footer>
    </div>
  );
}
