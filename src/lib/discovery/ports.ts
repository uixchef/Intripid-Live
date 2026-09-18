import { AIRPORTS, type Airport } from "@/data/airports";
import { distanceKm, flightHours } from "@/lib/geo";
import type { Destination, LngLat, Origin, TripScope } from "@/lib/types";

export interface DeparturePort {
  id: string;
  iata: string;
  name: string;
  city: string;
  coords: LngLat;
  km: number;
  hours: number;
}

const LOCAL_KM = 140;
const LOCAL_FALLBACK_KM = 320;
/** Airports that actually serve a city, not the nearest hub on another coast. */
const CITY_PORT_KM = 80;
const PLACE_FROM_PORT_KM = 140;
const HUNT_PORT_FLOOR = 50;
const HUNT_PLACE_FLOOR = 65;

/**
 * Real aerodromes around a point — Heathrow for London, not a pin on the
 * river. Widens the radius once if the first ring is empty (a geocoded
 * village, a small island).
 */
export function nearbyAirports(origin: LngLat): DeparturePort[] {
  const inner = airportsWithin(origin, LOCAL_KM);
  if (inner.length > 0) return inner;
  return airportsWithin(origin, LOCAL_FALLBACK_KM);
}

/** The single nearest commercial airport to home. */
export function nearestDeparture(origin: LngLat): DeparturePort | null {
  return nearbyAirports(origin)[0] ?? null;
}

function destinationInScope(
  destination: Destination,
  origin: Origin,
  scope: TripScope | null,
): boolean {
  if (!scope || scope === "open") return true;
  if (scope === "domestic") return destination.countryCode === origin.countryCode;
  return destination.countryCode !== origin.countryCode;
}

/**
 * Conservative city-level identity check. Excludes a destination only when
 * it is the traveller's own origin city — never a neighbouring city, a
 * same-country city, or a substring match.
 *
 * Two signals, either sufficient:
 * 1. Same country code + exact city name (case-insensitive)
 * 2. Same country code + coordinates within 20km (catches same-city-
 *    different-name cases like origin "New York" vs destination "New York City")
 */
function isOriginCity(destination: Destination, origin: Origin): boolean {
  if (destination.countryCode !== origin.countryCode) return false;
  if (destination.name.toLowerCase() === origin.city.toLowerCase()) return true;
  return distanceKm(destination.coords, origin.coords) <= 20;
}

function airportInScope(
  airport: Airport,
  origin: Origin,
  scope: TripScope | null,
): boolean {
  if (!scope || scope === "open") return true;
  if (scope === "domestic") return airport.country === origin.country;
  return airport.country !== origin.country;
}

function originSeed(coords: LngLat): number {
  return Math.abs(Math.round((coords.lng + 180) * 7919 + (coords.lat + 90) * 104729));
}

function seededShuffle<T>(items: T[], seed: number): T[] {
  const next = [...items];
  let value = seed || 1;
  for (let index = next.length - 1; index > 0; index -= 1) {
    value = (value * 16807) % 2147483647;
    const swap = value % (index + 1);
    const held = next[index];
    next[index] = next[swap];
    next[swap] = held;
  }
  return next;
}

function airportsServing(coords: LngLat, excludeIata?: string): Airport[] {
  const local = AIRPORTS.filter(
    (airport) =>
      airport.iata !== excludeIata &&
      distanceKm(coords, airport.coords) <= CITY_PORT_KM,
  );
  if (local.length > 0) return local;
  const closest = closestAirport(coords, excludeIata);
  return closest ? [closest] : [];
}

/**
 * Destination hunt: a seeded field of 50+ ports, then 65+ places those
 * ports can actually reach. Chip filters thin that field afterwards.
 */
export function destinationHunt(
  origin: Origin,
  destinations: Destination[],
  scope: TripScope | null,
): { ports: DeparturePort[]; destinations: Destination[] } {
  const departure = nearestDeparture(origin.coords);
  const scoped = destinations.filter(
    (destination) =>
      destinationInScope(destination, origin, scope) &&
      !isOriginCity(destination, origin),
  );
  const airportPool = AIRPORTS.filter(
    (airport) =>
      airport.iata !== departure?.iata &&
      airportInScope(airport, origin, scope),
  );

  const seen = new Set<string>();
  const serving: Airport[] = [];
  for (const destination of scoped) {
    for (const airport of airportsServing(destination.coords, departure?.iata)) {
      if (!airportInScope(airport, origin, scope)) continue;
      if (seen.has(airport.iata)) continue;
      seen.add(airport.iata);
      serving.push(airport);
    }
  }

  const fillers = seededShuffle(
    airportPool.filter((airport) => !seen.has(airport.iata)),
    originSeed(origin.coords),
  );
  for (const airport of fillers) {
    if (serving.length >= HUNT_PORT_FLOOR) break;
    seen.add(airport.iata);
    serving.push(airport);
  }

  const places = scoped.filter((destination) =>
    serving.some(
      (airport) =>
        distanceKm(destination.coords, airport.coords) <= PLACE_FROM_PORT_KM,
    ),
  );

  if (places.length < HUNT_PLACE_FLOOR) {
    const missing = scoped.filter(
      (destination) => !places.some((place) => place.id === destination.id),
    );
    for (const destination of missing) {
      for (const airport of airportsServing(destination.coords, departure?.iata)) {
        if (seen.has(airport.iata)) continue;
        seen.add(airport.iata);
        serving.push(airport);
      }
      places.push(destination);
      if (places.length >= HUNT_PLACE_FLOOR && serving.length >= HUNT_PORT_FLOOR) {
        break;
      }
    }
  }

  return {
    ports: serving
      .map((airport) => toPort(origin.coords, airport))
      .sort((a, b) => a.hours - b.hours),
    destinations: places,
  };
}

/**
 * Destination-side airports for the cities still in play.
 */
export function destinationPortsFor(
  origin: Origin,
  destinations: Destination[],
): DeparturePort[] {
  return destinationHunt(origin, destinations, "open").ports;
}

/** Cities the traveller can actually visit from the destination ports. */
export function destinationsNearPorts(
  origin: Origin,
  destinations: Destination[],
): Destination[] {
  return destinationHunt(origin, destinations, "open").destinations;
}

function closestAirport(coords: LngLat, excludeIata?: string): Airport | null {
  let best: Airport | null = null;
  let bestKm = Infinity;

  for (const airport of AIRPORTS) {
    if (airport.iata === excludeIata) continue;
    const km = distanceKm(coords, airport.coords);
    if (km < bestKm) {
      bestKm = km;
      best = airport;
    }
  }

  return best;
}

function airportsWithin(origin: LngLat, maxKm: number): DeparturePort[] {
  return AIRPORTS.filter((airport) => distanceKm(origin, airport.coords) <= maxKm)
    .map((airport) => toPort(origin, airport))
    .sort((a, b) => a.km - b.km);
}

function toPort(origin: LngLat, airport: Airport): DeparturePort {
  return {
    id: airport.iata,
    iata: airport.iata,
    name: airport.name,
    city: airport.city,
    coords: airport.coords,
    km: Math.round(distanceKm(origin, airport.coords)),
    hours: flightHours(origin, airport.coords),
  };
}
