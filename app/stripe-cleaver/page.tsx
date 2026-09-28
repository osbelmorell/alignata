import type { Metadata } from "next";
import { CleaverDesk } from "@/components/stripe-cleaver/CleaverDesk";

export const metadata: Metadata = {
  title: "Stripe→Books Cleaver",
  description: "Turn Stripe payout CSV into QuickBooks or Xero rows.",
};

export default function Page() {
  return (
    <main className="flex min-h-screen w-full max-w-full min-w-0 flex-col bg-[var(--cb-bg)] font-sans text-[var(--cb-ink)]">
      <CleaverDesk />
    </main>
  );
}
