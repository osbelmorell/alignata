/** Product orientation copy — verbatim from build-app-orientation-2026-09-18.md. Do not invent. */
export type OrientationCopy = {
  pitch: string;
  what: string;
  why: string;
  how: string[];
};

export const ORIENTATION: OrientationCopy = {
  pitch: `Base launcher for all Build apps — clean card grid with name, one-line purpose, status, and an Open link in a new tab. This is the front door, not another desk tool.`,
  what: `Live Build apps multiply on separate Vercel URLs. Without a hub, people bookmark the wrong one or miss that something shipped.`,
  why: `One place to find every live tool. Catalog is public/apps.json (no CMS). Hub already lists all apps including Agent Bundle Tag. Product note: hub card blurbs are short today — when you refresh copy, pull richer one-liners from the PITCH / WHAT blocks in this doc.`,
  how: [
    `Open the hub URL — live apps sort first, then alphabetically.`,
    `Use the search box to filter by name (also matches blurb / id).`,
    `Click Open ↗ on a card — tool opens in a new tab.`,
    `To add or retitle an app: edit public/apps.json (id, name, url, blurb, status), commit + push main, redeploy.`,
    `Prefer status: "live" for shipped tools (wip / planned also allowed).`,
    `No accounts, no CMS — JSON + redeploy is the whole update path.`,
  ],
};
