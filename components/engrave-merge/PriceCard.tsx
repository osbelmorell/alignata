"use client";

import { useEffect, useRef } from "react";
import { COPY } from "@/lib/engrave-merge/copy";

export type PriceCardMode = "card" | "thanks" | null;

const softPill =
  "inline-flex min-h-[44px] min-w-[72px] items-center justify-center rounded-[var(--cb-radius-pill)] bg-[#ECE7DE] px-5 text-base font-semibold text-[#111110] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:outline-[var(--cb-ink)]";
const textBtn =
  "inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-base font-medium text-[var(--cb-ink)] underline underline-offset-4";

/**
 * The inline "I'd pay" card (UX-PRICE-CARD.md): in document flow below the results, after the merge file is made. Never
 * a modal, never black (the page's one black pill stays Make merge file). "I'd pay $29" is a SOFT pill and "No thanks"
 * a text button, both ≥ 44px. onSeen fires once when at least half the card is on screen (price_card_view).
 */
export function PriceCard({
  mode,
  onSeen,
  onAnswer,
}: {
  mode: PriceCardMode;
  onSeen: () => void;
  onAnswer: (a: "pay" | "no") => void;
}) {
  const cardRef = useRef<HTMLElement>(null);
  const thanksRef = useRef<HTMLParagraphElement>(null);
  const seen = useRef<() => void>(onSeen);
  useEffect(() => {
    seen.current = onSeen;
  }, [onSeen]);

  useEffect(() => {
    if (mode !== "card" || !cardRef.current) return;
    if (typeof IntersectionObserver === "undefined") {
      seen.current();
      return;
    }
    const io = new IntersectionObserver(
      (es) => {
        if (es.some((e) => e.isIntersecting)) {
          io.disconnect();
          seen.current();
        }
      },
      { threshold: 0.5 },
    );
    io.observe(cardRef.current);
    return () => io.disconnect();
  }, [mode]);

  useEffect(() => {
    if (mode === "thanks") thanksRef.current?.focus({ preventScroll: true });
  }, [mode]);

  if (mode === "thanks") {
    return (
      <section data-price-thanks className="mt-4 rounded-[var(--cb-radius-card-sm)] border border-[var(--cb-line)] bg-[var(--cb-surface)] px-5 py-4">
        <p ref={thanksRef} tabIndex={-1} className="text-base leading-6 outline-none">
          {COPY.priceThanks}
        </p>
      </section>
    );
  }
  if (mode !== "card") return null;
  const [before, after] = COPY.priceLine.split("$29");
  return (
    <section
      ref={cardRef}
      data-price-card
      aria-labelledby="em-price-line"
      className="mt-4 rounded-[var(--cb-radius-card-sm)] border border-[var(--cb-line)] bg-[var(--cb-surface)] px-5 py-4"
    >
      <p id="em-price-line" className="text-base leading-6">
        {before}
        <span className="whitespace-nowrap">$29</span>
        {after}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
        <button type="button" data-price-yes className={softPill} onClick={() => onAnswer("pay")}>
          {COPY.priceYes}
        </button>
        <button type="button" data-price-no className={textBtn} onClick={() => onAnswer("no")}>
          {COPY.priceNo}
        </button>
      </div>
    </section>
  );
}
