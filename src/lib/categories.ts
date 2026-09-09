import {
  Bed,
  Building2,
  Landmark,
  Martini,
  ShoppingBag,
  Trees,
  TramFront,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

import type {
  BudgetTier,
  CommuteMode,
  Interest,
  ItemCategory,
  TripStyle,
} from "./types";

/**
 * Category metadata — the single place colour, icon and wording are decided.
 *
 * One colour per category only stays legible if the set is small, so the
 * taxonomy is deliberately eight wide. Transit is neutral by design: travel
 * time is structure, not content, and should never compete with the things
 * the traveller actually chose to do.
 */

export interface CategoryMeta {
  label: string;
  icon: LucideIcon;
  /** CSS custom property names, so colour stays in the token layer. */
  color: string;
  soft: string;
  ink: string;
}

export const CATEGORY_META: Record<ItemCategory, CategoryMeta> = {
  stay: {
    label: "Stay",
    icon: Bed,
    color: "var(--cat-stay)",
    soft: "var(--cat-stay-soft)",
    ink: "var(--cat-stay-ink)",
  },
  food: {
    label: "Food",
    icon: UtensilsCrossed,
    color: "var(--cat-food)",
    soft: "var(--cat-food-soft)",
    ink: "var(--cat-food-ink)",
  },
  culture: {
    label: "Culture",
    icon: Landmark,
    color: "var(--cat-culture)",
    soft: "var(--cat-culture-soft)",
    ink: "var(--cat-culture-ink)",
  },
  outdoors: {
    label: "Outdoors",
    icon: Trees,
    color: "var(--cat-outdoors)",
    soft: "var(--cat-outdoors-soft)",
    ink: "var(--cat-outdoors-ink)",
  },
  sightseeing: {
    label: "Sights",
    icon: Building2,
    color: "var(--cat-sightseeing)",
    soft: "var(--cat-sightseeing-soft)",
    ink: "var(--cat-sightseeing-ink)",
  },
  nightlife: {
    label: "Nightlife",
    icon: Martini,
    color: "var(--cat-nightlife)",
    soft: "var(--cat-nightlife-soft)",
    ink: "var(--cat-nightlife-ink)",
  },
  shopping: {
    label: "Shopping",
    icon: ShoppingBag,
    color: "var(--cat-shopping)",
    soft: "var(--cat-shopping-soft)",
    ink: "var(--cat-shopping-ink)",
  },
  transit: {
    label: "Travel",
    icon: TramFront,
    color: "var(--cat-transit)",
    soft: "var(--cat-transit-soft)",
    ink: "var(--cat-transit-ink)",
  },
};

export function categoryMeta(category: ItemCategory): CategoryMeta {
  return CATEGORY_META[category];
}

/** Traveller avatar colour from the identity ramp. */
export function travellerColor(colorIndex: number): string {
  return `var(--who-${colorIndex % 6})`;
}

/* -------------------------------------------------------------------------- */
/* Commute modes                                                             */
/* -------------------------------------------------------------------------- */

export const COMMUTE_LABELS: Record<CommuteMode, string> = {
  walk: "Walk",
  subway: "Subway",
  taxi: "Taxi",
  ferry: "Ferry",
  bike: "Bike",
};

/* -------------------------------------------------------------------------- */
/* Discovery vocabulary                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Budget bands, in the historical product's voice. The labels describe a
 * posture rather than a number, which is why they survived the redesign.
 */
export const BUDGET_META: Record<
  BudgetTier,
  { label: string; blurb: string; glyph: string }
> = {
  backpack: {
    label: "Backpack",
    blurb: "Keep costs to a minimum",
    glyph: "◔",
  },
  budget: {
    label: "Budget",
    blurb: "Balance quality and cost",
    glyph: "◑",
  },
  premium: {
    label: "Premium",
    blurb: "Splurge a little",
    glyph: "◕",
  },
  luxury: {
    label: "Luxury",
    blurb: "Money is not the question",
    glyph: "●",
  },
};

export const STYLE_META: Record<
  TripStyle,
  { label: string; blurb: string }
> = {
  slow: { label: "Slow", blurb: "One neighbourhood, properly" },
  adventure: { label: "Adventure", blurb: "Get the heart rate up" },
  culture: { label: "Culture", blurb: "Museums, music, architecture" },
  food: { label: "Food", blurb: "Plan the trip around meals" },
  nightlife: { label: "Nightlife", blurb: "The city after dark" },
  nature: { label: "Nature", blurb: "Mountains, forest, coastline" },
  beach: { label: "Beach", blurb: "Salt water and not much else" },
  city: { label: "City", blurb: "Dense, loud, alive" },
};

export const INTEREST_META: Record<Interest, { label: string }> = {
  museums: { label: "Museums" },
  architecture: { label: "Architecture" },
  "live-music": { label: "Live music" },
  markets: { label: "Markets" },
  coffee: { label: "Coffee" },
  "fine-dining": { label: "Fine dining" },
  "street-food": { label: "Street food" },
  hiking: { label: "Hiking" },
  water: { label: "Water" },
  shopping: { label: "Shopping" },
  history: { label: "History" },
  nightlife: { label: "Nightlife" },
};
