import type { Post } from "@/content/posts";
import { AUTHOR_NAME, DIGEST_ORG_NAME } from "@/lib/daily-digest/author";
import { heroImage, postCardDek, postKind } from "@/lib/daily-digest/meta";
import { toPlainText } from "@/lib/daily-digest/blocks";

const SITE = "https://alignata.com";

/**
 * schema.org Article for a Daily Digest story. Essays: author = Person "Osbel Morell". Techniques: author =
 * Organization "Alignata Daily Digest", editor = Person "Osbel Morell". datePublished = the article date.
 */
export function articleJsonLd(post: Post): Record<string, unknown> {
  const person = { "@type": "Person", name: AUTHOR_NAME };
  const url = `${SITE}/daily-digest/${post.slug}`;
  const byline =
    postKind(post) === "essay"
      ? { author: person }
      : { author: { "@type": "Organization", name: DIGEST_ORG_NAME, url: `${SITE}/daily-digest` }, editor: person };
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: toPlainText(postCardDek(post)),
    datePublished: post.date,
    image: `${SITE}${heroImage(post).src}`,
    url,
    mainEntityOfPage: url,
    ...byline,
  };
}

/** Safe to inline in <script type="application/ld+json">: no "</script>" or HTML comment can break out. */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}
