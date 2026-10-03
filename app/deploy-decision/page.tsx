import type { Metadata } from "next";
import { DecisionDesk } from "@/components/deploy-decision/DecisionDesk";
import { SiteFooter } from "@/components/fantasy/SiteFooter";

export const metadata: Metadata = {
  title: "Deploy Decision Card",
  description:
    "Investment Desk dogfood — opportunity card, approve / size / pass, append-only log.",
};

export default function Page() {
  return (
    <>
      <main className="fx-toolroute flex min-h-screen flex-col bg-[var(--cb-bg)] text-[var(--cb-ink)] font-sans">
        <DecisionDesk />
      </main>
      <SiteFooter />
    </>
  );
}
