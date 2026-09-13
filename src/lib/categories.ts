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

import {
  TRIP_STYLES,
  type BudgetTier,
  type CommuteMode,
  type IncomeBand,
  type Interest,
  type ItemCategory,
  type TripStyle,
  type WeekendShape,
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

/** Editor type tabs — Google Calendar's Event/Task row, for a trip. */
export type ActivityType =
  | "lodging"
  | "transportation"
  | "dining"
  | "event"
  | "attraction"
  | "excursion";

export const ACTIVITY_TYPES: readonly ActivityType[] = [
  "lodging",
  "transportation",
  "dining",
  "event",
  "attraction",
  "excursion",
] as const;

export const ACTIVITY_TYPE_META: Record<
  ActivityType,
  {
    label: string;
    category: ItemCategory;
    kind: "activity" | "stay" | "commute";
    titlePlaceholder: string;
    locationPlaceholder: string;
    guestsLabel: string;
    bookingPlaceholder?: string;
  }
> = {
  lodging: {
    label: "Lodging",
    category: "stay",
    kind: "stay",
    titlePlaceholder: "Add hotel or lodging",
    locationPlaceholder: "Add hotel",
    guestsLabel: "Who’s staying",
    bookingPlaceholder: "Confirmation number",
  },
  transportation: {
    label: "Transportation",
    category: "transit",
    kind: "commute",
    titlePlaceholder: "Add journey",
    locationPlaceholder: "Add station or pickup",
    guestsLabel: "Who’s travelling",
  },
  dining: {
    label: "Dining",
    category: "food",
    kind: "activity",
    titlePlaceholder: "Add restaurant",
    locationPlaceholder: "Add restaurant",
    guestsLabel: "Who’s going",
    bookingPlaceholder: "Reservation",
  },
  event: {
    label: "Event",
    category: "nightlife",
    kind: "activity",
    titlePlaceholder: "Add title",
    locationPlaceholder: "Add location",
    guestsLabel: "Who’s going",
    bookingPlaceholder: "Booking or ticket",
  },
  attraction: {
    label: "Attraction",
    category: "sightseeing",
    kind: "activity",
    titlePlaceholder: "Add title",
    locationPlaceholder: "Add location",
    guestsLabel: "Who’s going",
    bookingPlaceholder: "Timed entry or ticket",
  },
  excursion: {
    label: "Excursion",
    category: "outdoors",
    kind: "activity",
    titlePlaceholder: "Add title",
    locationPlaceholder: "Add meeting point",
    guestsLabel: "Who’s going",
  },
};

export function activityTypeOf(
  kind: "activity" | "stay" | "commute",
  category: ItemCategory,
): ActivityType {
  if (kind === "stay" || category === "stay") return "lodging";
  if (kind === "commute" || category === "transit") return "transportation";
  if (category === "food") return "dining";
  if (category === "outdoors") return "excursion";
  if (category === "sightseeing" || category === "culture") return "attraction";
  return "event";
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
 */
export const STYLE_META: Record<TripStyle, { label: string; blurb: string }> = {
  mountains: { label: "Mountains", blurb: "Peaks, trails, high country" },
  beaches: { label: "Beaches", blurb: "Coast, sand, salt water" },
  forests: { label: "Forests", blurb: "Woods, canopy, green cover" },
  deserts: { label: "Deserts", blurb: "Dunes, dry country, open sky" },
  "lakes-rivers": { label: "Lakes and rivers", blurb: "Fresh water, shores, valleys" },
  "historical-sites": { label: "Historical sites", blurb: "Places with a past you can walk" },
  monuments: { label: "Monuments", blurb: "Landmarks built to be seen" },
  "traditional-villages": { label: "Traditional villages", blurb: "Towns that still run on old rhythms" },
  "wildlife-safaris": { label: "Wildlife safaris", blurb: "Animals in their own landscape" },
  "adventure-parks": { label: "Adventure parks", blurb: "Purpose-built thrills" },
  "extreme-sports": { label: "Extreme sports", blurb: "High-adrenaline days" },
  "city-life": { label: "Enjoy city life", blurb: "Streets, density, urban energy" },
  architecture: { label: "Appreciate architecture", blurb: "Buildings worth looking at" },
  "beach-resort": { label: "Enjoy a beach resort", blurb: "Stay on the water" },
  "hot-springs": { label: "Be near hot springs", blurb: "Geothermal water close by" },
  rejuvenate: { label: "Rejuvenate", blurb: "Reset, recover, slow the clock" },
  peaceful: { label: "Be peaceful", blurb: "Quiet, unhurried, still" },
  spas: { label: "Enjoy spas", blurb: "Treatments, baths, wellness rooms" },
};

/** The order experiences are offered in. */
export const EXPERIENCE_ORDER: readonly TripStyle[] = TRIP_STYLES;

/** Same grouping pattern as activities — chips, not cards. */
export const EXPERIENCE_GROUPS = [
  {
    group: "Nature",
    styles: ["mountains", "beaches", "forests", "deserts", "lakes-rivers"] as const,
  },
  {
    group: "Culture heritage",
    styles: [
      "historical-sites",
      "monuments",
      "traditional-villages",
    ] as const,
  },
  {
    group: "Adventure",
    styles: ["wildlife-safaris", "adventure-parks", "extreme-sports"] as const,
  },
  {
    group: "Urban and modern",
    styles: ["city-life", "architecture"] as const,
  },
  {
    group: "Relaxation and wellness",
    styles: ["beach-resort", "hot-springs", "rejuvenate", "peaceful", "spas"] as const,
  },
] as const;

/**
 * Activities — the FILTER question.
 */
export const INTEREST_META: Record<
  Interest,
  { label: string; group: string }
> = {
  swimming: { label: "Swimming", group: "Water activities" },
  boating: { label: "Boating", group: "Water activities" },
  fishing: { label: "Fishing", group: "Water activities" },
  "beach-activities": { label: "Beach activities", group: "Water activities" },
  "kayaking-canoeing": { label: "Kayaking/canoeing", group: "Water activities" },
  snorkeling: { label: "Snorkelling", group: "Water activities" },
  "paddle-boarding": { label: "Paddle boarding", group: "Water activities" },
  "river-cruises": { label: "River cruises", group: "Water activities" },
  "waterfall-visits": { label: "Waterfall visits", group: "Water activities" },
  museums: { label: "Museums & galleries", group: "Cultural activities" },
  "live-music": { label: "Live music", group: "Cultural activities" },
  "cooking-classes": { label: "Cooking classes", group: "Cultural activities" },
  festivals: { label: "Local festivals", group: "Cultural activities" },
  "food-markets": { label: "Food markets", group: "Leisure activities" },
  "street-food": { label: "Street food", group: "Leisure activities" },
  "coffee-places": { label: "Coffee places", group: "Leisure activities" },
  "fine-dining": { label: "Fine dining", group: "Leisure activities" },
  "parks-gardens": { label: "Parks & gardens", group: "Leisure activities" },
  photography: { label: "Photography", group: "Leisure activities" },
  hiking: { label: "Hiking", group: "Sports and fitness" },
  cycling: { label: "Cycling", group: "Sports and fitness" },
  running: { label: "Running", group: "Sports and fitness" },
  yoga: { label: "Yoga", group: "Sports and fitness" },
  climbing: { label: "Climbing", group: "Sports and fitness" },
  "winter-sports": { label: "Winter sports", group: "Sports and fitness" },
  "walking-tours": { label: "Walking tours", group: "Urban exploration" },
  "street-art": { label: "Street art", group: "Urban exploration" },
  neighborhoods: { label: "Neighborhoods", group: "Urban exploration" },
  "bars-nightlife": { label: "Bars & nightlife", group: "Urban exploration" },
  "shopping-streets": { label: "Shopping streets", group: "Urban exploration" },
  viewpoints: { label: "Viewpoints", group: "Urban exploration" },
};

/** Activity groups in display order. */
export const ACTIVITY_GROUPS = [
  "Water activities",
  "Cultural activities",
  "Leisure activities",
  "Sports and fitness",
  "Urban exploration",
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
