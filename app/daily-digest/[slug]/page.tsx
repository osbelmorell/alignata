import Link from "next/link";
import type { Metadata } from "next";
import { getPost, posts } from "@/content/posts";
import { notFound } from "next/navigation";
import { ArticleBody } from "@/components/daily-digest/ArticleBody";
import { ArticleStoryCard } from "@/components/appstore/StoryCard";
import { ArtFigure } from "@/components/appstore/ArtFigure";
import { toPlainText } from "@/lib/daily-digest/blocks";
import { heroImage, nextPost, postCardDek, postTag, readMinutes, shortDate } from "@/lib/daily-digest/meta";
import { Morph, PageFade } from "@/components/appstore/Motion";
import { Byline } from "@/components/daily-digest/Byline";
import { articleJsonLd, jsonLdScript } from "@/lib/daily-digest/jsonld";

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
 * Article story (SPEC v2 §4; mock mockups-art/daily-digest-break-loops-when-progress-stalls.html). Hero directly under
 * the header (the card's exact file, so the morph pairs), eyebrow "Daily Digest", H1 = the card title, the card dek
 * (COPY.md v2 limit, so card and story match), then the meta line "Technique · Oct 2 · 4 min read". Body in the 680
 * column (v1.5 §8 rules). Ends with one "Next article" card and "All articles".
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
    <PageFade story>
      <main className="fx-story">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(articleJsonLd(post)) }} />
        <article>
          <ArtFigure slug={post.slug} className="fx-story-hero" src={hero.src} alt={hero.alt} pad={hero.pad} hero />
          <div className="fx-story-col">
            <header className="fx-story-head">
              <p className="fx-eyebrow">Daily Digest</p>
              <Morph name={`title-${post.slug}`}>
                <h1 className="fx-story-title">{post.title}</h1>
              </Morph>
              <p className="fx-story-dek">{postCardDek(post)}</p>
              <Byline post={post} />
              <p className="fx-meta fx-story-meta">
                <span>
                  {postTag(post)} · <time dateTime={post.date}>{shortDate(post.date)}</time> · {readMinutes(post)} min read
                </span>
              </p>
            </header>
            <ArticleBody paragraphs={post.paragraphs} sections={post.sections} pullQuote={post.pullQuote} />
            {post.sourceNote ? <p className="fx-prose fx-note">{post.sourceNote}</p> : null}
            <aside className="fx-next" aria-label="Next article">
              <h2>Next article</h2>
              {next ? <ArticleStoryCard post={next} heading="h3" /> : null}
              <Link className="fx-text-link" href="/daily-digest">
                All articles
              </Link>
            </aside>
          </div>
        </article>
      </main>
    </PageFade>
  );
}
