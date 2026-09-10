/**
 * App-level constants.
 */
export const site = {
  name: "Intripid",
  tagline: "Find where to go, then plan it properly",
  description:
    "Intripid helps you discover where to go from what you actually care about, then turns it into a real, shareable itinerary.",
  /** Absolute base URL for metadata, sitemap and robots. */
  url: "http://localhost:3000",

  /**
   * The header's icon cluster on the landing page.
   *
   * PLACEHOLDERS. These handles are not claimed — point them at the real
   * accounts (or delete entries) before this page is public. The cluster
   * renders whatever is in this array, so removing one is safe.
   */
  social: [
    {
      id: "instagram",
      label: "Intripid on Instagram",
      href: "https://instagram.com/intripid",
    },
    { id: "x", label: "Intripid on X", href: "https://x.com/intripid" },
    {
      id: "linkedin",
      label: "Intripid on LinkedIn",
      href: "https://linkedin.com/company/intripid",
    },
  ],
} as const;

/** One entry in the header's social cluster. */
export type SocialLink = (typeof site.social)[number];
