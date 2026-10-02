import type { Metadata } from "next";
import { EnvDiffDesk } from "@/components/env-diff/EnvDiffDesk";

export const metadata: Metadata = {
  title: "Env Diff Snapshot",
  description:
    "Paste two setting lists and see what's missing, extra, or different — secrets stay masked so you can share the report.",
};

export default function Page() {
  return (
    <main className="fx-toolroute flex min-h-screen w-full max-w-full flex-col overflow-x-hidden bg-[var(--cb-bg)] font-sans text-[var(--cb-ink)]">
      <EnvDiffDesk />
    </main>
  );
}
