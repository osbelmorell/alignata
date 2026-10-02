/** Product orientation copy — verbatim from build-app-orientation-2026-09-18.md. Do not invent. */
export type OrientationCopy = {
  pitch: string;
  what: string;
  why: string;
  how: string[];
};

export const ORIENTATION: OrientationCopy = {
  pitch: `Paste a Vercel Hobby usage CSV (or type manual counts) → see which project ate the window, plus a weekly one-liner ready for Slack.`,
  what: `Hobby quotas get chewed by whichever project is redeploying the most. The usage CSV doesn’t shout the top burner at you.`,
  why: `Know which repo burned the window this week, with a one-liner you can drop in chat without rebuilding a spreadsheet.`,
  how: [
    `Open the app (sample projects load on first visit) or paste CSV into the box.`,
    `Tap Show which projects used the quota, or Upload file. Flexible headers: project/name, builds/deploys/count, optional gb_hours.`,
    `Or add a Manual row: Project name + Deploys + optional GB-hours → Add / update.`,
    `Read the digest table (sorted by burn; top burner highlighted) and the Weekly one-liner banner.`,
    `Copy one-liner, Copy markdown, or Export JSON. Save digest keeps it in Recent digests.`,
    `Click a recent digest to restore those rows; Clear resets localStorage.`,
  ],
};
