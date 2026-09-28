/** Product orientation copy — verbatim from build-app-orientation-2026-09-18.md. Do not invent. */
export type OrientationCopy = {
  pitch: string;
  what: string;
  why: string;
  how: string[];
};

export const ORIENTATION: OrientationCopy = {
  pitch: `Sunday board 1:1 snapshot: three pillars (LinkedIn / Investment / Build), each with red·yellow·green and a last-outcome line. You’re looking at the shared week state — not a personal notepad.`,
  what: `Board needs one place to see whether each pillar is on track without hunting Slack or asking Osbel to paste a status.`,
  why: `Walk into the 1:1 with a single RYG view. Refresh = truth. Kill bar: used in 2 consecutive Sunday 1:1s.`,
  how: [
    `Open the live URL and refresh — page loads /scorecard.json (cache-busted).`,
    `Read the three pillars: status (red / yellow / green) + Last outcome + Updated timestamp.`,
    `Default UI is view-only — don’t expect to edit statuses on the page.`,
    `(Ops) To change the board: edit public/scorecard.json in the repo, commit + push main, then tell Osbel to refresh.`,
    `Emergency/dev only: append ?edit=1 for local override (localStorage). Banner reminds you that git JSON is still source of truth.`,
  ],
};
