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
  itemsForDay,
  routeForDay,
} from "./schedule";
import {
  atMinutes,
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

    const newStart = anchorEnd + hop;

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
    rationale.push(
      `“${mover.title}” is flexible — shifting it to ${timeLabel(
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
    notes: pick.idea.reason,
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

  return ideas
    .filter((idea) => idea.place !== null)
    .map((idea) => {
      let best = { km: Number.POSITIVE_INFINITY, nearest: "" };
      for (const stop of route) {
        const km = distanceKm(stop.place.coords, idea.place!.coords);
        if (km < best.km) best = { km, nearest: stop.item.title };
      }
      return { idea, ...best };
    })
    .sort((a, b) => a.km - b.km);
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
export function offersForDay(trip: Trip, day: string): AssistantOffer[] {
  const offers: AssistantOffer[] = [];
  const conflicts = conflictsForDay(trip, day);
  const overlaps = conflicts.filter((c) => c.kind === "overlap");
  const gaps = gapsForDay(trip, day);
  const items = itemsForDay(trip, day);

  if (overlaps.length > 0) {
    offers.push({
      intent: "resolve-overlap",
      label: overlaps.length === 1 ? "Resolve clash" : "Resolve clashes",
      detail:
        overlaps.length === 1
          ? "Two things are booked at once"
          : `${overlaps.length} pairs are booked at once`,
      severity: "attention",
    });
  }

  if (gaps.length > 0 && trip.ideas.length > 0) {
    const biggest = gaps.reduce((a, b) => (b.minutes > a.minutes ? b : a));
    offers.push({
      intent: "fill-gap",
      label: "Fill the gap",
      detail: `${durationLabel(biggest.minutes)} free from ${timeLabel(
        atMinutes(day, biggest.startMinutes),
      )}`,
      severity: "info",
    });
  }

  const busy = items
    .filter((i) => i.kind !== "commute")
    .reduce((sum, i) => sum + (i.start && i.end ? durationMinutes(i.start, i.end) : 0), 0);

  if (busy >= 8 * 60 || conflicts.some((c) => c.kind !== "overlap")) {
    offers.push({
      intent: "rebalance",
      label: "Give the day air",
      detail:
        busy >= 8 * 60
          ? `${durationLabel(busy)} scheduled back to back`
          : "Some transitions are too tight",
      severity: "info",
    });
  }

  return offers;
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
  }
}
