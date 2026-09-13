import type { Metadata, Viewport } from "next";
import { Familjen_Grotesk, Inter } from "next/font/google";

import { site } from "@/config/site";
import { travelPoleFontVariables } from "@/fonts/travel-pole";

import { Providers } from "./providers";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const familjen = Familjen_Grotesk({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-familjen",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#faf8f4",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${familjen.variable} ${travelPoleFontVariables}`}
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
