/** Product orientation copy — verbatim from build-app-orientation-2026-09-18.md. Do not invent. */
export type OrientationCopy = {
  pitch: string;
  what: string;
  why: string;
  how: string[];
};

export const ORIENTATION: OrientationCopy = {
  pitch: `Investment Desk dogfood: opportunity in → Approve / Size / Pass out. One card, a checklist, and an append-only log in this browser.`,
  what: `Deploy decisions used to live in flags and memory. There’s no single place to write ticker + thesis, size vs deployable, and record what you actually decided.`,
  why: `Get ≥3 real Osbel decisions in 14 days (examples don’t count). Markets paste this URL + a copied summary into flags.`,
  how: [
    `Enter ticker / name and a short thesis.`,
    `Paste Deployable $ and a Suggested % of deployable — implied size computes automatically.`,
    `Toggle the checklist (defaults: thesis clear / invalidation known / size vs floor). Labels are editable; add or remove items if needed.`,
    `Hit Approve, Size, or Pass — row appends to the decision log (time ET, ticker, state, thesis snippet, %).`,
    `Use Copy card summary or Copy shareable text for Markets (includes the page URL).`,
    `Reset example data restores the two seeded EXAMPLE rows and clears the working card. Example rows do not count toward the kill bar.`,
  ],
};
