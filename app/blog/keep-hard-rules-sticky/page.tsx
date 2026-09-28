import Link from "next/link";
import type { Metadata } from "next";
import { getPost } from "@/content/posts";
import { notFound } from "next/navigation";

const SLUG = "keep-hard-rules-sticky";

export const metadata: Metadata = {
  title: "Keep hard rules sticky",
  description:
    "Soft reminders fade in long chats. Re-inject the non-negotiables every turn.",
};

export default function KeepHardRulesStickyPage() {
  const post = getPost(SLUG);
  if (!post) notFound();

  return (
    <article className="space-y-8">
      <p>
        <Link
          href="/blog"
          className="text-[13px]"
          style={{ color: "var(--cb-ink-muted)" }}
        >
          ← Blog
        </Link>
      </p>

      <header className="space-y-3">
        <time
          className="text-[12px]"
          style={{ color: "var(--cb-ink-muted)" }}
          dateTime={post.date}
        >
          {post.date}
        </time>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {post.title}
        </h1>
        <p className="text-[17px]" style={{ color: "var(--cb-ink-muted)" }}>
          {post.dek}
        </p>
      </header>

      <div
        className="space-y-5 p-7 text-[16px]"
        style={{
          background: "var(--cb-surface)",
          borderRadius: "var(--cb-radius-squircle)",
          border: "1px solid var(--cb-line)",
          boxShadow: "var(--cb-shadow)",
        }}
      >
        {post.paragraphs.map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>

      {post.sourceNote ? (
        <p className="text-[12px]" style={{ color: "var(--cb-ink-muted)" }}>
          {post.sourceNote}
        </p>
      ) : null}
    </article>
  );
}
