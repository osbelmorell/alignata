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
  /** Problem list table + "Download problem list" button: whenever the problem list has rows. */
  showProblems: boolean;
}

/**
 * What the summary shows. `includeFlagged` = "Put items that need a look in the merge file anyway".
 * Units are items (one per merge row), so the warning's n matches the "How many" column.
 */
export function summaryView(ok: Pick<ProcessOk, "stats" | "problems">, includeFlagged: boolean): SummaryView {
  const s = ok.stats;
  const dupLines = ok.problems.filter((p) => p.dup).length;
  const duplicatesOnly = ok.problems.length > 0 && dupLines === ok.problems.length;
  const hasProblems = s.exception_count > 0;
  const n = s.flagged_in_merge_items;
  const countLine = includeFlagged
    ? COPY.summaryCountsIncluded(s.ready_items, n)
    : COPY.summaryCounts(s.ready_items, s.held_items);
  const warning = includeFlagged && n > 0 ? COPY.summaryIncludedWarning(n) : null;
  let note: string | null = null;
  if (!hasProblems && ok.problems.length === 0) note = COPY.summaryAllReady;
  else if (duplicatesOnly) note = COPY.summaryDuplicatesOnly(dupLines);
  else if (!warning) note = COPY.summaryHeldNote;
  return { countLine, note, warning, showProblems: hasProblems || ok.problems.length > 0 };
}
