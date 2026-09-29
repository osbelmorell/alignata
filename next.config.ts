import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/blog", destination: "/daily-digest", statusCode: 301 },
      { source: "/blog/:path*", destination: "/daily-digest/:path*", statusCode: 301 },
    ];
  },
};

export default nextConfig;
