import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Statically type `next/link` hrefs and `router.push/replace/prefetch`
   * against the real route tree. Stable top-level option as of Next.js 16
   * (previously `experimental.typedRoutes`).
   */
  typedRoutes: true,
};

export default nextConfig;
