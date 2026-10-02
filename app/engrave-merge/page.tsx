import type { Metadata } from "next";
import { EngraveMergeDesk } from "@/components/engrave-merge/EngraveMergeDesk";

// PRIVATE dogfood tool: unlisted. Not in /apps, public/apps.json, nav or any sitemap.
export const metadata: Metadata = {
  title: "Engrave Merge",
  description: "Private test build.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <main className="flex min-h-screen w-full max-w-full min-w-0 flex-col bg-[var(--cb-bg)] font-sans text-[var(--cb-ink)]">
      <EngraveMergeDesk />
    </main>
  );
}
