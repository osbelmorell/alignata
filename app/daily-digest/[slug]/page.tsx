import Link from "next/link";
import type { Metadata } from "next";
import { getPost, posts } from "@/content/posts";
import { notFound } from "next/navigation";
import { ArticleBody } from "@/components/daily-digest/ArticleBody";

export const dynamicParams = false;

export function generateStaticParams() {
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.dek,
    alternates: {
      canonical: `/daily-digest/${post.slug}`,
      types: { "application/rss+xml": "/daily-digest/rss.xml" },
    },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.dek,
      url: `/daily-digest/${post.slug}`,
      siteName: "Alignata",
      publishedTime: post.date,
    },
  };
}

export default async function DailyDigestPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  return (
    <article className="space-y-8">
      <p>
        <Link
          href="/daily-digest"
          className="text-[13px]"
          style={{ color: "var(--cb-ink-muted)" }}
        >
          ← Daily Digest
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

      <ArticleBody paragraphs={post.paragraphs} sections={post.sections} />

      {post.sourceNote ? (
        <p className="text-[12px]" style={{ color: "var(--cb-ink-muted)" }}>
          {post.sourceNote}
        </p>
      ) : null}
    </article>
  );
}
