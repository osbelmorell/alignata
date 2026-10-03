import type { Metadata } from "next";
import { LicenseGateDesk } from "@/components/license-gate/LicenseGateDesk";
import { SiteFooter } from "@/components/fantasy/SiteFooter";

export const metadata: Metadata = {
  title: "License Risk Gate",
  description: "Drop a lockfile and see if license risk is a pass or fail.",
};

export default function Page() {
  return (
    <>
      <main className="fx-toolroute flex min-h-screen w-full max-w-full min-w-0 flex-col bg-[var(--cb-bg)] font-sans text-[var(--cb-ink)]">
        <LicenseGateDesk />
      </main>
      <SiteFooter />
    </>
  );
}
