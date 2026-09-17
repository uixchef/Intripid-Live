import { supplementAttractions } from "@/data/destination-catalog";
import { briefPlacesOnMap } from "@/lib/discovery/places";
import { commentsFromText } from "@/lib/trip/schedule";
import { atMinutes, tripDays } from "@/lib/trip/time";
import type {
  Attraction,
  BudgetTier,
  Destination,
  Idea,
  Interest,
  ItemCategory,
  ItineraryItem,
  TripStyle,
} from "@/lib/types";

/**
 * A first itinerary from a catalog destination.
 *
 * Discovery's job is to pick the city. "Build trip here" should open a
 * credible first draft — stay plus a preference-weighted day structure —
 * with leftover catalog places on the Ideas shelf.
 */

const DURATION: Partial<Record<ItemCategory, number>> = {
  food: 90,
  culture: 150,
  sightseeing: 120,
  nightlife: 150,
  outdoors: 150,
  shopping: 90,
  transit: 45,
};

const DAY_WORD = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
] as const;

type Slot = { minutes: number; prefer: ItemCategory[] };

const MORNING: Slot = {
  minutes: 10 * 60,
  prefer: ["culture", "sightseeing", "outdoors"],
};
const LUNCH: Slot = { minutes: 13 * 60, prefer: ["food"] };
const AFTERNOON: Slot = {
  minutes: 15 * 60 + 30,
  prefer: ["sightseeing", "outdoors", "shopping", "culture"],
};
const EVENING: Slot = {
  minutes: 19 * 60,
  prefer: ["nightlife", "food"],
};

export type DraftPrefs = {
  budget?: BudgetTier | null;
  styles?: TripStyle[];
  interests?: Interest[];
  score?: number;
};

const STYLE_TO_CATEGORY: Partial<Record<TripStyle, ItemCategory[]>> = {
  mountains: ["outdoors"],
  beaches: ["outdoors"],
  forests: ["outdoors"],
  deserts: ["outdoors", "sightseeing"],
  "lakes-rivers": ["outdoors", "sightseeing"],
  "historical-sites": ["culture", "sightseeing"],
  monuments: ["sightseeing", "culture"],
  "traditional-villages": ["sightseeing", "culture"],
  "wildlife-safaris": ["outdoors"],
  "adventure-parks": ["outdoors"],
  "extreme-sports": ["outdoors"],
  "city-life": ["sightseeing", "nightlife"],
  architecture: ["sightseeing", "culture"],
  "beach-resort": ["outdoors", "food"],
  "hot-springs": ["outdoors"],
  rejuvenate: ["outdoors", "culture"],
  peaceful: ["outdoors", "culture"],
  spas: ["outdoors"],
};

const INTEREST_TO_CATEGORY: Partial<Record<Interest, ItemCategory[]>> = {
  museums: ["culture"],
  "live-music": ["nightlife"],
  "cooking-classes": ["food"],
  festivals: ["nightlife", "culture"],
  "food-markets": ["food"],
  "street-food": ["food"],
  "coffee-places": ["food"],
  "fine-dining": ["food"],
  "parks-gardens": ["outdoors"],
  photography: ["sightseeing"],
  hiking: ["outdoors"],
  cycling: ["outdoors"],
  running: ["outdoors"],
  yoga: ["outdoors"],
  climbing: ["outdoors"],
  "winter-sports": ["outdoors"],
  swimming: ["outdoors"],
  boating: ["outdoors"],
  "beach-activities": ["outdoors"],
  "kayaking-canoeing": ["outdoors"],
  snorkeling: ["outdoors"],
  "paddle-boarding": ["outdoors"],
  "river-cruises": ["sightseeing"],
  "waterfall-visits": ["outdoors"],
  "walking-tours": ["sightseeing"],
  "street-art": ["sightseeing"],
  neighborhoods: ["sightseeing"],
  "bars-nightlife": ["nightlife"],
  "shopping-streets": ["shopping"],
  viewpoints: ["sightseeing"],
};

function preferredCategories(prefs?: DraftPrefs): ItemCategory[] {
  const ranked = new Map<ItemCategory, number>();
  const bump = (category: ItemCategory, amount: number) => {
    ranked.set(category, (ranked.get(category) ?? 0) + amount);
  };
  for (const style of prefs?.styles ?? []) {
    for (const category of STYLE_TO_CATEGORY[style] ?? []) bump(category, 3);
  }
  for (const interest of prefs?.interests ?? []) {
    for (const category of INTEREST_TO_CATEGORY[interest] ?? []) bump(category, 2);
  }
  bump("food", 2);
  return [...ranked.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([category]) => category);
}

function scoreAttraction(attraction: Attraction, prefer: ItemCategory[]): number {
  const hit = prefer.indexOf(attraction.category);
  if (hit === 0) return 6;
  if (hit === 1) return 4;
  if (hit > 1) return 2;
  return 0;
}

function capForDay(index: number, total: number): number {
  if (total === 1) return 4;
  if (index === 0 || index === total - 1) return 3;
  return 4;
}

/**
 * How many catalog places to schedule. Aim for a useful draft with air:
 * arrival/departure lighter, full days 3–4 stops.
 */
function targetScheduled(days: number, poolSize: number): number {
  if (days <= 0 || poolSize <= 0) return 0;
  let target = 0;
  for (let day = 0; day < days; day += 1) {
    const edge = day === 0 || day === days - 1;
    target += edge && days > 1 ? 3 : 4;
  }
  /* Keep ~30–50% of the catalog unschedules for the Idea board. */
  const maxSchedule = Math.max(days * 2, Math.floor(poolSize * 0.7));
  return Math.min(target, maxSchedule, poolSize);
}

