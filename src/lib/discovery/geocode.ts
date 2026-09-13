import { publicEnv } from "@/lib/env";
import type { Origin } from "@/lib/types";

interface MapboxContext {
  id: string;
  text: string;
  short_code?: string;
}

interface MapboxFeature {
  text: string;
  place_name: string;
  place_type: string[];
  center: [number, number];
  address?: string;
  context?: MapboxContext[];
  properties?: { short_code?: string };
}

interface MapboxGeocodeResponse {
  features?: MapboxFeature[];
}

function contextOf(feature: MapboxFeature, prefix: string): MapboxContext | undefined {
  return feature.context?.find((item) => item.id.startsWith(prefix));
}

export function originFromFeature(feature: MapboxFeature): Origin {
  const countryCtx = contextOf(feature, "country.");
  const placeCtx =
    contextOf(feature, "place.") ??
    contextOf(feature, "locality.") ??
    contextOf(feature, "district.") ??
    contextOf(feature, "region.");

  const isAddress = feature.place_type.includes("address");
  const street = isAddress
    ? [feature.address, feature.text].filter(Boolean).join(" ").trim()
    : "";
  const cityName = isAddress
    ? (placeCtx?.text ?? feature.text)
    : feature.place_type.includes("place")
      ? feature.text
      : (placeCtx?.text ?? feature.text);

  const country = countryCtx?.text ?? "Unknown";
  const countryCode = (countryCtx?.short_code ?? "xx").slice(0, 2).toUpperCase();
  const [lng, lat] = feature.center;

  return {
    city: street || cityName,
    country: street && cityName ? `${cityName}, ${country}` : country,
    countryCode,
    coords: { lng, lat },
  };
}

async function geocode(search: string, extra = ""): Promise<Origin | null> {
  const token = publicEnv.mapboxToken.trim();
  if (!token) return null;

  const params = new URLSearchParams({
    limit: "1",
    access_token: token,
  });

  if (extra) {
    for (const [key, value] of new URLSearchParams(extra)) {
      params.set(key, value);
    }
  }

  const response = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${search}.json?${params.toString()}`,
  );

  if (!response.ok) return null;

  const body = (await response.json()) as MapboxGeocodeResponse;
  const feature = body.features?.[0];
  return feature ? originFromFeature(feature) : null;
}

export async function reverseGeocode(lng: number, lat: number): Promise<Origin | null> {
  const labeled =
    (await geocode(`${lng},${lat}`, "types=place")) ??
    (await geocode(`${lng},${lat}`, "types=address"));
  if (!labeled) return null;
  return { ...labeled, coords: { lng, lat } };
}

export async function forwardGeocode(query: string): Promise<Origin | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;
  return geocode(encodeURIComponent(trimmed));
}

export function originFromCoords(lng: number, lat: number): Origin {
  return {
    city: "Current location",
    country: "Pin from your device",
    countryCode: "XX",
    coords: { lng, lat },
  };
}

export interface PlaceSuggestion {
  id: string;
  name: string;
  detail: string;
  scale: "country" | "state" | "city";
  coords: { lng: number; lat: number };
  iso2?: string;
}

function scaleOf(feature: MapboxFeature): PlaceSuggestion["scale"] {
  if (feature.place_type.includes("country")) return "country";
  if (feature.place_type.includes("region")) return "state";
  return "city";
}

/** Several matches for the footprint editor, not a single origin. */
export async function suggestPlaces(query: string): Promise<PlaceSuggestion[]> {
  const trimmed = query.trim();
  const token = publicEnv.mapboxToken.trim();
  if (!trimmed || !token) return [];

  const params = new URLSearchParams({
    limit: "6",
    types: "country,region,place,district",
    access_token: token,
  });

  const response = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(trimmed)}.json?${params.toString()}`,
  );
  if (!response.ok) return [];

  const body = (await response.json()) as MapboxGeocodeResponse;
  return (body.features ?? []).map((feature) => {
    const country = contextOf(feature, "country.");
    const short =
      feature.place_type.includes("country")
        ? feature.properties?.short_code
        : country?.short_code;
    const [lng, lat] = feature.center;
    return {
      id: `${feature.place_name}-${lng},${lat}`,
      name: feature.text,
      detail: feature.place_name,
      scale: scaleOf(feature),
      coords: { lng, lat },
      iso2: short?.slice(0, 2).toUpperCase(),
    };
  });
}
