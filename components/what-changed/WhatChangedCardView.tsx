"use client";

import {
  cardToJson,
  cardToMarkdown,
  copyText,
  downloadText,
} from "@/lib/what-changed/export";
import type { WhatChangedCard } from "@/lib/what-changed/types";
import {
  CardSection,
  cardClass,
  fmt,
  quietBtn,
  secondaryBtn,
  verdictClass,
  verdictLabel,
} from "@/components/what-changed/WhatChangedShared";

export function WhatChangedCardView({
  card,
  setStatus,
}: {
  card: WhatChangedCard;
  setStatus: (s: string) => void;
}) {
  async function onCopyThread() {
    const ok = await copyText(cardToMarkdown(card));
    setStatus(ok ? "Copied for thread." : "Copy failed — try download.");
  }

  async function onCopyJson() {
    const ok = await copyText(cardToJson(card));
    setStatus(ok ? "Copied JSON." : "Copy failed — try download.");
  }

  const label = verdictLabel(card.decision.verdict);

  return (
    <section className={`mb-6 space-y-5 p-3 sm:mb-8 sm:p-5 ${cardClass}`}>
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight text-[var(--cb-ink)]">
            {card.service}
          </h2>
          <p className="break-words text-sm text-[var(--cb-ink-muted)]">
            {card.windowLabel} · {fmt(card.from)} → {fmt(card.to)}
          </p>
          <p className="text-sm text-[var(--cb-ink-muted)]">
            Generated {fmt(card.generatedAt)} · {card.eventCount} events
          </p>
        </div>
        <div
          className={`shrink-0 self-start rounded-[var(--cb-radius-pill)] border px-3 py-1.5 text-sm font-semibold ${verdictClass(card.decision.verdict)}`}
        >
          {label}
        </div>
      </div>

      <div
        className={`min-w-0 break-words rounded-[var(--cb-radius-card-sm)] border px-3 py-3 text-sm sm:px-4 ${verdictClass(card.decision.verdict)}`}
      >
        <p className="font-medium">Decision</p>
        <p className="mt-1 opacity-90">{card.decision.summary}</p>
        {card.decision.checks.length > 0 && (
          <ul className="mt-2 list-disc space-y-1 pl-5 opacity-90">
            {card.decision.checks.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        )}
      </div>

      <CardSection title="Deploys" empty={!card.deploys.length}>
        <ul className="space-y-2 text-sm">
          {card.deploys.map((d, i) => (
            <li
              key={`${d.ts}-${i}`}
              className="min-w-0 break-words rounded-[var(--cb-radius-card-sm)] border border-[var(--cb-line)] bg-[color-mix(in_srgb,var(--cb-bg)_55%,white)] px-3 py-2"
            >
              <span className="font-mono text-[var(--cb-olive-deep)]">
                {d.version || "?"}
              </span>{" "}
              <span className="text-[var(--cb-ink-muted)]">
                {d.sha ? `(${d.sha})` : ""}
              </span>
              <span className="text-[var(--cb-ink-muted)]">
                {" "}
                · {d.env || "?"} · {d.by || "?"} · {fmt(d.ts)}
              </span>
            </li>
          ))}
        </ul>
      </CardSection>

      <CardSection title="Settings" empty={!card.config.length}>
        <ul className="space-y-2 text-sm">
          {card.config.map((c, i) => (
            <li
              key={`${c.key}-${i}`}
              className="min-w-0 break-words rounded-[var(--cb-radius-card-sm)] border border-[var(--cb-line)] bg-[color-mix(in_srgb,var(--cb-bg)_55%,white)] px-3 py-2 font-mono text-sm sm:text-sm"
            >
              <span className="text-[var(--cb-olive)]">{c.key}</span>
              <span className="text-[var(--cb-ink-muted)]">
                {" "}
                : {c.oldValue ?? "?"} → {c.newValue ?? "?"}
              </span>
              <span className="block text-[var(--cb-ink-muted)] sm:inline sm:before:content-['·_']">
                {fmt(c.ts)}
              </span>
            </li>
          ))}
        </ul>
      </CardSection>

      <CardSection title="Feature flags" empty={!card.flags.length}>
        <ul className="space-y-2 text-sm">
          {card.flags.map((f, i) => (
            <li
              key={`${f.flag}-${i}`}
              className="min-w-0 break-words rounded-[var(--cb-radius-card-sm)] border border-[var(--cb-line)] bg-[color-mix(in_srgb,var(--cb-bg)_55%,white)] px-3 py-2"
            >
              <span className="font-mono text-[color-mix(in_srgb,var(--cb-danger)_45%,var(--ink))]">
                {f.flag}
              </span>
              <span className="text-[var(--cb-ink-muted)]">
                {" "}
                : {f.fromState ?? "?"} → {f.toState ?? "?"} · {fmt(f.ts)}
              </span>
            </li>
          ))}
        </ul>
      </CardSection>

      <CardSection title="Upstreams" empty={!card.upstreams.length}>
        <ul className="space-y-2 text-sm">
          {card.upstreams.map((u, i) => (
            <li
              key={`${u.dependency}-${i}`}
              className="min-w-0 break-words rounded-[var(--cb-radius-card-sm)] border border-[var(--cb-line)] bg-[color-mix(in_srgb,var(--cb-bg)_55%,white)] px-3 py-2"
            >
              <span className="font-mono text-[var(--cb-olive-deep)]">
                {u.dependency}
              </span>
              <span className="text-[var(--cb-ink-muted)]">
                {" "}
                : {u.status || "?"}
                {u.depVersion ? ` (${u.depVersion})` : ""}
                {u.note ? ` — ${u.note}` : ""} · {fmt(u.ts)}
              </span>
            </li>
          ))}
        </ul>
      </CardSection>

      <div className="flex min-w-0 flex-col gap-2 border-t border-[var(--cb-line)] pt-4 sm:flex-row sm:flex-wrap">
        <button type="button" onClick={onCopyThread} className={secondaryBtn}>
          Copy for thread
        </button>
        <button type="button" onClick={onCopyJson} className={secondaryBtn}>
          Copy
        </button>
        <button
          type="button"
          onClick={() =>
            downloadText(
              `what-changed-${card.service}.md`,
              cardToMarkdown(card),
              "text/markdown",
            )
          }
          className={quietBtn}
        >
          Download
        </button>
        <button
          type="button"
          onClick={() =>
            downloadText(
              `what-changed-${card.service}.json`,
              cardToJson(card),
              "application/json",
            )
          }
          className={quietBtn}
        >
          Download data
        </button>
      </div>
    </section>
  );
}
