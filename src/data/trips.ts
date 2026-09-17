import { ACCOUNT_USER, CONNECTIONS } from "@/data/account";
import { NYC_TRIP, NYC_TRIP_ID } from "@/data/nyc-trip";
import { DESTINATIONS, getDestination } from "@/data/destinations";
import { coverPhotoSrc, placePhotoSrc } from "@/data/place-photos";
import { connectionAsTraveller } from "@/lib/collaboration";
import { planFixedTrip } from "@/lib/trip/fixed-plan";
import {
  planFromDestination,
  tripTitleForDestination,
  type DraftPrefs,
} from "@/lib/trip/from-destination";
import { atMinutes, shiftDayKey } from "@/lib/trip/time";
import type { Route } from "next";
import type {
  BudgetTier,
  Interest,
  LngLat,
  Traveller,
  Trip,
  TripStatus,
  TripStyle,
  TripSummary,
  VisitedLocation,
} from "@/lib/types";

/**
 * The traveller's trips, as the dashboard knows them.
 *
 * New York carries the flagship itinerary. The other dashboard trips are
 * finished records too — dense calendars and a real party — so opening one
 * from the profile never lands on a blank week.
 *
 * Dates-first from the landing is a blank draft. Discovery still drafts a
 * city from its attractions.
 */

export const DRAFT_TRIP_ID = "draft";

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
    stops: 19,
    travellerIds: ["u-sarthak", "t-maya", "c-nina", "t-danny", "t-jonas"],
    plannerTripId: "t-lisbon-weekend",
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
    stops: 52,
    travellerIds: ["t-priya", "c-theo", "u-sarthak", "t-maya", "t-kenji", "t-elena"],
    plannerTripId: "t-tokyo-blossom",
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
    stops: 27,
    travellerIds: ["t-danny", "t-maya", "u-sarthak", "t-jonas"],
    plannerTripId: "t-marrakesh",
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
    stops: 13,
    travellerIds: ["t-maya", "t-jonas", "t-priya", "u-sarthak", "t-danny"],
    plannerTripId: "t-copenhagen",
    note: "Two days, one bike, no plan after lunch.",
  },
];

export function tripTravellers(ids: string[]): Traveller[] {
  return ids
    .map((id) => {
      if (id === ACCOUNT_USER.id) {
        return {
          id: ACCOUNT_USER.id,
          name: ACCOUNT_USER.name,
          initials: ACCOUNT_USER.initials,
          photoUrl: ACCOUNT_USER.photoUrl,
          colorIndex: ACCOUNT_USER.colorIndex,
          role: "editor" as const,
          online: true,
        };
      }
      const planner = NYC_TRIP.travellers.find((person) => person.id === id);
      if (planner) return planner;
      const connection = CONNECTIONS.find((person) => person.id === id);
      return connection ? connectionAsTraveller(connection) : null;
    })
    .filter((person): person is Traveller => Boolean(person));
}

function defaultWindow(destinationId: string): { startDate: string; endDate: string } {
  const destination = getDestination(destinationId);
  const nights = Math.max((destination?.idealDays[0] ?? 4) - 1, 3);
  const startDate = "2026-06-18";
  return { startDate, endDate: shiftDayKey(startDate, nights) };
}

function withDates(
  trip: Trip,
  dates?: { startDate?: string; endDate?: string },
): Trip {
  const startDate = dates?.startDate;
  const endDate = dates?.endDate;
  if (!startDate || !endDate || endDate < startDate) return trip;
  if (trip.items.length > 0) return trip;
  return { ...trip, startDate, endDate };
}

function rosterFor(ids: string[]): Traveller[] {
  const travellers = tripTravellers(ids);
  if (travellers.length === 0) return [NYC_TRIP.travellers[0]];
  return travellers.map((person, index) => {
    const role =
      index === 0
        ? "owner"
        : index === 1
          ? "co-owner"
          : person.id === "t-jonas"
            ? "advisor"
            : "editor";
    return {
      ...person,
      role,
      online: index % 3 !== 2,
    };
  });
}

