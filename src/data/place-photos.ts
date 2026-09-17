import { DESTINATIONS, getDestination } from "@/data/destinations";
import type { Attraction, LngLat } from "@/lib/types";

/** Destination photographs that live under /destinations. */
export const DESTINATION_COVER: Record<string, string> = {
  tokyo: "/destinations/tokyo.jpg",
  nyc: "/destinations/nyc.jpg",
  lisbon: "/destinations/lisbon.jpg",
  copenhagen: "/destinations/copenhagen.jpg",
  marrakesh: "/destinations/marrakesh.jpg",
};

const CITY_PHOTO: Record<string, string> = {
  ...Object.fromEntries(
  [
    "amsterdam",
    "athens",
    "atlanta",
    "auckland",
    "bali",
    "bangkok",
    "barcelona",
    "beijing",
    "bengaluru",
    "berlin",
    "bogota",
    "boston",
    "brisbane",
    "brussels",
    "budapest",
    "buenos-aires",
    "cairo",
    "cape-town",
    "casablanca",
    "chiang-mai",
    "chicago",
    "cusco",
    "delhi",
    "denver",
    "dubai",
    "dublin",
    "dubrovnik",
    "edinburgh",
    "florence",
    "goa",
    "hamburg",
    "hanoi",
    "ho-chi-minh",
    "hong-kong",
    "istanbul",
    "jaipur",
    "jakarta",
    "johannesburg",
    "kathmandu",
    "krakow",
    "kuala-lumpur",
    "kyoto",
    "lima",
    "los-angeles",
    "manchester",
    "manila",
    "melbourne",
    "mexico-city",
    "miami",
    "milan",
    "montreal",
    "mumbai",
    "munich",
    "nairobi",
    "new-orleans",
    "oaxaca",
    "osaka",
    "oslo",
    "paris",
    "perth",
    "porto",
    "prague",
    "queenstown",
    "reykjavik",
    "rio",
    "rome",
    "san-francisco",
    "santiago",
    "sao-paulo",
    "seattle",
    "seoul",
    "shanghai",
    "singapore",
    "stockholm",
    "sydney",
    "taipei",
    "toronto",
    "udaipur",
    "vancouver",
    "venice",
    "vienna",
    "washington",
    "wellington",
    "zanzibar",
    "zurich",
  ].map((id) => [id, `/places/${id}.jpg`]),
  ),
  /* Core editorial cities live under /destinations, not /places/{id}.jpg. */
  ...DESTINATION_COVER,
};

const FALLBACK = "/discovery/pins/place.png";

function slug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function tokens(value: string): string[] {
  return slug(value)
    .split("-")
    .filter((part) => part.length > 2);
}

function nameScore(query: string, attractionName: string): number {
  const q = slug(query);
  const a = slug(attractionName);
  if (!q || !a) return 0;
  if (q === a) return 1;
  /*
   * Only allow the query to contain the attraction name, not the reverse.
   * "Paris" containing "paris-historic-centre" is a false positive that
   * borrows another place's photo — the query must be the longer string.
   */
  if (q.includes(a) && q.length > a.length) return 0.92;
  const qTokens = new Set(tokens(query));
  const aTokens = tokens(attractionName);
  if (aTokens.length === 0) return 0;
  const hits = aTokens.filter((token) => qTokens.has(token)).length;
  return hits / aTokens.length >= 0.6 ? 0.75 : 0;
}

function dist2(a: LngLat, b: LngLat): number {
  const dLat = a.lat - b.lat;
  const dLng = (a.lng - b.lng) * Math.cos((a.lat * Math.PI) / 180);
  return dLat * dLat + dLng * dLng;
}

function catalog(destinationId?: string): Attraction[] {
  const fromCity = destinationId
    ? (getDestination(destinationId)?.attractions ?? [])
    : DESTINATIONS.flatMap((destination) => destination.attractions);
  return fromCity.filter((attraction) => attraction.photo);
}

function bestNameMatch(
  queries: string[],
  pool: Attraction[],
): Attraction | null {
  let winner: Attraction | null = null;
  let score = 0.69;
  for (const attraction of pool) {
    for (const query of queries) {
      const next = nameScore(query, attraction.name);
      if (next > score) {
        score = next;
        winner = attraction;
      }
    }
  }
  return winner;
}

