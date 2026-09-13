import { AIRPORTS, type Airport } from "@/data/airports";
import { distanceKm, flightHours } from "@/lib/geo";
import type { Destination, LngLat, Origin } from "@/lib/types";

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
const CITY_PORT_KM = 120;
const CITY_PORT_FALLBACK_KM = 250;

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

/**
 * Destination-side airports for the cities that already survived
 * home / where / budget. One airport per city, never the departure port.
 */
export function destinationPortsFor(
  origin: Origin,
  destinations: Destination[],
): DeparturePort[] {
  const departure = nearestDeparture(origin.coords);
  const seen = new Set<string>();
  const ports: DeparturePort[] = [];

  for (const destination of destinations) {
    const airport = closestAirport(destination.coords, departure?.iata);
    if (!airport || seen.has(airport.iata)) continue;
    seen.add(airport.iata);
    ports.push(toPort(origin.coords, airport));
  }

  return ports.sort((a, b) => a.hours - b.hours);
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

  if (!best) return null;
  if (bestKm <= CITY_PORT_KM) return best;
  if (bestKm <= CITY_PORT_FALLBACK_KM) return best;
  return null;
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
