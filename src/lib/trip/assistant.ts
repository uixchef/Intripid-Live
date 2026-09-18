import { distanceKm, walkMinutes } from "@/lib/geo";
import type {
  AssistantChange,
  AssistantPlan,
  Idea,
  ItineraryItem,
  Trip,
} from "@/lib/types";

import {
  activitiesForDay,
  conflictsForDay,
  gapsForDay,
  commentsFromText,
  itemsForDay,
  routeForDay,
  tripDayKeys,
} from "./schedule";
import {
  atMinutes,
  dayLabel,
  dayLabelLong,
  durationLabel,
  durationMinutes,
  minutesIntoDay,
  shiftMinutes,
  timeLabel,
} from "./time";

/**
 * The assistant.
 *
 * Product stance: Intripid is AI-ASSISTED, not a chatbot. The assistant never
 * asks the traveller to describe what they want in prose — it reads the
 * itinerary, finds a specific problem or opportunity, and proposes a concrete,
 * reviewable set of changes with its reasoning shown as narrated steps.
 *
 * Nothing is applied without acceptance, and every change is individually
 * legible before it lands. That is the difference between assistance and
 * something happening to your trip.
 *
 * Fully deterministic — same trip in, same plan out. No external API.
 */

let planCounter = 0;
function nextId(prefix: string): string {
  planCounter += 1;
  return `${prefix}-${planCounter}`;
}

/* -------------------------------------------------------------------------- */
/* Slot finding                                                              */
/* -------------------------------------------------------------------------- */

/** Minutes of breathing room the assistant leaves between two activities. */
const BUFFER_MIN = 10;

/**
 * The earliest start at or after `from` where `duration` fits without hitting
 * anything already on the day.
 *
 * This exists because a fix that creates a new clash is worse than no fix.
 * Moving an overlapping item to "just after the anchor" is only correct if
 * that slot is actually free — on a packed day it very often is not, and the
 * assistant would hand back a plan that silently broke the next activity.
 */
function firstFreeSlot(
  trip: Trip,
  day: string,
  duration: number,
  from: number,
  ignoreIds: string[] = [],
): number {
  const busy = activitiesForDay(trip, day)
    .filter((item) => !ignoreIds.includes(item.id) && item.start && item.end)
    .map((item) => ({
      start: minutesIntoDay(item.start!),
      end: minutesIntoDay(item.end!),
    }))
    .sort((a, b) => a.start - b.start);

  let cursor = from;

  for (const span of busy) {
    // Free stretch before this item is long enough — take it.
    if (cursor + duration + BUFFER_MIN <= span.start) return cursor;
    // Otherwise clear this item and keep looking.
    if (span.end + BUFFER_MIN > cursor) cursor = span.end + BUFFER_MIN;
  }

  return cursor;
}

/** True when the slot runs past a civilised end to the day. */
function runsTooLate(startMinutes: number, duration: number): boolean {
  return startMinutes + duration > 23 * 60;
}

