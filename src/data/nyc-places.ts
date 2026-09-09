/**
 * Deterministic New York City location dataset.
 *
 * This is what the activity editor's location field searches against. It exists
 * instead of a live geocoder for three reasons: the planner keeps working with
 * no network, results never reshuffle between sessions, and every entry is a
 * place a person would actually put on an itinerary — no parking garages, no
 * duplicate franchise pins, no "New York, NY" swallowing the top result.
 *
 * Coordinates are hand-checked lng/lat pairs for the real front door of each
 * place, so they can be dropped straight onto the map. Longitudes are negative:
 * New York sits west of Greenwich.
 */

import type { ItemCategory, Place } from "@/lib/types";

export interface NycPlace extends Place {
  id: string;
  category: ItemCategory;
  /** Short type label shown in search results, e.g. "Museum", "Wine bar". */
  kind: string;
}

/**
 * Seventy places across Manhattan, Brooklyn and Queens, grouped the way a
 * traveller thinks about a day rather than the way a database would sort them.
 */
export const NYC_PLACES: NycPlace[] = [
  /* ---------------------------------------------------------------------- */
  /* Museums & culture                                                      */
  /* ---------------------------------------------------------------------- */
  {
    id: "met",
    name: "The Metropolitan Museum of Art",
    kind: "Encyclopedic museum",
    category: "culture",
    address: "1000 Fifth Avenue, Manhattan",
    neighbourhood: "Upper East Side",
    coords: { lng: -73.9632, lat: 40.7794 },
  },
  {
    id: "moma",
    name: "Museum of Modern Art",
    kind: "Modern art museum",
    category: "culture",
    address: "11 West 53rd Street, Manhattan",
    neighbourhood: "Midtown",
    coords: { lng: -73.9776, lat: 40.7614 },
  },
  {
    id: "whitney",
    name: "Whitney Museum of American Art",
    kind: "American art museum",
    category: "culture",
    address: "99 Gansevoort Street, Manhattan",
    neighbourhood: "Meatpacking District",
    coords: { lng: -74.0089, lat: 40.7396 },
  },
  {
    id: "amnh",
    name: "American Museum of Natural History",
    kind: "Natural history museum",
    category: "culture",
    address: "200 Central Park West, Manhattan",
    neighbourhood: "Upper West Side",
    coords: { lng: -73.974, lat: 40.7813 },
  },
  {
    id: "guggenheim",
    name: "Solomon R. Guggenheim Museum",
    kind: "Museum in a Wright spiral",
    category: "culture",
    address: "1071 Fifth Avenue, Manhattan",
    neighbourhood: "Upper East Side",
    coords: { lng: -73.959, lat: 40.783 },
  },
  {
    id: "morgan-library",
    name: "The Morgan Library & Museum",
    kind: "Library & museum",
    category: "culture",
    address: "225 Madison Avenue, Manhattan",
    neighbourhood: "Murray Hill",
    coords: { lng: -73.9814, lat: 40.7492 },
  },
  {
    id: "new-museum",
    name: "New Museum",
    kind: "Contemporary art museum",
    category: "culture",
    address: "235 Bowery, Manhattan",
    neighbourhood: "Bowery",
    coords: { lng: -73.9928, lat: 40.7223 },
  },
  {
    id: "brooklyn-museum",
    name: "Brooklyn Museum",
    kind: "Art museum",
    category: "culture",
    address: "200 Eastern Parkway, Brooklyn",
    neighbourhood: "Prospect Heights",
    coords: { lng: -73.9636, lat: 40.6712 },
  },
  {
    id: "frick",
    name: "The Frick Collection",
    kind: "Gilded Age house museum",
    category: "culture",
    address: "1 East 70th Street, Manhattan",
    neighbourhood: "Upper East Side",
    coords: { lng: -73.9673, lat: 40.7712 },
  },
  {
    id: "moma-ps1",
    name: "MoMA PS1",
    kind: "Contemporary art space",
    category: "culture",
    address: "22-25 Jackson Avenue, Queens",
    neighbourhood: "Long Island City",
    coords: { lng: -73.9475, lat: 40.7456 },
  },

  /* ---------------------------------------------------------------------- */
  /* Parks & outdoors                                                       */
  /* ---------------------------------------------------------------------- */
  {
    id: "central-park",
    name: "Central Park",
    kind: "Park",
    category: "outdoors",
    address: "59th Street to 110th Street, Manhattan",
    neighbourhood: "Central Park",
    coords: { lng: -73.9654, lat: 40.7829 },
  },
  {
    id: "bethesda-terrace",
    name: "Bethesda Terrace",
    kind: "Terrace & fountain",
    category: "outdoors",
    address: "Mid-park at 72nd Street, Central Park",
    neighbourhood: "Central Park",
    coords: { lng: -73.9709, lat: 40.774 },
  },
  {
    id: "the-ramble",
    name: "The Ramble",
    kind: "Woodland trails",
    category: "outdoors",
    address: "Mid-park between 73rd and 79th Streets, Central Park",
    neighbourhood: "Central Park",
    coords: { lng: -73.9705, lat: 40.7768 },
  },
  {
    id: "sheep-meadow",
    name: "Sheep Meadow",
    kind: "Great lawn",
    category: "outdoors",
    address: "West side between 66th and 69th Streets, Central Park",
    neighbourhood: "Central Park",
    coords: { lng: -73.9742, lat: 40.7715 },
  },
  {
    id: "high-line",
    name: "The High Line",
    kind: "Elevated park",
    category: "outdoors",
    address: "Tenth Avenue at West 20th Street, Manhattan",
    neighbourhood: "Chelsea",
    coords: { lng: -74.0048, lat: 40.748 },
  },
  {
    id: "brooklyn-bridge-park",
    name: "Brooklyn Bridge Park",
    kind: "Waterfront park",
    category: "outdoors",
    address: "Pier 1, Furman Street at Old Fulton Street, Brooklyn",
    neighbourhood: "Dumbo",
    coords: { lng: -73.9957, lat: 40.7024 },
  },
  {
    id: "washington-square-park",
    name: "Washington Square Park",
    kind: "City square",
    category: "outdoors",
    address: "Washington Square, Manhattan",
    neighbourhood: "Greenwich Village",
    coords: { lng: -73.9973, lat: 40.7308 },
  },
  {
    id: "prospect-park",
    name: "Prospect Park",
    kind: "Park",
    category: "outdoors",
    address: "95 Prospect Park West, Brooklyn",
    neighbourhood: "Park Slope",
    coords: { lng: -73.969, lat: 40.6602 },
  },
  {
    id: "domino-park",
    name: "Domino Park",
    kind: "Riverfront park",
    category: "outdoors",
    address: "300 Kent Avenue, Brooklyn",
    neighbourhood: "Williamsburg",
    coords: { lng: -73.9677, lat: 40.7144 },
  },

  /* ---------------------------------------------------------------------- */
  /* Food, from a $4 slice to a four-hour tasting menu                      */
  /* ---------------------------------------------------------------------- */
  {
    id: "katzs-delicatessen",
    name: "Katz's Delicatessen",
    kind: "Jewish deli",
    category: "food",
    address: "205 East Houston Street, Manhattan",
    neighbourhood: "Lower East Side",
    coords: { lng: -73.9874, lat: 40.7223 },
  },
  {
    id: "russ-and-daughters",
    name: "Russ & Daughters",
    kind: "Appetizing shop",
    category: "food",
    address: "179 East Houston Street, Manhattan",
    neighbourhood: "Lower East Side",
    coords: { lng: -73.9882, lat: 40.7226 },
  },
  {
    id: "joes-pizza",
    name: "Joe's Pizza",
    kind: "Slice counter",
    category: "food",
    address: "7 Carmine Street, Manhattan",
    neighbourhood: "Greenwich Village",
    coords: { lng: -74.0027, lat: 40.7305 },
  },
  {
    id: "di-fara",
    name: "Di Fara Pizza",
    kind: "Pizzeria",
    category: "food",
    address: "1424 Avenue J, Brooklyn",
    neighbourhood: "Midwood",
    coords: { lng: -73.9614, lat: 40.625 },
  },
  {
    id: "xian-famous-foods",
    name: "Xi'an Famous Foods",
    kind: "Hand-pulled noodles",
    category: "food",
    address: "45 Bayard Street, Manhattan",
    neighbourhood: "Chinatown",
    coords: { lng: -73.9977, lat: 40.7156 },
  },
  {
    id: "superiority-burger",
    name: "Superiority Burger",
    kind: "Vegetarian diner",
    category: "food",
    address: "119 Avenue A, Manhattan",
    neighbourhood: "East Village",
    coords: { lng: -73.9836, lat: 40.7265 },
  },
  {
    id: "lilia",
    name: "Lilia",
    kind: "Italian restaurant",
    category: "food",
    address: "567 Union Avenue, Brooklyn",
    neighbourhood: "Williamsburg",
    coords: { lng: -73.9524, lat: 40.7176 },
  },
  {
    id: "gramercy-tavern",
    name: "Gramercy Tavern",
    kind: "New American restaurant",
    category: "food",
    address: "42 East 20th Street, Manhattan",
    neighbourhood: "Flatiron",
    coords: { lng: -73.9883, lat: 40.7386 },
  },
  {
    id: "le-bernardin",
    name: "Le Bernardin",
    kind: "Seafood tasting menu",
    category: "food",
    address: "155 West 51st Street, Manhattan",
    neighbourhood: "Midtown",
    coords: { lng: -73.9817, lat: 40.7615 },
  },
  {
    id: "balthazar",
    name: "Balthazar",
    kind: "French brasserie",
    category: "food",
    address: "80 Spring Street, Manhattan",
    neighbourhood: "SoHo",
    coords: { lng: -73.9979, lat: 40.7227 },
  },
  {
    id: "via-carota",
    name: "Via Carota",
    kind: "Italian trattoria",
    category: "food",
    address: "51 Grove Street, Manhattan",
    neighbourhood: "West Village",
    coords: { lng: -74.0026, lat: 40.733 },
  },
  {
    id: "sylvias",
    name: "Sylvia's",
    kind: "Soul food restaurant",
    category: "food",
    address: "328 Malcolm X Boulevard, Manhattan",
    neighbourhood: "Harlem",
    coords: { lng: -73.9446, lat: 40.8086 },
  },
  {
    id: "nom-wah-tea-parlor",
    name: "Nom Wah Tea Parlor",
    kind: "Dim sum parlour",
    category: "food",
    address: "13 Doyers Street, Manhattan",
    neighbourhood: "Chinatown",
    coords: { lng: -73.998, lat: 40.7146 },
  },
  {
    id: "tartine",
    name: "Tartine",
    kind: "French bistro",
    category: "food",
    address: "253 West 11th Street, Manhattan",
    neighbourhood: "West Village",
    coords: { lng: -74.0034, lat: 40.7363 },
  },
  {
    id: "los-tacos-no-1",
    name: "Los Tacos No. 1",
    kind: "Taqueria",
    category: "food",
    address: "75 Ninth Avenue, Manhattan",
    neighbourhood: "Chelsea",
    coords: { lng: -74.0052, lat: 40.7422 },
  },
  {
    id: "ess-a-bagel",
    name: "Ess-a-Bagel",
    kind: "Bagel counter",
    category: "food",
    address: "831 Third Avenue, Manhattan",
    neighbourhood: "Midtown East",
    coords: { lng: -73.9702, lat: 40.7562 },
  },
  {
    id: "taverna-kyclades",
    name: "Taverna Kyclades",
    kind: "Greek seafood taverna",
    category: "food",
    address: "36-01 Ditmars Boulevard, Queens",
    neighbourhood: "Astoria",
    coords: { lng: -73.908, lat: 40.7744 },
  },

  /* ---------------------------------------------------------------------- */
  /* Coffee                                                                 */
  /* ---------------------------------------------------------------------- */
  {
    id: "devocion",
    name: "Devoción",
    kind: "Colombian coffee roastery",
    category: "food",
    address: "69 Grand Street, Brooklyn",
    neighbourhood: "Williamsburg",
    coords: { lng: -73.9647, lat: 40.7159 },
  },
  {
    id: "sey-coffee",
    name: "Sey Coffee",
    kind: "Roastery & tasting bar",
    category: "food",
    address: "18 Grattan Street, Brooklyn",
    neighbourhood: "Bushwick",
    coords: { lng: -73.9324, lat: 40.7054 },
  },
  {
    id: "la-cabra",
    name: "La Cabra",
    kind: "Coffee & bakery",
    category: "food",
    address: "152 Second Avenue, Manhattan",
    neighbourhood: "East Village",
    coords: { lng: -73.9867, lat: 40.7294 },
  },
  {
    id: "abraco",
    name: "Abraço",
    kind: "Coffee counter",
    category: "food",
    address: "81 East 7th Street, Manhattan",
    neighbourhood: "East Village",
    coords: { lng: -73.9862, lat: 40.7273 },
  },

  /* ---------------------------------------------------------------------- */
  /* Sightseeing                                                            */
  /* ---------------------------------------------------------------------- */
  {
    id: "top-of-the-rock",
    name: "Top of the Rock",
    kind: "Observation deck",
    category: "sightseeing",
    address: "30 Rockefeller Plaza, Manhattan",
    neighbourhood: "Midtown",
    coords: { lng: -73.9793, lat: 40.7593 },
  },
  {
    id: "empire-state-building",
    name: "Empire State Building",
    kind: "Observation deck",
    category: "sightseeing",
    address: "20 West 34th Street, Manhattan",
    neighbourhood: "Midtown",
    coords: { lng: -73.9857, lat: 40.7484 },
  },
  {
    id: "statue-of-liberty",
    name: "Statue of Liberty",
    kind: "Monument",
    category: "sightseeing",
    address: "Liberty Island, New York Harbor",
    neighbourhood: "Liberty Island",
    coords: { lng: -74.0445, lat: 40.6892 },
  },
  {
    id: "brooklyn-bridge",
    name: "Brooklyn Bridge",
    kind: "Bridge walk",
    category: "sightseeing",
    address: "Brooklyn Bridge, Manhattan to Brooklyn",
    neighbourhood: "Civic Center",
    coords: { lng: -73.9969, lat: 40.7061 },
  },
  {
    id: "grand-central-terminal",
    name: "Grand Central Terminal",
    kind: "Rail terminal",
    category: "sightseeing",
    address: "89 East 42nd Street, Manhattan",
    neighbourhood: "Midtown East",
    coords: { lng: -73.9772, lat: 40.7527 },
  },
  {
    id: "one-world-observatory",
    name: "One World Observatory",
    kind: "Observation deck",
    category: "sightseeing",
    address: "117 West Street, Manhattan",
    neighbourhood: "Financial District",
    coords: { lng: -74.0134, lat: 40.7127 },
  },
  {
    id: "little-island",
    name: "Little Island",
    kind: "Island park",
    category: "sightseeing",
    address: "Pier 55, Hudson River Park, Manhattan",
    neighbourhood: "Meatpacking District",
    coords: { lng: -74.0104, lat: 40.7419 },
  },
  {
    id: "vessel",
    name: "The Vessel",
    kind: "Climbable sculpture",
    category: "sightseeing",
    address: "20 Hudson Yards, Manhattan",
    neighbourhood: "Hudson Yards",
    coords: { lng: -74.0021, lat: 40.7538 },
  },
  {
    id: "roosevelt-island-tramway",
    name: "Roosevelt Island Tramway",
    kind: "Aerial tramway",
    category: "sightseeing",
    address: "East 59th Street at Second Avenue, Manhattan",
    neighbourhood: "Midtown East",
    coords: { lng: -73.964, lat: 40.7614 },
  },

  /* ---------------------------------------------------------------------- */
  /* Nightlife & live music                                                 */
  /* ---------------------------------------------------------------------- */
  {
    id: "village-vanguard",
    name: "Village Vanguard",
    kind: "Jazz club",
    category: "nightlife",
    address: "178 Seventh Avenue South, Manhattan",
    neighbourhood: "West Village",
    coords: { lng: -74.0015, lat: 40.7362 },
  },
  {
    id: "blue-note",
    name: "Blue Note",
    kind: "Jazz club",
    category: "nightlife",
    address: "131 West 3rd Street, Manhattan",
    neighbourhood: "Greenwich Village",
    coords: { lng: -74.0007, lat: 40.7312 },
  },
  {
    id: "bemelmans-bar",
    name: "Bemelmans Bar",
    kind: "Piano bar",
    category: "nightlife",
    address: "35 East 76th Street, Manhattan",
    neighbourhood: "Upper East Side",
    coords: { lng: -73.963, lat: 40.7742 },
  },
  {
    id: "attaboy",
    name: "Attaboy",
    kind: "Cocktail bar",
    category: "nightlife",
    address: "134 Eldridge Street, Manhattan",
    neighbourhood: "Lower East Side",
    coords: { lng: -73.9914, lat: 40.7189 },
  },
  {
    id: "brooklyn-steel",
    name: "Brooklyn Steel",
    kind: "Concert hall",
    category: "nightlife",
    address: "319 Frost Street, Brooklyn",
    neighbourhood: "East Williamsburg",
    coords: { lng: -73.9387, lat: 40.7194 },
  },
  {
    id: "house-of-yes",
    name: "House of Yes",
    kind: "Nightclub & circus",
    category: "nightlife",
    address: "2 Wyckoff Avenue, Brooklyn",
    neighbourhood: "Bushwick",
    coords: { lng: -73.9236, lat: 40.7068 },
  },

  /* ---------------------------------------------------------------------- */
  /* Shopping & markets                                                     */
  /* ---------------------------------------------------------------------- */
  {
    id: "chelsea-market",
    name: "Chelsea Market",
    kind: "Food hall",
    category: "shopping",
    address: "75 Ninth Avenue, Manhattan",
    neighbourhood: "Chelsea",
    coords: { lng: -74.0049, lat: 40.7421 },
  },
  {
    id: "strand-book-store",
    name: "Strand Book Store",
    kind: "Bookshop",
    category: "shopping",
    address: "828 Broadway, Manhattan",
    neighbourhood: "Greenwich Village",
    coords: { lng: -73.9907, lat: 40.7332 },
  },
  {
    id: "essex-market",
    name: "Essex Market",
    kind: "Public market",
    category: "shopping",
    address: "88 Essex Street, Manhattan",
    neighbourhood: "Lower East Side",
    coords: { lng: -73.9881, lat: 40.7179 },
  },
  {
    id: "artists-and-fleas",
    name: "Artists & Fleas",
    kind: "Flea market",
    category: "shopping",
    address: "70 North 7th Street, Brooklyn",
    neighbourhood: "Williamsburg",
    coords: { lng: -73.9611, lat: 40.7198 },
  },
  {
    id: "dover-street-market",
    name: "Dover Street Market",
    kind: "Concept store",
    category: "shopping",
    address: "160 Lexington Avenue, Manhattan",
    neighbourhood: "Murray Hill",
    coords: { lng: -73.9816, lat: 40.7441 },
  },

  /* ---------------------------------------------------------------------- */
  /* Stays                                                                  */
  /* ---------------------------------------------------------------------- */
  {
    id: "standard-high-line",
    name: "The Standard, High Line",
    kind: "Design hotel",
    category: "stay",
    address: "848 Washington Street, Manhattan",
    neighbourhood: "Meatpacking District",
    coords: { lng: -74.008, lat: 40.7409 },
  },
  {
    id: "ace-hotel",
    name: "Ace Hotel New York",
    kind: "Boutique hotel",
    category: "stay",
    address: "20 West 29th Street, Manhattan",
    neighbourhood: "NoMad",
    coords: { lng: -73.9882, lat: 40.7457 },
  },
  {
    id: "ludlow-hotel",
    name: "The Ludlow Hotel",
    kind: "Boutique hotel",
    category: "stay",
    address: "180 Ludlow Street, Manhattan",
    neighbourhood: "Lower East Side",
    coords: { lng: -73.9866, lat: 40.7218 },
  },
  {
    id: "hotel-indigo-les",
    name: "Hotel Indigo Lower East Side",
    kind: "Mid-range hotel",
    category: "stay",
    address: "171 Ludlow Street, Manhattan",
    neighbourhood: "Lower East Side",
    coords: { lng: -73.9869, lat: 40.7214 },
  },
  {
    id: "greenwich-hotel",
    name: "The Greenwich Hotel",
    kind: "Luxury hotel",
    category: "stay",
    address: "377 Greenwich Street, Manhattan",
    neighbourhood: "Tribeca",
    coords: { lng: -74.0101, lat: 40.7195 },
  },

  /* ---------------------------------------------------------------------- */
  /* Transit anchors                                                        */
  /* ---------------------------------------------------------------------- */
  {
    id: "jfk",
    name: "John F. Kennedy International Airport",
    kind: "Airport (JFK)",
    category: "transit",
    address: "JFK Access Road, Queens",
    neighbourhood: "Jamaica",
    coords: { lng: -73.7781, lat: 40.6413 },
  },
  {
    id: "lga",
    name: "LaGuardia Airport",
    kind: "Airport (LGA)",
    category: "transit",
    address: "Grand Central Parkway, Queens",
    neighbourhood: "East Elmhurst",
    coords: { lng: -73.874, lat: 40.7769 },
  },
  {
    id: "ewr",
    name: "Newark Liberty International Airport",
    kind: "Airport (EWR)",
    category: "transit",
    address: "3 Brewster Road, Newark",
    neighbourhood: "Newark, New Jersey",
    coords: { lng: -74.1745, lat: 40.6895 },
  },
  {
    id: "penn-station",
    name: "Penn Station",
    kind: "Rail station",
    category: "transit",
    address: "Seventh Avenue at West 33rd Street, Manhattan",
    neighbourhood: "Midtown",
    coords: { lng: -73.9935, lat: 40.7506 },
  },
  {
    id: "port-authority",
    name: "Port Authority Bus Terminal",
    kind: "Bus terminal",
    category: "transit",
    address: "625 Eighth Avenue, Manhattan",
    neighbourhood: "Midtown",
    coords: { lng: -73.9903, lat: 40.7568 },
  },
];

