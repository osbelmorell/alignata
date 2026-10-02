import Link from "next/link";
import type { Metadata } from "next";
import { getPost, posts } from "@/content/posts";
import { notFound } from "next/navigation";
import { ArticleBody } from "@/components/daily-digest/ArticleBody";
import { PostCard } from "@/components/fantasy/PostCard";
import { toPlainText } from "@/lib/daily-digest/blocks";
import { heroImage, nextPost, postTag, readMinutes, shortDate } from "@/lib/daily-digest/meta";

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
    description: toPlainText(post.dek),
    alternates: {
      canonical: `/daily-digest/${post.slug}`,
      types: { "application/rss+xml": "/daily-digest/rss.xml" },
    },
    openGraph: {
      type: "article",
      title: post.title,
      description: toPlainText(post.dek),
      url: `/daily-digest/${post.slug}`,
      siteName: "Alignata",
      publishedTime: post.date,
    },
  };
}

/**
 * SPEC §8 article: centred meta (tag · date · read time), H1 and dek first, then the 16:9 hero; body column max 680.
 * Ends with one "Next article" card (index style) and an "All articles" link.
 */
export default async function DailyDigestPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();
  const hero = heroImage(post);
  const next = nextPost(post.slug);

  return (
    <main>
      <article>
        <header className="fx-wrap">
          <div className="fx-a-head">
            <p className="fx-meta">
              <span className="fx-dot" aria-hidden="true" />
              <span>
                {postTag(post)} · <time dateTime={post.date}>{shortDate(post.date)}</time> · {readMinutes(post)} min read
              </span>
            </p>
            <h1>{post.title}</h1>
            <p className="fx-intro">{toPlainText(post.dek)}</p>
          </div>
          <figure className="fx-hero fx-art fx-reveal">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={hero.src}
              {...(hero.srcSet ? { srcSet: hero.srcSet } : {})}
              sizes="(min-width: 1280px) 1184px, calc(100vw - 40px)"
              alt={hero.alt}
              width={hero.width}
              height={hero.height}
              fetchPriority="high"
              decoding="async"
            />
          </figure>
        </header>
        <div className="fx-wrap">
          <ArticleBody paragraphs={post.paragraphs} sections={post.sections} pullQuote={post.pullQuote} />
          {post.sourceNote ? <p className="fx-prose fx-note">{post.sourceNote}</p> : null}
        </div>
      </article>
      <div className="fx-wrap">
        <aside className="fx-next" aria-label="Next article">
          <h2>Next article</h2>
          {next ? <PostCard post={next} heading="h3" /> : null}
          <Link className="fx-all-link" href="/daily-digest">
            All articles
          </Link>
        </aside>
      </div>
    </main>
  );
}
