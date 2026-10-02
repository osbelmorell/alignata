import type { MetadataRoute } from "next";

export const dynamic = "force-static";

/** Allow all; point crawlers at the sitemap. Preview deployments (preview/* branches) disallow everything. */
export default function robots(): MetadataRoute.Robots {
  if (process.env.VERCEL_ENV === "preview") return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: "https://alignata.com/sitemap.xml",
  };
}
