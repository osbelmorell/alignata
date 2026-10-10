import type { Metadata } from "next";
import { Scorecard } from "@/components/scorecard/Scorecard";
import { SiteFooter } from "@/components/fantasy/SiteFooter";
import { readFileSync } from "node:fs";
import path from "node:path";
import { normalizeScorecard } from "@/lib/scorecard/storage";
import type { ScorecardData } from "@/lib/scorecard/types";

/** Build-time copy of the shared board file (same file the client fetches), so the server HTML has the real data. */
function initialScorecard(): ScorecardData | undefined {
  try {
    return normalizeScorecard(JSON.parse(readFileSync(path.join(process.cwd(), "public/scorecard.json"), "utf8")));
  } catch {
    return undefined;
  }
}

export const metadata: Metadata = {
  title: "Bet A — Enterprise Scorecard",
  description:
    "Board 1:1 scorecard for LinkedIn, Investment, and Build pillars.",
};

export default function Page() {
  return (
    <>
      <main className="fx-toolroute flex min-h-screen flex-col bg-[var(--cb-bg)] text-[var(--cb-ink)] font-sans">
        <Scorecard initial={initialScorecard()} />
      </main>
      <SiteFooter />
    </>
  );
}
