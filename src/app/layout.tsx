import type { Metadata, Viewport } from "next";

import { site } from "@/config/site";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: site.title,
    // Applies to child segments only, which is why `default` is required.
    template: `%s · ${site.name}`,
  },
  description: site.description,
};

export const viewport: Viewport = {
  // `charset` and `width=device-width, initial-scale=1` are emitted
  // automatically by Next.js and must not be re-declared here.
  colorScheme: "light dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
