import { walkMinutes } from "@/lib/geo";
import { partyTravellers, withOrganizerFirst } from "@/lib/collaboration";
import type {
  Conflict,
  ItineraryItem,
  Traveller,
  Trip,
} from "@/lib/types";

import {
  dayKey,
  durationMinutes,
  minutesIntoDay,
  parseWall,
  timeLabel,
} from "./time";

/**
 * Derived views over a trip's items.
 *
 * Everything here is a pure function of the trip. The store holds only the
 * items; anything the UI needs (day buckets, overlaps, gaps, commute
 * feasibility) is computed, so there is exactly one source of truth and no
 * chance of the calendar and the map disagreeing.
 */

/** Items that occupy time on a given day, sorted by start. */
export function itemsForDay(trip: Trip, day: string): ItineraryItem[] {
  return trip.items
    .filter((item) => item.start !== null && dayKey(item.start) === day)
    .filter((item) => item.kind !== "stay")
    .sort((a, b) => parseWall(a.start!).getTime() - parseWall(b.start!).getTime());
}

/** The stay covering a given day, if any. Stays span the trip, not a slot. */
export function stayForDay(trip: Trip, day: string): ItineraryItem | null {
  return (
    trip.items.find((item) => {
      if (item.kind !== "stay" || !item.start || !item.end) return false;
      return dayKey(item.start) <= day && day <= dayKey(item.end);
    }) ?? null
  );
}

/** Non-commute items for a day — what the traveller actually chose to do. */
export function activitiesForDay(trip: Trip, day: string): ItineraryItem[] {
  return itemsForDay(trip, day).filter((item) => item.kind !== "commute");
}

export function commutesForDay(trip: Trip, day: string): ItineraryItem[] {
  return itemsForDay(trip, day).filter((item) => item.kind === "commute");
}

export function findItem(trip: Trip, id: string | null): ItineraryItem | null {
  if (!id) return null;
  return trip.items.find((item) => item.id === id) ?? null;
}

export function findTraveller(trip: Trip, id: string) {
  return trip.travellers.find((t) => t.id === id) ?? null;
}

/**
 * Who this stop is for. Empty `assignedTo` means the whole travelling party —
 * not advisors, who help plan and are not on the ground.
 */
function peopleOn(item: ItineraryItem, trip: Trip): Set<string> {
  return new Set(guestsForItem(item, trip).map((person) => person.id));
}

export function guestsForItem(item: ItineraryItem, trip: Trip): Traveller[] {
  const party = withOrganizerFirst(partyTravellers(trip.travellers));
  if (item.assignedTo.length === 0) return party;
  const allowed = new Set(item.assignedTo);
  return party.filter((person) => allowed.has(person.id));
}

export function commentsFromText(
  from: string,
  text?: string | null,
): NonNullable<ItineraryItem["comments"]> | undefined {
  const trimmed = text?.trim();
  return trimmed ? [{ from, text: trimmed }] : undefined;
}

export function commentsOnItem(
  item: Pick<ItineraryItem, "comments" | "notes" | "createdBy">,
): NonNullable<ItineraryItem["comments"]> {
  if (item.comments && item.comments.length > 0) return item.comments;
  return commentsFromText(item.createdBy, item.notes) ?? [];
}

export function commentsForDisplay(item: ItineraryItem, trip: Trip) {
  return commentsOnItem(item).flatMap((comment) => {
    const person = trip.travellers.find((entry) => entry.id === comment.from);
    return person ? [{ person, text: comment.text }] : [];
  });
}

export function commentViewerId(
  travellers: Traveller[],
  sessionId: string,
): string {
  return (
    travellers.find((person) => person.id === sessionId)?.id ??
    travellers.find((person) => person.role === "owner")?.id ??
    travellers[0]?.id ??
    ""
  );
}

