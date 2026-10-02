import type { Metadata } from "next";
import { BundleDesk } from "@/components/agent-bundle/BundleDesk";

export const metadata: Metadata = {
  title: "Agent Bundle Tag",
  description:
    "Register agent bundles and diff the last two — prompt, model, tools, env, live flag.",
};

export default function Page() {
  return (
    <main className="fx-toolroute flex min-h-screen w-full max-w-full flex-col overflow-x-hidden bg-[var(--cb-bg)] font-sans text-[var(--cb-ink)]">
      <BundleDesk />
    </main>
  );
}
