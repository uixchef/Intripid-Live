import {
  Caveat,
  Indie_Flower,
  Life_Savers,
  Montez,
  Mountains_of_Christmas,
  Patrick_Hand,
  Reenie_Beanie,
  Shadows_Into_Light,
  Urbanist,
  Zeyada,
} from "next/font/google";

/**
 * Hand-painted type for the travel-pole share card.
 *
 * Loaded on the document root so @font-face exists before Generate opens.
 * `adjustFontFallback` is off — Next's size-adjust fallback makes script
 * faces look like compressed Inter.
 */
export const fontPoleShadows = Shadows_Into_Light({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  adjustFontFallback: false,
  variable: "--font-pole-shadows",
});
export const fontPoleUrbanist = Urbanist({
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "700", "800"],
  display: "swap",
  variable: "--font-pole-urbanist",
});
export const fontPoleLifeSavers = Life_Savers({
  subsets: ["latin"],
  weight: "800",
  display: "swap",
  adjustFontFallback: false,
  variable: "--font-pole-life-savers",
});
export const fontPoleCaveat = Caveat({
  subsets: ["latin"],
  weight: "700",
  display: "swap",
  adjustFontFallback: false,
  variable: "--font-pole-caveat",
});
export const fontPolePatrick = Patrick_Hand({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  adjustFontFallback: false,
  variable: "--font-pole-patrick",
});
export const fontPoleIndie = Indie_Flower({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  adjustFontFallback: false,
  variable: "--font-pole-indie",
});
export const fontPoleMontez = Montez({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  adjustFontFallback: false,
  variable: "--font-pole-montez",
});
export const fontPoleZeyada = Zeyada({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  adjustFontFallback: false,
  variable: "--font-pole-zeyada",
});
export const fontPoleReenie = Reenie_Beanie({
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  adjustFontFallback: false,
  variable: "--font-pole-reenie",
});
export const fontPoleMountains = Mountains_of_Christmas({
  subsets: ["latin"],
  weight: "700",
  display: "swap",
  adjustFontFallback: false,
  variable: "--font-pole-mountains",
});

export const travelPoleFontVariables = [
  fontPoleShadows.variable,
  fontPoleUrbanist.variable,
  fontPoleLifeSavers.variable,
  fontPoleCaveat.variable,
  fontPolePatrick.variable,
  fontPoleIndie.variable,
  fontPoleMontez.variable,
  fontPoleZeyada.variable,
  fontPoleReenie.variable,
  fontPoleMountains.variable,
].join(" ");
