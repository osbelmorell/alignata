"use client";

import {
  CATEGORY_META,
  CardSection,
  CountPill,
  RowTable,
  cardClass,
  fmt,
  quietBtn,
  secondaryBtn,
  warnClayBox,
} from "@/components/env-diff/deskShared";
import {
  downloadText,
  snapshotToJson,
  snapshotToMarkdown,
} from "@/lib/env-diff/export";
import type { DiffCategory, DiffRow, EnvDiffSnapshot } from "@/lib/env-diff/types";

export function EnvDiffResults({
  snap,
  secretRows,
  showUnchanged,
  setShowUnchanged,
  onCopySummary,
  onCopyMd,
  onCopyJson,
}: {
  snap: EnvDiffSnapshot;
  secretRows: DiffRow[];
  showUnchanged: boolean;
  setShowUnchanged: (fn: (v: boolean) => boolean) => void;
  onCopySummary: () => void;
  onCopyMd: () => void;
  onCopyJson: () => void;
}) {
  return (
    <section className={`mb-6 space-y-5 p-3 sm:mb-8 sm:p-5 ${cardClass}`}>
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight text-[var(--cb-ink)]">
            {snap.beforeLabel} → {snap.afterLabel}
          </h2>
          <p className="break-words text-sm text-[var(--cb-ink-muted)]">
            {snap.summaryLine}
          </p>
          <p className="text-sm text-[var(--cb-ink-muted)]">
            Generated {fmt(snap.generatedAt)}
          </p>
        </div>
      </div>

      {snap.counts.secretLike > 0 ? (
        <div
          className={`min-w-0 break-words px-3 py-3 text-sm sm:px-4 ${warnClayBox}`}
        >
          <strong className="font-semibold">Secret-like:</strong>{" "}
          {snap.counts.secretLike} key
          {snap.counts.secretLike === 1 ? "" : "s"} flagged — values stay masked
          in copies and downloads.
        </div>
      ) : null}

      <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-5">
        <CountPill label="Missing" value={snap.counts.missing} />
        <CountPill label="Extra" value={snap.counts.extra} />
        <CountPill label="Changed" value={snap.counts.changed} />
        <CountPill
          label="Secret-like"
          value={snap.counts.secretLike}
          highlight={snap.counts.secretLike > 0}
        />
        <CountPill label="Unchanged" value={snap.counts.unchanged} />
      </div>

      <CardSection
        title="Secret-like keys"
        empty={!secretRows.length}
        hint="Key name or value shape looks sensitive — values masked"
      >
        <RowTable
          rows={secretRows}
          beforeLabel={snap.beforeLabel}
          afterLabel={snap.afterLabel}
        />
      </CardSection>

      {(["missing", "extra", "changed"] as DiffCategory[]).map((cat) => {
        const rows = snap.rows.filter((r) => r.category === cat);
        return (
          <CardSection
            key={cat}
            title={CATEGORY_META[cat].title}
            empty={!rows.length}
          >
            <RowTable
              rows={rows}
              beforeLabel={snap.beforeLabel}
              afterLabel={snap.afterLabel}
            />
          </CardSection>
        );
      })}

      <div className="min-w-0">
        <button
          type="button"
          onClick={() => setShowUnchanged((v) => !v)}
          className="mb-2 text-sm text-[var(--cb-ink-muted)] hover:text-[var(--cb-ink)]"
        >
          {showUnchanged ? "Hide" : "Show"} unchanged ({snap.counts.unchanged})
        </button>
        {showUnchanged ? (
          <CardSection
            title={CATEGORY_META.unchanged.title}
            empty={snap.counts.unchanged === 0}
          >
            <RowTable
              rows={snap.rows.filter((r) => r.category === "unchanged")}
              beforeLabel={snap.beforeLabel}
              afterLabel={snap.afterLabel}
            />
          </CardSection>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-col gap-2 border-t border-[var(--cb-line)] pt-4 sm:flex-row sm:flex-wrap">
        <button type="button" onClick={onCopySummary} className={secondaryBtn}>
          Copy one-liner
        </button>
        <button type="button" onClick={onCopyMd} className={quietBtn}>
          Copy Markdown
        </button>
        <button type="button" onClick={onCopyJson} className={quietBtn}>
          Copy report
        </button>
        <button
          type="button"
          onClick={() =>
            downloadText(
              `env-diff-${snap.beforeLabel}-${snap.afterLabel}.md`,
              snapshotToMarkdown(snap),
              "text/markdown",
            )
          }
          className={quietBtn}
        >
          Download .md
        </button>
        <button
          type="button"
          onClick={() =>
            downloadText(
              `env-diff-${snap.beforeLabel}-${snap.afterLabel}.json`,
              snapshotToJson(snap),
              "application/json",
            )
          }
          className={quietBtn}
        >
          Download report
        </button>
      </div>
    </section>
  );
}
