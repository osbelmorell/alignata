"use client";

import { quietBtn, cardClass } from "@/components/agent-bundle/BundleDeskShared";
import type { Bundle } from "@/lib/agent-bundle/types";
import type { FieldDiff } from "@/lib/agent-bundle/types";

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function BundleDeskHistory({
  ordered,
  selectedIds,
  toggleSelect,
  onCopyBundle,
  diffPair,
  onCopyDiff,
}: {
  ordered: Bundle[];
  selectedIds: [string | null, string | null];
  toggleSelect: (id: string) => void;
  onCopyBundle: (b: Bundle) => void;
  diffPair: {
    before: Bundle;
    after: Bundle;
    fields: FieldDiff[];
  } | null;
  onCopyDiff: () => void;
}) {
  return (
    <div className="min-w-0 space-y-6">
      <section className={`p-4 ${cardClass}`}>
        <div className="mb-3 flex min-w-0 flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-2">
          <h2 className="text-sm font-semibold text-[var(--cb-ink)]">
            History ({ordered.length})
          </h2>
          <p className="text-sm text-[var(--cb-ink-muted)]">
            Select up to 2 to diff · else auto-diffs latest two
          </p>
        </div>
        {ordered.length === 0 ? (
          <p className="text-sm text-[var(--cb-ink-muted)]">
            No bundles yet. Register one or load sample.
          </p>
        ) : (
          <ul className="min-w-0 space-y-2">
            {[...ordered].reverse().map((b) => {
              const selected =
                selectedIds[0] === b.id || selectedIds[1] === b.id;
              return (
                <li
                  key={b.id}
                  className={`flex min-w-0 flex-col gap-2 rounded-[var(--cb-radius-card-sm)] border px-3 py-2.5 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-3 ${
                    selected
                      ? "border-[var(--cb-ink)] bg-[color-mix(in_srgb,var(--cb-olive)_8%,white)]"
                      : "border-[var(--cb-line)] bg-[var(--cb-bg)]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleSelect(b.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="font-medium text-[var(--cb-ink)]">
                        {b.name}
                      </span>
                      {b.marked_live ? (
                        <span className="rounded-[var(--cb-radius-pill)] bg-[var(--cb-lime)] px-1.5 py-0.5 text-sm font-semibold text-[var(--cb-lime-ink)]">
                          live
                        </span>
                      ) : (
                        <span className="rounded-[var(--cb-radius-pill)] border border-[var(--cb-line)] bg-[var(--cb-surface)] px-1.5 py-0.5 text-sm text-[var(--cb-ink-muted)]">
                          draft
                        </span>
                      )}
                      <span className="rounded-[var(--cb-radius-pill)] border border-[var(--cb-line)] px-1.5 py-0.5 text-sm text-[var(--cb-ink-muted)]">
                        {b.env}
                      </span>
                    </div>
                    <p className="mt-1 break-all font-mono text-sm text-[var(--cb-ink-muted)]">
                      {b.prompt_ref} · {b.model_id}
                    </p>
                    <p className="mt-0.5 text-sm text-[var(--cb-ink-muted)]">
                      {fmt(b.created_at)}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => onCopyBundle(b)}
                    className={`${quietBtn} self-start`}
                  >
                    Copy JSON
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className={`min-w-0 p-4 ${cardClass}`}>
        <div className="mb-3 flex min-w-0 flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-[var(--cb-ink)]">Diff</h2>
          {diffPair ? (
            <button type="button" onClick={onCopyDiff} className={quietBtn}>
              Copy diff JSON
            </button>
          ) : null}
        </div>
        {!diffPair ? (
          <p className="text-sm text-[var(--cb-ink-muted)]">
            Need at least 2 bundles to diff.
          </p>
        ) : (
          <>
            <p className="mb-4 min-w-0 break-words text-sm text-[var(--cb-ink-muted)]">
              <span className="text-[var(--cb-ink)]">
                {diffPair.before.name}
              </span>
              {" → "}
              <span className="text-[var(--cb-ink)]">
                {diffPair.after.name}
              </span>
              {" · "}
              {diffPair.fields.filter((f) => f.changed).length}{" "}
              field(s) changed
            </p>
            <div className="min-w-0 max-w-full overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--cb-line)] text-sm text-[var(--cb-ink-muted)]">
                    <th className="pb-2 pr-3 font-medium">Field</th>
                    <th className="pb-2 pr-3 font-medium">Before</th>
                    <th className="pb-2 font-medium">After</th>
                  </tr>
                </thead>
                <tbody>
                  {diffPair.fields.map((f) => (
                    <tr
                      key={f.key}
                      className={`border-b border-[var(--cb-line)] ${
                        f.changed
                          ? "bg-[color-mix(in_srgb,var(--cb-olive)_10%,white)]"
                          : ""
                      }`}
                    >
                      <td
                        className={`py-2.5 pr-3 align-top font-medium ${
                          f.changed
                            ? "text-[var(--cb-olive-deep)]"
                            : "text-[var(--cb-ink-muted)]"
                        }`}
                      >
                        {f.label}
                        {f.changed ? (
                          <span className="ml-1.5 text-sm text-[var(--cb-olive)]">
                            changed
                          </span>
                        ) : null}
                      </td>
                      <td
                        className={`max-w-[12rem] break-all py-2.5 pr-3 align-top font-mono text-sm ${
                          f.changed
                            ? "text-[color-mix(in_srgb,var(--cb-danger)_45%,var(--ink))]"
                            : "text-[var(--cb-ink-muted)]"
                        }`}
                      >
                        {f.before || "—"}
                      </td>
                      <td
                        className={`max-w-[12rem] break-all py-2.5 align-top font-mono text-sm ${
                          f.changed
                            ? "text-[var(--cb-olive-deep)]"
                            : "text-[var(--cb-ink-muted)]"
                        }`}
                      >
                        {f.after || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
