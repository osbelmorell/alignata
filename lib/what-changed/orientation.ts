/** Product orientation copy — verbatim from build-app-orientation-2026-09-18.md. Do not invent. */
export type OrientationCopy = {
  pitch: string;
  what: string;
  why: string;
  how: string[];
};

export const ORIENTATION: OrientationCopy = {
  pitch: `Shareable incident / what-changed card for a service: deploys, config, flags, upstreams, plus a go / no-go / verify decision. Export Markdown or JSON; history stays in localStorage.`,
  what: `During an incident, “what changed?” is scattered across deploys, env, flags, and upstream status. Nobody wants to assemble that from scratch under pressure.`,
  why: `One card you can paste into a thread: what moved, in what window, and the current go / no-go / verify call.`,
  how: [
    `Pick an input mode: Sample / events, Before → after config, or Change-type checklist.`,
    `Set Service (e.g. api) and Time window (1h / 6h / 24h / 7d / custom).`,
    `For sample or checklist: tick change types in play (Deploys / Config / Flags / Upstreams). Checklist mode also takes short notes per type.`,
    `For config mode: paste Before and After .env or JSON into the two textareas.`,
    `Click Generate card — read Deploys / Config / Flags / Upstreams + the decision badge.`,
    `Copy Markdown or Copy JSON (or download). Recent cards save locally; click one to restore.`,
  ],
};
