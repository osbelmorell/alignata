import type { Metadata } from "next";
import { Scorecard } from "@/components/scorecard/Scorecard";
import { SiteFooter } from "@/components/fantasy/SiteFooter";

export const metadata: Metadata = {
  title: "Bet A — Enterprise Scorecard",
  description:
    "Board 1:1 scorecard for LinkedIn, Investment, and Build pillars.",
};

export default function Page() {
  return (
    <>
      <main className="fx-toolroute flex min-h-screen flex-col bg-[var(--cb-bg)] text-[var(--cb-ink)] font-sans">
        <Scorecard />
      </main>
      <SiteFooter />
    </>
  );
}
