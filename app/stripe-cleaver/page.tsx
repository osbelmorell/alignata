import type { Metadata } from "next";
import { CleaverDesk } from "@/components/stripe-cleaver/CleaverDesk";
import { SiteFooter } from "@/components/fantasy/SiteFooter";

export const metadata: Metadata = {
  title: "Stripe Payout Cleaver",
  description: "Turn a Stripe payout file into a books-ready download.",
};

export default function Page() {
  return (
    <>
      <main className="fx-toolroute flex min-h-screen w-full max-w-full min-w-0 flex-col bg-[var(--cb-bg)] font-sans text-[var(--cb-ink)]">
        <CleaverDesk />
      </main>
      <SiteFooter />
    </>
  );
}
