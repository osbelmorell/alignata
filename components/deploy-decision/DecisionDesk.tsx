"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { AboutPanel } from "@/components/deploy-decision/AboutPanel";
import { DecisionLog } from "@/components/deploy-decision/DecisionLog";
import { KillBar } from "@/components/deploy-decision/KillBar";
import { OpportunityForm } from "@/components/deploy-decision/OpportunityForm";
import {
  cardSummaryText,
  impliedUsd,
  newId,
  shareableText,
} from "@/lib/deploy-decision/format";
import {
  getClientAsOf,
  getClientSnapshot,
  getServerAsOf,
  getServerSnapshot,
  saveState,
  subscribeAsOf,
  subscribeState,
} from "@/lib/deploy-decision/storage";
import {
  defaultState,
  type DecisionState,
  type OpportunityCard,
} from "@/lib/deploy-decision/types";

const secondaryBtn =
  "rounded-[var(--cb-radius-pill)] border border-[var(--cb-line)] bg-[color-mix(in_srgb,var(--cb-line)_35%,white)] px-3 py-1.5 text-sm font-medium text-[var(--cb-ink)] hover:bg-[var(--cb-line)]";

const quietBtn =
  "rounded-[var(--cb-radius-pill)] border border-[var(--cb-line)] bg-[var(--cb-surface)] px-3 py-1.5 text-sm font-medium text-[var(--cb-ink-muted)] hover:bg-[var(--cb-bg)] hover:text-[var(--cb-ink)]";

export function DecisionDesk() {
  const state = useSyncExternalStore(
    subscribeState,
    getClientSnapshot,
    getServerSnapshot,
  );
  const asOfMs = useSyncExternalStore(
    subscribeAsOf,
    getClientAsOf,
    getServerAsOf,
  );
  const [lastState, setLastState] = useState<DecisionState | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [formNonce, setFormNonce] = useState(0);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(id);
  }, [toast]);

  const flash = useCallback((message: string) => setToast(message), []);

  const setCard = useCallback(
    (card: OpportunityCard) => {
      saveState({ ...state, card });
    },
    [state],
  );

  const decide = useCallback(
    (decision: DecisionState) => {
      const ticker = state.card.ticker.trim();
      if (!ticker) {
        flash("Ticker required");
        return;
      }
      saveState({
        ...state,
        log: [
          ...state.log,
          {
            id: newId(),
            timestamp: new Date().toISOString(),
            ticker,
            state: decision,
            thesis: state.card.thesis.trim(),
            suggestedPct: state.card.suggestedPct,
            deployableUsd: state.card.deployableUsd,
            impliedUsd: impliedUsd(
              state.card.deployableUsd,
              state.card.suggestedPct,
            ),
            checklist: state.card.checklist.map((item) => ({ ...item })),
            example: false,
          },
        ],
      });
      setLastState(decision);
      flash(`Logged ${ticker} · ${decision}`);
    },
    [flash, state],
  );

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(
        cardSummaryText({
          card: state.card,
          state: lastState,
          url: window.location.href,
        }),
      );
      flash("Card summary copied");
    } catch {
      flash("Copy failed");
    }
  };

  const copyShareable = async () => {
    try {
      await navigator.clipboard.writeText(
        shareableText({
          card: state.card,
          state: lastState,
          url: window.location.href,
        }),
      );
      flash("Shareable text copied");
    } catch {
      flash("Copy failed");
    }
  };

  const resetExamples = () => {
    saveState(defaultState());
    setLastState(null);
    setFormNonce((n) => n + 1);
    flash("Reset to example data");
  };

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-[var(--cb-line)] bg-[var(--cb-surface)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-1.5 px-3 py-3 sm:gap-3 sm:px-4 sm:py-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="fx-tool-kicker">
              Bet B · Investment desk
            </p>
            <h1 className="mt-0.5 text-lg font-semibold tracking-tight text-[var(--cb-ink)] sm:mt-1 sm:text-2xl">
              Deploy Decision Card
            </h1>
            <p className="mt-1 text-base text-[var(--cb-ink-muted)]">
              Opportunity in → Approve / Size / Pass out. Local only — one
              obvious next tap.
            </p>
          </div>
          <div className="hidden flex-wrap gap-2 sm:flex">
            <button type="button" onClick={copySummary} className={secondaryBtn}>
              Copy card summary
            </button>
            <button
              type="button"
              onClick={copyShareable}
              className={secondaryBtn}
            >
              Copy shareable text
            </button>
            <button
              type="button"
              onClick={resetExamples}
              className={quietBtn}
            >
              Reset example data
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl flex-1 px-3 py-3 sm:px-4 sm:py-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_1fr] xl:grid-cols-[minmax(0,24rem)_1fr]">
          <OpportunityForm
            key={formNonce}
            card={state.card}
            lastState={lastState}
            onChange={setCard}
            onDecide={decide}
          />
          <DecisionLog log={state.log} />
        </div>

        <div className="mt-4 flex flex-wrap gap-2 sm:hidden">
          <button type="button" onClick={copySummary} className={secondaryBtn}>
            Copy card summary
          </button>
          <button
            type="button"
            onClick={copyShareable}
            className={secondaryBtn}
          >
            Copy shareable text
          </button>
          <button type="button" onClick={resetExamples} className={quietBtn}>
            Reset example data
          </button>
        </div>

        <div className="mt-4">
          <AboutPanel />
        </div>
      </div>

      <KillBar log={state.log} asOfMs={asOfMs} />

      {toast ? (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-[var(--cb-radius-pill)] bg-[var(--cb-ink)] px-4 py-2 text-sm font-medium text-white shadow-[var(--cb-shadow)]"
        >
          {toast}
        </div>
      ) : null}
    </div>
  );
}