/** The earliest day at or after `fromDay` with room for `duration`. */
function nextDayWithRoom(
  trip: Trip,
  fromDay: string,
  duration: number,
  ignoreIds: string[] = [],
): { day: string; startMinutes: number } | null {
  const days = tripDayKeys(trip).filter((day) => day >= fromDay);

  for (const day of days) {
    const slot = firstFreeSlot(trip, day, duration, 9 * 60, ignoreIds);
    if (!runsTooLate(slot, duration)) return { day, startMinutes: slot };
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/* Resolve overlap                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Fixes double-booked time. Prefers moving the FLEXIBLE item, and moves it
 * later rather than earlier, because a booked table or a timed museum entry is
 * the fixed point a day is built around.
 */
export function planResolveOverlap(trip: Trip, day: string): AssistantPlan | null {
  const overlaps = conflictsForDay(trip, day).filter((c) => c.kind === "overlap");
  if (overlaps.length === 0) return null;

  const changes: AssistantChange[] = [];
  const rationale: string[] = [];

  for (const conflict of overlaps) {
    const [firstId, secondId] = conflict.itemIds;
    const first = trip.items.find((i) => i.id === firstId);
    const second = trip.items.find((i) => i.id === secondId);
    if (!first?.start || !first.end || !second?.start || !second.end) continue;

    // Whichever is flexible gives way; if both are, the later one moves.
    const mover = first.flexible && !second.flexible ? first : second;
    const anchor = mover.id === first.id ? second : first;
    if (!mover.start || !mover.end || !anchor.end) continue;

    const moverDuration = durationMinutes(mover.start, mover.end);
    const anchorEnd = minutesIntoDay(anchor.end);

    // Leave a realistic hop between them rather than butting them together.
    const hop =
      mover.place && anchor.place
        ? Math.max(10, Math.min(35, walkMinutes(anchor.place.coords, mover.place.coords)))
        : 15;

    // Land it in a slot that is genuinely free, not merely after the anchor.
    const newStart = firstFreeSlot(trip, day, moverDuration, anchorEnd + hop, [
      mover.id,
    ]);

    if (runsTooLate(newStart, moverDuration)) {
      /*
       * The day is genuinely full. Rather than reporting failure and doing
       * nothing, look across the rest of the trip — the timeline is the
       * canvas, not one column of it.
       */
      const elsewhere = nextDayWithRoom(trip, day, moverDuration, [mover.id]);

      if (elsewhere) {
        changes.push({
          id: nextId("chg"),
          kind: "move",
          itemId: mover.id,
          summary: `Move “${mover.title}” to ${dayLabel(elsewhere.day)} at ${timeLabel(
            atMinutes(elsewhere.day, elsewhere.startMinutes),
          )}`,
          patch: {
            start: atMinutes(elsewhere.day, elsewhere.startMinutes),
            end: atMinutes(
              elsewhere.day,
              elsewhere.startMinutes + moverDuration,
            ),
          },
        });
        rationale.push(
          `“${anchor.title}” is anchored${anchor.booking ? " (booked)" : ""}, so it keeps its slot.`,
        );
        rationale.push(
          `${dayLabelLong(day)} has no opening left that fits “${mover.title}” — the evening is already booked solid.`,
        );
        rationale.push(
          `${dayLabel(elsewhere.day)} has room at ${timeLabel(
            atMinutes(elsewhere.day, elsewhere.startMinutes),
          )}, which is the earliest point in the trip it fits without displacing anything.`,
        );
      } else {
        // Nowhere in the trip fits it. Park it in Ideas — reversible, honest.
        changes.push({
          id: nextId("chg"),
          kind: "remove",
          itemId: mover.id,
          summary: `Move “${mover.title}” to Ideas for now`,
        });
        rationale.push(
          `Nothing in the trip has a gap big enough for “${mover.title}”, so the only honest fix is to take it off the schedule and keep it on the Ideas list.`,
        );
      }
      continue;
    }

    changes.push({
      id: nextId("chg"),
      kind: "move",
      itemId: mover.id,
      summary: `Move “${mover.title}” to ${timeLabel(atMinutes(day, newStart))}`,
      patch: {
        start: atMinutes(day, newStart),
        end: atMinutes(day, newStart + moverDuration),
      },
    });

    rationale.push(
      `“${anchor.title}” is anchored${anchor.booking ? " (booked)" : ""}, so it keeps its slot.`,
    );

    // Say so when the obvious slot was taken — otherwise the new time looks
    // arbitrary rather than like the first one that actually works.
    const pushedPast = newStart > anchorEnd + hop;
    rationale.push(
      pushedPast
        ? `“${mover.title}” is flexible, but the slot right after was already busy — ${timeLabel(
            atMinutes(day, newStart),
          )} is the first opening that fits it without creating a new clash.`
        : `“${mover.title}” is flexible — shifting it to ${timeLabel(
            atMinutes(day, newStart),
          )} clears the clash and leaves ${durationLabel(hop)} to get between them.`,
    );
  }

  if (changes.length === 0) return null;

  return {
    id: nextId("plan"),
    intent: "resolve-overlap",
    title: overlaps.length === 1 ? "Resolve the clash" : "Resolve the clashes",
    rationale: [
      `Found ${overlaps.length} overlapping ${overlaps.length === 1 ? "pair" : "pairs"} on ${dayLabelLong(day)}.`,
      ...rationale,
    ],
    changes,
    dayIso: day,
  };
}

/* -------------------------------------------------------------------------- */
/* Fill a gap                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Suggests something for an empty stretch, chosen by how close it is to what
 * the traveller is already doing either side of the gap. Proximity is the whole
 * point: a great suggestion 40 minutes away is a worse suggestion.
 */
export function planFillGap(
  trip: Trip,
  day: string,
  ideas: Idea[],
): AssistantPlan | null {
  const gaps = gapsForDay(trip, day);
  if (gaps.length === 0 || ideas.length === 0) return null;

  const gap = gaps.reduce((a, b) => (b.minutes > a.minutes ? b : a));
  const dayItems = activitiesForDay(trip, day);

  // The items bracketing the gap define where the traveller will be.
  const before = [...dayItems]
    .filter((i) => i.end && minutesIntoDay(i.end) <= gap.startMinutes)
    .pop();
  const after = dayItems.find(
    (i) => i.start && minutesIntoDay(i.start) >= gap.endMinutes,
  );
  const anchor = before?.place ?? after?.place ?? null;

  const candidates = ideas
    .filter((idea) => idea.place !== null)
    .filter((idea) => idea.durationMin + 30 <= gap.minutes)
    .map((idea) => ({
      idea,
      km: anchor ? distanceKm(anchor.coords, idea.place!.coords) : 0,
    }))
    .sort((a, b) => a.km - b.km);

  const pick = candidates[0];
  if (!pick) return null;

  const startMinutes = gap.startMinutes + (before ? 20 : 15);
  const start = atMinutes(day, startMinutes);
  const end = atMinutes(day, startMinutes + pick.idea.durationMin);

  const created: ItineraryItem = {
    id: nextId("item"),
    kind: "activity",
    category: pick.idea.category,
    title: pick.idea.title,
    subtitle: pick.idea.subtitle,
    place: pick.idea.place,
    start,
    end,
    comments: commentsFromText("assistant", pick.idea.reason),
    flexible: true,
    assignedTo: [],
    createdBy: "assistant",
    costUsd: pick.idea.costUsd,
  };

  const rationale = [
    `${durationLabel(gap.minutes)} is unscheduled on ${dayLabelLong(day)}, between ${
      before ? `“${before.title}”` : "the start of the day"
    } and ${after ? `“${after.title}”` : "the evening"}.`,
  ];

  if (anchor && pick.km > 0) {
    rationale.push(
      `“${pick.idea.title}” is ${pick.km < 1 ? "a few minutes" : `${Math.round(pick.km * 10) / 10}km`} from where you already are, so it costs almost no travel time.`,
    );
  }
  rationale.push(pick.idea.reason);

  return {
    id: nextId("plan"),
    intent: "fill-gap",
    title: "Fill the empty afternoon",
    rationale,
    changes: [
      {
        id: nextId("chg"),
        kind: "add",
        summary: `Add “${pick.idea.title}” at ${timeLabel(start)}`,
        create: created,
      },
    ],
    dayIso: day,
  };
}

/* -------------------------------------------------------------------------- */
/* Rebalance a day                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Spaces out an over-packed day. Only touches flexible items, and only moves
 * them later — never silently drops anything.
 */
export function planRebalance(trip: Trip, day: string): AssistantPlan | null {
  const items = activitiesForDay(trip, day);
  if (items.length < 3) return null;

  const busy = items.reduce(
    (sum, i) => sum + (i.start && i.end ? durationMinutes(i.start, i.end) : 0),
    0,
  );

  const tight = conflictsForDay(trip, day).filter(
    (c) => c.kind === "tight-turnaround" || c.kind === "impossible-commute",
  );

  // A day is "over-packed" if it either runs long or has no breathing room.
  if (busy < 8 * 60 && tight.length === 0) return null;

  const changes: AssistantChange[] = [];
  const rationale: string[] = [
    `${dayLabelLong(day)} has ${items.length} activities filling ${durationLabel(busy)}.`,
  ];

  if (tight.length > 0) {
    rationale.push(
      `${tight.length} ${tight.length === 1 ? "transition is" : "transitions are"} tighter than the travel between them allows.`,
    );
  }

  // Walk the day forward, pushing flexible items to restore a real buffer.
  let previousEnd: number | null = null;
  let previousPlace = null as ItineraryItem["place"];

  for (const item of items) {
    if (!item.start || !item.end) continue;
    const start = minutesIntoDay(item.start);
    const duration = durationMinutes(item.start, item.end);

    if (previousEnd !== null) {
      // Pinned to a local so TypeScript does not chase `previousEnd` through
      // its own later reassignment below.
      const prevEnd: number = previousEnd;
      const hop =
        previousPlace && item.place
          ? Math.max(10, Math.min(40, walkMinutes(previousPlace.coords, item.place.coords)))
          : 15;
      const earliest: number = prevEnd + hop;

      if (start < earliest && item.flexible) {
        changes.push({
          id: nextId("chg"),
          kind: "move",
          itemId: item.id,
          summary: `Push “${item.title}” to ${timeLabel(atMinutes(day, earliest))}`,
          patch: {
            start: atMinutes(day, earliest),
            end: atMinutes(day, earliest + duration),
          },
        });
        previousEnd = earliest + duration;
        previousPlace = item.place;
        continue;
      }
    }

    previousEnd = Math.max(previousEnd ?? 0, start + duration);
    previousPlace = item.place;
  }

  if (changes.length === 0) {
    // Nothing movable — say so honestly instead of inventing a change.
    const trimmable = items.find((i) => i.flexible && i.start && i.end);
    if (!trimmable?.start || !trimmable.end) return null;

    const duration = durationMinutes(trimmable.start, trimmable.end);
    if (duration <= 60) return null;

    changes.push({
      id: nextId("chg"),
      kind: "shorten",
      itemId: trimmable.id,
      summary: `Trim “${trimmable.title}” to ${durationLabel(duration - 30)}`,
      patch: { end: shiftMinutes(trimmable.end, -30) },
    });
    rationale.push(
      `Everything else is anchored, so the only slack is inside “${trimmable.title}”.`,
    );
  } else {
    rationale.push(
      `Moving ${changes.length} flexible ${changes.length === 1 ? "item" : "items"} later restores a realistic buffer between each stop.`,
    );
  }

  return {
    id: nextId("plan"),
    intent: "rebalance",
    title: "Give the day some air",
    rationale,
    changes,
    dayIso: day,
  };
}

/* -------------------------------------------------------------------------- */
/* Suggest near the route                                                    */
/* -------------------------------------------------------------------------- */

/** Ideas closest to the day's actual route, ranked. Powers the Ideas rail. */
export function ideasNearRoute(
  trip: Trip,
  day: string,
  ideas: Idea[],
): { idea: Idea; km: number; nearest: string }[] {
  const route = routeForDay(trip, day);
  if (route.length === 0) {
    return ideas.map((idea) => ({ idea, km: Number.POSITIVE_INFINITY, nearest: "" }));
  }

  const ranked: { idea: Idea; km: number; nearest: string }[] = [];
  const loose: { idea: Idea; km: number; nearest: string }[] = [];

  for (const idea of ideas) {
    if (!idea.place) {
      loose.push({ idea, km: Number.POSITIVE_INFINITY, nearest: "" });
      continue;
    }
    let best = { km: Number.POSITIVE_INFINITY, nearest: "" };
    for (const stop of route) {
      const km = distanceKm(stop.place.coords, idea.place.coords);
      if (km < best.km) best = { km, nearest: stop.item.title };
    }
    ranked.push({ idea, ...best });
  }

  ranked.sort((a, b) => a.km - b.km);
  return [...loose, ...ranked];
}

/* -------------------------------------------------------------------------- */
/* Which intervention is worth offering?                                     */
/* -------------------------------------------------------------------------- */

export interface AssistantOffer {
  intent: AssistantPlan["intent"];
  label: string;
  /** Why this is being offered — shown as the button's supporting line. */
  detail: string;
  severity: "info" | "attention";
}

/**
 * The assistant only speaks when it has something specific to say. Offers are
 * derived from the actual state of the day, so the affordance never appears
 * with nothing behind it.
 */
export function offersForDay(
  trip: Trip,
  day: string,
  selected?: ItineraryItem | null,
): AssistantOffer[] {
  const offers: AssistantOffer[] = [];
  const conflicts = conflictsForDay(trip, day);
  const overlaps = conflicts.filter((c) => c.kind === "overlap");
  const gaps = gapsForDay(trip, day);
  const items = itemsForDay(trip, day);
  const activities = items.filter((item) => item.kind === "activity");
  const route = routeForDay(trip, day);

  if (overlaps.length > 0) {
    offers.push({
      intent: "resolve-overlap",
      label: overlaps.length === 1 ? "Resolve this clash" : "Resolve clashes",
      detail:
        overlaps.length === 1
          ? "Two things are booked at once"
          : `${overlaps.length} pairs are booked at once`,
      severity: "attention",
    });
  }

  let longestHop = 0;
  for (let index = 1; index < route.length; index += 1) {
    const prev = route[index - 1]?.place;
    const next = route[index]?.place;
    if (!prev || !next) continue;
    longestHop = Math.max(longestHop, walkMinutes(prev.coords, next.coords));
  }
  if (longestHop >= 35) {
    offers.push({
      intent: "reduce-travel",
      label: "Reduce travel time",
      detail: `Longest hop is about ${durationLabel(longestHop)}`,
      severity: "info",
    });
  }

  if (selected?.kind === "activity") {
    offers.push({
      intent: "alternatives",
      label: "Find alternatives",
      detail: `Options instead of “${selected.title}”`,
      severity: "info",
    });
    if (selected.category !== "outdoors") {
      offers.push({
        intent: "replace",
        label: "Replace with something outdoors",
        detail: "Keep the slot, change the stop",
        severity: "info",
      });
    }
    offers.push({
      intent: "move",
      label: "Move this later",
      detail: selected.start
        ? `Currently ${timeLabel(selected.start)}`
        : "Shift it on the calendar",
      severity: "info",
    });
  }

  if (gaps.length > 0 && trip.ideas.length > 0) {
    const biggest = gaps.reduce((a, b) => (b.minutes > a.minutes ? b : a));
    if (biggest.minutes >= 90) {
      offers.push({
        intent: "fill-gap",
        label: biggest.startMinutes >= 12 * 60 ? "Fill this afternoon" : "Fill this gap",
        detail: `${durationLabel(biggest.minutes)} free from ${timeLabel(
          atMinutes(day, biggest.startMinutes),
        )}`,
        severity: "info",
      });
    }
  }

  const last = [...activities].reverse()[0];
  const eveningOpen =
    !last?.end || minutesIntoDay(last.end) <= 18 * 60;
  if (eveningOpen && trip.ideas.some((idea) => idea.category === "food")) {
    offers.push({
      intent: "nearby-dinner",
      label: "Add dinner nearby",
      detail: last ? `After “${last.title}”` : "An evening meal on this day",
      severity: "info",
    });
  }

  const busy = items
    .filter((i) => i.kind !== "commute")
    .reduce((sum, i) => sum + (i.start && i.end ? durationMinutes(i.start, i.end) : 0), 0);

  if (busy >= 8 * 60 || conflicts.some((c) => c.kind !== "overlap")) {
    offers.push({
      intent: "rebalance",
      label: "Make this day less rushed",
      detail:
        busy >= 8 * 60
          ? `${durationLabel(busy)} scheduled`
          : "Some transitions are too tight",
      severity: "info",
    });
  }

  if (offers.length === 0 && trip.ideas.length > 0) {
    offers.push({
      intent: "fill-gap",
      label: "Find a hidden gem nearby",
      detail: "The day is balanced — improve one stretch",
      severity: "info",
    });
  }

  const ranked = [
    ...offers.filter((offer) => offer.severity === "attention"),
    ...offers.filter((offer) => offer.severity !== "attention"),
  ];
  const seen = new Set<string>();
  return ranked.filter((offer) => {
    if (seen.has(offer.intent)) return false;
    seen.add(offer.intent);
    return true;
  }).slice(0, 4);
}

/** Builds the plan for a given intent, or null if it no longer applies. */
export function buildPlan(
  trip: Trip,
  day: string,
  intent: AssistantPlan["intent"],
): AssistantPlan | null {
  switch (intent) {
    case "resolve-overlap":
      return planResolveOverlap(trip, day);
    case "fill-gap":
      return planFillGap(trip, day, trip.ideas);
    case "rebalance":
      return planRebalance(trip, day);
    case "near-route":
      return null;
    default:
      return null;
  }
}
