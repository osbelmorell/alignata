/** Product orientation copy — verbatim from build-app-orientation-2026-09-18.md. Do not invent. */
export type OrientationCopy = {
  pitch: string;
  what: string;
  why: string;
  how: string[];
};

export const ORIENTATION: OrientationCopy = {
  pitch: `Paste two env key lists (or full .env / JSON) → structured diff: missing, extra, changed, and secret-like. Values are redacted client-side for the shareable report.`,
  what: `Staging ↔ prod drift is usually discovered mid-incident. Diffing raw env blobs by eye is slow and leaks secrets into chat.`,
  why: `A shareable parity check: what’s missing/extra/changed, with secret-like keys flagged and values masked — no server logging.`,
  how: [
    `Set Before label / After label (e.g. staging / prod).`,
    `Paste into the two textareas: key-only lists, KEY=VALUE, or JSON. Or hit Load sample.`,
    `Click Diff snapshot.`,
    `Read the count pills (Missing / Extra / Changed / Secret-like / Unchanged) and the tables. Secret-like values show masked / length-only.`,
    `Copy one-liner, Copy Markdown, or Copy JSON (all redacted). Download .md / .json if you need a file.`,
    `Recent snapshots restore from localStorage; last paste pair reloads on revisit.`,
  ],
};
