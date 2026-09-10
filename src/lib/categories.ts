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
  IncomeBand,
  Interest,
  ItemCategory,
  TripStyle,
  WeekendShape,
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

/**
 * Must-have experiences — the FILTER question.
 *
 * Verb-led with an inline definition, which is the phrasing the original
 * product used ("Enjoy Mountains", "Be Peaceful"). It matters: a taxonomy
 * written as things you DO reads as a wishlist, while the same list written
 * as nouns reads as a filter panel.
 */
export const STYLE_META: Record<TripStyle, { label: string; blurb: string }> = {
  city: { label: "Live city life", blurb: "Dense, loud, alive at every hour" },
  culture: {
    label: "Steep in culture",
    blurb: "Museums, architecture, music that matters",
  },
  food: { label: "Eat properly", blurb: "Plan the days around the meals" },
  slow: { label: "Be peaceful", blurb: "One neighbourhood, unhurried" },
  nature: {
    label: "Get into nature",
    blurb: "Mountains, forest, open coastline",
  },
  beach: { label: "Live island life", blurb: "Salt water and not much else" },
  adventure: {
    label: "Do something bracing",
    blurb: "Get the heart rate up on purpose",
  },
  nightlife: {
    label: "Stay out late",
    blurb: "The city after everyone else has gone home",
  },
};

/** The order experiences are offered in. */
export const EXPERIENCE_ORDER: readonly TripStyle[] = [
  "city",
  "culture",
  "food",
  "slow",
  "nature",
  "beach",
  "adventure",
  "nightlife",
] as const;

/**
 * Activities — the RANK question.
 *
 * These never eliminate a city; they order the survivors. Grouped so the list
 * scans, and no emoji in the labels.
 */
export const INTEREST_META: Record<
  Interest,
  { label: string; group: string }
> = {
  museums: { label: "Museums & galleries", group: "Culture" },
  architecture: { label: "Architecture walks", group: "Culture" },
  history: { label: "Historic sites", group: "Culture" },
  "live-music": { label: "Live music", group: "Culture" },
  "fine-dining": { label: "Fine dining", group: "Food & drink" },
  "street-food": { label: "Street food", group: "Food & drink" },
  markets: { label: "Food markets", group: "Food & drink" },
  coffee: { label: "Coffee places", group: "Food & drink" },
  nightlife: { label: "Bars & nightlife", group: "Food & drink" },
  hiking: { label: "Hiking", group: "Outdoors" },
  water: { label: "Swimming & water", group: "Outdoors" },
  shopping: { label: "Shopping", group: "City" },
};

/** Activity groups in display order. */
export const ACTIVITY_GROUPS = [
  "Culture",
  "Food & drink",
  "Outdoors",
  "City",
] as const;

/** Income bands for the optional budget normaliser. */
export const INCOME_META: Record<IncomeBand, { label: string }> = {
  "under-40": { label: "Under $40k" },
  "40-75": { label: "$40k – $75k" },
  "75-125": { label: "$75k – $125k" },
  "125-200": { label: "$125k – $200k" },
  "over-200": { label: "Over $200k" },
};

/** What "the weekend" means. Asked only when the traveller picks a weekend. */
export const WEEKEND_META: Record<
  WeekendShape,
  { label: string; blurb: string }
> = {
  "fri-sun": { label: "Friday to Sunday", blurb: "Leave after work" },
  "sat-mon": { label: "Saturday to Monday", blurb: "Take the Monday" },
  "sat-sun": { label: "Saturday to Sunday", blurb: "One night only" },
};
