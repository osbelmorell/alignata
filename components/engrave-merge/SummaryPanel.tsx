import { forwardRef } from "react";
import { COPY } from "@/lib/engrave-merge/copy";
import { type SummaryView, howManyLabel } from "@/lib/engrave-merge/summary";

const secondaryBtn =
  "inline-flex min-h-[44px] items-center justify-center rounded-xl border border-[var(--cb-ink)] bg-[var(--cb-surface)] px-4 text-base font-medium text-[var(--cb-ink)] hover:bg-[var(--cb-bg)]";
const fieldClass =
  "min-h-[44px] rounded-xl border border-[var(--cb-ink-muted)] bg-[var(--cb-surface)] px-3 text-base text-[var(--cb-ink)]";
const muted = "text-[var(--cb-ink-muted)]";

export interface SummaryPanelProps {
  view: SummaryView;
  /** "Updated" in the fixed 20px line under the count line after a settings change re-ran the file. */
  updated?: boolean;
  listings: { lid: string; itemName: string }[];
  listing: string;
  onListing: (lid: string) => void;
  onProblems: () => void;
  onPrint: () => void;
  /** Turns on "Include orders already shipped" (same as the Settings toggle; no event). */
  onIncludeShipped?: () => void;
}

/**
 * After a file is loaded: picker → count line (one line, fixed height) → "Updated" line (fixed 20px,
 * always reserved) → Download problem list / Print cut sheet → warning / note / Show all items →
 * problem table. Everything above the buttons has a fixed height, so they keep the same position
 * for All items, any pick, and while "Updated" shows.
 */
export const SummaryPanel = forwardRef<HTMLElement, SummaryPanelProps>(function SummaryPanel(
  { view, updated = false, listings, listing, onListing, onProblems, onPrint, onIncludeShipped = () => {} },
  ref,
) {
  const picked = listings.find((l) => l.lid === listing);
  // full title of the current pick (option text is capped to one line)
  const selectedTitle = picked ? COPY.whichOne(picked.itemName, picked.lid) : COPY.whichAll;
  return (
    <section ref={ref} aria-label="Summary" className="mt-6 scroll-mt-4 space-y-3">
      {!view.bothZero && (
      <label className="flex min-w-0 flex-col gap-1">
        <span className="text-base font-medium">{COPY.whichItems}</span>
        <select
          data-which-items
          className={`${fieldClass} w-full min-w-0 whitespace-normal`}
          value={listing}
          title={selectedTitle}
          onChange={(e) => onListing(e.target.value)}
        >
          <option value="">{COPY.whichAll}</option>
          {listings.map((l) => (
            <option key={l.lid} value={l.lid} title={COPY.whichOne(l.itemName, l.lid)} aria-label={COPY.whichOne(l.itemName, l.lid)}>
              {COPY.whichOneShort(l.itemName, l.lid)}
            </option>
          ))}
        </select>
      </label>
      )}
      <div>
        {view.bothZero ? (
          // Both-zero: no count line (never "0 ready"); this block sits in its spot.
          <div data-both-zero role="status" className="space-y-2">
            <p className="text-base font-semibold leading-6">{view.countLine}</p>
            {view.note && (
              <p data-note-line className={`text-base leading-6 ${muted}`}>
                {view.note}
              </p>
            )}
            {view.showIncludeShipped && (
              <button
                type="button"
                data-include-shipped
                className={secondaryBtn}
                onClick={(e) => {
                  const section = e?.currentTarget?.closest("section");
                  onIncludeShipped();
                  // the count line comes back after the re-run; then focus moves to it
                  setTimeout(() => section?.querySelector<HTMLElement>("[data-count-line]")?.focus(), 0);
                }}
              >
                {COPY.includeShippedButton}
              </button>
            )}
          </div>
        ) : (
          <p
            data-count-line
            tabIndex={-1}
            className="h-6 truncate whitespace-nowrap text-base font-semibold leading-6 outline-none focus-visible:ring-2 focus-visible:ring-[var(--cb-ink)]"
          >
            {view.countLine}
          </p>
        )}
        <p data-updated aria-live="polite" className={`h-5 text-base leading-5 ${muted}`}>
          {updated ? COPY.updated : ""}
        </p>
      </div>
      {!view.bothZero && (
      <div data-actions className="flex flex-wrap gap-2">
        {view.showDownload && (
          <button type="button" data-download-problems className={secondaryBtn} onClick={onProblems}>
            {COPY.downloadProblems}
          </button>
        )}
        {!view.noReady && (
          <button type="button" className={secondaryBtn} onClick={onPrint}>
            {COPY.printCutsheet}
          </button>
        )}
      </div>
      )}
      {!view.bothZero && (view.warning || view.note || view.showAllButton) && (
        <div className="space-y-2">
          {(view.warning || view.note) && (
            <p className="text-base leading-6">
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
          )}
          {view.showAllButton && (
            <button
              type="button"
              data-show-all
              className={secondaryBtn}
              onClick={(e) => {
                onListing("");
                // focus moves to the picker
                e?.currentTarget
                  ?.closest("section")
                  ?.querySelector<HTMLSelectElement>("[data-which-items]")
                  ?.focus();
              }}
            >
              {COPY.showAllItems}
            </button>
          )}
        </div>
      )}
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
