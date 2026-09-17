import { distanceKm, walkMinutes } from "@/lib/geo";
import type {
  AssistantChange,
  AssistantPlan,
  Idea,
  ItineraryItem,
  Trip,
} from "@/lib/types";

import {
  planFillGap,
  planRebalance,
  planResolveOverlap,
} from "./assistant";
import {
  activitiesForDay,
  commentsFromText,
  conflictsForDay,
  gapsForDay,
  itemsForDay,
  routeForDay,
  tripDayKeys,
} from "./schedule";
import {
  atMinutes,
  dayLabel,
  durationMinutes,
  minutesIntoDay,
  shiftDayKey,
  timeLabel,
} from "./time";

let seq = 0;
function nextId(prefix: string) {
  seq += 1;
  return `${prefix}-${Date.now().toString(36)}-${seq}`;
}

export function applyPlanChanges(trip: Trip, changes: AssistantChange[]): Trip {
  let items = [...trip.items];
  let ideas = [...trip.ideas];

  for (const change of changes) {
    if (change.kind === "add" && change.create) {
      if (!items.some((item) => item.id === change.create!.id)) {
        items = [...items, change.create];
      }
    } else if (change.itemId && change.patch) {
      items = items.map((item) =>
        item.id === change.itemId ? { ...item, ...change.patch } : item,
      );
    } else if (change.kind === "remove" && change.itemId) {
      const target = items.find((item) => item.id === change.itemId);
      if (target) {
        items = items.filter((item) => item.id !== change.itemId);
        ideas = [
          {
            id: nextId("idea"),
            category: target.category,
            title: target.title,
            subtitle: target.subtitle,
            place: target.place,
            durationMin:
              target.start && target.end
                ? durationMinutes(target.start, target.end)
                : 90,
            reason: "Taken off the schedule — drop it back in when there is room.",
            addedBy: "assistant",
            costUsd: target.costUsd,
          },
          ...ideas,
        ];
      }
    }
  }

  return { ...trip, items, ideas };
}

export function tripWithPlanPreview(
  trip: Trip,
  plan: AssistantPlan | null,
  applied: string[],
): Trip {
  if (!plan) return trip;
  const pending = plan.changes.filter((change) => !applied.includes(change.id));
  if (pending.length === 0) return trip;
  return applyPlanChanges(trip, pending);
}

export function previewItemIds(plan: AssistantPlan | null, applied: string[]): Set<string> {
  const ids = new Set<string>();
  if (!plan) return ids;
  for (const change of plan.changes) {
    if (applied.includes(change.id)) continue;
    if (change.itemId) ids.add(change.itemId);
    if (change.create?.id) ids.add(change.create.id);
  }
  return ids;
}

function weekdayIndex(word: string): number | null {
  const days = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  const index = days.indexOf(word);
  return index >= 0 ? index : null;
}

function dayFromUtterance(text: string, trip: Trip, fallback: string): string {
  const keys = tripDayKeys(trip);
  const lower = text.toLowerCase();
  for (const key of keys) {
    const label = dayLabel(key).toLowerCase();
    if (lower.includes(label)) return key;
  }
  for (const word of lower.split(/[^a-z]+/)) {
    const index = weekdayIndex(word);
    if (index === null) continue;
    const match = keys.find((key) => new Date(`${key}T12:00:00`).getDay() === index);
    if (match) return match;
  }
  if (/\btomorrow\b/.test(lower)) {
    const next = shiftDayKey(fallback, 1);
    return keys.includes(next) ? next : fallback;
  }
  return fallback;
}

function morningMinutes(text: string): number {
  if (/afternoon|2\s*[-–]?\s*5|after lunch/.test(text)) return 14 * 60;
  if (/evening|dinner|night/.test(text)) return 18 * 60 + 30;
  if (/morning/.test(text)) return 9 * 60 + 30;
  return 10 * 60;
}

function pickIdea(
  ideas: Idea[],
  prefer: Array<Idea["category"]>,
  near?: ItineraryItem | null,
  avoidTitles: string[] = [],
): Idea | null {
  const blocked = new Set(avoidTitles.map((title) => title.toLowerCase()));
  const ranked = ideas
    .filter((idea) => idea.place && !blocked.has(idea.title.toLowerCase()))
    .map((idea) => {
      let score = prefer.includes(idea.category) ? 4 : 0;
      if (near?.place && idea.place) {
        const km = distanceKm(near.place.coords, idea.place.coords);
        score += Math.max(0, 3 - km);
      }
      return { idea, score };
    })
    .sort((a, b) => b.score - a.score);
  return ranked[0]?.idea ?? null;
}

