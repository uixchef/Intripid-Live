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
 * Whether to boost well-known cities or quieter places. `open` is a real
 * answer, not an unanswered question — it means "don't weight scale".
 */
export type PopulatedPref = "open" | "popular" | "quiet";

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
  | "mountains"
  | "beaches"
  | "forests"
  | "deserts"
  | "lakes-rivers"
  | "historical-sites"
  | "monuments"
  | "traditional-villages"
  | "wildlife-safaris"
  | "adventure-parks"
  | "extreme-sports"
  | "city-life"
  | "architecture"
  | "beach-resort"
  | "hot-springs"
  | "rejuvenate"
  | "peaceful"
  | "spas";

export const TRIP_STYLES: readonly TripStyle[] = [
  "mountains",
  "beaches",
  "forests",
  "deserts",
  "lakes-rivers",
  "historical-sites",
  "monuments",
  "traditional-villages",
  "wildlife-safaris",
  "adventure-parks",
  "extreme-sports",
  "city-life",
  "architecture",
  "beach-resort",
  "hot-springs",
  "rejuvenate",
  "peaceful",
  "spas",
] as const;

/** Finer-grained interests, used to explain and differentiate recommendations. */
export type Interest =
  | "swimming"
  | "boating"
  | "fishing"
  | "beach-activities"
  | "kayaking-canoeing"
  | "snorkeling"
  | "paddle-boarding"
  | "river-cruises"
  | "waterfall-visits"
  | "museums"
  | "live-music"
  | "cooking-classes"
  | "festivals"
  | "food-markets"
  | "street-food"
  | "coffee-places"
  | "fine-dining"
  | "parks-gardens"
  | "photography"
  | "hiking"
  | "cycling"
  | "running"
  | "yoga"
  | "climbing"
  | "winter-sports"
  | "walking-tours"
  | "street-art"
  | "neighborhoods"
  | "bars-nightlife"
  | "shopping-streets"
  | "viewpoints";

export const INTERESTS: readonly Interest[] = [
  "swimming",
  "boating",
  "fishing",
  "beach-activities",
  "kayaking-canoeing",
  "snorkeling",
  "paddle-boarding",
  "river-cruises",
  "waterfall-visits",
  "museums",
  "live-music",
  "cooking-classes",
  "festivals",
  "food-markets",
  "street-food",
  "coffee-places",
  "fine-dining",
  "parks-gardens",
  "photography",
  "hiking",
  "cycling",
  "running",
  "yoga",
  "climbing",
  "winter-sports",
  "walking-tours",
  "street-art",
  "neighborhoods",
  "bars-nightlife",
  "shopping-streets",
  "viewpoints",
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
  /** Calendar year for `flexibleMonth` — April is not the same trip in 2026 and 2027. */
  flexibleYear: number;
  /** Only meaningful when dateMode is "flexible". */
  flexibleNights: number;
  origin: Origin | null;
  /** True once the traveller has confirmed the origin pin on the map. */
  originConfirmed: boolean;
  scope: TripScope | null;
  budget: BudgetTier | null;
  /** Rank-only: boost famous cities, quieter places, or neither. */
  populated: PopulatedPref | null;
  /** Optional refinement of what the chosen tier means for this traveller. */
  incomeBand: IncomeBand | null;
  /**
   * Must-have experiences. These FILTER: a city that cannot support one is
   * removed from the running, not merely ranked lower.
   */
  styles: TripStyle[];
  /** Preferred activities. These FILTER: a city that cannot support one is removed. */
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
  /** Editorial photo of the place — never a map tile. */
  photo?: string;
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
  key:
    | "budget"
    | "style"
    | "interests"
    | "season"
    | "distance"
    | "duration"
    | "populated";
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
  key: "dates" | "scope" | "reach" | "afford" | "experiences" | "activities";
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
  /** Portrait. Initials remain the fallback when this is missing. */
  photoUrl?: string;
  /** Index into the traveller colour ramp. */
  colorIndex: number;
  role: "owner" | "co-owner" | "editor" | "advisor" | "viewer";
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
  /**
   * Leftover briefing copy. Folded into `comments` on load; do not write new
   * notes — care notes live as comments from people on the trip.
   */
  notes?: string;
  comments?: { from: string; text: string }[];
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
    /** Free-standing origin when this is not a hop between two stops. */
    fromPlace?: Place;
    /** Free-standing destination. */
    toPlace?: Place;
  };
  /** Free-text booking note, e.g. "Confirmation FJ8L2Q". */
  booking?: string;
}

export type IdeaWhen = "flexible" | "morning" | "afternoon" | "evening" | "night";

export const IDEA_WHEN_LABELS: Record<IdeaWhen, string> = {
  flexible: "Flexible",
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  night: "Night",
};

export type IdeaAttachment =
  | { kind: "photo"; id: string; name: string; src: string }
  | { kind: "file"; id: string; name: string };

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
  /** Part of day this belongs in, before anyone puts it on the grid. */
  when?: IdeaWhen;
  /** Why the assistant is suggesting it — or the writer's own description. */
  reason: string;
  /** Who added it — travellers add ideas too, not just the assistant. */
  addedBy: string;
  costUsd?: number;
  attachments?: IdeaAttachment[];
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
  /** Photo on the trip. Null uses the destination drawing. */
  coverImage?: string | null;
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
 * A prize on the identity row — the original dashboard's four circles.
 * Empty slots stay visible so the set reads as a collection, not a list
 * that happens to have two items.
 */