/** Planner trip for a catalog destination — calendar filled from attractions. */
export function tripFromDestination(
  destinationId: string,
  options?: {
    startDate?: string;
    endDate?: string;
    name?: string;
    prefs?: DraftPrefs;
  },
): Trip | undefined {
  const destination = getDestination(destinationId);
  if (!destination) return undefined;
  const fromDiscovery = Boolean(
    options?.prefs?.styles?.length ||
      options?.prefs?.interests?.length ||
      options?.prefs?.budget ||
      options?.startDate,
  );
  if (destinationId === "nyc" && !fromDiscovery) return NYC_TRIP;

  const window = defaultWindow(destinationId);
  const startDate = options?.startDate ?? window.startDate;
  const endDate = options?.endDate ?? window.endDate;
  const owner = draftOwner();
  const { items, ideas } = planFromDestination(
    destination,
    startDate,
    endDate,
    owner.id,
    options?.prefs,
  );

  return {
    id: destinationId,
    name: options?.name ?? tripTitleForDestination(destination, startDate, endDate),
    destinationId,
    startDate,
    endDate,
    timezone: destination.timezone,
    travellers: [owner],
    items,
    ideas,
    coverImage: coverPhotoSrc(destinationId),
    fromDiscovery: options?.prefs
      ? {
          budget: options.prefs.budget ?? null,
          styles: options.prefs.styles ?? [],
          interests: options.prefs.interests ?? [],
          score: options.prefs.score ?? 0,
        }
      : undefined,
  };
}

/** Planner payload for a dashboard trip. NYC keeps its itinerary. */
export function plannerTripFromSummary(summary: TripSummary): Trip {
  if (summary.id === NYC_TRIP_ID || summary.plannerTripId === NYC_TRIP_ID) {
    return NYC_TRIP;
  }

  const destination = getDestination(summary.destinationId);
  const roster = rosterFor(summary.travellerIds);

  const { items, ideas } = destination
    ? planFixedTrip(destination, summary.startDate, summary.endDate, roster)
    : { items: [] as Trip["items"], ideas: [] as Trip["ideas"] };

  return {
    id: summary.plannerTripId ?? summary.id,
    name: summary.name,
    destinationId: summary.destinationId,
    startDate: summary.startDate,
    endDate: summary.endDate,
    timezone: destination?.timezone ?? "UTC",
    travellers: roster,
    items,
    ideas,
    coverImage: coverPhotoSrc(summary.destinationId),
  };
}

export function plannerTripIdForDestination(destinationId: string): string {
  if (destinationId === "nyc") return NYC_TRIP_ID;
  return destinationId;
}

export function plannerHrefForDestination(
  destinationId: string,
  dates?: { start?: string | null; end?: string | null },
  prefs?: DraftPrefs,
): Route {
  const tripId = destinationId;
  const params = new URLSearchParams();
  if (dates?.start && dates.end) {
    params.set("from", dates.start);
    params.set("to", dates.end);
  }
  if (prefs?.styles?.length) params.set("styles", prefs.styles.join(","));
  if (prefs?.interests?.length) params.set("interests", prefs.interests.join(","));
  if (prefs?.budget) params.set("budget", prefs.budget);
  const query = params.toString();
  return (query ? `/trip/${tripId}?${query}` : `/trip/${tripId}`) as Route;
}

/** Empty planner for people who already have dates and do not need a city yet. */
export function plannerHrefForDates(start: string, end: string): Route {
  const params = new URLSearchParams({ from: start, to: end });
  return `/trip/${DRAFT_TRIP_ID}?${params.toString()}` as Route;
}

/**
 * Planner URL for a footprint place.
 *
 * Catalog city (Queenstown, Tokyo, …) → `/trip/{id}` with a filled itinerary.
 * Anywhere else → `/trip/p-{slug}?place=&lng=&lat=` named draft with a stay.
 */
export function plannerHrefForPlace(place: {
  id: string;
  name: string;
  coords?: LngLat;
  start?: string;
  end?: string;
}): Route {
  const dates =
    place.start && place.end ? { start: place.start, end: place.end } : undefined;
  const destinationId = matchCatalogDestination(place.id, place.name);
  if (destinationId) return plannerHrefForDestination(destinationId, dates);
  const slug = slugify(place.name) || "place";
  const params = new URLSearchParams({ place: place.name });
  if (place.coords) {
    params.set("lng", String(place.coords.lng));
    params.set("lat", String(place.coords.lat));
  }
  if (dates) {
    params.set("from", dates.start);
    params.set("to", dates.end);
  }
  return `/trip/p-${slug}?${params.toString()}` as Route;
}

