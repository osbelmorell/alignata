import type { Metadata } from "next";
import { getPost, getPostsNewestFirst, type Post } from "@/content/posts";
import { ArticleStoryCard } from "@/components/appstore/StoryCard";
import { DigestFind } from "@/components/daily-digest/DigestFind";
import { NewMarkBoot } from "@/components/daily-digest/NewMarkBoot";
import { PageFade } from "@/components/appstore/Motion";
import { BackLink } from "@/components/site/BackLink";
import { PageHero } from "@/components/site/PageHero";
import { DIGEST_FILTER_BOOT, START_HERE, START_HERE_SLUGS, digestSearchText, groupByMonth } from "@/lib/daily-digest/listing";
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

function startHerePost(slug: string): Post {
  const post = getPost(slug);
  if (!post) throw new Error(`Start here post missing: ${slug}`);
  return post;
}

/**
 * /daily-digest: compact head, then the newest-first feed. The three Start here pins are not
 * repeated in the feed; they sit below it. Type chips and search filter the feed in the browser
 * and write ?type=&q= . Canonical stays /daily-digest. No lead rows: every card is the same
 * equal-height story card (24px gap, 16:9 inset).
 */
export default function DailyDigestIndexPage() {
  const posts = getPostsNewestFirst();
  const feed = posts.filter((post) => !START_HERE_SLUGS.has(post.slug));
  const months = groupByMonth(feed);
  return (
    <PageFade>
      <BackLink href="/" label="Home" share={{ path: "/daily-digest", slug: "daily-digest", label: "Share the Daily Digest", title: "Daily Digest" }} />
      <main className="fx-wrap fx-digest-index">
        <NewMarkBoot posts={posts} />
        <script dangerouslySetInnerHTML={{ __html: DIGEST_FILTER_BOOT }} />
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
        <section className="fx-digest-latest" aria-label="Latest">
          <DigestFind />
          <div className="fx-digest-months">
            {months.map((month, monthIndex) => (
              <section key={month.key} data-digest-month={month.key} aria-labelledby={`digest-month-${month.key}`}>
                <h2 id={`digest-month-${month.key}`} className="fx-digest-month">{month.label}</h2>
                <ul className="fx-digest-cards fx-latest">
                  {month.posts.map((post, i) => (
                    <li key={post.slug} data-tag={postTag(post)} data-search={digestSearchText(post)}>
                      <ArticleStoryCard post={post} heading="h3" eager={monthIndex === 0 && i === 0} newMark />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
          <p id="digest-empty" className="fx-digest-empty" hidden aria-live="polite">
            No articles match.
          </p>
        </section>
        <section className="fx-digest-block" aria-labelledby="digest-start">
          <h2 id="digest-start">Start here</h2>
          <ol className="fx-digest-cards fx-start">
            {START_HERE.map(({ slug, why }) => (
              <li key={slug}>
                <ArticleStoryCard post={startHerePost(slug)} dek={why} heading="h3" newMark />
              </li>
            ))}
          </ol>
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
