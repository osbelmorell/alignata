import type { Metadata } from "next";
import { BurnDigestDesk } from "@/components/hobby-burn/BurnDigestDesk";

export const metadata: Metadata = {
  title: "Hobby Deploy Burn Digest",
  description:
    "Paste this week’s usage list (or type counts) and see which project burned the free deploy window — plus a one-liner ready for chat.",
};

export default function Page() {
  return (
    <main className="flex min-h-screen w-full max-w-full flex-col overflow-x-hidden bg-[var(--cb-bg)] font-sans text-[var(--cb-ink)]">
      <BurnDigestDesk />
    </main>
  );
}