function spreadCounts(totalPlaces: number, days: number): number[] {
  const counts = Array.from({ length: days }, () => 0);
  if (days <= 0 || totalPlaces <= 0) return counts;
  const order: number[] = [];
  for (let day = 0; day < days; day += 1) {
    if (days === 1 || (day !== 0 && day !== days - 1)) order.push(day);
  }
  if (days > 1) {
    order.push(0);
    order.push(days - 1);
  }
  let left = totalPlaces;
  while (left > 0) {
    let placed = 0;
    for (const day of order) {
      if (left === 0) break;
      if (counts[day] < capForDay(day, days)) {
        counts[day] += 1;
        left -= 1;
        placed += 1;
      }
    }
    if (placed === 0) break;
  }
  return counts;
}

function slotsForDay(index: number, total: number, count: number): Slot[] {
  if (count <= 0) return [];
  const middle = total === 1 || (index > 0 && index < total - 1);
  if (middle) {
    if (count === 1) return [AFTERNOON];
    if (count === 2) return [MORNING, EVENING];
    if (count === 3) return [MORNING, LUNCH, EVENING];
    return [MORNING, LUNCH, AFTERNOON, EVENING];
  }
  if (index === 0) {
    if (count === 1) return [AFTERNOON];
    if (count === 2) return [AFTERNOON, EVENING];
    return [LUNCH, AFTERNOON, EVENING];
  }
  const lastMorning = { ...MORNING, minutes: 9 * 60 + 30 };
  if (count === 1) return [lastMorning];
  if (count === 2) return [lastMorning, LUNCH];
  return [lastMorning, LUNCH, AFTERNOON];
}

function takeAttraction(
  pool: Attraction[],
  prefer: ItemCategory[],
): Attraction | undefined {
  if (pool.length === 0) return undefined;
  let best = 0;
  let score = -1;
  pool.forEach((attraction, index) => {
    const next = scoreAttraction(attraction, prefer);
    if (next > score) {
      score = next;
      best = index;
    }
  });
  return pool.splice(best, 1)[0];
}

function itemFromAttraction(
  destination: Destination,
  attraction: Attraction,
  day: string,
  startMin: number,
  ownerId: string,
  index: number,
): ItineraryItem {
  const duration = DURATION[attraction.category] ?? 90;
  return {
    id: `i-${destination.id}-${index}`,
    kind: "activity",
    category: attraction.category,
    title: attraction.name,
    subtitle: attraction.note,
    place: {
      name: attraction.name,
      address: `${destination.name}, ${destination.country}`,
      coords: attraction.coords,
    },
    start: atMinutes(day, startMin),
    end: atMinutes(day, startMin + duration),
    comments: commentsFromText(ownerId, attraction.note),
    flexible: true,
    assignedTo: [],
    createdBy: ownerId,
  };
}

function ideaFromAttraction(
  destination: Destination,
  attraction: Attraction,
  ownerId: string,
  index: number,
): Idea {
  return {
    id: `idea-${destination.id}-${index}`,
    category: attraction.category,
    title: attraction.name,
    subtitle: attraction.note,
    place: {
      name: attraction.name,
      address: destination.name,
      coords: attraction.coords,
    },
    durationMin: DURATION[attraction.category] ?? 90,
    reason: attraction.note,
    addedBy: ownerId,
  };
}

export function tripTitleForDestination(
  destination: Destination,
  startDate: string,
  endDate: string,
): string {
  const days = tripDays(startDate, endDate).length;
  const place = destination.id === "nyc" ? "New York" : destination.name;
  if (days === 1) return `A day in ${place}`;
  const count = DAY_WORD[days] ?? String(days);
  return `${count} days in ${place}`;
}

export function planFromDestination(
  destination: Destination,
  startDate: string,
  endDate: string,
  ownerId: string,
  prefs?: DraftPrefs,
): { items: ItineraryItem[]; ideas: Idea[] } {
  const days = tripDays(startDate, endDate);
  const nights = Math.max(days.length - 1, 1);
  const prefer = preferredCategories(prefs);
  const pool = [...briefPlacesOnMap(supplementAttractions(destination))].sort(
    (a, b) => scoreAttraction(b, prefer) - scoreAttraction(a, prefer),
  );
  const scheduled = targetScheduled(days.length, pool.length);
  const perDay = spreadCounts(scheduled, days.length);
  const items: ItineraryItem[] = [
    {
      id: `stay-${destination.id}`,
      kind: "stay",
      category: "stay",
      title: `Stay in ${destination.name}`,
      subtitle: `${nights} ${nights === 1 ? "night" : "nights"}`,
      place: {
        name: destination.name,
        address: `${destination.name}, ${destination.country}`,
        coords: destination.coords,
      },
      start: atMinutes(startDate, 15 * 60),
      end: atMinutes(endDate, 11 * 60),
      flexible: false,
      assignedTo: [],
      createdBy: ownerId,
    },
  ];

  let index = 0;
  for (let dayIndex = 0; dayIndex < days.length; dayIndex += 1) {
    const day = days[dayIndex];
    for (const slot of slotsForDay(dayIndex, days.length, perDay[dayIndex] ?? 0)) {
      const preferSlot = [...slot.prefer, ...prefer];
      const attraction = takeAttraction(pool, preferSlot);
      if (!attraction) continue;
      items.push(
        itemFromAttraction(destination, attraction, day, slot.minutes, ownerId, index),
      );
      index += 1;
    }
  }

  const ideas = pool.map((attraction, ideaIndex) =>
    ideaFromAttraction(destination, attraction, ownerId, ideaIndex),
  );

  return { items, ideas };
}
