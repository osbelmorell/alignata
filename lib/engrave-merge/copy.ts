/**
 * ALL on-screen words for /engrave-merge live here so Product Copy can edit them in one place.
 * Everything is PLACEHOLDER copy ([COPY] in SPEC §3) until Product Copy signs off.
 * Rule: no jargon on the face — say "file", "problem list", "settings file".
 */
export const COPY = {
  title: "Engrave Merge",
  intro: "Turn your Etsy orders file into a LightBurn merge file and a cut sheet.",
  privacy: "Your file stays on this device.",
  dogfoodNote: "Test mode: your runs are not counted.",

  dropTitle: 'Drop your Etsy "Order Items" file',
  dropSub: "or tap to choose it",
  dropChosen: (fileName: string, items: number) =>
    `${fileName} · ${items} ${items === 1 ? "item" : "items"}. Tap to choose another.`,
  whereLink: "Where do I find this file?",
  whereBody:
    'In Etsy, go to Shop Manager → Settings → Options → Download Data. Pick "Order Items", choose the month, and tap Download CSV. The file is named like EtsySoldOrderItems2026-9.csv.',

  primary: "Make merge file",

  statusIdle: "Choose your file to start.",
  statusReading: "Reading your file…",
  statusReady: 'File loaded. Tap "Make merge file" to get your LightBurn file.',
  statusDownloaded: (n: number) => `Merge file downloaded with ${n} ${n === 1 ? "item" : "items"}.`,
  statusWrongSoldOrders:
    'This is Etsy\'s "Orders" file. On the same Download Data page, pick "Order Items" instead.',
  statusWrongOther: (missing: string[]) => `This isn't Etsy's "Order Items" file. It's missing: ${missing.join(", ")}`,
  statusEmpty: "That file is empty.",
  statusUnreadable: "Couldn't open that file. Please try again.",
  garbled: "Some letters look garbled. Download the file again from Etsy and don't open it in Excel first.",

  /** The ONLY count on screen. ready + held = total items to make (one per merge row). */
  summaryCounts: (ready: number, held: number) => `${ready} ready for LightBurn · ${held} need a look`,
  summaryHeldNote: "Items that need a look are left out of the merge file. The problem list says why.",
  summaryAllReady: "Everything is ready.",
  /** One listing picked, it has 0 problems, but other lines in the file do. n = other problem lines. */
  summaryPickReadyOthers: (n: number) =>
    n === 1
      ? "This item is ready. 1 other line in your file has a problem. Pick All items to see them."
      : `This item is ready. ${n} other lines in your file have problems. Pick All items to see them.`,
  /** The ONLY problems are duplicates (either include-anyway mode). n = duplicate lines. */
  summaryDuplicatesOnly: (n: number) =>
    n === 1
      ? "1 duplicate line was left out. The problem list shows it."
      : `${n} duplicate lines were left out. The problem list shows it.`,
  /** Duplicate-only (no real problems, d ≥ 1 duplicate lines): count lines for include-anyway OFF / ON. */
  summaryCountsDupOnly: (ready: number, d: number) =>
    `${ready} ready for LightBurn · ${d === 1 ? "1 duplicate left out" : `${d} duplicates left out`}`,
  summaryCountsDupOnlyIncluded: (inFile: number, d: number) =>
    `${inFile} in your merge file · ${d === 1 ? "1 duplicate left out" : `${d} duplicates left out`}`,
  /** "Put items that need a look in the merge file anyway" ON: count line. n = items with problems (same unit). */
  summaryCountsIncluded: (inFile: number, n: number) => `${inFile} in your merge file · ${n} with problems`,
  /** "Include anyway" ON and some items in the file have problems. n = items. */
  summaryIncludedWarning: (n: number) =>
    n === 1
      ? "1 of these has a problem. Check the problem list before you engrave."
      : `${n} of these have problems. Check the problem list before you engrave.`,

  problemListTitle: "Problem list",
  problemColItem: "Item",
  problemColHowMany: "How many",
  problemColProblem: "Problem",
  howManyDuplicate: "Duplicate, left out",
  howManyBadQty: (raw: string) => `${raw === "" ? "Blank" : raw}, counted as 1`,
  problemOrder: (order: string, name: string) => (name ? `Order ${order} · ${name}` : `Order ${order}`),
  downloadProblems: "Download problem list",
  printCutsheet: "Print cut sheet",
  cutsheetTitle: "Cut sheet",

  whichItems: "Which items",
  whichAll: "All items",
  whichOne: (name: string, lid: string) => `${name} (${lid})`,

  settings: "Settings",
  includeShipped: "Include orders already shipped",
  charLimit: "Most letters per line (0 = no limit)",
  splitLines: "Split text into lines",
  lineColumns: "Number of line columns (1–10)",
  stripNumbers: 'Remove "1. 2. 3." numbering',
  includeFlagged: "Put items that need a look in the merge file anyway",
  fontCheck: "Check letters against my font (optional)",
  fontLoaded: (name: string, missing: number) =>
    missing === 0 ? `${name}: no missing letters.` : `${name}: ${missing} missing ${missing === 1 ? "letter" : "letters"}.`,
  fontError: "Couldn't read that font file.",
  fontClear: "Remove font",

  itemSettings: "Item settings",
  itemSettingsEmpty: "Load a file to set up each item.",
  labelKind: (label: string) => `What is "${label}"?`,
  kindOption: "Option",
  kindText: "Engraving text",
  kindAlwaysText: "Engraving text (always)",
  optionSlot: (n: number) => `Option ${n}`,
  optionAuto: "Automatic",
  needsText: "This item always needs text",
  itemLimit: "Letter limit for this item (blank = main setting)",

  saveSettings: "Save settings file",
  loadSettings: "Load settings file",
  settingsLoaded: "Settings file loaded.",
  settingsBad: "That isn't an Engrave Merge settings file.",
  settingsTooBig: "That settings file is too big.",

  guide: "How to use this in LightBurn",
  guideSteps: [
    "In LightBurn, add a text box and type %11 (whole text) or %12, %13 … (one line each).",
    "Set the text box's mode to Merge/CSV in the text toolbar.",
    "Open Window → Variable Text (it opens as a tab behind Cuts / Layers), click Browse and pick your Engrave Merge file.",
    "Set Start = 1 (row 0 is the header), End = the last Merge row number on your cut sheet, then press Reset.",
    "One item per run: Advance By = 1 and turn on Auto-Advance. Each Start moves to the next item.",
    "Several items per bed: lay them out with Grid Array with Auto-Increment Variable Text on (offsets 0, 1, 2, …), and set Advance By to how many fit (e.g. 4).",
    "Press Test or use Preview to check names before burning. Set Max Width in the Shape Properties window so long names shrink to fit.",
    'Tick items off on the printed cut sheet. The "Merge row" number matches LightBurn\'s Current value.',
  ],
  cheatSheet: "%11 whole text · %12 line 1 · %13 line 2 · … · %2 first name · %7 option 1",

  proButton: "I'd pay for unlimited batches",
  proThanks: "Thanks, noted. No sign-up needed.",
  sample: "Try it with a sample file",
} as const;