export function itemHasUnreadComments(
  item: ItineraryItem,
  viewerId: string,
  seen: Record<string, number>,
): boolean {
  const comments = commentsOnItem(item);
  if (comments.length === 0) return false;
  const seenCount = seen[item.id];
  if (seenCount === undefined) {
    return comments.some((comment) => comment.from !== viewerId);
  }
  return comments.length > seenCount;
}

export function migrateItemComments(item: ItineraryItem): ItineraryItem {
  const comments = commentsOnItem(item);
  return {
    ...item,
    comments: comments.length > 0 ? comments : undefined,
    notes: undefined,
  };
}

/** True when at least one traveller is expected at both stops. */
function sharesTravellers(a: ItineraryItem, b: ItineraryItem, trip: Trip): boolean {
  const left = peopleOn(a, trip);
  for (const id of peopleOn(b, trip)) {
    if (left.has(id)) return true;
  }
  return false;
}

/* -------------------------------------------------------------------------- */
/* Conflicts                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Detects real scheduling problems. Surfaced in the UI rather than silently
 * allowed: a planner that lets you double-book without saying so is lying to
 * you. Commutes are excluded from overlap checks because they are generated
 * around activities and are expected to abut them.
 */
export function conflictsForDay(trip: Trip, day: string): Conflict[] {
  const items = activitiesForDay(trip, day);
  const conflicts: Conflict[] = [];

  /*
   * Pairs that already have an explicit commute item between them have their
   * travel accounted for on the calendar. Re-deriving a walking estimate for
   * those would double-count the journey and flag a correctly planned day as
   * broken — which is exactly what it did before this guard.
   */
  const bridged = new Set(
    commutesForDay(trip, day)
      .filter((commute) => commute.commute)
      .map((commute) => `${commute.commute!.fromItemId}->${commute.commute!.toItemId}`),
  );

  for (let i = 0; i < items.length; i += 1) {
    const a = items[i];
    if (!a.start || !a.end) continue;

    for (let j = i + 1; j < items.length; j += 1) {
      const b = items[j];
      if (!b.start || !b.end) continue;

      const aStart = minutesIntoDay(a.start);
      const aEnd = minutesIntoDay(a.end);
      const bStart = minutesIntoDay(b.start);
      const bEnd = minutesIntoDay(b.end);

      if (bStart < aEnd && aStart < bEnd) {
        /*
         * Two stops in the same hour are only a clash if someone is on both.
         * The group splitting up — Maya at the Neue, Danny on Madison — is
         * parallel, not double-booked.
         */
        if (sharesTravellers(a, b, trip)) {
          const overlap = Math.min(aEnd, bEnd) - Math.max(aStart, bStart);
          conflicts.push({
            kind: "overlap",
            itemIds: [a.id, b.id],
            message: `“${a.title}” and “${b.title}” overlap by ${overlap} minutes.`,
            severity: "error",
          });
        }
        continue;
      }

      // Only check travel feasibility between items that are adjacent in
      // time AND have no scheduled commute already covering the hop.
      if (j === i + 1 && a.place && b.place && !bridged.has(`${a.id}->${b.id}`)) {
        const gap = bStart - aEnd;
        const walk = walkMinutes(a.place.coords, b.place.coords);
        // Below ~2.5km we assume walking; beyond that transit is faster and a
        // tight gap is a judgement call rather than an impossibility.
        const needed = walk <= 35 ? walk : Math.round(walk * 0.45);

        if (gap < needed - 5) {
          conflicts.push({
            kind: "impossible-commute",
            itemIds: [a.id, b.id],
            message: `Only ${gap} minutes between “${a.title}” and “${b.title}”, but it takes about ${needed} to get there.`,
            severity: gap < needed / 2 ? "error" : "warning",
          });
        } else if (gap < needed + 6 && needed > 14) {
          conflicts.push({
            kind: "tight-turnaround",
            itemIds: [a.id, b.id],
            message: `Tight: ${gap} minutes to cover a ${needed}-minute hop to “${b.title}”.`,
            severity: "warning",
          });
        }
      }
    }
  }

  return conflicts;
}

