/**
 * ALL on-screen words for /engrave-merge live here so Product Copy can edit them in one place.
 * Everything is PLACEHOLDER copy ([COPY] in SPEC §3) until Product Copy signs off.
 * Rule: no jargon on the face — say "file", "problem list", "settings file".
 */
export const COPY = {
  backLink: "All tools",
  title: "Engrave Merge",
  intro: "Turn your Etsy orders file into a LightBurn merge file and a cut sheet.",
  privacy: "Your file stays on this device.",
  dogfoodNote: "Test mode: your runs are not counted.",

  dropTitle: 'Drop your Etsy "Sold Order Items" file',
  dropSub: "or tap to choose it",
  dropChosen: (rows: number) => `File loaded (${rows} ${rows === 1 ? "row" : "rows"}). Tap to choose another.`,
  whereLink: "Where do I find this file?",
  whereBody:
    'In Etsy, go to Shop Manager → Settings → Options → Download Data. Pick "Order Items", choose the month, and tap Download CSV. The file is named like EtsySoldOrderItems2026-9.csv.',

  primary: "Make merge file",

  statusIdle: "Choose your file to start.",
  statusReading: "Reading your file…",
  statusReady: (items: number, orders: number) =>
    `Ready: ${items} ${items === 1 ? "item" : "items"} from ${orders} ${orders === 1 ? "order" : "orders"}`,
  statusDownloaded: (rows: number) => `Merge file downloaded: ${rows} ${rows === 1 ? "row" : "rows"}.`,
  statusWrongSoldOrders:
    'This looks like Etsy\'s "Sold Orders" file. Please download "Order Items" instead.',
  statusWrongOther: (missing: string[]) =>
    `This doesn't look like Etsy's "Sold Order Items" file. Missing: ${missing.join(", ")}.`,
  statusEmpty: "That file is empty.",
  statusUnreadable: "Couldn't open that file. Please try again.",
  garbled: "Some letters look garbled. Download the file again from Etsy and don't open it in Excel first.",

  summaryToMake: (n: number) => `${n} ${n === 1 ? "item" : "items"} to make`,
  summaryNeedLook: (n: number) => `${n} need a look`,
  summaryShipped: (n: number) => `${n} already shipped (hidden)`,
  summaryInFile: (n: number) => `${n} ${n === 1 ? "row" : "rows"} in your merge file`,

  downloadProblems: (n: number) => `Download problem list (${n})`,
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
    "Open Window → Variable Text, tap Browse and pick your Engrave Merge file.",
    "Set Start = 1 (row 0 is the header), End = the last Row number on your cut sheet, then press Reset.",
    "One item per run: Advance By = 1 and turn on Auto-Advance. Each Start moves to the next item.",
    "Several items per bed: lay them out with Grid Array with Offset auto-increment on (offsets 0, 1, 2, …), and set Advance By to how many fit (e.g. 4).",
    "Press Test or use Preview to check names before burning. Set Max Width so long names shrink to fit.",
    'Tick items off on the printed cut sheet. The "Merge row" number matches LightBurn\'s Current row.',
  ],
  cheatSheet: "%11 whole text · %12 line 1 · %13 line 2 · … · %2 first name · %7 option 1",

  proButton: "I'd pay for unlimited batches",
  proThanks: "Thanks, noted. No sign-up needed.",
  sample: "Try it with a sample file",
} as const;
