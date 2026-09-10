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

/**
 * How the dates were expressed. Three modes, restored from the original
 * product: a specific window, an open month, or "this weekend" — which was
 * first-class because weekend trips are a quarter of global bookings.
 */
export type DateMode = "specific" | "flexible" | "weekend";

/** What "the weekend" means to this traveller. Asked as a clarifying sub-step. */
export type WeekendShape = "fri-sun" | "sat-mon" | "sat-sun";

/**
 * Income band, used once per session to normalise what a budget tier means.
 * Two-layer budget — qualitative posture, quantitatively normalised — was one
 * of the original product's better ideas. It is always optional and never
 * blocks the flow.
 */
export type IncomeBand =
  | "under-40"
  | "40-75"
  | "75-125"
  | "125-200"
  | "over-200";

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
  /** Only meaningful when dateMode is "weekend". */
  weekendShape: WeekendShape;
  /** Only meaningful when dateMode is "flexible": 0-indexed month. */
  flexibleMonth: number;
  /** Only meaningful when dateMode is "flexible". */
  flexibleNights: number;
  origin: Origin | null;
  /** True once the traveller has confirmed the origin pin on the map. */
  originConfirmed: boolean;
  scope: TripScope | null;
  budget: BudgetTier | null;
  /** Optional refinement of what the chosen tier means for this traveller. */
  incomeBand: IncomeBand | null;
  /**
   * Must-have experiences. These FILTER: a city that cannot support one is
   * removed from the running, not merely ranked lower.
   */
  styles: TripStyle[];
  /** Preferred activities. These RANK the survivors; they never eliminate. */
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

/**
 * One hard-filter stage and what it eliminated.
 *
 * The original product narrated its filtering with live counts rather than
 * showing a spinner, and every question was labelled as narrowing or ordering
 * the results. Both need this data to be real rather than decorative.
 */
export interface FilterStage {
  key: "dates" | "scope" | "reach" | "afford" | "experiences";
  /** Present tense, what we are doing. */
  label: string;
  /** Why it takes a moment. */
  detail: string;
  /** How many candidates entered this stage. */
  entered: number;
  /** How many this stage eliminated. */
  removed: number;
  /** Ids eliminated here, so the map can cull them in the right order. */
  removedIds: string[];
}

/**
 * The full result of a discovery pass: which candidates survived each hard
 * filter, and the ranked survivors.
 */
