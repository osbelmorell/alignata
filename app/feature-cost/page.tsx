import type { Metadata } from "next";
import { CostDesk } from "@/components/feature-cost/CostDesk";

export const metadata: Metadata = {
  title: "Feature-Cost Tag",
  description:
    "See which product feature is burning the AI bill, day by day — and get a heads-up when one feature eats most of the spend.",
};

export default function Page() {
  return (
    <main className="fx-toolroute flex min-h-screen w-full max-w-full flex-col overflow-x-hidden bg-[var(--cb-bg)] font-sans text-[var(--cb-ink)]">
      <CostDesk />
    </main>
  );
}