/* -------------------------------------------------------------------------- */
/* Lookup                                                                     */
/* -------------------------------------------------------------------------- */

const PLACES_BY_ID: ReadonlyMap<string, NycPlace> = new Map(
  NYC_PLACES.map((place) => [place.id, place]),
);

/** Resolve a saved place reference back to its full record. */
export function getNycPlace(id: string): NycPlace | undefined {
  return PLACES_BY_ID.get(id);
}

/* -------------------------------------------------------------------------- */
/* Search                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Lower-cased and stripped of accents, so "devocion" finds Devoción and
 * "abraco" finds Abraço. Nobody reaches for the option key mid-search.
 */
function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

interface SearchEntry {
  place: NycPlace;
  name: string;
  /** Name split into words, so "met" ranks "The Metropolitan Museum of Art". */
  words: string[];
  kind: string;
  neighbourhood: string;
}

const SEARCH_INDEX: readonly SearchEntry[] = NYC_PLACES.map((place) => {
  const name = fold(place.name);
  return {
    place,
    name,
    words: name.split(/[^a-z0-9]+/).filter((word) => word.length > 0),
    kind: fold(place.kind),
    neighbourhood: fold(place.neighbourhood ?? ""),
  };
});

/**
 * Ranking tiers, lower is better. Plain numbers rather than an enum, so the
 * sort is a subtraction and the ordering reads top to bottom.
 */
