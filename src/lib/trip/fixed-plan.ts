import { FIXED_STAYS, FIXED_STOPS, type FixedStop } from "@/data/fixed-places";
import { distanceKm, walkMinutes } from "@/lib/geo";
import { commentsFromText } from "@/lib/trip/schedule";
import { atMinutes, tripDays } from "@/lib/trip/time";
import type {
  CommuteMode,
  Destination,
  Idea,
  ItineraryItem,
  Traveller,
} from "@/lib/types";

/**
 * A finished itinerary for a dashboard trip.
 *
 * Discovery drafts a city. These records already happened — or are booked —
 * so the calendar has to read like NYC: meals, walks, commutes, a stay, and
 * a party that is not one face.
 */

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 28);
}

function partyIds(travellers: Traveller[]): string[] {
  return travellers
    .filter((person) => person.role !== "advisor")
    .map((person) => person.id);
}

function splitAssignments(travellers: Traveller[]): [string[], string[]] {
  const party = partyIds(travellers);
  if (party.length < 2) return [party, party];
  const mid = Math.ceil(party.length / 2);
  return [party.slice(0, mid), party.slice(mid)];
}

function nextOf(pool: FixedStop[], index: number, day: number): FixedStop | undefined {
  if (pool.length === 0) return undefined;
  return pool[(index + day) % pool.length];
}

function commuteBetween(
  from: ItineraryItem,
  to: ItineraryItem,
  start: string,
  ownerId: string,
  id: string,
): ItineraryItem | null {
  if (!from.place || !to.place || !from.end) return null;
  const minutes = Math.max(8, walkMinutes(from.place.coords, to.place.coords));
  const km = distanceKm(from.place.coords, to.place.coords);
  if (minutes < 8) return null;
  const mode: CommuteMode = minutes <= 22 ? "walk" : minutes <= 45 ? "subway" : "taxi";
  const travel = Math.min(mode === "walk" ? minutes : Math.round(minutes * 0.55), 40);
  return {
    id,
    kind: "commute",
    category: "transit",
    title:
      mode === "walk"
        ? `Walk to ${to.place.name}`
        : mode === "subway"
          ? `Transit to ${to.place.name}`
          : `Taxi to ${to.place.name}`,
    subtitle: `${travel} minutes`,
    place: null,
    start,
    end: atMinutes(start.slice(0, 10), Math.min(24 * 60 - 1, minutesInto(start) + travel)),
    flexible: false,
    assignedTo: [],
    createdBy: ownerId,
    commute: {
      mode,
      minutes: travel,
      distanceKm: Math.round(km * 10) / 10,
      fromItemId: from.id,
      toItemId: to.id,
    },
  };
}

function minutesInto(iso: string): number {
  const time = iso.slice(11, 16);
  const [hh, mm] = time.split(":").map(Number);
  return hh * 60 + mm;
}

function activityFromStop(
  stop: FixedStop,
  day: string,
  startMin: number,
  ownerId: string,
  assignedTo: string[],
  id: string,
  flexible: boolean,
): ItineraryItem {
  return {
    id,
    kind: "activity",
    category: stop.category,
    title: stop.title,
    subtitle: stop.subtitle,
    place: {
      name: stop.title.replace(/^(Coffee at |Lunch at |Dinner at |Breakfast on )/, ""),
      address: stop.address,
      coords: stop.coords,
      neighbourhood: stop.neighbourhood,
    },
    start: atMinutes(day, startMin),
    end: atMinutes(day, startMin + stop.durationMin),
    comments: commentsFromText(ownerId, stop.notes),
    flexible,
    assignedTo,
    createdBy: ownerId,
    costUsd: stop.costUsd,
  };
}