function matchCatalogDestination(id: string, name: string): string | undefined {
  if (getDestination(id)) return id;
  const needle = name.trim().toLowerCase();
  return DESTINATIONS.find(
    (destination) =>
      destination.id === needle || destination.name.toLowerCase() === needle,
  )?.id;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function titleFromPlaceSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function draftOwner(): Traveller {
  return {
    id: ACCOUNT_USER.id,
    name: ACCOUNT_USER.name,
    initials: ACCOUNT_USER.initials,
    photoUrl: ACCOUNT_USER.photoUrl,
    colorIndex: ACCOUNT_USER.colorIndex,
    role: "owner",
    online: true,
  };
}

export function blankTripFromDates(dates?: {
  startDate?: string;
  endDate?: string;
  name?: string;
  id?: string;
  placeName?: string;
  coords?: LngLat;
}): Trip {
  const startDate =
    dates?.startDate && dates.endDate && dates.endDate >= dates.startDate
      ? dates.startDate
      : "2026-06-18";
  const endDate =
    dates?.startDate && dates.endDate && dates.endDate >= dates.startDate
      ? dates.endDate
      : shiftDayKey(startDate, 4);
  const owner = draftOwner();
  const placeName = dates?.placeName?.trim() || "";
  const stay = dates?.coords
    ? [
        {
          id: `stay-${dates.id ?? DRAFT_TRIP_ID}`,
          kind: "stay" as const,
          category: "stay" as const,
          title: placeName ? `Stay in ${placeName}` : "Stay",
          subtitle: "Draft",
          place: {
            name: placeName || "Destination",
            address: placeName || "Destination",
            coords: dates.coords,
          },
          start: atMinutes(startDate, 15 * 60),
          end: atMinutes(endDate, 11 * 60),
          flexible: false,
          assignedTo: [] as string[],
          createdBy: owner.id,
        },
      ]
    : [];

  return {
    id: dates?.id ?? DRAFT_TRIP_ID,
    name: dates?.name?.trim() || "Untitled trip",
    destinationId: "",
    startDate,
    endDate,
    timezone: "Europe/London",
    travellers: [owner],
    items: stay,
    ideas: [],
    coverImage: placeName
      ? placePhotoSrc({
          id: dates?.id?.replace(/^p-/, "") ?? placeName,
          name: placeName,
        })
      : null,
  };
}

export function getPlannerTrip(
  tripId: string,
  dates?: {
    startDate?: string;
    endDate?: string;
    name?: string;
    coords?: LngLat;
    prefs?: DraftPrefs;
  },
): Trip | undefined {
  if (tripId === DRAFT_TRIP_ID) return blankTripFromDates(dates);
  if (tripId.startsWith("p-")) {
    const label = dates?.name?.trim() || titleFromPlaceSlug(tripId.slice(2));
    return blankTripFromDates({
      ...dates,
      id: tripId,
      name: `Trip to ${label}`,
      placeName: label,
    });
  }
  const fromDiscovery = Boolean(
    dates?.prefs?.styles?.length ||
      dates?.prefs?.interests?.length ||
      dates?.prefs?.budget ||
      dates?.startDate,
  );
  if ((tripId === NYC_TRIP_ID || tripId === "nyc") && !fromDiscovery) {
    return NYC_TRIP;
  }
  if (tripId === NYC_TRIP_ID || tripId === "nyc") {
    return tripFromDestination("nyc", dates);
  }

  const summary = TRIP_SUMMARIES.find(
    (trip) => trip.id === tripId || trip.plannerTripId === tripId,
  );
  if (summary && !fromDiscovery) {
    return withDates(plannerTripFromSummary(summary), dates);
  }

  const draft = tripFromDestination(
    tripId === NYC_TRIP_ID ? "nyc" : tripId,
    dates,
  );
  return draft;
}

export function plannerStaticTripIds(): string[] {
  const ids = new Set<string>([NYC_TRIP_ID, DRAFT_TRIP_ID]);
  for (const trip of TRIP_SUMMARIES) {
    ids.add(trip.plannerTripId ?? trip.id);
  }
  for (const destination of DESTINATIONS) {
    ids.add(plannerTripIdForDestination(destination.id));
  }
  return [...ids];
}

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
export function tripCounts(
  trips: TripSummary[],
  extraCompleted = 0,
): Record<TripFilter, number> {
  return {
    all: trips.length + extraCompleted,
    completed:
      trips.filter((trip) => trip.status === "completed").length + extraCompleted,
    ongoing: trips.filter((trip) => trip.status === "ongoing").length,
    upcoming: trips.filter((trip) => trip.status === "upcoming").length,
  };
}

/**
 * Visited places that were logged on the map, not planned as an Intripid trip.
 *
 * Home and transit are footprint, not a completed trip. Destinations that
 * already have a trip card stay off this list so Completed does not double-count.
 */
export function visitsOutsideTrips(
  visited: VisitedLocation[],
  trips: TripSummary[],
): VisitedLocation[] {
  const covered = new Set<string>();
  for (const trip of trips) {
    covered.add(trip.destinationId);
    const destination = getDestination(trip.destinationId);
    if (destination) covered.add(destination.name.toLowerCase());
  }

  return visited
    .filter((place) => {
      if (place.kind !== "visited") return false;
      if (covered.has(place.id)) return false;
      if (covered.has(place.name.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}
