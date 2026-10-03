import type { Metadata } from "next";
import { EngraveMergeDesk } from "@/components/engrave-merge/EngraveMergeDesk";
import { SiteFooter } from "@/components/fantasy/SiteFooter";

// Listed in /apps (public/apps.json). Indexable.
export const metadata: Metadata = {
  title: "Engrave Merge",
  description: "Turn Etsy orders into a LightBurn file, ready to engrave.",
};

export default function Page() {
  return (
    <>
      <main className="fx-toolroute flex min-h-screen w-full max-w-full min-w-0 flex-col bg-[var(--cb-bg)] font-sans text-[var(--cb-ink)]">
        <EngraveMergeDesk />
      </main>
      <SiteFooter />
    </>
  );
}
