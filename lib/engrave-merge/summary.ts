import { COPY } from "./copy";
import type { ProblemItem, ProcessOk } from "./types";

/** On-screen "How many" cell for one problem-list row (the problem-list file keeps the raw Quantity). */
export function howManyLabel(p: ProblemItem): string {
  if (p.dup) return COPY.howManyDuplicate;
  if (p.badQty) return COPY.howManyBadQty(p.qty);
  return p.qty;
}

export interface SummaryView {
  countLine: string;
  /** Line under the count: held note, "Everything is ready." (zero problems only) or null. */
  note: string | null;
  /** "Include anyway" ON and items with problems are in the merge file. */
  warning: string | null;
  /** On-screen problem table: whenever it has rows for the current pick. */
  showProblems: boolean;
  /** "Download problem list": whenever the WHOLE file has problems, regardless of pick (download is unfiltered). */
  showDownload: boolean;
  /** "Show all items" (resets the picker): a clean pick while the rest of the file has problems. */
  showAllButton: boolean;
  /** "Include shipped orders": nothing to engrave and the shipped-orders setting hid rows. */
  showIncludeShipped: boolean;
  /**
   * Both-zero: 0 ready rows AND 0 problem rows in the file (only when the shipped filter hides
   * everything). The page then hides the picker, Make merge file, Print cut sheet and
   * "Everything is ready.", and shows only the count line + shipped line + button.
   */
  bothZero: boolean;
  /**
   * On-screen table rows: the rows for the "Which items" pick (all rows for "All items").
   * A row belongs to a pick by its Listing ID (duplicates included); rows with a blank
   * Listing ID only show under "All items". The downloaded problem list is never filtered.
   */
  problems: ProblemItem[];
}

/**
 * What the summary shows. `includeFlagged` = "Put items that need a look in the merge file anyway".
 * Units are items (one per merge row), so the warning's n matches the "How many" column.
 */
export function summaryView(ok: Pick<ProcessOk, "stats" | "problems">, includeFlagged: boolean): SummaryView {
  const s = ok.stats;
  const shown = ok.problems.filter((p) => p.inScope);
  const dupLines = shown.filter((p) => p.dup).length;
  const duplicatesOnly = shown.length > 0 && dupLines === shown.length;
  const hasProblems = shown.length > 0;
  const n = s.flagged_in_merge_items;
  // Count line: left = items in the merge file, right = what the table shows for this pick
  // (duplicates only → the duplicate count). Any part that would read 0 is left out: no 0 anywhere.
  const left = includeFlagged ? COPY.countInFile : COPY.countReady;
  const rightN = !hasProblems ? 0 : duplicatesOnly ? dupLines : includeFlagged ? n : s.held_items;
  const right = duplicatesOnly ? COPY.countDupLeftOut : includeFlagged ? COPY.countWithProblems : COPY.countNeedLook;
  const parts = [s.ready_items > 0 ? left(s.ready_items) : null, rightN > 0 ? right(rightN) : null].filter(
    (x): x is string => x !== null,
  );
  const bothZero = s.ready_items === 0 && ok.problems.length === 0 && s.exception_count === 0;
  const nothing = bothZero || parts.length === 0;
  const countLine = nothing ? COPY.countNothing : parts.join(" · ");
  const warning = includeFlagged && n > 0 ? COPY.summaryIncludedWarning(n) : null;
  const others = ok.problems.filter((p) => !p.inScope);
  const otherItems = others.reduce((sum, p) => sum + p.counted, 0); // items, like "need a look" (duplicates count 0)
  const otherDupLines = others.filter((p) => p.dup).length;
  const fileHasProblems = ok.problems.length > 0 || s.exception_count > 0;
  const cleanPick = fileHasProblems && !hasProblems;
  let note: string | null = null;
  if (!fileHasProblems) note = COPY.summaryAllReady; // the whole file has zero problems
  else if (cleanPick)
    // this pick is clean; other items need a look (or, if the rest are only duplicates, say that)
    note = otherItems > 0 ? COPY.summaryPickReadyOthers(otherItems) : COPY.summaryDuplicatesOnly(otherDupLines);
  else if (duplicatesOnly) note = COPY.summaryDuplicatesOnly(dupLines);
  else if (!warning) note = COPY.summaryHeldNote;
  // Nothing to engrave: never "Everything is ready."; if the shipped-orders setting hid rows, say so.
  if (nothing) note = s.hidden_shipped > 0 ? COPY.countShippedHidden : note === COPY.summaryAllReady ? null : note;
  return {
    countLine,
    note,
    warning,
    showProblems: hasProblems,
    showDownload: fileHasProblems && !bothZero,
    showAllButton: cleanPick && !nothing,
    showIncludeShipped: bothZero && s.hidden_shipped > 0,
    bothZero,
    problems: shown,
  };
}
