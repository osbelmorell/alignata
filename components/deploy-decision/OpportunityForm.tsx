"use client";

import { useState } from "react";
import type { DecisionState, OpportunityCard } from "@/lib/deploy-decision/types";
import { DECISION_STATES, STATE_META } from "@/lib/deploy-decision/types";
import {
  formatPct,
  formatUsd,
  impliedUsd,
  newId,
  parseMoney,
  parsePct,
} from "@/lib/deploy-decision/format";

interface OpportunityFormProps {
  card: OpportunityCard;
  lastState: DecisionState | null;
  onChange: (card: OpportunityCard) => void;
  onDecide: (state: DecisionState) => void;
}

const inputClass =
  "rounded-[var(--cb-radius-card-sm)] border border-[var(--cb-line)] bg-[color-mix(in_srgb,var(--cb-bg)_70%,white)] px-3 py-2 text-sm text-[var(--cb-ink)] outline-none placeholder:text-[var(--cb-ink-muted)] focus:border-[var(--cb-ink)] focus:bg-[var(--cb-surface)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--cb-ink)_12%,transparent)]";

export function OpportunityForm({
  card,
  lastState,
  onChange,
  onDecide,
}: OpportunityFormProps) {
  const [deployableText, setDeployableText] = useState(
    card.deployableUsd == null ? "" : String(card.deployableUsd),
  );
  const [pctText, setPctText] = useState(
    card.suggestedPct == null ? "" : String(card.suggestedPct),
  );
  const implied = impliedUsd(card.deployableUsd, card.suggestedPct);
  const checkedCount = card.checklist.filter((i) => i.checked).length;

  return (
    <section className="overflow-hidden rounded-[var(--cb-radius-card-sm)] border border-[var(--cb-line)] bg-[var(--cb-surface)] shadow-[var(--cb-shadow)] sm:rounded-[var(--cb-radius-squircle)]">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--cb-line)] px-4 py-2.5">
        <div>
          <h2 className="text-sm font-semibold text-[var(--cb-ink-muted)]">
            Opportunity
          </h2>
          <p className="text-sm font-medium text-[var(--cb-ink)]">
            Decision card
          </p>
        </div>
        <div className="text-right font-mono text-sm text-[var(--cb-ink-muted)]">
          {checkedCount}/{card.checklist.length} checks
          {lastState ? (
            <span className={`ml-2 ${STATE_META[lastState].tone}`}>
              last {STATE_META[lastState].short}
            </span>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 p-4">
        <label className="grid gap-1">
          <span className="text-sm font-semibold text-[var(--cb-ink-muted)]">
            Ticker / name
          </span>
          <input
            value={card.ticker}
            onChange={(e) => onChange({ ...card, ticker: e.target.value })}
            placeholder="NVDA"
            autoComplete="off"
            spellCheck={false}
            className={`${inputClass} font-mono`}
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-semibold text-[var(--cb-ink-muted)]">
            Short thesis
          </span>
          <textarea
            value={card.thesis}
            onChange={(e) => onChange({ ...card, thesis: e.target.value })}
            rows={2}
            placeholder="Why this, why now, what kills it."
            className={`${inputClass} resize-y leading-relaxed`}
          />
        </label>

        <div className="grid grid-cols-2 items-end gap-3">
          <label className="grid gap-1">
            <span className="text-sm font-semibold text-[var(--cb-ink-muted)]">
              Deployable $ pasted
            </span>
            <input
              inputMode="decimal"
              value={deployableText}
              onChange={(e) => {
                setDeployableText(e.target.value);
                onChange({
                  ...card,
                  deployableUsd: parseMoney(e.target.value),
                });
              }}
              placeholder="250000"
              className={`${inputClass} font-mono tabular-nums`}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm font-semibold text-[var(--cb-ink-muted)]">
              Suggested % of deployable
            </span>
            <input
              inputMode="decimal"
              value={pctText}
              onChange={(e) => {
                setPctText(e.target.value);
                onChange({
                  ...card,
                  suggestedPct: parsePct(e.target.value),
                });
              }}
              placeholder="2"
              className={`${inputClass} font-mono tabular-nums`}
            />
          </label>
        </div>

        <p className="rounded-[var(--cb-radius-card-sm)] border border-[var(--cb-line)] bg-[var(--cb-bg)] px-3 py-2 font-mono text-sm tabular-nums text-[var(--cb-ink-muted)]">
          Implied size{" "}
          <span className="text-[var(--cb-ink)]">{formatUsd(implied)}</span>
          <span className="text-[var(--cb-ink-muted)]">
            {" "}
            · {formatPct(card.suggestedPct)} of{" "}
            {formatUsd(card.deployableUsd)}
          </span>
        </p>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold text-[var(--cb-ink-muted)]">
              Checklist
            </span>
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...card,
                  checklist: [
                    ...card.checklist,
                    { id: newId(), label: "New check", checked: false },
                  ],
                })
              }
              className="text-sm font-medium text-[var(--cb-ink-muted)] hover:text-[var(--cb-ink)]"
            >
              + Add item
            </button>
          </div>
          <ul className="grid gap-1.5">
            {card.checklist.map((item, idx) => (
              <li
                key={item.id}
                className="flex items-center gap-1 rounded-[var(--cb-radius-card-sm)] border border-[var(--cb-line)] bg-[var(--cb-bg)] px-1 py-0"
              >
                <label className="inline-flex size-11 shrink-0 items-center justify-center">
                <input
                  id={`check-${item.id}`}
                  type="checkbox"
                  aria-label={item.label.trim() ? `Done: ${item.label.trim()}` : `Checklist item ${idx + 1} done`}
                  checked={item.checked}
                  onChange={(e) => {
                    const checklist = card.checklist.map((c) =>
                      c.id === item.id
                        ? { ...c, checked: e.target.checked }
                        : c,
                    );
                    onChange({ ...card, checklist });
                  }}
                  className="h-3.5 w-3.5 accent-[var(--cb-lime)]"
                />
                </label>
                <input
                  value={item.label}
                  onChange={(e) => {
                    const checklist = card.checklist.map((c) =>
                      c.id === item.id ? { ...c, label: e.target.value } : c,
                    );
                    onChange({ ...card, checklist });
                  }}
                  className="min-w-0 flex-1 bg-transparent text-sm text-[var(--cb-ink)] outline-none"
                  aria-label={`Checklist item ${idx + 1} label`}
                />
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...card,
                      checklist: card.checklist.filter((c) => c.id !== item.id),
                    })
                  }
                  className="min-w-11 px-1 text-sm text-[var(--cb-ink-muted)] hover:text-[var(--cb-ink)]"
                  aria-label={`Remove ${item.label}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-[var(--cb-ink-muted)]">
            Decide
          </p>
          {/* Full-width stacked CTAs — no H-clip / horizontal scroll */}
          <div className="flex w-full min-w-0 flex-col gap-2">
            {DECISION_STATES.map((state) => {
              const meta = STATE_META[state];
              return (
                <button
                  key={state}
                  type="button"
                  onClick={() => onDecide(state)}
                  className={`w-full min-h-11 min-w-0 rounded-[var(--cb-radius-pill)] border px-3 py-3.5 text-sm font-semibold ${meta.btn}`}
                >
                  {meta.label}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-base text-[var(--cb-ink-muted)]">
            Appends to the local decision log. Ticker required.
          </p>
        </div>
      </div>
    </section>
  );
}
