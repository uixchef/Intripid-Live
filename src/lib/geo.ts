import type { LngLat } from "./types";

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Great-circle distance in kilometres. */
export function distanceKm(a: LngLat, b: LngLat): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Rough flight duration in hours, including the fixed overhead that makes
 * short hops feel longer than their distance suggests.
 */
export function flightHours(a: LngLat, b: LngLat): number {
  const km = distanceKm(a, b);
  if (km < 1) return 0;
  return 0.75 + km / 800;
}

/**
 * Walking minutes at a realistic city pace (~4.4 km/h door to door, which
 * accounts for crossings and detours).
 */
export function walkMinutes(a: LngLat, b: LngLat): number {
  return Math.round((distanceKm(a, b) / 4.4) * 60);
}

/** A bounding box that contains every point, as Mapbox expects it. */
export function boundsOf(
  points: LngLat[],
): [[number, number], [number, number]] | null {
  if (points.length === 0) return null;

  let minLng = points[0].lng;
  let maxLng = points[0].lng;
  let minLat = points[0].lat;
  let maxLat = points[0].lat;

  for (const p of points) {
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
  }

  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}

/** Midpoint of a set of points, good enough for city-scale framing. */
export function centroidOf(points: LngLat[]): LngLat | null {
  if (points.length === 0) return null;
  const sum = points.reduce(
    (acc, p) => ({ lng: acc.lng + p.lng, lat: acc.lat + p.lat }),
    { lng: 0, lat: 0 },
  );
  return { lng: sum.lng / points.length, lat: sum.lat / points.length };
}
