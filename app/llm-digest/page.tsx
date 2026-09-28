import type { Metadata } from "next";
import { DigestFeed } from "@/components/llm-digest/DigestFeed";

export const metadata: Metadata = {
  title: "AI Digest",
  description: "Weekday AI news and techniques that actually worked.",
};

export default function Page() {
  return (
    <main className="flex min-h-screen w-full max-w-full flex-col overflow-x-hidden bg-[var(--cb-bg)] font-sans text-[var(--cb-ink)]">
      <DigestFeed />
    </main>
  );
}
