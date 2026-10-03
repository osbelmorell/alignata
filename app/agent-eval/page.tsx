import type { Metadata } from "next";
import { EvalDesk } from "@/components/agent-eval/EvalDesk";
import { SiteFooter } from "@/components/fantasy/SiteFooter";

export const metadata: Metadata = {
  title: "Agent Eval Go/No-Go",
  description:
    "One-pager agent eval checklist: score must-haves → GO / NO-GO.",
};

export default function Page() {
  return (
    <>
      <main className="fx-toolroute flex min-h-screen w-full max-w-full flex-col overflow-x-hidden bg-[var(--cb-bg)] font-sans text-[var(--cb-ink)]">
        <EvalDesk />
      </main>
      <SiteFooter />
    </>
  );
}
