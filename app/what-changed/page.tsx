import type { Metadata } from "next";
import { WhatChangedDesk } from "@/components/what-changed/WhatChangedDesk";

export const metadata: Metadata = {
  title: "What-Changed Card",
  description:
    "List what changed before you decide go or hold — deploys, config, flags, upstreams.",
};

export default function Page() {
  return (
    <main className="flex min-h-screen w-full max-w-full flex-col overflow-x-hidden bg-[var(--cb-bg)] font-sans text-[var(--cb-ink)]">
      <WhatChangedDesk />
    </main>
  );
}
