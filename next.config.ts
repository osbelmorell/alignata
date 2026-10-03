import type { NextConfig } from "next";

/** Old /llm-digest pages → their Daily Digest articles (first article of that day). */
const llmDigestRedirects: [string, string][] = [
  ["2026-09-16", "reuse-the-same-key-when-a-tool-retries"],
  ["2026-09-23", "refuse-answers-that-dont-match-tool-results"],
  ["2026-09-24", "keep-hard-rules-sticky"],
  ["2026-09-25", "prove-it-before-irreversible-actions"],
  ["2026-09-25-laya", "laya-ai-deep-dive"],
  ["2026-09-25-jev", "system-one-and-jev-deep-dive"],
  ["2026-09-25-paperclip", "paperclip-deep-dive"],
  ["2026-09-28", "refuse-answers-sources-do-not-support"],
  ["2026-09-29", "ask-before-doing-what-wasnt-asked"],
];

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/blog", destination: "/daily-digest", statusCode: 301 },
      { source: "/blog/:path*", destination: "/daily-digest/:path*", statusCode: 301 },
      { source: "/llm-digest", destination: "/daily-digest", statusCode: 301 },
      ...llmDigestRedirects.map(([from, to]) => ({
        source: `/llm-digest/${from}`,
        destination: `/daily-digest/${to}`,
        statusCode: 301 as const,
      })),
      { source: "/llm-digest/:path*", destination: "/daily-digest", statusCode: 301 },
      // Env Diff Snapshot retired (Oct 3 2026): its old story URL goes to the retired tool route, so old links hit the
      // storage wipe and the retired page (HANDOFF-ENVDIFF.md).
      { source: "/apps/env-diff-snapshot", destination: "/env-diff", statusCode: 301 },
    ];
  },
};

export default nextConfig;
