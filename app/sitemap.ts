import type { MetadataRoute } from "next";
import { getApps, storyHref, toolsOrder } from "@/lib/apps";
import { posts } from "@/content/posts";
import { guideSitemapEntries } from "@/lib/guides/guides";
import { COMPANY_PATHS } from "@/content/company";

export const dynamic = "force-static";

const SITE = "https://alignata.com";

/**
 * Home, /apps, every tool listed in public/apps.json (the /apps catalog), each tool's story /apps/<slug> (every tool
 * with a story; Deploy Decision Card has none), /daily-digest and each digest article, then each PUBLISHED guide
 * /guides/<slug> with lastmod (draft guides never). Unlisted tools (not in apps.json) and redirect-only paths are never
 * included.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const tools = getApps()
    .map((a) => a.url)
    .filter((u) => u.startsWith("/") && !u.startsWith("//"));
  const stories = toolsOrder(getApps())
    .map((a) => storyHref(a.id))
    .filter((h): h is string => !!h);
  const paths = ["/", "/apps", ...tools, ...stories, "/daily-digest", ...posts.map((p) => `/daily-digest/${p.slug}`), ...COMPANY_PATHS];
  return [...[...new Set(paths)].map((p) => ({ url: p === "/" ? SITE : `${SITE}${p}` })), ...guideSitemapEntries()];
}