function nearestAttraction(
  coords: LngLat,
  pool: Attraction[],
): Attraction | null {
  if (pool.length === 0) return null;
  let winner = pool[0];
  let best = Infinity;
  for (const attraction of pool) {
    const d = dist2(coords, attraction.coords);
    if (d < best) {
      best = d;
      winner = attraction;
    }
  }
  return winner;
}

function cityPhoto(place: { id?: string; name?: string }): string | null {
  const keys = [place.id, place.name ? slug(place.name) : ""]
    .filter((k): k is string => Boolean(k))
    .map((key) => key.replace(/^p-/, ""));
  for (const key of keys) {
    if (DESTINATION_COVER[key]) return DESTINATION_COVER[key];
    if (CITY_PHOTO[key]) return CITY_PHOTO[key];
  }
  return null;
}

/**
 * City portrait for a footprint pin.
 *
 * City covers only — never a nearest Discovery attraction. The identity
 * globe is the travel record, not the hunt.
 */
export function footprintPhotoSrc(place: { id: string; name?: string }): string {
  return cityPhoto(place) ?? FALLBACK;
}

/** A real photograph for a map pin — never a satellite still, never a borrowed photo. */
export function placePhotoSrc(place: {
  id: string;
  name?: string;
  title?: string;
  coords?: LngLat;
  destinationId?: string;
}): string {
  const city = cityPhoto(place);
  if (city) return city;

  /*
   * Place-specific photo only: a canonical name match to an attraction
   * that has its own photograph. No nearest-attraction fallback, no city
   * cover fallback — those borrow another place's real photo. Missing
   * photos use the Intripid bird pin.
   */
  const queries = [place.name, place.title, place.id].filter(
    (value): value is string => Boolean(value),
  );
  const pool = catalog(place.destinationId);
  const named = bestNameMatch(queries, pool);
  if (named?.photo) return named.photo;
  return FALLBACK;
}

/**
 * One photo per stop on a day. Name match only — each place gets its own
 * canonical photograph or the bird fallback, never a borrowed photo.
 */
export function photosForPlaces(
  places: {
    id: string;
    name?: string;
    title?: string;
    coords?: LngLat;
  }[],
  destinationId?: string,
): Record<string, string | null> {
  const photos: Record<string, string> = {};
  const pool = catalog(destinationId);
  const used = new Set<string>();

  for (const place of places) {
    const named = bestNameMatch(
      [place.name, place.title].filter((value): value is string =>
        Boolean(value),
      ),
      pool,
    );
    if (named?.photo && !used.has(named.photo)) {
      photos[place.id] = named.photo;
      used.add(named.photo);
    }
  }

  /* No nearest-attraction, no leftover cycle, no city cover — null for cards, bird for pins. */
  for (const place of places) {
    if (!photos[place.id]) photos[place.id] = null as unknown as string;
  }

  return photos;
}

/** Cover photo for a catalog destination. Always a file that exists. */
export function coverPhotoSrc(destinationId: string): string | null {
  if (!destinationId) return null;
  if (DESTINATION_COVER[destinationId]) return DESTINATION_COVER[destinationId];
  const city = CITY_PHOTO[destinationId];
  if (city) return city;
  const slugId = slug(destinationId);
  if (DESTINATION_COVER[slugId]) return DESTINATION_COVER[slugId];
  if (CITY_PHOTO[slugId]) return CITY_PHOTO[slugId];
  return FALLBACK;
}

/**
 * What the trip header and settings picker should show.
 * Rewrites missing `/destinations/{id}.jpg` seeds to a real photograph.
 */
export function resolveTripCover(
  coverImage: string | null | undefined,
  destinationId: string,
): string | null {
  if (coverImage === null) return null;
  if (coverImage?.startsWith("data:")) return coverImage;
  const missingDest = coverImage?.match(/^\/destinations\/([^/]+)\.jpg$/);
  if (missingDest && !DESTINATION_COVER[missingDest[1]]) {
    return coverPhotoSrc(destinationId || missingDest[1]);
  }
  if (coverImage) return coverImage;
  return coverPhotoSrc(destinationId);
}
