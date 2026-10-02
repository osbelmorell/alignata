import { forwardRef } from "react";
import { COPY } from "@/lib/engrave-merge/copy";
import { type SummaryView, howManyLabel } from "@/lib/engrave-merge/summary";

const secondaryBtn =
  "inline-flex min-h-[44px] items-center justify-center rounded-[var(--cb-radius-pill)] border border-[var(--cb-ink)] bg-[var(--cb-surface)] px-4 text-base font-medium text-[var(--cb-ink)] hover:bg-[var(--cb-bg)]";
const fieldClass =
  "min-h-[44px] rounded-xl border border-[var(--cb-ink-muted)] bg-[var(--cb-surface)] px-3 text-base text-[var(--cb-ink)]";
const muted = "text-[var(--cb-ink-muted)]";

export interface SummaryPanelProps {
  view: SummaryView;
  listings: { lid: string; itemName: string }[];
  listing: string;
  onListing: (lid: string) => void;
  onProblems: () => void;
  onPrint: () => void;
}

/**
 * After a file is loaded. Order is fixed so nothing above the buttons depends on the
 * "Which items" pick: actions row → picker → count/note → problem table. That keeps
 * "Download problem list" and the picker in the same place for All items and any pick.
 */
export const SummaryPanel = forwardRef<HTMLElement, SummaryPanelProps>(function SummaryPanel(
  { view, listings, listing, onListing, onProblems, onPrint },
  ref,
) {
  return (
    <section ref={ref} aria-label="Summary" className="mt-6 scroll-mt-4 space-y-4">
      <div data-actions className="flex flex-wrap gap-2">
        {view.showDownload && (
          <button type="button" data-download-problems className={secondaryBtn} onClick={onProblems}>
            {COPY.downloadProblems}
          </button>
        )}
        <button type="button" className={secondaryBtn} onClick={onPrint}>
          {COPY.printCutsheet}
        </button>
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-base font-medium">{COPY.whichItems}</span>
        <select data-which-items className={fieldClass} value={listing} onChange={(e) => onListing(e.target.value)}>
          <option value="">{COPY.whichAll}</option>
          {listings.map((l) => (
            <option key={l.lid} value={l.lid}>
              {COPY.whichOne(l.itemName, l.lid)}
            </option>
          ))}
        </select>
      </label>
      <div className="space-y-2">
        <p className="text-base leading-6">
          <span data-count-line className="font-semibold">
            {view.countLine}
          </span>
          {view.warning && (
            <span data-warning-line className="block font-semibold text-[#8a1c1c]">
              {view.warning}
            </span>
          )}
          {view.note && (
            <span data-note-line className={`block ${muted}`}>
              {view.note}
            </span>
          )}
        </p>
        {view.showAllButton && (
          <button type="button" data-show-all className={secondaryBtn} onClick={() => onListing("")}>
            {COPY.showAllItems}
          </button>
        )}
      </div>
      {view.showProblems && (
        <div className="space-y-2">
          <h2 className="text-base font-semibold">{COPY.problemListTitle}</h2>
          <div className="overflow-x-auto rounded-xl border border-[var(--cb-line)] bg-[var(--cb-surface)]">
            <table data-problem-list className="w-full border-collapse text-left text-base leading-6">
              <thead>
                <tr className="border-b border-[var(--cb-line)]">
                  <th scope="col" className="px-3 py-2 font-semibold">{COPY.problemColItem}</th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold whitespace-nowrap">
                    {COPY.problemColHowMany}
                  </th>
                  <th scope="col" className="px-3 py-2 font-semibold">{COPY.problemColProblem}</th>
                </tr>
              </thead>
              <tbody>
                {view.problems.map((p, i) => (
                  <tr key={i} className="border-b border-[var(--cb-line)] align-top last:border-b-0">
                    <td className="px-3 py-2">
                      {p.item}
                      <span className={`block ${muted}`}>{COPY.problemOrder(p.order, p.fn)}</span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{howManyLabel(p)}</td>
                    <td className="px-3 py-2">{p.problems.join(" · ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
});
