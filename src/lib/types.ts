/**
 * Intripid domain model.
 *
 * Two connected products share this model:
 *  - Destination Discovery: turn loose constraints into ranked destinations.
 *  - Trip Planner: turn a chosen destination into a timeline.
 *
 * The historical product's core insight is encoded here: a trip is a TIMELINE
 * of structured objects (stays, activities, commutes) before it is a list.
 */

/* -------------------------------------------------------------------------- */
/* Shared                                                                     */
/* -------------------------------------------------------------------------- */

export interface LngLat {
  lng: number;
  lat: number;
}

export interface Place {
  name: string;
  /** Street address, or a neighbourhood when a street address is meaningless. */
  address: string;
  coords: LngLat;
  neighbourhood?: string;
}

/* -------------------------------------------------------------------------- */
/* Discovery preferences                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Budget bands, carried over from the historical product because the labels
 * did real work — they describe a posture, not a number.
 */
export type BudgetTier = "backpack" | "budget" | "premium" | "luxury";

export const BUDGET_TIERS: readonly BudgetTier[] = [
  "backpack",
  "budget",
  "premium",
  "luxury",
] as const;

/** How far the traveller is willing to go. `open` means "surprise me". */
export type TripScope = "domestic" | "international" | "open";

/** How the dates were expressed. Flexible dates widen seasonal scoring. */
export type DateMode = "exact" | "flexible" | "weekend";

/**
 * Trip style — the single "what kind of trip is this?" axis. Deliberately kept
 * to one multi-select question; the historical product learned that splitting
 * this into several questions created friction without improving results.
 */
export type TripStyle =
  | "slow"
  | "adventure"
  | "culture"
  | "food"
  | "nightlife"
  | "nature"
  | "beach"
  | "city";

export const TRIP_STYLES: readonly TripStyle[] = [
  "slow",
  "adventure",
  "culture",
  "food",
  "nightlife",
  "nature",
  "beach",
  "city",
] as const;

/** Finer-grained interests, used to explain and differentiate recommendations. */
export type Interest =
  | "museums"
  | "architecture"
  | "live-music"
  | "markets"
  | "coffee"
  | "fine-dining"
  | "street-food"
  | "hiking"
  | "water"
  | "shopping"
  | "history"
  | "nightlife";

export const INTERESTS: readonly Interest[] = [
  "museums",
  "architecture",
  "live-music",
  "markets",
  "coffee",
  "fine-dining",
  "street-food",
  "hiking",
  "water",
  "shopping",
  "history",
  "nightlife",
] as const;

export interface Origin {
  /** City label as the traveller would say it, e.g. "London". */
  city: string;
  country: string;
  countryCode: string;
  coords: LngLat;
}

/**
 * Everything discovery learns about the traveller. Every field is optional
 * because recommendations must work from partial input — the product should
 * never require a completed questionnaire before showing value.
 */
export interface DiscoveryPreferences {
  dateMode: DateMode;
  startDate: string | null;
  endDate: string | null;
  origin: Origin | null;
  scope: TripScope | null;
  budget: BudgetTier | null;
  styles: TripStyle[];
  interests: Interest[];
}

/* -------------------------------------------------------------------------- */
/* Destinations                                                               */
/* -------------------------------------------------------------------------- */

/** A 0..1 fit score keyed by an enum. */
export type FitMap<K extends string> = Record<K, number>;

export interface SeasonMonth {
  /** 0 = January. */
  month: number;
  /** 0..1 — how pleasant the destination is that month. */
  score: number;
  highC: number;
  lowC: number;
  /** Short human label, e.g. "Crisp and clear". */
  label: string;
}

export interface Attraction {
  name: string;
  category: ItemCategory;
  coords: LngLat;
  /** One-line reason this is worth the traveller's time. */
  note: string;
}

export interface Destination {
  id: string;
  /** City name alone, e.g. "New York City". */
  name: string;
  /** Region/state line, e.g. "New York". Omitted for city-states. */
  region?: string;
  country: string;
  countryCode: string;
  /** Emoji flag — used sparingly, as a wayfinding aid rather than decoration. */
  flag: string;
  coords: LngLat;
  /** Sensible initial map framing for this destination. */
  zoom: number;
  /** One-sentence editorial description. */
  blurb: string;
  /** Three concrete reasons, in the product's voice. Never generic. */
  whyYoullLoveIt: string[];
  /** Where the destination sits on the map at a glance. */
  continent: string;
  budgetFit: FitMap<BudgetTier>;
  styleFit: FitMap<TripStyle>;
  interestFit: FitMap<Interest>;
  /** Indicative on-the-ground spend per person per day, in USD. */
  dailyBudgetUsd: FitMap<BudgetTier>;
  season: SeasonMonth[];
  attractions: Attraction[];
  /** Great-circle hours are derived; this is a hand-tuned realistic figure. */
  timezone: string;
  /** Currency code, shown in the destination bridge. */
  currency: string;
  /** Language line, e.g. "English". */
  language: string;
  /** Ideal trip length in days, used to flag date mismatches. */
  idealDays: [number, number];
}

/* -------------------------------------------------------------------------- */
/* Recommendations                                                            */
/* -------------------------------------------------------------------------- */

/** Why a destination scored the way it did — drives the "Why here" surface. */
export interface ScoreFactor {
  key: "budget" | "style" | "interests" | "season" | "distance" | "duration";
  label: string;
  /** 0..1 — how well this factor matched. */
  score: number;
  /** 0..1 — how much this factor influenced the total. */
  weight: number;
  /** Human explanation, e.g. "Premium goes a long way here". */
  detail: string;
}