export interface RecommendationSet {
  /** Hard-filter stages in execution order. */
  stages: FilterStage[];
  /** Survivors, ranked. */
  ranked: Recommendation[];
  /** The decisive answer. Exactly three, or fewer if that is the truth. */
  top: Recommendation[];
  /** Everything that was eliminated, with the stage that did it. */
  eliminated: { destination: Destination; stage: FilterStage["key"] }[];
  /**
   * True when filtering would have emptied the set and we ranked instead.
   * Surfaced in the UI — a silent fallback would be dishonest.
   */
  relaxed: boolean;
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

/* -------------------------------------------------------------------------- */
/* Account — the authenticated dashboard                                      */
/*                                                                            */
/* The landing page at `/` is the logged-out door. A returning user has an    */
/* account, and these are the objects that account is made of. There is no    */
/* real auth behind them: the session is a deterministic local mock, which is */
/* the honest shape for a portfolio build.                                    */
/* -------------------------------------------------------------------------- */

/** Who is looking. The app only ever needs to distinguish these two. */
export type SessionState = "guest" | "authenticated";

/**
 * Traveller statistics.
 *
 * `avoid` is inherited from the original product and is the most distinctive
 * of the three: Intripid lets you rule places OUT, and a recommender that
 * knows where you will not go is more useful than one that only knows where
 * you might. It is a first-class count, not a footnote.
 */
export interface TravelStats {
  wishlist: number;
  visited: number;
  avoid: number;
}

/**
 * A trait the recommender actually uses.
 *
 * Deliberately not a badge or an achievement. The original dashboard showed
 * four badge-like circles; read as product rather than as decoration, what
 * belongs in that position is the standing input to every recommendation —
 * the things Discovery would otherwise have to ask again.
 */
export interface PersonaTrait {
  id: string;
  label: string;
  /** What this trait causes the product to do differently. */
  effect: string;
  /** Which brand channel carries it, so the row is legible at a glance. */
  channel: "purple" | "teal" | "orange" | "pink";
}

/** The standing preference profile shown as "About". */
export interface TravelPersona {
  /** Prose summary, editable. */
  summary: string;
  traits: PersonaTrait[];
  /** How much structure this traveller wants in a day. */
  pace: "loose" | "moderate" | "packed";
  /** Interests carried into Discovery's ranking. */
  interests: Interest[];
  /** Preferred trip character. */
  styles: TripStyle[];
  /** Typical budget tier, used to pre-fill Discovery. */
  budget: BudgetTier;
  /** ISO date the persona was last confirmed by the user. */
  updatedIso: string;
}

export interface AccountUser {
  id: string;
  name: string;
  /** Without the leading "@". */
  handle: string;
  initials: string;
  /** Index into the traveller colour ramp, shared with the planner. */
  colorIndex: number;
  /** Where they travel from by default; feeds Discovery's origin step. */
  homeCity: string;
  homeCountry: string;
  memberSinceIso: string;
  stats: TravelStats;
  persona: TravelPersona;
}

/* -------------------------------------------------------------------------- */
/* Trip summaries                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Status is stored, not derived from today's date.
 *
 * Deriving it would make the dashboard mean different things on different
 * days — the seeded April trip would silently become "completed" and the
 * planner, which presents it as a live trip, would contradict the dashboard
 * that links to it. Deterministic demo data has to be deterministic in time
 * as well as in content.
 */
export type TripStatus = "upcoming" | "ongoing" | "completed";

/**
 * A trip as the dashboard knows it.
 *
 * Only one seeded trip has a real itinerary behind it (`plannerTripId` points
 * at the planner's NYC trip). The rest are summaries, and the card says so by
 * offering a different primary action rather than pretending to open a
 * planner that has nothing in it.
 */
export interface TripSummary {
  id: string;
  name: string;
  status: TripStatus;
  /** Destination id, so covers, flags and Discovery data all resolve. */
  destinationId: string;
  /** Where the traveller set out from. */
  origin: { city: string; countryCode: string; flag: string };
  /** ISO dates, inclusive. */
  startDate: string;
  endDate: string;
  /** Scheduled stops. Null when the trip is a summary with no itinerary. */
  stops: number | null;
  /** Traveller ids from the planner's roster, so the two agree. */
  travellerIds: string[];
  /** Set only when a real planner itinerary exists for this trip. */
  plannerTripId?: string;
  /** One line of why this trip exists, shown on completed trips. */
  note?: string;
}

/* -------------------------------------------------------------------------- */
/* Connections                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Someone you have travelled with.
 *
 * This is the dashboard end of the planner's collaboration model: the same
 * people, with the history that explains why they are suggested. It is not a
 * social graph — there is no following, no feed and no profile page.
 */
export interface Connection {
  /** Matches a planner traveller id where the person is on the NYC trip. */
  id: string;
  name: string;
  initials: string;
  colorIndex: number;
  /** Trips taken together, most recent first. */
  history: string[];
  /** True when they are on at least one of your active trips. */
  onCurrentTrip: boolean;
}

/* -------------------------------------------------------------------------- */
/* Notifications                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Notifications are only worth having if every one of them is actionable.
 * Each carries the route it resolves to; there is no "someone liked this".
 */
export interface AppNotification {
  id: string;
  kind: "collaboration" | "advisor" | "season";
  title: string;
  detail: string;
  /** Relative age, stored as text so the demo never drifts. */
  age: string;
  /** Where acting on it takes you. */
  href: string;
  read: boolean;
}

/* -------------------------------------------------------------------------- */
/* Editorial                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * One seasonal destination feature.
 *
 * The original dashboard carried a Cherry Blossom news card. Kept, but pointed
 * back into the product: the reason to show it is that the window is closing
 * and Discovery can act on that, not that it is news.
 */
export interface EditorialFeature {
  id: string;
  /** Destination id, so it links into Discovery with real data behind it. */
  destinationId: string;
  eyebrow: string;
  headline: string;
  body: string;
  /** The window this is about, in the traveller's terms. */
  window: string;
  /** Why it is being surfaced now, tied to the persona. */
  because: string;
}

/** A place kept for later, from Discovery or from a feature. */
export interface SavedDestination {
  destinationId: string;
  /** What made them save it. */
  reason: string;
  /** Best months, in the traveller's terms. */
  window: string;
}
