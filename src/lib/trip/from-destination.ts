import { briefPlacesOnMap } from "@/lib/discovery/places";
import { commentsFromText } from "@/lib/trip/schedule";
import { atMinutes, tripDays } from "@/lib/trip/time";
import type {
  Attraction,
  Destination,
  Idea,
  ItemCategory,
  ItineraryItem,
} from "@/lib/types";

/**
 * A first itinerary from a catalog destination.
 *
 * Discovery's job is to pick the city. "Build trip here" should open the
 * planner with every place from that brief on the calendar — stay plus the
 * shortlist, spread across the nights — not two pins and a pile of ideas.
 */

const DURATION: Partial<Record<ItemCategory, number>> = {
  food: 90,
  culture: 150,
  sightseeing: 120,
  nightlife: 150,
  outdoors: 180,
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
  minutes: 16 * 60,
  prefer: ["sightseeing", "shopping", "outdoors", "transit"],
};
const EVENING: Slot = {
  minutes: 19 * 60 + 30,
  prefer: ["nightlife", "food"],
};

function capForDay(index: number, total: number): number {
  if (total === 1) return 4;
  if (index === 0 || index === total - 1) return 3;
  return 4;
}

/** Spread every attraction across the trip days, middle days first. */
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
  const index = pool.findIndex((attraction) => prefer.includes(attraction.category));
  if (index >= 0) return pool.splice(index, 1)[0];
  return pool.shift();
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
): { items: ItineraryItem[]; ideas: Idea[] } {
  const days = tripDays(startDate, endDate);
  const nights = Math.max(days.length - 1, 1);
  const pool = [...briefPlacesOnMap(destination.attractions)];
  const perDay = spreadCounts(pool.length, days.length);
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
      const attraction = takeAttraction(pool, slot.prefer);
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