export function planFixedTrip(
  destination: Destination,
  startDate: string,
  endDate: string,
  travellers: Traveller[],
): { items: ItineraryItem[]; ideas: Idea[] } {
  const ownerId = travellers[0]?.id ?? "owner";
  const days = tripDays(startDate, endDate);
  const nights = Math.max(days.length - 1, 1);
  const stayMeta = FIXED_STAYS[destination.id];
  const stops = FIXED_STOPS[destination.id] ?? [];
  const ideasStops = stops.filter((stop) => stop.idea);
  const usable = stops.filter((stop) => !stop.idea);
  const breakfasts = usable.filter((stop) => stop.meal === "breakfast");
  const lunches = usable.filter((stop) => stop.meal === "lunch");
  const dinners = usable.filter((stop) => stop.meal === "dinner");
  const nightsOut = usable.filter((stop) => stop.category === "nightlife");
  const sights = usable.filter((stop) => !stop.meal && stop.category !== "nightlife");
  const [groupA, groupB] = splitAssignments(travellers);

  const stay: ItineraryItem = {
    id: `stay-${destination.id}`,
    kind: "stay",
    category: "stay",
    title: stayMeta?.title ?? `Stay in ${destination.name}`,
    subtitle: stayMeta?.subtitle ?? `${nights} ${nights === 1 ? "night" : "nights"}`,
    place: {
      name: stayMeta?.title ?? destination.name,
      address: stayMeta?.address ?? `${destination.name}, ${destination.country}`,
      coords: stayMeta?.coords ?? destination.coords,
      neighbourhood: stayMeta?.neighbourhood,
    },
    start: atMinutes(startDate, 15 * 60),
    end: atMinutes(endDate, 11 * 60),
    comments: commentsFromText(ownerId, stayMeta?.notes),
    flexible: false,
    assignedTo: [],
    createdBy: ownerId,
    costUsd: stayMeta?.costUsd,
    booking: stayMeta?.booking,
  };

  const items: ItineraryItem[] = [stay];
  let seq = 0;

  for (let dayIndex = 0; dayIndex < days.length; dayIndex += 1) {
    const day = days[dayIndex];
    const first = dayIndex === 0;
    const last = dayIndex === days.length - 1;
    const dayStops: { stop: FixedStop; start: number; assigned: string[]; flex: boolean }[] =
      [];

    if (!first) {
      const breakfast = nextOf(breakfasts, 0, dayIndex);
      if (breakfast) {
        dayStops.push({
          stop: breakfast,
          start: 8 * 60 + 15,
          assigned: [],
          flex: true,
        });
      }
    }

    const morning = nextOf(sights, dayIndex * 2, 0);
    if (morning && !first) {
      dayStops.push({
        stop: morning,
        start: 10 * 60,
        assigned: dayIndex % 3 === 1 ? groupA : [],
        flex: true,
      });
    }

    if (first) {
      const arrival = nextOf(sights, 0, 1);
      if (arrival) {
        dayStops.push({
          stop: arrival,
          start: 16 * 60,
          assigned: [],
          flex: true,
        });
      }
    } else {
      const lunch = nextOf(lunches, 0, dayIndex);
      if (lunch) {
        dayStops.push({
          stop: lunch,
          start: 13 * 60,
          assigned: [],
          flex: true,
        });
      }
      const afternoon = nextOf(sights, dayIndex * 2 + 1, 2);
      if (afternoon && afternoon !== morning) {
        dayStops.push({
          stop: afternoon,
          start: 15 * 60 + 30,
          assigned: dayIndex % 3 === 1 ? groupB : [],
          flex: true,
        });
      }
    }

    if (!last) {
      const dinner = nextOf(dinners, 0, dayIndex);
      if (dinner) {
        dayStops.push({
          stop: dinner,
          start: first ? 19 * 60 + 30 : 19 * 60,
          assigned: [],
          flex: dayIndex % 2 === 0,
        });
      }
      const night = nextOf(nightsOut, 0, dayIndex);
      if (night && (first || dayIndex % 2 === 0)) {
        dayStops.push({
          stop: night,
          start: 21 * 60 + 30,
          assigned: groupA,
          flex: true,
        });
      }
    } else {
      const lunch = nextOf(lunches, 1, dayIndex);
      if (lunch) {
        dayStops.push({
          stop: lunch,
          start: 12 * 60 + 30,
          assigned: [],
          flex: true,
        });
      }
    }

    const placed: ItineraryItem[] = [];
    for (const slot of dayStops) {
      seq += 1;
      const item = activityFromStop(
        slot.stop,
        day,
        slot.start,
        ownerId,
        slot.assigned,
        `i-${destination.id}-${slug(slot.stop.title)}-${dayIndex}-${seq}`,
        slot.flex,
      );
      const previous = placed[placed.length - 1];
      if (previous?.end && item.start && previous.end > item.start) {
        const shifted = minutesInto(previous.end) + 10;
        item.start = atMinutes(day, shifted);
        item.end = atMinutes(day, shifted + slot.stop.durationMin);
      }
      if (previous) {
        seq += 1;
        const hop = commuteBetween(
          previous,
          item,
          previous.end ?? item.start!,
          ownerId,
          `cm-${destination.id}-${dayIndex}-${seq}`,
        );
        if (hop) {
          items.push(hop);
          if (hop.end && item.start && hop.end > item.start) {
            const shifted = minutesInto(hop.end) + 5;
            item.start = atMinutes(day, shifted);
            item.end = atMinutes(day, shifted + slot.stop.durationMin);
          }
        }
      }
      placed.push(item);
      items.push(item);
    }
  }

  const ideas: Idea[] = ideasStops.map((stop, index) => ({
    id: `idea-${destination.id}-${index}`,
    category: stop.category,
    title: stop.title,
    subtitle: stop.subtitle,
    place: {
      name: stop.title,
      address: stop.address,
      coords: stop.coords,
      neighbourhood: stop.neighbourhood,
    },
    durationMin: stop.durationMin,
    reason: stop.notes,
    addedBy: ownerId,
    costUsd: stop.costUsd,
  }));

  return { items, ideas };
}
