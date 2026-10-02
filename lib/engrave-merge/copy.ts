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

  summaryHeldNote: "Items that need a look are left out of the merge file. The problem list says why.",
  summaryAllReady: "Everything is ready.",
  /** One listing picked, it has 0 problems, but other items in the file need a look. n = items (same counting as "need a look"). */
  summaryPickReadyOthers: (n: number) =>
    n === 1
      ? "Everything you picked is ready. 1 other item in your file needs a look."
      : `Everything you picked is ready. ${n} other items in your file need a look.`,
  /**
   * 0 ready rows for the current pick while problems remain (Make merge file, its hint and Print cut sheet are hidden).
   * Count line (in its usual spot) + the line under it, pointing to the problem list. n = items, as in "need a look".
   */
  countNoReady: (n: number) => (n === 1 ? "1 item needs a look" : `${n} items need a look`),
  noReadyNote: "Nothing is ready to engrave yet. The problem list says why.",
  showAllItems: "Show all items",
  /** The ONLY problems are duplicates (either include-anyway mode). n = duplicate lines. */
  summaryDuplicatesOnly: (n: number) =>
    n === 1
      ? "1 duplicate line was left out. The problem list shows it."
      : `${n} duplicate lines were left out. The problem list shows it.`,
  /**
   * The ONLY count on screen, built from parts joined with " · " (ready + held = total items to make, one per merge row).    * A part whose number is 0 is left out (no 0 anywhere).
   */
  countReady: (n: number) => `${n} ready for LightBurn`,
  countInFile: (n: number) => `${n} in your merge file`,
  countNeedLook: (n: number) => (n === 1 ? "1 needs a look" : `${n} need a look`),
  countWithProblems: (n: number) => (n === 1 ? "1 with a problem" : `${n} with problems`),
  countDupLeftOut: (d: number) => (d === 1 ? "1 duplicate left out" : `${d} duplicates left out`),
  /** Both parts would be 0. */
  countNothing: "Nothing to engrave in this file.",
  /** A listing pick whose orders are all shipped (hidden), while the file has other items. */
  countNothingListing: "Nothing to engrave in this listing.",
  /** That screen only (the clean-pick screen keeps summaryPickReadyOthers). n = items, as in "need a look". */
  shippedPickOthers: (n: number) => (n === 1 ? "1 other item needs a look." : `${n} other items need a look.`),
  /** Second line under countNothing when the shipped-orders setting hid rows (stats.hidden_shipped > 0). */
  countShippedHidden: "Orders already shipped are hidden.",
  /** Outlined 44px button under that line: turns on "Include orders already shipped". */
  includeShippedButton: "Include shipped orders",
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
  /**
   * Picker option label, capped to ONE line in the 358px select at 390 (WebKit wraps option text, Chromium clips it):
   * the whole "Title (listing ID)" if it fits PICKER_LABEL_PX and 40 characters, else the title cut at a word break
   * + "… (listing ID)", the whole label still within both.
   * The full title stays on the option/select title attribute and the option's aria-label.
   */
  whichOneShort: (name: string, lid: string) => shortListingLabel(name, lid),

  settings: "Settings",
  /** Settings row (collapsed), ≤ 35 characters. n = settings changed from the standard ones. */
  settingsRow: (n: number) => (n === 0 ? "Settings · Standard" : `Settings · ${n} changed`),
  /** aria-live, in a fixed 20px line under the count line for a moment after a settings change re-runs the file. */
  updated: "Updated",
  includeShipped: "Include orders already shipped",
  charLimit: "Most letters per line (0 = no limit)",
  splitLines: "Split text into lines",
  lineColumns: "Number of line columns (1–10)",
  stripNumbers: 'Remove "1. 2. 3." numbering',
  includeFlagged: "Put items that need a look in the merge file anyway",
  fontCheck: "Check my font (optional)",
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
  startOver: "Start over",
  startOverWarn: "This clears your file and all settings.",
  startOverYes: "Yes, start over",
  startOverCancel: "Cancel",
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

/**
 * One-line budget for a picker label, in px of 16px system-ui text. Measured in WebKit at 390: a label wraps
 * once its text passes ~305px (358px select minus 12px padding each side and the arrow). 300 keeps a small margin.
 */
export const PICKER_LABEL_PX = 300;
/** ...and at most 40 characters for the WHOLE label, "… (listing ID)" included (Product). */
export const PICKER_LABEL_CHARS = 40;
const fitsLabel = (t: string) => labelWidthPx(t) <= PICKER_LABEL_PX && [...t].length <= PICKER_LABEL_CHARS;
// Glyph widths (px, 16px system-ui in WebKit) for ASCII 32..126; anything else counts as 10 (CJK/emoji as 16).
const ASCII_PX = [4.38,4.55,6.27,9.45,8.63,13.09,12.8,3.68,4.83,4.83,6.67,10.95,3.47,6.4,3.47,6.23,8.63,8.63,8.63,8.63,8.63,8.63,8.63,8.63,8.63,8.63,3.47,3.47,10.95,10.95,10.95,7.17,15.28,10.32,9.17,9.91,11.22,8.09,7.81,10.98,11.36,4.26,5.71,9.28,7.53,14.37,11.97,12.06,8.96,12.06,9.57,8.5,8.38,10.99,9.94,14.95,9.44,8.84,9.13,4.83,6.06,4.83,10.95,6.64,4.29,8.14,9.41,7.39,9.42,8.37,5.01,9.42,9.05,3.88,3.88,7.95,3.88,13.78,9.05,9.38,9.41,9.42,5.56,6.79,5.42,9.05,7.66,11.56,7.34,7.74,7.23,4.83,3.83,4.83,10.95];
export function labelWidthPx(text: string): number {
  let w = 0;
  for (const ch of text) {
    const c = ch.codePointAt(0) ?? 0;
    w += c >= 32 && c < 127 ? ASCII_PX[c - 32] : ch === "\u2026" ? 11.73 : c >= 0x2e80 ? 16 : 10;
  }
  return w;
}
function shortListingLabel(name: string, lid: string): string {
  const t = name.trim().replace(/\s+/g, " ");
  const full = `${t} (${lid})`;
  if (fitsLabel(full)) return full;
  const suffix = `\u2026 (${lid})`;
  let cut = "";
  for (const word of t.split(" ")) {
    const next = cut ? `${cut} ${word}` : word;
    if (!fitsLabel(next + suffix)) break;
    cut = next;
  }
  if (!cut) for (const ch of t) { if (!fitsLabel(cut + ch + suffix)) break; cut += ch; } // one very long first word
  return `${cut.replace(/[\s,.;:\u2013-]+$/, "")}${suffix}`;
}
