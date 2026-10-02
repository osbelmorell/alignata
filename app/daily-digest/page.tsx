import type { Metadata } from "next";
import { getPostsNewestFirst } from "@/content/posts";
import { PostCard } from "@/components/fantasy/PostCard";

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

/** SPEC §7 /daily-digest: newest first; on desktop the newest is a full-width feature, then a 3-up grid. */
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
      <section className="fx-posts" aria-label="All articles">
        {posts.map((post, i) => (
          <PostCard key={post.slug} post={post} feature={i === 0} dot={i === 0} eager={i === 0} />
        ))}
      </section>
    </main>
  );
}
