export type OrientationCopy = {
  pitch: string;
  what: string;
  why: string;
  how: string[];
};

/** Hub-level orientation — used by AboutPanel on /apps. */
export const HUB_ORIENTATION: OrientationCopy = {
  pitch:
    "One launcher for every Build app. Tap a card to open the tool; use Apps in the nav to return."
  ,
  what: "Build tools used to live on separate deploys. The hub is the single door."
  ,
  why: "Find the tool in one place. Auth stays off. Clay Board house style."
  ,
  how: [
    "Open /apps — live tools sort first.",
    "Search by name if the grid is long.",
    "Tap the card or Open to launch.",
    "Use Home / Apps / Blog in the top nav anytime.",
  ],
};
