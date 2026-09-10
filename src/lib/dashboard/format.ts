import { differenceInCalendarDays, format } from "date-fns";

import { parseWall } from "@/lib/trip/time";
import type { TripSummary } from "@/lib/types";

/**
 * Date and count formatting for the dashboard.
 *
 * Everything here goes through `parseWall`, the same offset-free parser the
 * planner uses, so a trip that reads "14–18 Apr" on the dashboard reads
 * 14 April in the calendar regardless of the viewer's timezone. Reaching for
 * `new Date(iso)` instead is what makes a trip slip a day for anyone west of
 * Greenwich.
 */

/**
 * "14–18 Apr" · "26 Mar – 4 Apr" · "13–15 Jun 2025"
 *
 * The month is stated once when both ends share it, which is how people write
 * dates and how the original dashboard's cards read. The year appears only
 * when the trip is behind you: on something upcoming it is noise, but on a
 * completed trip it is the whole point of the label.
 */
export function tripDateRange(
  startIso: string,
  endIso: string,
  options: { withYear?: boolean } = {},
): string {
  const start = parseWall(startIso);
  const end = parseWall(endIso);
  const sameMonth =
    start.getMonth() === end.getMonth() &&
    start.getFullYear() === end.getFullYear();

  const year = options.withYear ? ` ${format(end, "yyyy")}` : "";

  return sameMonth
    ? `${format(start, "d")}–${format(end, "d MMM")}${year}`
    : `${format(start, "d MMM")} – ${format(end, "d MMM")}${year}`;
}

/** Nights, which is how trip length is actually bought and discussed. */
export function tripNights(startIso: string, endIso: string): number {
  return Math.max(
    0,
    differenceInCalendarDays(parseWall(endIso), parseWall(startIso)),
  );
}

/** "4 nights" / "1 night" */
export function nightsLabel(startIso: string, endIso: string): string {
  const nights = tripNights(startIso, endIso);
  return `${nights} ${nights === 1 ? "night" : "nights"}`;
}

/**
 * The card's length-and-density line.
 *
 * A trip with an itinerary can say how much is in it; a summary cannot, and
 * says nothing rather than "0 stops". Claiming a count we do not have is the
 * kind of small lie that makes a whole dashboard feel like a mock.
 */
export function tripScaleLabel(trip: TripSummary): string {
  const nights = nightsLabel(trip.startDate, trip.endDate);
  if (trip.stops === null) return nights;
  return `${nights} · ${trip.stops} ${trip.stops === 1 ? "stop" : "stops"}`;
}

/** "November 2023", for "member since". */
export function monthYear(iso: string): string {
  return format(parseWall(iso), "MMMM yyyy");
}

/** "21 Aug 2026", for "persona last confirmed". */
export function shortDate(iso: string): string {
  return format(parseWall(iso), "d MMM yyyy");
}
