import { NYC_TRIP, NYC_TRIP_ID } from "@/data/nyc-trip";
import type { TripStatus, TripSummary } from "@/lib/types";

/**
 * The traveller's trips, as the dashboard knows them.
 *
 * WHAT IS REAL. Exactly one of these has an itinerary behind it: the New York
 * trip, whose `plannerTripId` points at the planner's seeded 39-item
 * schedule. Its name and dates are read from that trip rather than retyped,
 * so the dashboard can never disagree with the planner it links to.
 *
 * The others are summaries. That is stated in the model — `stops: null` and
 * no `plannerTripId` — and the card acts on it by offering a different
 * primary action instead of opening an empty planner. A dashboard full of
 * cards that all claim to open a full itinerary and then don't is worse than
 * one that is honest about which trip is built.
 *
 * ONGOING IS DELIBERATELY EMPTY. Every tab having content would mean the
 * empty state never renders, and a filter with nothing in it is a state this
 * screen genuinely has. It is seeded as the one tab that shows it.
 */

const LONDON = { city: "London", countryCode: "GB", flag: "🇬🇧" } as const;

export const TRIP_SUMMARIES: TripSummary[] = [
  {
    id: NYC_TRIP_ID,
    /* Read from the planner, never retyped. */
    name: NYC_TRIP.name,
    status: "upcoming",
    destinationId: NYC_TRIP.destinationId,
    origin: LONDON,
    startDate: NYC_TRIP.startDate,
    endDate: NYC_TRIP.endDate,
    /* The real count, derived from the real itinerary. */
    stops: NYC_TRIP.items.filter((item) => item.kind === "activity").length,
    travellerIds: NYC_TRIP.travellers.map((traveller) => traveller.id),
    plannerTripId: NYC_TRIP_ID,
  },
  {
    id: "t-lisbon-weekend",
    name: "Lisbon long weekend",
    status: "upcoming",
    destinationId: "lisbon",
    origin: LONDON,
    startDate: "2026-05-22",
    endDate: "2026-05-25",
    stops: null,
    travellerIds: ["t-maya"],
  },
  {
    id: "t-tokyo-blossom",
    name: "Tokyo in blossom season",
    status: "completed",
    destinationId: "tokyo",
    origin: LONDON,
    /* 2025: every completed trip should sit behind the seeded "today". */
    startDate: "2025-03-26",
    endDate: "2025-04-04",
    stops: 21,
    travellerIds: ["t-priya", "c-theo"],
    note: "Hit the peak by three days. Ueno after dark was the whole trip.",
  },
  {
    id: "t-marrakesh",
    name: "Marrakesh, off the grid",
    status: "completed",
    destinationId: "marrakesh",
    origin: LONDON,
    startDate: "2025-10-11",
    endDate: "2025-10-16",
    stops: 14,
    travellerIds: ["t-danny"],
    note: "Almost nothing booked in advance. Would do that again.",
  },
  {
    id: "t-copenhagen",
    name: "Copenhagen weekend",
    status: "completed",
    destinationId: "copenhagen",
    origin: LONDON,
    startDate: "2025-06-13",
    endDate: "2025-06-15",
    stops: 9,
    travellerIds: ["t-maya", "t-jonas"],
    note: "Two days, one bike, no plan after lunch.",
  },
];

/* -------------------------------------------------------------------------- */
/* Derived views                                                              */
/* -------------------------------------------------------------------------- */

/** Tab order, and the labels the original dashboard used. */
export const TRIP_FILTERS = [
  "all",
  "completed",
  "ongoing",
  "upcoming",
] as const;

export type TripFilter = (typeof TRIP_FILTERS)[number];

export const TRIP_FILTER_LABEL: Record<TripFilter, string> = {
  all: "All",
  completed: "Completed",
  ongoing: "Ongoing",
  upcoming: "Upcoming",
};

export const TRIP_STATUS_LABEL: Record<TripStatus, string> = {
  upcoming: "Upcoming",
  ongoing: "In progress",
  completed: "Completed",
};

/**
 * Upcoming first, then in progress, then completed most-recent-first.
 *
 * A home screen is sorted by what you are about to do, not by when a record
 * was created — the trip you fly to on Tuesday belongs above the one you got
 * back from in June.
 */
const STATUS_RANK: Record<TripStatus, number> = {
  ongoing: 0,
  upcoming: 1,
  completed: 2,
};

export function sortTrips(trips: TripSummary[]): TripSummary[] {
  return [...trips].sort((a, b) => {
    const byStatus = STATUS_RANK[a.status] - STATUS_RANK[b.status];
    if (byStatus !== 0) return byStatus;
    /* Soonest first while it is ahead of you, latest first once it is behind. */
    return a.status === "completed"
      ? b.startDate.localeCompare(a.startDate)
      : a.startDate.localeCompare(b.startDate);
  });
}

export function filterTrips(
  trips: TripSummary[],
  filter: TripFilter,
): TripSummary[] {
  const matching =
    filter === "all" ? trips : trips.filter((trip) => trip.status === filter);
  return sortTrips(matching);
}

/** Counts for the tab strip, so a tab can say how much is behind it. */
export function tripCounts(trips: TripSummary[]): Record<TripFilter, number> {
  return {
    all: trips.length,
    completed: trips.filter((trip) => trip.status === "completed").length,
    ongoing: trips.filter((trip) => trip.status === "ongoing").length,
    upcoming: trips.filter((trip) => trip.status === "upcoming").length,
  };
}
