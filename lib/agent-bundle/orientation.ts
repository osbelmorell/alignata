/** Product orientation copy — verbatim from build-app-orientation-2026-09-18.md. Do not invent. */
export type OrientationCopy = {
  pitch: string;
  what: string;
  why: string;
  how: string[];
};

export const ORIENTATION: OrientationCopy = {
  pitch: `Register an agent bundle (name, prompt_ref, model_id, tools_note, env, marked_live) and diff history — auto last-two, or any selected pair. Dogfood across multi-desk. Not for brand.content_draft.`,
  what: `Prompt / model / tools / env change without a paper trail. You can’t tell what “live” actually means versus last week’s draft.`,
  why: `Tag what’s in the harness before you mark live, then see exactly which fields moved between two bundles. Data stays in this browser.`,
  how: [
    `Open Register Bundle. Fill required Name, Prompt ref, Model ID; optional Env, Tools note, and Marked live.`,
    `Click Save bundle — you’re switched to History / Diff.`,
    `History lists bundles newest-first (live/draft badge + env). Click a row to select up to two for a custom diff; otherwise it auto-diffs the latest two.`,
    `Read the Diff table (Field / Before / After); changed fields are highlighted.`,
    `Copy JSON on a bundle row, or Copy diff JSON for the pair.`,
    `Load sample seeds two demo bundles; Clear wipes localStorage history.`,
  ],
};
