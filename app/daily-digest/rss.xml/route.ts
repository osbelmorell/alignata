import { getPostsNewestFirst } from "@/content/posts";

export const dynamic = "force-static";

const SITE = "https://alignata.com";
const FEED_TITLE = "Alignata Daily Digest";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function rfc822(date: string): string {
  return new Date(`${date}T12:00:00Z`).toUTCString();
}

export function GET() {
  const posts = getPostsNewestFirst();
  const items = posts
    .map((post) => {
      const url = `${SITE}/daily-digest/${post.slug}`;
      return [
        "    <item>",
        `      <title>${esc(post.title)}</title>`,
        `      <link>${url}</link>`,
        `      <guid isPermaLink="true">${url}</guid>`,
        `      <pubDate>${rfc822(post.date)}</pubDate>`,
        `      <description>${esc(post.dek)}</description>`,
        "    </item>",
      ].join("\n");
    })
    .join("\n");

  const lastBuild = posts[0] ? rfc822(posts[0].date) : new Date(0).toUTCString();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${FEED_TITLE}</title>
    <link>${SITE}/daily-digest</link>
    <description>Proven AI techniques, deep dives, and the occasional essay, tested and written in plain English.</description>
    <language>en</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
    <atom:link href="${SITE}/daily-digest/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}