export interface TravelBadge {
  id: string;
  label: string;
  /** Short line on hover / for screen readers. */
  detail: string;
  earned: boolean;
  /** Prize artwork from the profile design. */
  image: string;
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

/** A city or stop on the traveller's footprint map. */
export type VisitedLocationKind = "home" | "visited" | "transit";

export interface VisitedLocation {
  id: string;
  name: string;
  coords: LngLat;
  kind: VisitedLocationKind;
  /** ISO 3166-1 alpha-2, for the circular flag on the footprint list. */
  countryCode?: string;
}

/**
 * A place this traveller has ruled out.
 *
 * Scale is the unit they meant — a city, a state, a country, or a whole
 * continent — so the identity map can paint an area rather than a pin.
 */
export type AvoidScale = "continent" | "country" | "state" | "city";

export interface AvoidPlace {
  id: string;
  name: string;
  scale: AvoidScale;
  coords: LngLat;
  /** ISO 3166-1 alpha-2, when the area is a country (or Antarctica). */
  iso2?: string;
  /** Halo used at globe zoom so small places still read as a region. */
  radiusKm: number;
  /** Optional outline; used for states that are not in the country tileset. */
  polygon?: [number, number][];
  /** Extra ISO codes when the area is a continent or region. */
  iso2Group?: string[];
}

/** A place they want to go — pin, not an area. */
export interface WishlistPlace {
  id: string;
  name: string;
  coords: LngLat;
  countryCode?: string;
}

export type FootprintCategory = "wishlist" | "visited" | "avoid";

/** How this traveller eats when we book or rank meals. */
export type DietPreference =
  | "omnivore"
  | "vegetarian"
  | "vegan"
  | "pescatarian"
  | "halal"
  | "kosher";

/** Allergens and exclusions. Multi-select; never required. */
export type FoodRestriction =
  | "gluten"
  | "dairy"
  | "nuts"
  | "peanuts"
  | "shellfish"
  | "egg"
  | "soy"
  | "sesame";

/** Documents we keep so booking and border questions are not asked twice. */
export interface TravelDocuments {
  nationality: string;
  passportNumber: string;
  passportExpiry: string;
  knownTravellerNumber: string;
  emergencyName: string;
  emergencyPhone: string;
}

/** Why this person is on Friends & family — not a social graph role. */
export type HouseholdRelation = "partner" | "family" | "friend" | "colleague";

/** How well they get around in a spoken language. */
export type LanguageLevel = "native" | "fluent" | "conversational" | "basic";

export type LanguageId =
  | "english"
  | "hindi"
  | "spanish"
  | "french"
  | "portuguese"
  | "german"
  | "italian"
  | "japanese"
  | "mandarin"
  | "arabic"
  | "korean"
  | "dutch"
  | "danish"
  | "swedish"
  | "icelandic";

export interface LanguageSkill {
  id: LanguageId;
  level: LanguageLevel;
}

export interface SavedAddress {
  id: string;
  street: string;
  city: string;
  postal: string;
  country: string;
  countryCode: string;
}

export interface AccountUser {
  id: string;
  name: string;
  /** Without the leading "@". */
  handle: string;
  initials: string;
  /** Portrait when we have one; initials otherwise. */
  photoUrl?: string;
  /** Index into the traveller colour ramp, shared with the planner. */
  colorIndex: number;
  /** Where they travel from by default; feeds Discovery's origin step. */
  homeCity: string;
  homeCountry: string;
  /** Street or building, when they have given one. */
  homeAddress: string;
  /** Saved departure addresses — street, city, postal, country. */
  addresses: SavedAddress[];
  defaultAddressId: string;
  /** Known diet ids, plus any custom tags the traveller added. */
  diets: string[];
  /** Known allergen ids, plus any custom exclusions. */
  foodRestrictions: string[];
  /** Spoken languages, with how well they travel in them. */
  languages: LanguageSkill[];
  incomeBand: IncomeBand | null;
  documents: TravelDocuments;
  memberSinceIso: string;
  stats: TravelStats;
  badges: TravelBadge[];
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
 * `plannerTripId` is the `/trip/[id]` route. Dashboard trips carry a finished
 * itinerary and roster. Discovery drafts a city; dates-first opens empty.
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
  /** Route id for `/trip/[id]`. */
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
  /** Public username, shown as @handle. */
  handle: string;
  initials: string;
  photoUrl?: string;
  colorIndex: number;
  /** Trips taken together, most recent first. */
  history: string[];
  /** True when they are on at least one of your active trips. */
  onCurrentTrip: boolean;
  relation?: HouseholdRelation;
  /**
   * `sent` / `received` are pending requests (Requests tab).
   * Omit or `connected` is a confirmed connect.
   */
  invite?: "connected" | "sent" | "received";
  /** Address used to send a connection request. */
  email?: string;
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
 * One seasonal destination feature in the dashboard carousel.
 *
 * The original dashboard carried a Cherry Blossom news card. Kept as a
 * rotating set: windows close, and Discovery can act on the one in view.
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
