import type { Post } from "@/content/posts";
import { AUTHOR_NAME, DIGEST_ORG_NAME } from "@/lib/daily-digest/author";
import { heroImage, postCardDek, postKind } from "@/lib/daily-digest/meta";
import { toPlainText } from "@/lib/daily-digest/blocks";

const SITE = "https://alignata.com";

/**
 * schema.org Article for a Daily Digest story. Essays: author = Person "Osbel Morell". Techniques: author =
 * Organization "Alignata Daily Digest", editor = Person "Osbel Morell". datePublished = the article date.
 * dateModified = the updated date, else the article date. publisher = Organization "Alignata". isPartOf = the
 * Daily Digest series. A series-specific isPartOf waits until posts carry series metadata.
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
    dateModified: post.updated?.date ?? post.date,
    image: `${SITE}${heroImage(post).src}`,
    url,
    mainEntityOfPage: url,
    publisher: { "@type": "Organization", name: "Alignata", url: SITE },
    isPartOf: { "@type": "CreativeWorkSeries", name: "Daily Digest", url: `${SITE}/daily-digest` },
    ...byline,
  };
}

/** BreadcrumbList: Home › Daily Digest › this article. Second JSON-LD script on the story page. */
export function digestBreadcrumbJsonLd(post: Post): Record<string, unknown> {
  const url = `${SITE}/daily-digest/${post.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
      { "@type": "ListItem", position: 2, name: "Daily Digest", item: `${SITE}/daily-digest` },
      { "@type": "ListItem", position: 3, name: post.title, item: url },
    ],
  };
}

/** Safe to inline in <script type="application/ld+json">: no "</script>" or HTML comment can break out. */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}