/** Every conflict across the whole trip, keyed by day. */
export function allConflicts(trip: Trip): Record<string, Conflict[]> {
  const result: Record<string, Conflict[]> = {};
  for (const day of tripDayKeys(trip)) {
    const found = conflictsForDay(trip, day);
    if (found.length > 0) result[day] = found;
  }
  return result;
}

/**
 * Items involved in a conflict, split by severity.
 *
 * The distinction matters visually: an overlap is a real error and earns the
 * danger colour, while a tight connection is advice and must not paint half
 * the day red.
 */
export function conflictIdsForDay(
  trip: Trip,
  day: string,
): { errors: Set<string>; warnings: Set<string> } {
  const errors = new Set<string>();
  const warnings = new Set<string>();

  for (const conflict of conflictsForDay(trip, day)) {
    for (const id of conflict.itemIds) {
      if (conflict.severity === "error") errors.add(id);
      else warnings.add(id);
    }
  }

  // An item that is genuinely broken should not also be styled as a warning.
  for (const id of errors) warnings.delete(id);

  return { errors, warnings };
}

/* -------------------------------------------------------------------------- */
/* Gaps                                                                      */
/* -------------------------------------------------------------------------- */

export interface DayGap {
  startMinutes: number;
  endMinutes: number;
  minutes: number;
}

/**
 * Unscheduled stretches inside the active part of a day. These are offered as
 * real affordances — an empty afternoon is a planning opportunity, not blank
 * space to be hidden.
 */
export function gapsForDay(
  trip: Trip,
  day: string,
  options: { dayStart?: number; dayEnd?: number; minMinutes?: number } = {},
): DayGap[] {
  const dayStart = options.dayStart ?? 8 * 60;
  const dayEnd = options.dayEnd ?? 22 * 60;
  const minMinutes = options.minMinutes ?? 75;

  const spans = itemsForDay(trip, day)
    .filter((item) => item.start && item.end)
    .map((item) => ({
      start: minutesIntoDay(item.start!),
      end: minutesIntoDay(item.end!),
    }))
    .sort((a, b) => a.start - b.start);

  const gaps: DayGap[] = [];
  let cursor = dayStart;

  for (const span of spans) {
    if (span.start - cursor >= minMinutes) {
      gaps.push({
        startMinutes: cursor,
        endMinutes: span.start,
        minutes: span.start - cursor,
      });
    }
    cursor = Math.max(cursor, span.end);
  }

  if (dayEnd - cursor >= minMinutes) {
    gaps.push({ startMinutes: cursor, endMinutes: dayEnd, minutes: dayEnd - cursor });
  }

  return gaps;
}

/* -------------------------------------------------------------------------- */
/* Day summaries                                                             */
/* -------------------------------------------------------------------------- */

export interface DaySummary {
  day: string;
  itemCount: number;
  activityCount: number;
  /** Scheduled minutes excluding commutes. */
  busyMinutes: number;
  commuteMinutes: number;
  costUsd: number;
  /** Genuine problems — overlaps and impossible hops. */
  errorCount: number;
  /** Advisory only — tight connections. */
  warningCount: number;
  categories: string[];
  firstStart: string | null;
  lastEnd: string | null;
}