const RANK_NAME_PREFIX = 0;
const RANK_NAME_WORD_PREFIX = 1;
const RANK_NAME_SUBSTRING = 2;
const RANK_METADATA = 3;
const RANK_NO_MATCH = 4;

function rankEntry(entry: SearchEntry, query: string): number {
  if (entry.name.startsWith(query)) return RANK_NAME_PREFIX;
  if (entry.words.some((word) => word.startsWith(query))) {
    return RANK_NAME_WORD_PREFIX;
  }
  if (entry.name.includes(query)) return RANK_NAME_SUBSTRING;
  if (entry.neighbourhood.includes(query) || entry.kind.includes(query)) {
    return RANK_METADATA;
  }
  return RANK_NO_MATCH;
}

export const DEFAULT_SEARCH_LIMIT = 8;

/**
 * What an empty search box offers: one anchor per category a first day in New
 * York usually needs, ordered the way that day tends to unfold.
 */
const DEFAULT_RESULT_IDS = [
  "central-park",
  "met",
  "high-line",
  "chelsea-market",
  "katzs-delicatessen",
  "brooklyn-bridge",
  "grand-central-terminal",
  "village-vanguard",
] as const;

const DEFAULT_RESULTS: readonly NycPlace[] = DEFAULT_RESULT_IDS.map((id) =>
  getNycPlace(id),
).filter((place): place is NycPlace => place !== undefined);

/**
 * Case-insensitive substring search over name, kind and neighbourhood.
 *
 * Ranking, best first: the name starts with the query, a word in the name
 * starts with it, the name contains it anywhere, then a neighbourhood or type
 * match. Ties keep dataset order, which is grouped by category — so a vague
 * query returns a varied list rather than five museums.
 */
export function searchNycPlaces(
  query: string,
  limit: number = DEFAULT_SEARCH_LIMIT,
): NycPlace[] {
  const take = Math.max(0, Math.trunc(limit));
  if (take === 0) return [];

  const needle = fold(query);
  if (needle.length === 0) return DEFAULT_RESULTS.slice(0, take);

  const hits: { place: NycPlace; rank: number; index: number }[] = [];
  SEARCH_INDEX.forEach((entry, index) => {
    const rank = rankEntry(entry, needle);
    if (rank !== RANK_NO_MATCH) {
      hits.push({ place: entry.place, rank, index });
    }
  });

  hits.sort((a, b) => a.rank - b.rank || a.index - b.index);
  return hits.slice(0, take).map((hit) => hit.place);
}
