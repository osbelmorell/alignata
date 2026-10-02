import type { MetadataRoute } from "next";

export const dynamic = "force-static";

/** Allow all; point crawlers at the sitemap. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: "https://alignata.com/sitemap.xml",
  };
}
