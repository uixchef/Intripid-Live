import {
  addDays,
  addMinutes,
  addMonths,
  differenceInMinutes,
  eachDayOfInterval,
  endOfWeek,
  format,
  isSameDay,
  parseISO,
  startOfWeek,
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

/**
 * Local calendar date from a day key. Avoids ISO date-only UTC shifting,
 * which would move "2026-04-14" onto the 13th in US timezones.
 */
export function dateFromDayKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function shiftDayKey(key: string, days: number): string {
  return format(addDays(dateFromDayKey(key), days), "yyyy-MM-dd");
}

export function shiftMonthKey(key: string, months: number): string {
  return format(addMonths(dateFromDayKey(key), months), "yyyy-MM-dd");
}

export type ClockFormat = "12h" | "24h";

/** Week containing the given day, starting Sunday or Monday. */
export function weekDayKeys(
  anchorKey: string,
  weekStartsOn: 0 | 1 = 0,
): string[] {
  const date = dateFromDayKey(anchorKey);
  return eachDayOfInterval({
    start: startOfWeek(date, { weekStartsOn }),
    end: endOfWeek(date, { weekStartsOn }),
  }).map((d) => format(d, "yyyy-MM-dd"));
}

/** Rolling four-day window starting on the given day. */
export function fourDayKeys(anchorKey: string): string[] {
  const date = dateFromDayKey(anchorKey);
  return Array.from({ length: 4 }, (_, index) =>
    format(addDays(date, index), "yyyy-MM-dd"),
  );
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

/** "9:30 AM" or "09:30". */
export function timeLabel(iso: string, clock: ClockFormat = "12h"): string {
  return format(parseWall(iso), clock === "24h" ? "HH:mm" : "h:mm a");
}

/** Tight calendar chrome. */
export function timeLabelCompact(iso: string, clock: ClockFormat = "12h"): string {
  const date = parseWall(iso);
  if (clock === "24h") return format(date, "HH:mm");
  return date.getMinutes() === 0
    ? format(date, "h a").toLowerCase()
    : format(date, "h:mm").toLowerCase();
}

/** "9:30 AM – 11:00 AM" */
export function timeRangeLabel(
  start: string,
  end: string,
  clock: ClockFormat = "12h",
): string {
  return `${timeLabel(start, clock)} – ${timeLabel(end, clock)}`;
}

/** "Tue 14 Apr" */
export function dayLabel(key: string): string {
  return format(parseWall(key), "EEE d MMM");
}

/** "Tuesday 14 April" */
export function dayLabelLong(key: string): string {
  return format(parseWall(key), "EEEE d MMMM");
}

/** "9:00am" / "2:00 pm" / "14:00" for itinerary time pills. */
export function timeLabelPill(iso: string, clock: ClockFormat = "12h"): string {
  if (clock === "24h") return format(parseWall(iso), "HH:mm");
  return format(parseWall(iso), "h:mm a").toLowerCase();
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

/**
 * Right now, as a destination wall-clock day and minutes-since-midnight.
 * The planner stores times without a zone; this is the conversion so "now"
 * on the grid means now where the trip is, not where the browser is.
 */
/**
 * How far through a stop we are, in destination wall-clock.
 * `null` when the stop is not happening now — upcoming and past stay empty
 * so purple means "this is the one you are on".
 */
export function liveProgress(
  start: string,
  end: string,
  wall: { day: string; minutes: number },
): number | null {
  const now = parseWall(atMinutes(wall.day, wall.minutes)).getTime();
  const from = parseWall(start).getTime();
  const to = parseWall(end).getTime();
  if (to <= from || now < from || now > to) return null;
  return Math.min(1, Math.max(0, (now - from) / (to - from)));
}

export function wallNow(
  timeZone: string,
  date: Date = new Date(),
): { day: string; minutes: number; seconds: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "0";
  let hour = Number(read("hour"));
  if (hour === 24) hour = 0;
  return {
    day: `${read("year")}-${read("month")}-${read("day")}`,
    minutes: hour * 60 + Number(read("minute")),
    seconds: Number(read("second")),
  };
}
