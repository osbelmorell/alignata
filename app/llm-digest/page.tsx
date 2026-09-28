import type { Metadata } from "next";
import { DigestFeed } from "@/components/llm-digest/DigestFeed";
import { listDigestPosts } from "@/lib/llm-digest/posts";

export const metadata: Metadata = {
  title: "AI Digest",
  description:
    "Weekday board feed of AI news FYI and box-tested harness techniques. Newest first.",
};

export default function AiDigestPage() {
  const posts = listDigestPosts();
  return (
    <main className="flex min-h-screen flex-col bg-[var(--cb-bg)] font-sans text-[var(--cb-ink)]">
      <DigestFeed posts={posts} />
    </main>
  );
}
