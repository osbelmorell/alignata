import Link from "next/link";
import type { Metadata } from "next";
import { SiteFooter } from "@/components/fantasy/SiteFooter";
import { PageFade } from "@/components/appstore/Motion";
import { RetiredToolNote, RETIRED_DELETED_LINE } from "@/components/site/RetiredToolNote";

export const RETIRED_TITLE = "Env Diff has been retired";

export const metadata: Metadata = {
  title: RETIRED_TITLE,
  description: RETIRED_DELETED_LINE,
  robots: { index: false, follow: false },
};

/**
 * Env Diff Snapshot is retired (CEO, Oct 3 2026): it stored pasted env text in plain form in localStorage and Clear did
 * not delete it. The route stays reachable so old links land somewhere, but there is no tool UI and nothing is stored.
 * Copy: COPY.md §8 via Product UI's HANDOFF-ENVDIFF.md (H1, dek, one black pill "See the tools" → /apps). Layout: the
 * story column (680 at ≥900px, 20px margins on phone), no hero, no eyebrow, no Open. The dek ("…has been deleted") is
 * client-only: RetiredToolNote wipes every key the tool wrote (lib/site/retired-storage.ts) synchronously in a layout
 * effect and only then renders it, so it never exists before the data is gone.
 */
export default function EnvDiffRetiredPage() {
  return (
    <PageFade>
      <div className="fx-page">
        <main className="fx-story fx-retired" data-retired="env-diff-snapshot">
          <article>
            <div className="fx-story-col">
              <header className="fx-story-head">
                <h1 className="fx-story-title">{RETIRED_TITLE}</h1>
                <RetiredToolNote />
              </header>
              <div className="fx-retired-cta">
                <Link className="fx-pill" href="/apps">
                  See the tools
                </Link>
              </div>
            </div>
          </article>
        </main>
        <SiteFooter />
      </div>
    </PageFade>
  );
}