export function tripDayKeys(trip: Trip): string[] {
  const days: string[] = [];
  const start = parseWall(trip.startDate);
  const end = parseWall(trip.endDate);
  const cursor = new Date(start);

  while (cursor <= end) {
    days.push(
      `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(
        cursor.getDate(),
      ).padStart(2, "0")}`,
    );
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

export function summariseDay(trip: Trip, day: string): DaySummary {
  const items = itemsForDay(trip, day);
  const activities = items.filter((i) => i.kind !== "commute");
  const commutes = items.filter((i) => i.kind === "commute");

  const busyMinutes = activities.reduce(
    (sum, i) => sum + (i.start && i.end ? durationMinutes(i.start, i.end) : 0),
    0,
  );
  const commuteMinutes = commutes.reduce(
    (sum, i) => sum + (i.commute?.minutes ?? 0),
    0,
  );

  const conflicts = conflictsForDay(trip, day);

  return {
    day,
    itemCount: items.length,
    activityCount: activities.length,
    busyMinutes,
    commuteMinutes,
    costUsd: items.reduce((sum, i) => sum + (i.costUsd ?? 0), 0),
    /*
     * Counted separately. A single number conflated a real double-booking
     * with a merely tight connection, so the day tab kept a red badge after
     * the assistant had actually fixed the clash — which read as a failure.
     */
    errorCount: conflicts.filter((c) => c.severity === "error").length,
    warningCount: conflicts.filter((c) => c.severity === "warning").length,
    categories: [...new Set(activities.map((i) => i.category))],
    firstStart: activities[0]?.start ?? null,
    lastEnd: activities.length > 0 ? (activities[activities.length - 1].end ?? null) : null,
  };
}

/* -------------------------------------------------------------------------- */
/* Overlap layout                                                            */
/* -------------------------------------------------------------------------- */

export interface LaidOutItem {
  item: ItineraryItem;
  startMinutes: number;
  endMinutes: number;
  /** Column index within its overlap cluster. */
  column: number;
  /** How many columns the cluster needs. */
  columns: number;
}

/**
 * Assigns overlapping items to side-by-side columns, the way a calendar must.
 * Items are grouped into clusters of mutual overlap, then greedily packed into
 * the first column that is free — so two conflicting items sit beside each
 * other and stay individually clickable instead of hiding one another.
 */
export function layOutDay(items: ItineraryItem[]): LaidOutItem[] {
  const spans = items
    .filter((item) => item.start && item.end)
    .map((item) => ({
      item,
      startMinutes: minutesIntoDay(item.start!),
      endMinutes: Math.max(
        minutesIntoDay(item.end!),
        minutesIntoDay(item.start!) + 15,
      ),
    }))
    .sort((a, b) => a.startMinutes - b.startMinutes || a.endMinutes - b.endMinutes);

  const result: LaidOutItem[] = [];
  let cluster: typeof spans = [];
  let clusterEnd = -1;

  const flush = () => {
    if (cluster.length === 0) return;

    const columnEnds: number[] = [];
    const placed = cluster.map((span) => {
      let column = columnEnds.findIndex((end) => end <= span.startMinutes);
      if (column === -1) {
        column = columnEnds.length;
        columnEnds.push(span.endMinutes);
      } else {
        columnEnds[column] = span.endMinutes;
      }
      return { ...span, column };
    });

    for (const span of placed) {
      result.push({ ...span, columns: columnEnds.length });
    }

    cluster = [];
    clusterEnd = -1;
  };

  for (const span of spans) {
    if (cluster.length > 0 && span.startMinutes >= clusterEnd) flush();
    cluster.push(span);
    clusterEnd = Math.max(clusterEnd, span.endMinutes);
  }
  flush();

  return result;
}

/* -------------------------------------------------------------------------- */
/* Route ordering                                                            */
/* -------------------------------------------------------------------------- */

/**
 * The day's places in schedule order — the sequence the map draws as a route.
 * This is what makes the calendar and map causally connected: the route IS the
 * schedule, not a separate hand-authored path.
 */
export function routeForDay(trip: Trip, day: string) {
  return activitiesForDay(trip, day)
    .filter((item) => item.place !== null)
    .map((item, index) => ({
      item,
      place: item.place!,
      /** a, b, c… matching the historical lettered markers. */
      letter: String.fromCharCode(97 + index),
      index,
    }));
}

/** Human sentence describing when an item happens, for tooltips and a11y. */
export function itemTimeSentence(item: ItineraryItem): string {
  if (!item.start) return "Not scheduled";
  if (!item.end) return timeLabel(item.start);
  return `${timeLabel(item.start)} to ${timeLabel(item.end)}`;
}
