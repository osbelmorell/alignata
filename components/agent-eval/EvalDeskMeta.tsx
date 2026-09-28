"use client";

import {
  STATUS_OPTS,
  PLAIN_RULE,
  cardClass,
  inputClass,
  primaryBtn,
  quietBtn,
  secondaryBtn,
  statusBtnClass,
  verdictStyles,
} from "@/components/agent-eval/EvalDeskShared";
import {
  setItemNotes,
  setItemStatus,
  countsFor,
} from "@/lib/agent-eval/eval";
import type { AgentEval, SectionId } from "@/lib/agent-eval/types";
import { SECTION_META } from "@/lib/agent-eval/types";

export function EvalDeskMeta({
  current,
  update,
  onSave,
  onLoadSample,
  onClear,
}: {
  current: AgentEval;
  update: (next: AgentEval, note?: string) => void;
  onSave: () => void;
  onLoadSample: (kind: "pass" | "fail") => void;
  onClear: () => void;
}) {
  const vs = verdictStyles(current.verdict);
  const counts = countsFor(current);
  return (
    <section className={`mb-6 space-y-4 p-3 sm:p-4 ${cardClass}`}>
      <div className="grid min-w-0 gap-3 sm:grid-cols-2">
        <label className="block min-w-0 space-y-1 text-xs font-medium text-[var(--cb-ink-muted)]">
          Agent name
          <input
            value={current.name}
            onChange={(e) => update({ ...current, name: e.target.value })}
            className={inputClass}
            placeholder="e.g. Support triage agent v0.3"
          />
        </label>
        <label className="block min-w-0 space-y-1 text-xs font-medium text-[var(--cb-ink-muted)]">
          Date
          <input
            type="date"
            value={current.date.slice(0, 10)}
            onChange={(e) => update({ ...current, date: e.target.value })}
            className={inputClass}
          />
        </label>
      </div>

      <div
        className={`rounded-[var(--cb-radius-card-sm)] border px-3 py-3 sm:px-4 sm:py-4 ${vs.badge}`}
        role="status"
        aria-live="polite"
      >
        <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between sm:gap-2">
          <p className="text-2xl font-semibold tracking-tight">{vs.label}</p>
          <p className="text-xs opacity-80">
            {counts.pass} pass · {counts.fail} fail · {counts.na} n/a ·{" "}
            {counts.unset} unset
          </p>
        </div>
        <p className="mt-1 text-sm opacity-90">{current.reasonSummary}</p>
      </div>

      <div className="rounded-[var(--cb-radius-card-sm)] border border-[var(--cb-line)] bg-[color-mix(in_srgb,var(--cb-bg)_70%,white)] px-3 py-2 text-xs leading-relaxed text-[var(--cb-ink-muted)]">
        <span className="font-medium text-[var(--cb-ink)]">Rule: </span>
        {PLAIN_RULE}
      </div>

      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button type="button" onClick={onSave} className={primaryBtn}>
          Save to recent
        </button>
        <div className="flex min-w-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onLoadSample("pass")}
            className={secondaryBtn}
          >
            Load sample pass
          </button>
          <button
            type="button"
            onClick={() => onLoadSample("fail")}
            className={secondaryBtn}
          >
            Load sample fail
          </button>
          <button type="button" onClick={onClear} className={quietBtn}>
            Clear
          </button>
        </div>
      </div>
    </section>
  );
}

export function EvalDeskSections({
  current,
  update,
}: {
  current: AgentEval;
  update: (next: AgentEval, note?: string) => void;
}) {
  return (
    <div className="mb-8 space-y-4 sm:space-y-5">
      {current.sections.map((section) => {
        const meta = SECTION_META[section.id as SectionId];
        return (
          <section key={section.id} className={`p-3 sm:p-5 ${cardClass}`}>
            <div className="mb-4 min-w-0">
              <span className="inline-flex rounded-[var(--cb-radius-pill)] border border-[var(--cb-line)] bg-[color-mix(in_srgb,var(--cb-line)_35%,white)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--cb-ink-muted)]">
                {meta.title}
              </span>
              <h2 className="mt-1 text-lg font-semibold tracking-tight text-[var(--cb-ink)]">
                {section.title}
              </h2>
              <p className="text-sm text-[var(--cb-ink-muted)]">
                {section.description}
              </p>
            </div>

            <ul className="space-y-3 sm:space-y-4">
              {section.items.map((item) => (
                <li
                  key={item.id}
                  className="min-w-0 rounded-[var(--cb-radius-card-sm)] border border-[var(--cb-line)] bg-[color-mix(in_srgb,var(--cb-bg)_55%,white)] p-3"
                >
                  <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[var(--cb-ink)]">
                        {item.label}
                        {item.required ? (
                          <span className="ml-2 text-[10px] uppercase tracking-wide text-[var(--cb-clay-deep)]">
                            required
                          </span>
                        ) : (
                          <span className="ml-2 text-[10px] uppercase tracking-wide text-[var(--cb-ink-muted)]">
                            optional
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex min-w-0 flex-wrap gap-1">
                      {STATUS_OPTS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() =>
                            update(
                              setItemStatus(
                                current,
                                section.id,
                                item.id,
                                opt.value,
                              ),
                            )
                          }
                          className={statusBtnClass(
                            item.status === opt.value,
                            opt.value,
                          )}
                          aria-pressed={item.status === opt.value}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <label className="mt-2 block min-w-0 space-y-1 text-xs font-medium text-[var(--cb-ink-muted)]">
                    Notes
                    <input
                      value={item.notes}
                      onChange={(e) =>
                        update(
                          setItemNotes(
                            current,
                            section.id,
                            item.id,
                            e.target.value,
                          ),
                        )
                      }
                      className={inputClass}
                      placeholder="Short evidence / link / fixture id"
                    />
                  </label>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
