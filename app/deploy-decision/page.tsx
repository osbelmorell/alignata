import type { Metadata } from "next";
import { DecisionDesk } from "@/components/deploy-decision/DecisionDesk";

export const metadata: Metadata = {
  title: "Deploy Decision Card",
  description:
    "Investment Desk dogfood — opportunity card, approve / size / pass, append-only log.",
};

export default function Page() {
  return (
    <main className="flex min-h-screen flex-col bg-[var(--cb-bg)] text-[var(--cb-ink)] font-sans">
      <DecisionDesk />
    </main>
  );
}
