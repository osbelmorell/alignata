import type { Metadata } from "next";
import { Scorecard } from "@/components/scorecard/Scorecard";

export const metadata: Metadata = {
  title: "Enterprise Scorecard",
  description: "See if LinkedIn, Investing, and Build are on track this week.",
};

export default function Page() {
  return (
    <main className="flex min-h-screen flex-col bg-[var(--cb-bg)] text-[var(--cb-ink)] font-sans">
      <Scorecard />
    </main>
  );
}
