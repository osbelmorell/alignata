import type { Metadata } from "next";
import { WhatChangedDesk } from "@/components/what-changed/WhatChangedDesk";

export const metadata: Metadata = {
  title: "What-Changed Card",
  description:
    "Build one card of what moved — deploys, settings, flags, upstreams — then mark go, hold, or verify.",
};

export default function Page() {
  return (
    <main className="fx-toolroute flex min-h-screen w-full max-w-full flex-col overflow-x-hidden bg-[var(--cb-bg)] font-sans text-[var(--cb-ink)]">
      <WhatChangedDesk />
    </main>
  );
}
