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
 * Discovery's job is to pick the city. The planner should then open with a
 * real week on the calendar — stay plus the destination's attractions on
 * those nights — not an empty grid and a pile of ideas.
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

function slotsForDay(index: number, total: number): Slot[] {
  if (total === 1) {
    return [
      { minutes: 10 * 60, prefer: ["culture", "sightseeing", "outdoors"] },
      { minutes: 13 * 60, prefer: ["food"] },
      { minutes: 16 * 60, prefer: ["sightseeing", "shopping"] },
      { minutes: 19 * 60 + 30, prefer: ["food", "nightlife"] },
    ];
  }
  if (index === 0) {
    return [
      { minutes: 16 * 60, prefer: ["sightseeing", "outdoors", "shopping"] },
      { minutes: 19 * 60 + 30, prefer: ["food", "nightlife"] },
    ];
  }
  if (index === total - 1) {
    return [
      { minutes: 9 * 60 + 30, prefer: ["culture", "sightseeing", "outdoors"] },
      { minutes: 13 * 60, prefer: ["food"] },
    ];
  }
  return [
    { minutes: 10 * 60, prefer: ["culture", "sightseeing", "outdoors"] },
    { minutes: 13 * 60, prefer: ["food"] },
    { minutes: 16 * 60, prefer: ["sightseeing", "shopping", "outdoors"] },
    { minutes: 21 * 60, prefer: ["nightlife"] },
  ];
}

function takeAttraction(pool: Attraction[], prefer: ItemCategory[]): Attraction | undefined {
  if (pool.length === 0) return undefined;
  const nightlifeOnly = prefer.length === 1 && prefer[0] === "nightlife";
  const index = pool.findIndex((attraction) => prefer.includes(attraction.category));
  if (index >= 0) return pool.splice(index, 1)[0];
  if (nightlifeOnly) return undefined;
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
  const pool = [...destination.attractions];
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
    for (const slot of slotsForDay(dayIndex, days.length)) {
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