function moveItemPlan(
  trip: Trip,
  item: ItineraryItem,
  day: string,
  startMin: number,
): AssistantPlan | null {
  if (!item.start || !item.end) return null;
  const duration = durationMinutes(item.start, item.end);
  return {
    id: nextId("plan"),
    intent: "move",
    title: `Move ${item.title}`,
    rationale: [
      `Keeping “${item.title}”, just on ${dayLabel(day)} at ${timeLabel(atMinutes(day, startMin))}.`,
      "Nothing else is rewritten until you apply this.",
    ],
    changes: [
      {
        id: nextId("chg"),
        kind: "move",
        itemId: item.id,
        summary: `Move “${item.title}” to ${dayLabel(day)} ${timeLabel(atMinutes(day, startMin))}`,
        patch: {
          start: atMinutes(day, startMin),
          end: atMinutes(day, startMin + duration),
        },
      },
    ],
    dayIso: day,
  };
}

function replacePlan(
  trip: Trip,
  item: ItineraryItem,
  idea: Idea,
  day: string,
): AssistantPlan {
  const start = item.start ?? atMinutes(day, 11 * 60);
  const duration = idea.durationMin;
  const created: ItineraryItem = {
    id: nextId("item"),
    kind: "activity",
    category: idea.category,
    title: idea.title,
    subtitle: idea.subtitle,
    place: idea.place,
    start,
    end: atMinutes(start.slice(0, 10), minutesIntoDay(start) + duration),
    comments: commentsFromText("assistant", idea.reason),
    flexible: true,
    assignedTo: item.assignedTo,
    createdBy: "assistant",
    costUsd: idea.costUsd,
  };
  return {
    id: nextId("plan"),
    intent: "replace",
    title: `Replace ${item.title}`,
    rationale: [
      `Swap “${item.title}” for “${idea.title}”.`,
      idea.reason,
      "The rest of the day stays put until you apply this.",
    ],
    changes: [
      {
        id: nextId("chg"),
        kind: "remove",
        itemId: item.id,
        summary: `Unschedule “${item.title}”`,
      },
      {
        id: nextId("chg"),
        kind: "add",
        summary: `Add “${idea.title}” at ${timeLabel(start)}`,
        create: created,
      },
    ],
    dayIso: day,
  };
}

export function nearbyDinnerPlan(trip: Trip, day: string): AssistantPlan | null {
  const activities = activitiesForDay(trip, day);
  const last = [...activities].reverse().find((item) => item.place) ?? null;
  const idea = pickIdea(trip.ideas, ["food"], last);
  if (!idea?.place) return null;
  const after = last?.end
    ? minutesIntoDay(last.end) + 20
    : 19 * 60;
  const startMin = Math.max(18 * 60, Math.min(after, 20 * 60 + 30));
  const hop =
    last?.place && idea.place
      ? walkMinutes(last.place.coords, idea.place.coords)
      : 12;
  const created: ItineraryItem = {
    id: nextId("item"),
    kind: "activity",
    category: "food",
    title: idea.title,
    subtitle: idea.subtitle,
    place: idea.place,
    start: atMinutes(day, startMin),
    end: atMinutes(day, startMin + idea.durationMin),
    comments: commentsFromText(
      "assistant",
      last
        ? `${Math.max(8, hop)} min from “${last.title}”.`
        : idea.reason,
    ),
    flexible: true,
    assignedTo: [],
    createdBy: "assistant",
    costUsd: idea.costUsd,
  };
  return {
    id: nextId("plan"),
    intent: "nearby-dinner",
    title: "Add dinner near the last stop",
    rationale: [
      last
        ? `Last stop on ${dayLabel(day)} is “${last.title}”.`
        : `${dayLabel(day)} has no anchored last stop yet, so this sits in the evening.`,
      `“${idea.title}” fits a dinner window without inventing a reservation.`,
    ],
    changes: [
      {
        id: nextId("chg"),
        kind: "add",
        summary: `Add “${idea.title}” at ${timeLabel(created.start!)}`,
        create: created,
      },
    ],
    dayIso: day,
  };
}

export function reduceTravelPlan(trip: Trip, day: string): AssistantPlan | null {
  const stops = routeForDay(trip, day);
  if (stops.length < 3) return planRebalance(trip, day);
  let worst = { index: -1, km: 0 };
  for (let index = 1; index < stops.length; index += 1) {
    const prev = stops[index - 1]?.place;
    const next = stops[index]?.place;
    if (!prev || !next) continue;
    const km = distanceKm(prev.coords, next.coords);
    if (km > worst.km) worst = { index, km };
  }
  if (worst.index < 1 || worst.km < 1.2) return planRebalance(trip, day);
  const mover = stops[worst.index]?.item;
  if (!mover?.start || !mover.end || !mover.flexible) return planRebalance(trip, day);
  const duration = durationMinutes(mover.start, mover.end);
  const startMin = minutesIntoDay(stops[0]!.item.start ?? mover.start) + 30;
  return {
    id: nextId("plan"),
    intent: "reduce-travel",
    title: "Cut the long hop",
    rationale: [
      `The stretch into “${mover.title}” is the longest hop on ${dayLabel(day)}.`,
      "Moving it earlier groups the day instead of crossing the city twice.",
    ],
    changes: [
      {
        id: nextId("chg"),
        kind: "move",
        itemId: mover.id,
        summary: `Move “${mover.title}” to ${timeLabel(atMinutes(day, startMin))}`,
        patch: {
          start: atMinutes(day, startMin),
          end: atMinutes(day, startMin + duration),
        },
      },
    ],
    dayIso: day,
  };
}

