import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Statically type `next/link` hrefs and `router.push/replace/prefetch`
   * against the real route tree. Stable top-level option as of Next.js 16
   * (previously `experimental.typedRoutes`).
   */
  typedRoutes: true,

  /** The floating dev badge sits over the UI and pollutes visual QA. */
  devIndicators: false,

  images: {
    /*
     * Next 16 narrowed the allowed `quality` values to `[75]` by default and
     * silently coerces anything else to the nearest entry — the landing hero
     * asked for 90 and was served 75 with no error.
     *
     * 75 is the right default for photographs and the wrong one for this
     * page: the hero is a smooth dawn gradient across the full viewport,
     * which is the worst case for block artefacts and banding. 90 roughly
     * doubles the file for an image that is the entire first impression.
     */
    qualities: [75, 90],
  },
};

export default nextConfig;
