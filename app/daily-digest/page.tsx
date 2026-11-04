import type { Metadata } from "next";
import { getPost, getPostsNewestFirst, type Post } from "@/content/posts";
import { ArticleStoryCard } from "@/components/appstore/StoryCard";
import { NewMarkBoot } from "@/components/daily-digest/NewMarkBoot";
import { PageFade } from "@/components/appstore/Motion";
import { BackLink } from "@/components/site/BackLink";
import { PageHero } from "@/components/site/PageHero";
import { DIGEST_POSITIONING, postTag } from "@/lib/daily-digest/meta";
import { ogImage, ogPath, shareMeta } from "@/lib/share/og";

const SHARE = shareMeta({
  title: "Daily Digest",
  description: DIGEST_POSITIONING,
  image: ogImage(ogPath.digestIndex(), "The Alignata Daily Digest illustration."),
});

export const metadata: Metadata = {
  title: "Daily Digest",
  description: DIGEST_POSITIONING,
  alternates: {
    canonical: "/daily-digest",
    types: { "application/rss+xml": "/daily-digest/rss.xml" },
  },
  openGraph: {
    type: "website",
    title: "Daily Digest",
    description: DIGEST_POSITIONING,
    url: "/daily-digest",
    siteName: "Alignata",
    images: SHARE.images,
  },
  twitter: SHARE.twitter,
};

/** Pinned entry posts. Why-read lines are listing copy, not a new content field. */
const START_HERE: { slug: string; why: string }[] = [
  {
    slug: "cdm-vs-llm-vs-jev",
    why: "Three model types do different jobs. Read this before you treat every task as a chat model.",
  },
  {
    slug: "ai-harnesses-explained",
    why: "The model is half the system. This is the harness around it: tools, checks, and the loop.",
  },
  {
    slug: "the-ai-safety-paradox",
    why: "A field note on asking the model to police itself, and why that does not hold.",
  },
];

function startHerePost(slug: string): Post {
  const post = getPost(slug);
  if (!post) throw new Error(`Start here post missing: ${slug}`);
  return post;
}

/**
 * /daily-digest: positioning line, three pinned entry cards, then Deep dive and Essay cards,
 * then every article as a story card (no app row), newest first. Eyebrow = the tag. Desktop repeats the §3 layout:
 * a full-width lead row, then a 2-up grid, every 5 cards. Listing picks reuse ArticleStoryCard (same sticker).
 */
export default function DailyDigestIndexPage() {
  const posts = getPostsNewestFirst();
  const flagship = posts.filter((post) => {
    const tag = postTag(post);
    return tag === "Deep dive" || tag === "Essay";
  });
  return (
    <PageFade>
      <BackLink href="/" label="Home" share={{ path: "/daily-digest", slug: "daily-digest", label: "Share the Daily Digest", title: "Daily Digest" }} />
      <main className="fx-wrap">
        <NewMarkBoot posts={posts} />
        <section className="fx-page-head fx-head-split">
          <div>
            <h1 className="fx-display">Daily Digest</h1>
            <p className="fx-intro">{DIGEST_POSITIONING}</p>
            <p className="fx-digest-follow">
              <a className="fx-text-link" href="/daily-digest/rss.xml" type="application/rss+xml">
                Follow via RSS
              </a>
            </p>
          </div>
          <PageHero src="/art/digest-hero-sticker.webp" />
        </section>
        <section className="fx-digest-block" aria-labelledby="digest-start">
          <h2 id="digest-start">Start here</h2>
          <ol className="fx-digest-cards fx-start">
            {START_HERE.map(({ slug, why }, i) => (
              <li key={slug}>
                <ArticleStoryCard post={startHerePost(slug)} dek={why} heading="h3" morph={false} eager={i === 0} newMark />
              </li>
            ))}
          </ol>
        </section>
        <section className="fx-digest-block" aria-labelledby="digest-flagship">
          <h2 id="digest-flagship">Deep dives and essays</h2>
          <ul className="fx-digest-cards fx-flagship">
            {flagship.map((post) => (
              <li key={post.slug}>
                <ArticleStoryCard post={post} heading="h3" morph={false} newMark />
              </li>
            ))}
          </ul>
        </section>
        <section className="fx-feed" aria-label="All articles">
          {posts.map((post, i) => (
            <ArticleStoryCard key={post.slug} post={post} lead={i % 5 === 0} eager={i === 0} newMark />
          ))}
        </section>
        <p className="fx-rss">
          <a className="fx-text-link" href="/daily-digest/rss.xml">
            RSS feed
          </a>
        </p>
      </main>
    </PageFade>
  );
}