function removeOnePlan(trip: Trip, day: string, selected?: ItineraryItem | null): AssistantPlan | null {
  const item =
    selected && selected.kind === "activity" && selected.flexible
      ? selected
      : [...activitiesForDay(trip, day)].reverse().find((entry) => entry.flexible);
  if (!item) return null;
  return {
    id: nextId("plan"),
    intent: "remove",
    title: `Ease ${dayLabel(day)}`,
    rationale: [
      `Taking “${item.title}” off the calendar and keeping it in Ideas.`,
      "Apply only if you want that breathing room.",
    ],
    changes: [
      {
        id: nextId("chg"),
        kind: "remove",
        itemId: item.id,
        summary: `Move “${item.title}” to Ideas`,
      },
    ],
    dayIso: day,
  };
}

export function planFromUtterance(
  trip: Trip,
  day: string,
  text: string,
  selectedItemId?: string | null,
): AssistantPlan | null {
  const line = text.trim().toLowerCase();
  const targetDay = dayFromUtterance(line, trip, day);
  const selected =
    trip.items.find((item) => item.id === selectedItemId) ??
    activitiesForDay(trip, targetDay).find((item) =>
      line.includes(item.title.toLowerCase()),
    ) ??
    [...trip.items]
      .reverse()
      .find((item) => item.kind === "activity" && item.createdBy === "assistant") ??
    null;

  if (/clash|overlap|conflict|double.?book/.test(line)) {
    return planResolveOverlap(trip, targetDay);
  }
  if (/dinner|eat near|near my last|near the last/.test(line)) {
    return nearbyDinnerPlan(trip, targetDay);
  }
  if (/alternative|another option|three options/.test(line) && selected) {
    const ideas = alternativeIdeas(trip, selected);
    const pick = /another/.test(line) ? ideas[1] ?? ideas[0] : ideas[0];
    if (pick) return replacePlan(trip, selected, pick, targetDay);
  }
  if (/replace|swap|instead|outdoors|something else/.test(line) && selected) {
    const prefer = /outdoor|park|walk|hike/.test(line)
      ? (["outdoors"] as Idea["category"][])
      : /food|dinner|lunch/.test(line)
        ? (["food"] as Idea["category"][])
        : ([selected.category] as Idea["category"][]);
    const idea = pickIdea(trip.ideas, prefer, selected, [selected.title]);
    if (idea) return replacePlan(trip, selected, idea, targetDay);
  }
  if (/move/.test(line) && selected) {
    return moveItemPlan(trip, selected, targetDay, morningMinutes(line));
  }
  if (/later/.test(line) && selected?.start && selected.end) {
    const start = minutesIntoDay(selected.start) + 60;
    return moveItemPlan(trip, selected, selected.start.slice(0, 10), start);
  }
  if (/travel time|too much walking|reduce travel|backtrack/.test(line)) {
    return reduceTravelPlan(trip, targetDay);
  }
  if (/less rushed|less packed|easier|slower morning|remove one|drop one/.test(line)) {
    return removeOnePlan(trip, targetDay, selected) ?? planRebalance(trip, targetDay);
  }
  if (/fill|afternoon|gap|empty|nothing to do/.test(line)) {
    return planFillGap(trip, targetDay, trip.ideas);
  }
  if (/air|rebalance|breathing/.test(line)) {
    return planRebalance(trip, targetDay);
  }

  const gaps = gapsForDay(trip, targetDay);
  const conflicts = conflictsForDay(trip, targetDay);
  if (conflicts.some((item) => item.kind === "overlap")) {
    return planResolveOverlap(trip, targetDay);
  }
  if (gaps.some((gap) => gap.minutes >= 120)) {
    return planFillGap(trip, targetDay, trip.ideas);
  }
  return null;
}

export function alternativeIdeas(
  trip: Trip,
  item: ItineraryItem | null,
): Idea[] {
  const prefer: Idea["category"][] = item ? [item.category, "outdoors", "food"] : ["outdoors", "food"];
  const blocked = new Set(
    trip.items.map((entry) => entry.title.toLowerCase()),
  );
  return trip.ideas
    .filter((idea) => idea.place && !blocked.has(idea.title.toLowerCase()))
    .sort((a, b) => {
      const as = prefer.includes(a.category) ? 1 : 0;
      const bs = prefer.includes(b.category) ? 1 : 0;
      return bs - as;
    })
    .slice(0, 3);
}