export interface Recommendation {
  destination: Destination;
  /** 0..100. */
  score: number;
  /** 0..1 — how much evidence the score rests on. */
  confidence: number;
  factors: ScoreFactor[];
  /** Interests this destination genuinely serves, ordered by strength. */
  matchedInterests: Interest[];
  /** Estimated total on-the-ground cost for the trip window, in USD. */
  estimatedBudgetUsd: number | null;
  /** Rank in the current result set, 1-based. */
  rank: number;
}

/* -------------------------------------------------------------------------- */
/* Trip planner                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Category drives colour, icon and semantics across calendar, map and list.
 * Kept deliberately small — one colour per category only works if the set is
 * legible at a glance.
 */
export type ItemCategory =
  | "stay"
  | "food"
  | "culture"
  | "outdoors"
  | "sightseeing"
  | "nightlife"
  | "shopping"
  | "transit";

export const ITEM_CATEGORIES: readonly ItemCategory[] = [
  "stay",
  "food",
  "culture",
  "outdoors",
  "sightseeing",
  "nightlife",
  "shopping",
  "transit",
] as const;

/**
 * Structural kind, independent of category. A commute is scheduled time that
 * the traveller does not choose; a stay spans days rather than hours.
 */
export type ItemKind = "activity" | "stay" | "commute";

export type CommuteMode = "walk" | "subway" | "taxi" | "ferry" | "bike";

export interface Traveller {
  id: string;
  name: string;
  initials: string;
  /** Index into the traveller colour ramp. */
  colorIndex: number;
  role: "owner" | "editor" | "advisor" | "viewer";
  /** Simulated presence. */
  online: boolean;
  /** What they are looking at, when present. Powers lightweight presence. */
  viewingItemId?: string;
}

export interface ItineraryItem {
  id: string;
  kind: ItemKind;
  category: ItemCategory;
  title: string;
  /** Optional supporting line, e.g. "Table for 4 · outdoor". */
  subtitle?: string;
  place: Place | null;
  /**
   * ISO datetime. Null only for ideas that have never been scheduled.
   * Stays use start/end to span nights.
   */
  start: string | null;
  end: string | null;
  notes?: string;
  /**
   * Flexible items can be moved by the assistant when it rebalances a day.
   * Non-flexible items are anchored (a booked table, a timed museum entry).
   */
  flexible: boolean;
  /** Travellers this item is for. Empty means "everyone". */
  assignedTo: string[];
  createdBy: string;
  /** Indicative cost per person in USD. */
  costUsd?: number;
  /** Set for commute items — the leg they represent. */
  commute?: {
    mode: CommuteMode;
    minutes: number;
    distanceKm: number;
    fromItemId: string;
    toItemId: string;
  };
  /** Free-text booking note, e.g. "Confirmation FJ8L2Q". */
  booking?: string;
}

/**
 * An unscheduled suggestion. Lives in the "Ideas" rail and can be dragged onto
 * the calendar. Carries enough shape to become an ItineraryItem directly.
 */
export interface Idea {
  id: string;
  category: ItemCategory;
  title: string;
  subtitle?: string;
  place: Place | null;
  /** Typical duration in minutes, used when it lands on the calendar. */
  durationMin: number;
  /** Why the assistant is suggesting it. */
  reason: string;
  /** Who added it — travellers add ideas too, not just the assistant. */
  addedBy: string;
  costUsd?: number;
}

export interface Trip {
  id: string;
  name: string;
  destinationId: string;
  /** ISO date, inclusive. */
  startDate: string;
  /** ISO date, inclusive. */
  endDate: string;
  timezone: string;
  travellers: Traveller[];
  items: ItineraryItem[];
  ideas: Idea[];
  /** Preferences carried over from discovery, for the "why this trip" context. */
  fromDiscovery?: {
    budget: BudgetTier | null;
    styles: TripStyle[];
    interests: Interest[];
    score: number;
  };
}

/* -------------------------------------------------------------------------- */
/* Assistant                                                                  */
/* -------------------------------------------------------------------------- */

/** A concrete, reviewable change the assistant proposes. */
export interface AssistantChange {
  id: string;
  kind: "move" | "add" | "remove" | "shorten" | "insert-commute";
  itemId?: string;
  /** Human summary, e.g. "Move The Met to 13:30 to clear the overlap". */
  summary: string;
  /** The proposed patch, applied only if accepted. */
  patch?: Partial<ItineraryItem>;
  /** For "add", the full item to create. */
  create?: ItineraryItem;
}

export interface AssistantPlan {
  id: string;
  /** Which intervention produced this plan. */
  intent: "rebalance" | "resolve-overlap" | "fill-gap" | "near-route";
  title: string;
  /** The reasoning, shown as narrated steps rather than a chat bubble. */
  rationale: string[];
  changes: AssistantChange[];
  /** Day this plan applies to, ISO date. */
  dayIso: string;
}

/* -------------------------------------------------------------------------- */
/* Derived view models                                                        */
/* -------------------------------------------------------------------------- */

/** A detected scheduling problem, surfaced in the UI rather than silently allowed. */
export interface Conflict {
  kind: "overlap" | "impossible-commute" | "tight-turnaround";
  itemIds: string[];
  message: string;
  severity: "warning" | "error";
}
