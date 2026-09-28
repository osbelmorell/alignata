/** Product orientation copy — verbatim from build-app-orientation-2026-09-18.md. Do not invent. */
export type OrientationCopy = {
  pitch: string;
  what: string;
  why: string;
  how: string[];
};

export const ORIENTATION: OrientationCopy = {
  pitch: `One-pager ship checklist for an agent / unit across Component · Trajectory · Outcome · Adversarial. Score Pass / Fail / N/A → overall GO or NO-GO.`,
  what: `“Is this agent ready?” is fuzzy. Teams need a visible rule, not vibes, before marking something shippable.`,
  why: `GO only if every required item is Pass or N/A. NO-GO if any required item is Fail. Incomplete while anything required is still unset.`,
  how: [
    `Enter Agent / eval name and Eval date.`,
    `Score all four sections — each item: Pass / Fail / N/A + optional Notes. Required vs optional is labeled on each row.`,
    `Watch the big badge: INCOMPLETE → GO (PASS) or NO-GO (FAIL) as you fill required items.`,
    `Use Load sample PASS or Load sample FAIL to see a finished demo.`,
    `Save to recent, then Copy JSON / Copy Markdown (or download) for the thread.`,
    `Open a row under Recent evals to restore; Clear resets the working form.`,
  ],
};
