import {
  addMinutes,
  differenceInMinutes,
  eachDayOfInterval,
  format,
  isSameDay,
  parseISO,
} from "date-fns";

/**
 * Time handling for the planner.
 *
 * DECISION: all itinerary times are DESTINATION WALL-CLOCK time, stored as
 * offset-free ISO strings ("2026-04-14T09:30:00").
 *
 * Why: a traveller thinks "the museum at 10am", meaning 10am where they are
 * standing. If times carried a UTC offset, the browser would re-render them in
 * the viewer's own timezone — planning a New York trip from London would show
 * a 10am booking as 3pm. Wall-clock storage makes the schedule mean the same
 * thing everywhere, and makes arithmetic (drag by 30 minutes, extend by an
 * hour) trivially correct across DST boundaries.
 *
 * The trip's `timezone` field is retained for display ("EDT") and would be the
 * conversion basis if real bookings or notifications were ever added.
 */

/** Strips any trailing UTC offset or Z, leaving a wall-clock ISO string. */
export function toWallClock(iso: string): string {
  return iso.replace(/(?:Z|[+-]\d{2}:?\d{2})$/, "");
}

/** Parses a wall-clock ISO string into a Date carrying those literal fields. */
export function parseWall(iso: string): Date {
  return parseISO(toWallClock(iso));
}

/** Serialises a Date back to a wall-clock ISO string. */
export function formatWall(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm:ss");
}

/** Just the date part, e.g. "2026-04-14". */
export function dayKey(iso: string | Date): string {
  const date = typeof iso === "string" ? parseWall(iso) : iso;
  return format(date, "yyyy-MM-dd");
}

/** Minutes since midnight. */
export function minutesIntoDay(iso: string): number {
  const date = parseWall(iso);
  return date.getHours() * 60 + date.getMinutes();
}

/** Duration in minutes between two wall-clock strings. */
export function durationMinutes(start: string, end: string): number {
  return differenceInMinutes(parseWall(end), parseWall(start));
}

/** Shifts a wall-clock string by a number of minutes. */
export function shiftMinutes(iso: string, minutes: number): string {
  return formatWall(addMinutes(parseWall(iso), minutes));
}

/**
 * Rebuilds a wall-clock string on a different day, preserving time of day.
 * Used when an item is dragged between day columns.
 */
export function moveToDay(iso: string, targetDayKey: string): string {
  const time = format(parseWall(iso), "HH:mm:ss");
  return `${targetDayKey}T${time}`;
}

/** Builds a wall-clock string from a day and minutes-since-midnight. */
export function atMinutes(targetDayKey: string, minutes: number): string {
  const clamped = Math.max(0, Math.min(24 * 60 - 1, Math.round(minutes)));
  const hh = String(Math.floor(clamped / 60)).padStart(2, "0");
  const mm = String(clamped % 60).padStart(2, "0");
  return `${targetDayKey}T${hh}:${mm}:00`;
}

/** Every day the trip spans, as day keys. */
export function tripDays(startDate: string, endDate: string): string[] {
  return eachDayOfInterval({
    start: parseWall(startDate),
    end: parseWall(endDate),
  }).map((d) => format(d, "yyyy-MM-dd"));
}

export function isSameDayKey(iso: string, key: string): boolean {
  return dayKey(iso) === key;
}

export function sameDay(a: string, b: string): boolean {
  return isSameDay(parseWall(a), parseWall(b));
}

/* -------------------------------------------------------------------------- */
/* Display                                                                    */
/* -------------------------------------------------------------------------- */

/** "9:30 AM" — the canonical time label. */
export function timeLabel(iso: string): string {
  return format(parseWall(iso), "h:mm a");
}

/** "9:30" with no meridiem, for tight calendar chrome. */
export function timeLabelCompact(iso: string): string {
  const date = parseWall(iso);
  return date.getMinutes() === 0
    ? format(date, "h a").toLowerCase()
    : format(date, "h:mm").toLowerCase();
}

/** "9:30 AM – 11:00 AM" */
export function timeRangeLabel(start: string, end: string): string {
  return `${timeLabel(start)} – ${timeLabel(end)}`;
}

/** "Tue 14 Apr" */
export function dayLabel(key: string): string {
  return format(parseWall(key), "EEE d MMM");
}

/** "Tuesday 14 April" */
export function dayLabelLong(key: string): string {
  return format(parseWall(key), "EEEE d MMMM");
}

/** "TUE" / "14" split for the day rail. */
export function dayParts(key: string): { weekday: string; dayNum: string; month: string } {
  const date = parseWall(key);
  return {
    weekday: format(date, "EEE"),
    dayNum: format(date, "d"),
    month: format(date, "MMM"),
  };
}

/** "1h 30m", "45m", "2h" — compact and readable. */
export function durationLabel(minutes: number): string {
  const abs = Math.max(0, Math.round(minutes));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * A relative label between consecutive items, in the historical product's
 * voice ("in 19min", "3hr later"). Reads as a rhythm rather than a timestamp.
 */
export function relativeGapLabel(gapMinutes: number): string {
  if (gapMinutes <= 0) return "straight after";
  if (gapMinutes < 60) return `${gapMinutes}min later`;
  const hours = Math.round((gapMinutes / 60) * 10) / 10;
  const rounded = Number.isInteger(hours) ? hours : Math.round(hours);
  return `${rounded}hr later`;
}
