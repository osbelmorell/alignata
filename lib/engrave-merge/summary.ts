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
  /** Problem list table + "Download problem list" button: whenever the on-screen table has rows. */
  showProblems: boolean;
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
  // Never a "0" next to a table with rows: duplicate-only shows the duplicate count instead.
  const countLine = duplicatesOnly
    ? includeFlagged
      ? COPY.summaryCountsDupOnlyIncluded(s.ready_items, dupLines)
      : COPY.summaryCountsDupOnly(s.ready_items, dupLines)
    : includeFlagged
      ? COPY.summaryCountsIncluded(s.ready_items, n)
      : COPY.summaryCounts(s.ready_items, s.held_items);
  const warning = includeFlagged && n > 0 ? COPY.summaryIncludedWarning(n) : null;
  let note: string | null = null;
  if (!hasProblems) note = COPY.summaryAllReady; // this pick really has zero problems
  else if (duplicatesOnly) note = COPY.summaryDuplicatesOnly(dupLines);
  else if (!warning) note = COPY.summaryHeldNote;
  return { countLine, note, warning, showProblems: hasProblems, problems: shown };
}
