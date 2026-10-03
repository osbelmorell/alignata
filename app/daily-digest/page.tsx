import type { Metadata } from "next";
import { getPostsNewestFirst } from "@/content/posts";
import { ArticleStoryCard } from "@/components/appstore/StoryCard";

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

/**
 * /daily-digest (SPEC v2 §5): title and locked subline, then every article as a story card (no app row), newest first.
 * Eyebrow = the tag (the page title already says Daily Digest). Desktop repeats the §3 layout: a full-width lead row,
 * then a 2-up grid of 6 columns, every 5 cards.
 */
export default function DailyDigestIndexPage() {
  const posts = getPostsNewestFirst();
  return (
    <main className="fx-wrap">
      <section className="fx-page-head">
        <h1 className="fx-display">Daily Digest</h1>
        <p className="fx-intro">
          Proven AI techniques, deep dives, and the occasional essay, tested and written in plain English.
        </p>
      </section>
      <section className="fx-feed" aria-label="All articles">
        {posts.map((post, i) => (
          <ArticleStoryCard key={post.slug} post={post} lead={i % 5 === 0} eager={i === 0} />
        ))}
      </section>
    </main>
  );
}
