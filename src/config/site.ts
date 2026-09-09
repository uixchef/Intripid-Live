/**
 * App-level constants.
 *
 * Content and identity only — no visual/design tokens live here yet. The
 * design language for Intripid is deliberately undecided at this stage.
 */
export const site = {
  name: "Intripid",
  title: "Intripid",
  description: "Interactive travel planning.",
  /**
   * Absolute base URL, used for `metadataBase`, `sitemap.ts` and `robots.ts`.
   * Swap for the real origin when a deployment target is chosen.
   */
  url: "http://localhost:3000",
} as const;
