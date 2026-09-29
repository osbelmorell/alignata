import Link from "next/link";
import type { Metadata } from "next";
import { getPostsNewestFirst } from "@/content/posts";

export const metadata: Metadata = {
  title: "Daily Digest",
  description: "Techniques for building with agents — Alignata",
  alternates: {
    canonical: "/daily-digest",
    types: { "application/rss+xml": "/daily-digest/rss.xml" },
  },
  openGraph: {
    type: "website",
    title: "Daily Digest",
    description: "Techniques for building with agents — Alignata",
    url: "/daily-digest",
    siteName: "Alignata",
  },
};

export default function DailyDigestIndexPage() {
  const posts = getPostsNewestFirst();

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Daily Digest</h1>
        <p className="text-[15px]" style={{ color: "var(--cb-ink-muted)" }}>
          Techniques only — plain notes from building with agents.
        </p>
      </header>

      <ul className="space-y-4">
        {posts.map((post) => (
          <li key={post.slug}>
            <Link
              href={`/daily-digest/${post.slug}`}
              className="block p-6 transition-shadow hover:shadow-[var(--cb-shadow)]"
              style={{
                background: "var(--cb-surface)",
                borderRadius: "var(--cb-radius-card-sm)",
                border: "1px solid var(--cb-line)",
              }}
            >
              <time
                className="text-[12px]"
                style={{ color: "var(--cb-ink-muted)" }}
                dateTime={post.date}
              >
                {post.date}
              </time>
              <h2 className="mt-1 text-xl font-semibold tracking-tight">
                {post.title}
              </h2>
              <p className="mt-2 text-[15px]" style={{ color: "var(--cb-ink-muted)" }}>
                {post.dek}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
