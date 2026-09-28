/** Product orientation copy — verbatim from build-app-orientation-2026-09-18.md. Do not invent. */
export type OrientationCopy = {
  pitch: string;
  what: string;
  why: string;
  how: string[];
};

export const ORIENTATION: OrientationCopy = {
  pitch: `Tag LLM spend by feature, roll it up daily, and flag any feature that eats ≥40% of total cost. Browser-only — no accounts.`,
  what: `Token bills show up as one blob. You can’t see which product feature is burning money until something’s already out of hand.`,
  why: `Spot concentration early (alert at ≥40% share). Note: brand.content_draft spend is CUT (board override) — don’t treat that feature as an active spend lane in planning.`,
  how: [
    `Open the app — or hit Load sample to see a week where research trips the ≥40% alert.`,
    `Ingest real data: Upload file (NDJSON / JSONL / CSV) or paste into the textarea and click Ingest paste.`,
    `Each event needs feature + costUsd (optional: ts, tokens, model). CSV needs a header row.`,
    `Read the header tiles (Events / Total cost / ≥40% alerts) and the Daily rollup by feature table (cost, share, events, days).`,
    `Amber rows / alert banner = that feature is ≥40% of spend — dig in or cut.`,
    `Clear wipes localStorage when you’re done with a test set.`,
  ],
};
