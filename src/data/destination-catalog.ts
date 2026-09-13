import {
  INTERESTS,
  TRIP_STYLES,
  type Destination,
  type Interest,
  type SeasonMonth,
  type TripStyle,
} from "@/lib/types";

type Climate =
  | "temperate"
  | "mediterranean"
  | "tropical"
  | "desert"
  | "nordic"
  | "southern";

type Spend = "cheap" | "mid" | "spend";

type Seed = {
  id: string;
  name: string;
  region?: string;
  country: string;
  countryCode: string;
  flag: string;
  coords: { lng: number; lat: number };
  continent: string;
  timezone: string;
  currency: string;
  language: string;
  climate: Climate;
  spend: Spend;
  blurb: string;
  styles: Partial<Record<TripStyle, number>>;
  interests: Partial<Record<Interest, number>>;
  idealDays?: [number, number];
};

const BASE_STYLE = 0.14;
const BASE_INTEREST = 0.16;

function styleFit(highs: Partial<Record<TripStyle, number>>) {
  return Object.fromEntries(
    TRIP_STYLES.map((key) => [key, highs[key] ?? BASE_STYLE]),
  ) as Destination["styleFit"];
}

function interestFit(highs: Partial<Record<Interest, number>>) {
  return Object.fromEntries(
    INTERESTS.map((key) => [key, highs[key] ?? BASE_INTEREST]),
  ) as Destination["interestFit"];
}

function budget(spend: Spend) {
  if (spend === "cheap") {
    return {
      budgetFit: { backpack: 0.95, budget: 0.9, premium: 0.55, luxury: 0.28 },
      dailyBudgetUsd: { backpack: 28, budget: 58, premium: 140, luxury: 320 },
    };
  }
  if (spend === "mid") {
    return {
      budgetFit: { backpack: 0.62, budget: 0.88, premium: 0.82, luxury: 0.55 },
      dailyBudgetUsd: { backpack: 55, budget: 110, premium: 240, luxury: 520 },
    };
  }
  return {
    budgetFit: { backpack: 0.22, budget: 0.48, premium: 0.9, luxury: 0.95 },
    dailyBudgetUsd: { backpack: 95, budget: 190, premium: 420, luxury: 900 },
  };
}

function season(climate: Climate): SeasonMonth[] {
  const curves: Record<Climate, Omit<SeasonMonth, "month">[]> = {
    temperate: [
      { score: 0.35, highC: 5, lowC: -1, label: "Cold and grey" },
      { score: 0.4, highC: 7, lowC: 0, label: "Late winter" },
      { score: 0.55, highC: 12, lowC: 3, label: "Early spring" },
      { score: 0.75, highC: 16, lowC: 7, label: "Mild and green" },
      { score: 0.9, highC: 20, lowC: 11, label: "Long evenings" },
      { score: 0.85, highC: 24, lowC: 14, label: "Warm and busy" },
      { score: 0.7, highC: 27, lowC: 16, label: "Peak summer" },
      { score: 0.72, highC: 26, lowC: 16, label: "Still warm" },
      { score: 0.88, highC: 21, lowC: 12, label: "Clear and golden" },
      { score: 0.8, highC: 15, lowC: 8, label: "Crisp" },
      { score: 0.5, highC: 9, lowC: 3, label: "Short days" },
      { score: 0.4, highC: 6, lowC: 0, label: "Festive cold" },
    ],
    mediterranean: [
      { score: 0.45, highC: 14, lowC: 6, label: "Cool and bright" },
      { score: 0.5, highC: 15, lowC: 7, label: "Almond blossom" },
      { score: 0.7, highC: 18, lowC: 9, label: "Spring light" },
      { score: 0.88, highC: 21, lowC: 11, label: "Perfect walking" },
      { score: 0.92, highC: 25, lowC: 15, label: "Terrace weather" },
      { score: 0.8, highC: 29, lowC: 18, label: "Hot afternoons" },
      { score: 0.62, highC: 32, lowC: 21, label: "High summer" },
      { score: 0.65, highC: 32, lowC: 21, label: "Still fierce" },
      { score: 0.9, highC: 27, lowC: 18, label: "Sea still warm" },
      { score: 0.85, highC: 22, lowC: 14, label: "Soft light" },
      { score: 0.6, highC: 17, lowC: 10, label: "Quiet streets" },
      { score: 0.5, highC: 14, lowC: 7, label: "Mild winter" },
    ],
    tropical: [
      { score: 0.7, highC: 30, lowC: 23, label: "Warm and wet" },
      { score: 0.68, highC: 31, lowC: 23, label: "Humid" },
      { score: 0.72, highC: 32, lowC: 24, label: "Hot season rising" },
      { score: 0.78, highC: 33, lowC: 25, label: "Peak heat" },
      { score: 0.7, highC: 32, lowC: 25, label: "Pre-monsoon" },
      { score: 0.55, highC: 30, lowC: 24, label: "Rains" },
      { score: 0.5, highC: 29, lowC: 24, label: "Monsoon" },
      { score: 0.52, highC: 29, lowC: 24, label: "Still raining" },
      { score: 0.75, highC: 30, lowC: 24, label: "Clearing" },
      { score: 0.88, highC: 30, lowC: 24, label: "Best air" },
      { score: 0.9, highC: 30, lowC: 23, label: "Dry and bright" },
      { score: 0.82, highC: 29, lowC: 23, label: "Warm evenings" },
    ],
    desert: [
      { score: 0.7, highC: 18, lowC: 6, label: "Cool and clear" },
      { score: 0.75, highC: 21, lowC: 8, label: "Bright winter" },
      { score: 0.85, highC: 24, lowC: 11, label: "Ideal days" },
      { score: 0.8, highC: 28, lowC: 14, label: "Warming fast" },
      { score: 0.55, highC: 33, lowC: 18, label: "Hot" },
      { score: 0.35, highC: 38, lowC: 22, label: "Scorching" },
      { score: 0.28, highC: 40, lowC: 24, label: "Peak heat" },
      { score: 0.3, highC: 39, lowC: 24, label: "Still brutal" },
      { score: 0.5, highC: 34, lowC: 20, label: "Easing" },
      { score: 0.82, highC: 28, lowC: 15, label: "Best light" },
      { score: 0.88, highC: 22, lowC: 10, label: "Cool nights" },
      { score: 0.78, highC: 18, lowC: 7, label: "Crisp" },
    ],
    nordic: [
      { score: 0.35, highC: -1, lowC: -7, label: "Dark and icy" },
      { score: 0.4, highC: 0, lowC: -6, label: "Deep winter" },
      { score: 0.5, highC: 3, lowC: -3, label: "Light returning" },
      { score: 0.65, highC: 8, lowC: 1, label: "Thaw" },
      { score: 0.8, highC: 14, lowC: 6, label: "Long days" },
      { score: 0.92, highC: 18, lowC: 10, label: "Midnight sun" },
      { score: 0.95, highC: 20, lowC: 12, label: "Warmest" },
      { score: 0.9, highC: 18, lowC: 11, label: "Soft light" },
      { score: 0.75, highC: 13, lowC: 7, label: "Aurora season" },
      { score: 0.55, highC: 7, lowC: 2, label: "Windy" },
      { score: 0.4, highC: 2, lowC: -3, label: "Dark again" },
      { score: 0.38, highC: 0, lowC: -6, label: "Polar night" },
    ],
    southern: [
      { score: 0.9, highC: 26, lowC: 16, label: "High summer" },
      { score: 0.88, highC: 26, lowC: 16, label: "Still warm" },
      { score: 0.8, highC: 24, lowC: 14, label: "Easing" },
      { score: 0.7, highC: 20, lowC: 11, label: "Autumn" },
      { score: 0.55, highC: 16, lowC: 8, label: "Cooling" },
      { score: 0.45, highC: 13, lowC: 6, label: "Winter" },
      { score: 0.42, highC: 12, lowC: 5, label: "Shortest days" },
      { score: 0.48, highC: 14, lowC: 6, label: "Late winter" },
      { score: 0.68, highC: 17, lowC: 8, label: "Spring" },
      { score: 0.8, highC: 20, lowC: 10, label: "Bright" },
      { score: 0.88, highC: 23, lowC: 13, label: "Warming" },
      { score: 0.92, highC: 25, lowC: 15, label: "Peak summer" },
    ],
  };
  return curves[climate].map((entry, month) => ({ month, ...entry }));
}

function offset(coords: Seed["coords"], eastKm: number, northKm: number) {
  return {
    lng: coords.lng + eastKm / (111.32 * Math.cos((coords.lat * Math.PI) / 180)),
    lat: coords.lat + northKm / 110.57,
  };
}

/**
 * Catalog cities still need a real shortlist. One pin named after the city
 * leaves the destination brief empty and the planner with a stay and nothing
 * to do. These are typed stops around the centre — not a live POI scrape —
 * so discovery and "Build trip here" always have places and calendar items.
 */
function placePhoto(id: string, slot?: string) {
  return slot ? `/places/${id}-${slot}.jpg` : `/places/${id}.jpg`;
}

function catalogAttractions(seed: Seed): Destination["attractions"] {
  const { coords, name, id } = seed;
  return [
    {
      name: `${name} historic centre`,
      category: "sightseeing",
      coords: offset(coords, 0.4, 0.2),
      note: `Start in the centre of ${name} and walk until the streets tell you where to turn.`,
      photo: placePhoto(id),
    },
    {
      name: `Museum quarter, ${name}`,
      category: "culture",
      coords: offset(coords, -0.6, 0.5),
      note: `Give the main museum a morning before the rooms fill, then sit with whatever is next door.`,
      photo: placePhoto(id, "culture"),
    },
    {
      name: `${name} central market`,
      category: "food",
      coords: offset(coords, 0.3, -0.5),
      note: `Eat standing if that is how the locals do it — the point is the stall, not a reservation.`,
      photo: placePhoto(id, "food"),
    },
    {
      name: `Neighbourhood table, ${name}`,
      category: "food",
      coords: offset(coords, -0.4, -0.7),
      note: `Book the early sitting and let the room decide the rest of the night.`,
      photo: placePhoto(id, "table"),
    },
    {
      name: `Park or waterfront, ${name}`,
      category: "outdoors",
      coords: offset(coords, 0.8, -0.2),
      note: `Walk it at the cooler end of the day. This is where ${name} exhales.`,
      photo: placePhoto(id, "outdoors"),
    },
    {
      name: `After dark in ${name}`,
      category: "nightlife",
      coords: offset(coords, -0.2, 0.8),
      note: `One room, not a crawl. Sit where you can still hear the person you came with.`,
      photo: placePhoto(id, "night"),
    },
    {
      name: `Main shopping street, ${name}`,
      category: "shopping",
      coords: offset(coords, 0.5, 0.6),
      note: `Use it as a transect, not a checklist — the side streets are the actual finds.`,
      photo: placePhoto(id, "street"),
    },
    {
      name: `${name} arrival hall`,
      category: "transit",
      coords: offset(coords, -0.9, -0.3),
      note: `Orient from the station or ferry and walk in. The first twenty minutes are the map.`,
      photo: placePhoto(id, "transit"),
    },
  ];
}

function fromSeed(seed: Seed): Destination {
  const money = budget(seed.spend);
  return {
    id: seed.id,
    name: seed.name,
    region: seed.region,
    country: seed.country,
    countryCode: seed.countryCode,
    flag: seed.flag,
    coords: seed.coords,
    zoom: 11,
    blurb: seed.blurb,
    whyYoullLoveIt: [
      `${seed.name} earns a place on the map for how it actually feels on the ground, not a list of must-sees.`,
      "Give it a few unhurried days and the neighbourhoods start to explain themselves.",
      "The food, the light and the walking distances are the reasons people stay an extra night.",
    ],
    continent: seed.continent,
    ...money,
    styleFit: styleFit(seed.styles),
    interestFit: interestFit(seed.interests),
    season: season(seed.climate),
    attractions: catalogAttractions(seed),
    timezone: seed.timezone,
    currency: seed.currency,
    language: seed.language,
    idealDays: seed.idealDays ?? [3, 6],
  };
}

const urban = {
  "city-life": 0.94,
  architecture: 0.86,
  "historical-sites": 0.72,
  monuments: 0.7,
};
const urbanActs = {
  museums: 0.82,
  "walking-tours": 0.88,
  neighborhoods: 0.9,
  "bars-nightlife": 0.84,
  "shopping-streets": 0.8,
  photography: 0.8,
  "coffee-places": 0.82,
  "street-food": 0.74,
  viewpoints: 0.78,
};

const SEEDS: Seed[] = [
  { id: "paris", name: "Paris", country: "France", countryCode: "FR", flag: "🇫🇷", coords: { lng: 2.3522, lat: 48.8566 }, continent: "Europe", timezone: "Europe/Paris", currency: "EUR", language: "French", climate: "temperate", spend: "spend", blurb: "A walkable capital of museums, river light and neighbourhoods that still close for lunch.", styles: { ...urban, monuments: 0.95, architecture: 0.95, peaceful: 0.45 }, interests: { ...urbanActs, museums: 0.98, "fine-dining": 0.95, "river-cruises": 0.88, "parks-gardens": 0.9 } },
  { id: "rome", name: "Rome", country: "Italy", countryCode: "IT", flag: "🇮🇹", coords: { lng: 12.4964, lat: 41.9028 }, continent: "Europe", timezone: "Europe/Rome", currency: "EUR", language: "Italian", climate: "mediterranean", spend: "mid", blurb: "Ancient stone, espresso at a counter, and a city that treats dinner as the main event.", styles: { ...urban, "historical-sites": 0.98, monuments: 0.96 }, interests: { ...urbanActs, museums: 0.9, "fine-dining": 0.8, "food-markets": 0.85, "walking-tours": 0.92 } },
  { id: "barcelona", name: "Barcelona", country: "Spain", countryCode: "ES", flag: "🇪🇸", coords: { lng: 2.1734, lat: 41.3851 }, continent: "Europe", timezone: "Europe/Madrid", currency: "EUR", language: "Spanish", climate: "mediterranean", spend: "mid", blurb: "Sea, grid streets, and architecture you can walk through without a ticket.", styles: { ...urban, beaches: 0.88, architecture: 0.96, "beach-resort": 0.7 }, interests: { ...urbanActs, swimming: 0.82, "beach-activities": 0.85, "street-art": 0.9, "street-food": 0.88 } },
  { id: "amsterdam", name: "Amsterdam", country: "Netherlands", countryCode: "NL", flag: "🇳🇱", coords: { lng: 4.9041, lat: 52.3676 }, continent: "Europe", timezone: "Europe/Amsterdam", currency: "EUR", language: "Dutch", climate: "temperate", spend: "spend", blurb: "Canals, bikes, and a compact centre you can cross on foot between museums.", styles: { ...urban, "lakes-rivers": 0.82, peaceful: 0.55, architecture: 0.88 }, interests: { ...urbanActs, cycling: 0.98, "river-cruises": 0.9, museums: 0.9, boating: 0.78 } },
  { id: "berlin", name: "Berlin", country: "Germany", countryCode: "DE", flag: "🇩🇪", coords: { lng: 13.405, lat: 52.52 }, continent: "Europe", timezone: "Europe/Berlin", currency: "EUR", language: "German", climate: "temperate", spend: "mid", blurb: "A city of layers: palaces, clubs, parks, and a food scene that never quite settles.", styles: { ...urban, "historical-sites": 0.88, forests: 0.4 }, interests: { ...urbanActs, "live-music": 0.92, "bars-nightlife": 0.95, "street-art": 0.94, museums: 0.88 } },
  { id: "vienna", name: "Vienna", country: "Austria", countryCode: "AT", flag: "🇦🇹", coords: { lng: 16.3738, lat: 48.2082 }, continent: "Europe", timezone: "Europe/Vienna", currency: "EUR", language: "German", climate: "temperate", spend: "mid", blurb: "Palaces, coffeehouses, and a river city that still dresses for the opera.", styles: { ...urban, monuments: 0.9, architecture: 0.92, spas: 0.7, rejuvenate: 0.62 }, interests: { ...urbanActs, museums: 0.9, "coffee-places": 0.95, "fine-dining": 0.82, "parks-gardens": 0.85 } },
  { id: "prague", name: "Prague", country: "Czechia", countryCode: "CZ", flag: "🇨🇿", coords: { lng: 14.4378, lat: 50.0755 }, continent: "Europe", timezone: "Europe/Prague", currency: "CZK", language: "Czech", climate: "temperate", spend: "cheap", blurb: "A fairy-tale centre that is still a real drinking and walking city after dark.", styles: { ...urban, "historical-sites": 0.9, monuments: 0.88, architecture: 0.9 }, interests: { ...urbanActs, "bars-nightlife": 0.88, "river-cruises": 0.75, "walking-tours": 0.9 } },
  { id: "budapest", name: "Budapest", country: "Hungary", countryCode: "HU", flag: "🇭🇺", coords: { lng: 19.0402, lat: 47.4979 }, continent: "Europe", timezone: "Europe/Budapest", currency: "HUF", language: "Hungarian", climate: "temperate", spend: "cheap", blurb: "Thermal baths, a split city on a river, and ruin bars in old courtyards.", styles: { ...urban, "hot-springs": 0.95, spas: 0.92, "lakes-rivers": 0.78, rejuvenate: 0.8 }, interests: { ...urbanActs, swimming: 0.72, "bars-nightlife": 0.9, "river-cruises": 0.82 } },
  { id: "athens", name: "Athens", country: "Greece", countryCode: "GR", flag: "🇬🇷", coords: { lng: 23.7275, lat: 37.9838 }, continent: "Europe", timezone: "Europe/Athens", currency: "EUR", language: "Greek", climate: "mediterranean", spend: "cheap", blurb: "A living ruin you eat under, with islands an hour away by sea.", styles: { ...urban, "historical-sites": 0.98, monuments: 0.96, beaches: 0.55 }, interests: { ...urbanActs, museums: 0.85, "street-food": 0.8, viewpoints: 0.88 } },
  { id: "porto", name: "Porto", country: "Portugal", countryCode: "PT", flag: "🇵🇹", coords: { lng: -8.6291, lat: 41.1579 }, continent: "Europe", timezone: "Europe/Lisbon", currency: "EUR", language: "Portuguese", climate: "mediterranean", spend: "cheap", blurb: "River terraces, port lodges, and a walkable old town that still belongs to locals in the morning.", styles: { ...urban, "lakes-rivers": 0.85, "historical-sites": 0.8, peaceful: 0.6 }, interests: { ...urbanActs, "river-cruises": 0.9, "food-markets": 0.82, "coffee-places": 0.8 } },
  { id: "edinburgh", name: "Edinburgh", country: "United Kingdom", countryCode: "GB", flag: "🇬🇧", coords: { lng: -3.1883, lat: 55.9533 }, continent: "Europe", timezone: "Europe/London", currency: "GBP", language: "English", climate: "temperate", spend: "mid", blurb: "A volcanic ridge of a city: alleys, festivals, and hills you can climb before breakfast.", styles: { ...urban, mountains: 0.62, "historical-sites": 0.9, monuments: 0.85 }, interests: { ...urbanActs, festivals: 0.95, hiking: 0.7, museums: 0.8, "live-music": 0.82 } },
  { id: "dublin", name: "Dublin", country: "Ireland", countryCode: "IE", flag: "🇮🇪", coords: { lng: -6.2603, lat: 53.3498 }, continent: "Europe", timezone: "Europe/Dublin", currency: "EUR", language: "English", climate: "temperate", spend: "spend", blurb: "A compact capital of pubs, literature, and coast within a tram ride.", styles: { ...urban, "lakes-rivers": 0.5 }, interests: { ...urbanActs, "live-music": 0.92, "bars-nightlife": 0.9, "walking-tours": 0.85 } },
  { id: "stockholm", name: "Stockholm", country: "Sweden", countryCode: "SE", flag: "🇸🇪", coords: { lng: 18.0686, lat: 59.3293 }, continent: "Europe", timezone: "Europe/Stockholm", currency: "SEK", language: "Swedish", climate: "nordic", spend: "spend", blurb: "Fourteen islands, cold-water swimming, and design you notice in the subway.", styles: { ...urban, "lakes-rivers": 0.9, architecture: 0.88, peaceful: 0.7 }, interests: { ...urbanActs, swimming: 0.72, boating: 0.85, "kayaking-canoeing": 0.7, museums: 0.82 } },
  { id: "oslo", name: "Oslo", country: "Norway", countryCode: "NO", flag: "🇳🇴", coords: { lng: 10.7522, lat: 59.9139 }, continent: "Europe", timezone: "Europe/Oslo", currency: "NOK", language: "Norwegian", climate: "nordic", spend: "spend", blurb: "A harbour city with forest on the metro line and museums on the water.", styles: { ...urban, forests: 0.82, "lakes-rivers": 0.8, mountains: 0.55 }, interests: { ...urbanActs, hiking: 0.85, museums: 0.8, cycling: 0.7, "winter-sports": 0.65 } },
  { id: "venice", name: "Venice", country: "Italy", countryCode: "IT", flag: "🇮🇹", coords: { lng: 12.3155, lat: 45.4408 }, continent: "Europe", timezone: "Europe/Rome", currency: "EUR", language: "Italian", climate: "mediterranean", spend: "spend", blurb: "A city without cars: water, stone, and mornings before the day-trippers.", styles: { "historical-sites": 0.95, monuments: 0.9, architecture: 0.92, "lakes-rivers": 0.95, peaceful: 0.55, "city-life": 0.55 }, interests: { "river-cruises": 0.95, boating: 0.9, photography: 0.95, "walking-tours": 0.88, museums: 0.8, viewpoints: 0.85 } },
  { id: "florence", name: "Florence", country: "Italy", countryCode: "IT", flag: "🇮🇹", coords: { lng: 11.2558, lat: 43.7696 }, continent: "Europe", timezone: "Europe/Rome", currency: "EUR", language: "Italian", climate: "mediterranean", spend: "mid", blurb: "Renaissance density: art, hills, and a river you can cross in five minutes.", styles: { ...urban, "historical-sites": 0.96, architecture: 0.95, monuments: 0.9 }, interests: { ...urbanActs, museums: 0.98, "fine-dining": 0.85, "food-markets": 0.88 } },
  { id: "dubrovnik", name: "Dubrovnik", country: "Croatia", countryCode: "HR", flag: "🇭🇷", coords: { lng: 18.0944, lat: 42.6507 }, continent: "Europe", timezone: "Europe/Zagreb", currency: "EUR", language: "Croatian", climate: "mediterranean", spend: "mid", blurb: "Stone walls over a bright sea, and islands you can hop in an afternoon.", styles: { beaches: 0.88, "historical-sites": 0.9, "beach-resort": 0.8, monuments: 0.85, "city-life": 0.5 }, interests: { swimming: 0.9, "beach-activities": 0.88, snorkeling: 0.7, boating: 0.85, "kayaking-canoeing": 0.75, photography: 0.9, viewpoints: 0.92 } },
  { id: "krakow", name: "Kraków", country: "Poland", countryCode: "PL", flag: "🇵🇱", coords: { lng: 19.9445, lat: 50.0497 }, continent: "Europe", timezone: "Europe/Warsaw", currency: "PLN", language: "Polish", climate: "temperate", spend: "cheap", blurb: "A square you can live in, cellars of vodka, and a river walk at dusk.", styles: { ...urban, "historical-sites": 0.9, "traditional-villages": 0.45 }, interests: { ...urbanActs, "food-markets": 0.8, "bars-nightlife": 0.85, museums: 0.78 } },
  { id: "istanbul", name: "Istanbul", country: "Türkiye", countryCode: "TR", flag: "🇹🇷", coords: { lng: 28.9784, lat: 41.0082 }, continent: "Europe", timezone: "Europe/Istanbul", currency: "TRY", language: "Turkish", climate: "mediterranean", spend: "cheap", blurb: "Two continents, a ferry commute, and food that starts before you sit down.", styles: { ...urban, "historical-sites": 0.95, monuments: 0.94, "lakes-rivers": 0.7 }, interests: { ...urbanActs, "street-food": 0.95, "food-markets": 0.92, "river-cruises": 0.88, "fine-dining": 0.7 } },
  { id: "los-angeles", name: "Los Angeles", region: "California", country: "United States", countryCode: "US", flag: "🇺🇸", coords: { lng: -118.2437, lat: 34.0522 }, continent: "North America", timezone: "America/Los_Angeles", currency: "USD", language: "English", climate: "mediterranean", spend: "spend", blurb: "A spread-out city of beaches, canyons, and neighbourhoods that each feel like a different town.", styles: { ...urban, beaches: 0.9, "beach-resort": 0.82, mountains: 0.45 }, interests: { ...urbanActs, swimming: 0.8, "beach-activities": 0.88, hiking: 0.7, "bars-nightlife": 0.85 } },
  { id: "san-francisco", name: "San Francisco", region: "California", country: "United States", countryCode: "US", flag: "🇺🇸", coords: { lng: -122.4194, lat: 37.7749 }, continent: "North America", timezone: "America/Los_Angeles", currency: "USD", language: "English", climate: "temperate", spend: "spend", blurb: "Hills, fog, and a walkable patchwork of neighbourhoods over a cold bay.", styles: { ...urban, "lakes-rivers": 0.55, architecture: 0.8 }, interests: { ...urbanActs, hiking: 0.65, cycling: 0.7, "coffee-places": 0.9, viewpoints: 0.92 } },
  { id: "chicago", name: "Chicago", region: "Illinois", country: "United States", countryCode: "US", flag: "🇺🇸", coords: { lng: -87.6298, lat: 41.8781 }, continent: "North America", timezone: "America/Chicago", currency: "USD", language: "English", climate: "temperate", spend: "mid", blurb: "A lake city of serious architecture, parks, and a food culture that is not shy.", styles: { ...urban, architecture: 0.95, "lakes-rivers": 0.85 }, interests: { ...urbanActs, museums: 0.88, "fine-dining": 0.85, "live-music": 0.82, cycling: 0.7 } },
  { id: "miami", name: "Miami", region: "Florida", country: "United States", countryCode: "US", flag: "🇺🇸", coords: { lng: -80.1918, lat: 25.7617 }, continent: "North America", timezone: "America/New_York", currency: "USD", language: "English", climate: "tropical", spend: "spend", blurb: "Warm water, Art Deco, and a nightlife that starts when other cities go to bed.", styles: { beaches: 0.95, "beach-resort": 0.92, "city-life": 0.85, architecture: 0.7, spas: 0.72 }, interests: { swimming: 0.95, "beach-activities": 0.95, snorkeling: 0.7, "paddle-boarding": 0.8, "bars-nightlife": 0.95, "fine-dining": 0.8 } },
  { id: "new-orleans", name: "New Orleans", region: "Louisiana", country: "United States", countryCode: "US", flag: "🇺🇸", coords: { lng: -90.0715, lat: 29.9511 }, continent: "North America", timezone: "America/Chicago", currency: "USD", language: "English", climate: "tropical", spend: "mid", blurb: "Music in the street, food that argues with you, and a river that runs the show.", styles: { ...urban, "lakes-rivers": 0.7, "historical-sites": 0.75 }, interests: { ...urbanActs, "live-music": 0.98, "street-food": 0.9, festivals: 0.92, "bars-nightlife": 0.95 } },
  { id: "vancouver", name: "Vancouver", country: "Canada", countryCode: "CA", flag: "🇨🇦", coords: { lng: -123.1207, lat: 49.2827 }, continent: "North America", timezone: "America/Vancouver", currency: "CAD", language: "English", climate: "temperate", spend: "spend", blurb: "Mountains in the same frame as a seawall, and sushi that is not a tourist trap.", styles: { ...urban, mountains: 0.88, forests: 0.8, "lakes-rivers": 0.75, beaches: 0.55 }, interests: { ...urbanActs, hiking: 0.9, cycling: 0.85, "kayaking-canoeing": 0.75, "winter-sports": 0.7 } },
  { id: "montreal", name: "Montreal", country: "Canada", countryCode: "CA", flag: "🇨🇦", coords: { lng: -73.5673, lat: 45.5017 }, continent: "North America", timezone: "America/Toronto", currency: "CAD", language: "French", climate: "temperate", spend: "mid", blurb: "A bilingual city of festivals, bagels, and staircases you notice.", styles: { ...urban, "historical-sites": 0.7 }, interests: { ...urbanActs, festivals: 0.9, "live-music": 0.85, "fine-dining": 0.8, "coffee-places": 0.85 } },
  { id: "toronto", name: "Toronto", country: "Canada", countryCode: "CA", flag: "🇨🇦", coords: { lng: -79.3832, lat: 43.6532 }, continent: "North America", timezone: "America/Toronto", currency: "CAD", language: "English", climate: "temperate", spend: "mid", blurb: "A lake city of neighbourhoods, towers, and a food map that never repeats.", styles: { ...urban }, interests: { ...urbanActs, "street-food": 0.88, "fine-dining": 0.8, neighborhoods: 0.9 } },
  { id: "lima", name: "Lima", country: "Peru", countryCode: "PE", flag: "🇵🇪", coords: { lng: -77.0428, lat: -12.0464 }, continent: "South America", timezone: "America/Lima", currency: "PEN", language: "Spanish", climate: "desert", spend: "cheap", blurb: "Cliffs over a grey Pacific, and a food scene that made the city a destination.", styles: { ...urban, beaches: 0.45, "historical-sites": 0.6 }, interests: { ...urbanActs, "fine-dining": 0.95, "street-food": 0.9, "food-markets": 0.88, "cooking-classes": 0.85 } },
  { id: "bogota", name: "Bogotá", country: "Colombia", countryCode: "CO", flag: "🇨🇴", coords: { lng: -74.0721, lat: 4.711 }, continent: "South America", timezone: "America/Bogota", currency: "COP", language: "Spanish", climate: "temperate", spend: "cheap", blurb: "High-altitude streets, a gold museum, and a food hall culture that is still local.", styles: { ...urban, mountains: 0.7, "historical-sites": 0.72 }, interests: { ...urbanActs, museums: 0.8, "street-food": 0.85, "coffee-places": 0.88, hiking: 0.6 } },
  { id: "buenos-aires", name: "Buenos Aires", country: "Argentina", countryCode: "AR", flag: "🇦🇷", coords: { lng: -58.3816, lat: -34.6037 }, continent: "South America", timezone: "America/Argentina/Buenos_Aires", currency: "ARS", language: "Spanish", climate: "southern", spend: "cheap", blurb: "A late-night capital of steak, tango, and European streets that run on Argentine time.", styles: { ...urban, architecture: 0.85 }, interests: { ...urbanActs, "live-music": 0.9, "bars-nightlife": 0.92, "fine-dining": 0.82, "street-art": 0.8 } },
  { id: "rio", name: "Rio de Janeiro", country: "Brazil", countryCode: "BR", flag: "🇧🇷", coords: { lng: -43.1729, lat: -22.9068 }, continent: "South America", timezone: "America/Sao_Paulo", currency: "BRL", language: "Portuguese", climate: "tropical", spend: "mid", blurb: "Beaches under granite peaks, and a city that treats the weekend as a public sport.", styles: { beaches: 0.95, mountains: 0.85, "city-life": 0.88, "beach-resort": 0.8, "adventure-parks": 0.55 }, interests: { swimming: 0.92, "beach-activities": 0.95, hiking: 0.8, viewpoints: 0.95, "bars-nightlife": 0.9, "live-music": 0.85 } },
  { id: "santiago", name: "Santiago", country: "Chile", countryCode: "CL", flag: "🇨🇱", coords: { lng: -70.6693, lat: -33.4489 }, continent: "South America", timezone: "America/Santiago", currency: "CLP", language: "Spanish", climate: "southern", spend: "mid", blurb: "Andes on the horizon, wine in the valleys, and a metro that actually works.", styles: { ...urban, mountains: 0.88 }, interests: { ...urbanActs, hiking: 0.75, "winter-sports": 0.8, "fine-dining": 0.75 } },
  { id: "cusco", name: "Cusco", country: "Peru", countryCode: "PE", flag: "🇵🇪", coords: { lng: -71.9675, lat: -13.5319 }, continent: "South America", timezone: "America/Lima", currency: "PEN", language: "Spanish", climate: "temperate", spend: "cheap", blurb: "Inca stone under a colonial city, and the jumping-off point for the high Andes.", styles: { "historical-sites": 0.98, mountains: 0.92, "traditional-villages": 0.85, monuments: 0.8, peaceful: 0.7 }, interests: { hiking: 0.95, museums: 0.7, "walking-tours": 0.9, photography: 0.88, "food-markets": 0.8 } },
  { id: "seoul", name: "Seoul", country: "South Korea", countryCode: "KR", flag: "🇰🇷", coords: { lng: 126.978, lat: 37.5665 }, continent: "Asia", timezone: "Asia/Seoul", currency: "KRW", language: "Korean", climate: "temperate", spend: "mid", blurb: "Palaces and neon in the same metro ride, and a food culture that does not sleep.", styles: { ...urban, mountains: 0.55, "historical-sites": 0.8, spas: 0.75 }, interests: { ...urbanActs, "street-food": 0.95, "bars-nightlife": 0.88, hiking: 0.7, "shopping-streets": 0.92, "coffee-places": 0.9 } },
  { id: "bangkok", name: "Bangkok", country: "Thailand", countryCode: "TH", flag: "🇹🇭", coords: { lng: 100.5018, lat: 13.7563 }, continent: "Asia", timezone: "Asia/Bangkok", currency: "THB", language: "Thai", climate: "tropical", spend: "cheap", blurb: "River ferries, street heat, and temples you reach by boat as often as by car.", styles: { ...urban, "lakes-rivers": 0.8, "historical-sites": 0.78, spas: 0.8 }, interests: { ...urbanActs, "street-food": 0.98, "river-cruises": 0.9, "food-markets": 0.95, "cooking-classes": 0.88, "shopping-streets": 0.85 } },
  { id: "singapore", name: "Singapore", country: "Singapore", countryCode: "SG", flag: "🇸🇬", coords: { lng: 103.8198, lat: 1.3521 }, continent: "Asia", timezone: "Asia/Singapore", currency: "SGD", language: "English", climate: "tropical", spend: "spend", blurb: "A garden city that is also a food destination, with hawker centres as the civic square.", styles: { ...urban, architecture: 0.88, beaches: 0.4 }, interests: { ...urbanActs, "street-food": 0.98, "fine-dining": 0.9, "food-markets": 0.9, "parks-gardens": 0.92 } },
  { id: "hong-kong", name: "Hong Kong", country: "China", countryCode: "HK", flag: "🇭🇰", coords: { lng: 114.1694, lat: 22.3193 }, continent: "Asia", timezone: "Asia/Hong_Kong", currency: "HKD", language: "Cantonese", climate: "tropical", spend: "spend", blurb: "Vertical density, island trails, and dim sum that is still a morning ritual.", styles: { ...urban, mountains: 0.65, beaches: 0.55, architecture: 0.9 }, interests: { ...urbanActs, "street-food": 0.9, hiking: 0.8, viewpoints: 0.95, "fine-dining": 0.88 } },
  { id: "taipei", name: "Taipei", country: "Taiwan", countryCode: "TW", flag: "🇹🇼", coords: { lng: 121.5654, lat: 25.033 }, continent: "Asia", timezone: "Asia/Taipei", currency: "TWD", language: "Mandarin", climate: "tropical", spend: "cheap", blurb: "Night markets, hot springs in the hills, and a metro that makes the city easy.", styles: { ...urban, "hot-springs": 0.85, mountains: 0.5, spas: 0.7 }, interests: { ...urbanActs, "street-food": 0.98, "food-markets": 0.95, "coffee-places": 0.85 } },
  { id: "kyoto", name: "Kyoto", country: "Japan", countryCode: "JP", flag: "🇯🇵", coords: { lng: 135.7681, lat: 35.0116 }, continent: "Asia", timezone: "Asia/Tokyo", currency: "JPY", language: "Japanese", climate: "temperate", spend: "mid", blurb: "Temples in the trees, a river walk, and a food culture that is precise without being precious.", styles: { "historical-sites": 0.96, "traditional-villages": 0.8, "peaceful": 0.85, architecture: 0.9, "city-life": 0.55, forests: 0.7, "hot-springs": 0.55 }, interests: { museums: 0.7, "walking-tours": 0.92, "food-markets": 0.85, "fine-dining": 0.88, photography: 0.9, "parks-gardens": 0.9, "coffee-places": 0.8 } },
  { id: "osaka", name: "Osaka", country: "Japan", countryCode: "JP", flag: "🇯🇵", coords: { lng: 135.5023, lat: 34.6937 }, continent: "Asia", timezone: "Asia/Tokyo", currency: "JPY", language: "Japanese", climate: "temperate", spend: "mid", blurb: "Japan’s kitchen: alleys of grilled food, neon, and a castle in the middle of it.", styles: { ...urban, "historical-sites": 0.7 }, interests: { ...urbanActs, "street-food": 0.98, "food-markets": 0.9, "bars-nightlife": 0.88 } },
  { id: "hanoi", name: "Hanoi", country: "Vietnam", countryCode: "VN", flag: "🇻🇳", coords: { lng: 105.8342, lat: 21.0278 }, continent: "Asia", timezone: "Asia/Bangkok", currency: "VND", language: "Vietnamese", climate: "tropical", spend: "cheap", blurb: "A lake in the old quarter, coffee on a stool, and motorbikes as the city’s pulse.", styles: { ...urban, "lakes-rivers": 0.75, "historical-sites": 0.72, "traditional-villages": 0.5 }, interests: { ...urbanActs, "street-food": 0.98, "coffee-places": 0.95, "food-markets": 0.9, "cooking-classes": 0.8 } },
  { id: "ho-chi-minh", name: "Ho Chi Minh City", country: "Vietnam", countryCode: "VN", flag: "🇻🇳", coords: { lng: 106.6297, lat: 10.8231 }, continent: "Asia", timezone: "Asia/Ho_Chi_Minh", currency: "VND", language: "Vietnamese", climate: "tropical", spend: "cheap", blurb: "A hot, fast city of markets, coffee, and a river that still moves goods.", styles: { ...urban, "lakes-rivers": 0.55 }, interests: { ...urbanActs, "street-food": 0.96, "coffee-places": 0.9, "food-markets": 0.88 } },
  { id: "bali", name: "Canggu", region: "Bali", country: "Indonesia", countryCode: "ID", flag: "🇮🇩", coords: { lng: 115.1252, lat: -8.6478 }, continent: "Asia", timezone: "Asia/Makassar", currency: "IDR", language: "Indonesian", climate: "tropical", spend: "cheap", blurb: "Rice terraces, surf, and a wellness scene that actually uses the island.", styles: { beaches: 0.92, "beach-resort": 0.9, "traditional-villages": 0.75, peaceful: 0.7, spas: 0.88, rejuvenate: 0.9, forests: 0.6 }, interests: { swimming: 0.88, "beach-activities": 0.9, yoga: 0.95, "paddle-boarding": 0.7, "coffee-places": 0.8, photography: 0.85 } },
  { id: "chiang-mai", name: "Chiang Mai", country: "Thailand", countryCode: "TH", flag: "🇹🇭", coords: { lng: 98.9817, lat: 18.7883 }, continent: "Asia", timezone: "Asia/Bangkok", currency: "THB", language: "Thai", climate: "tropical", spend: "cheap", blurb: "A walled old town, mountains on the edge, and a food culture that is not Bangkok’s.", styles: { "traditional-villages": 0.8, mountains: 0.7, "historical-sites": 0.75, peaceful: 0.72, "city-life": 0.55, forests: 0.6 }, interests: { "street-food": 0.9, "cooking-classes": 0.92, "food-markets": 0.88, hiking: 0.75, "coffee-places": 0.85, yoga: 0.7 } },
  { id: "mumbai", name: "Mumbai", country: "India", countryCode: "IN", flag: "🇮🇳", coords: { lng: 72.8777, lat: 19.076 }, continent: "Asia", timezone: "Asia/Kolkata", currency: "INR", language: "Hindi", climate: "tropical", spend: "cheap", blurb: "A seaside megacity of trains, street food, and neighbourhoods that run on their own clocks.", styles: { ...urban, beaches: 0.5, "historical-sites": 0.7 }, interests: { ...urbanActs, "street-food": 0.98, "food-markets": 0.9, "bars-nightlife": 0.8, "walking-tours": 0.8 } },
  { id: "delhi", name: "Delhi", country: "India", countryCode: "IN", flag: "🇮🇳", coords: { lng: 77.209, lat: 28.6139 }, continent: "Asia", timezone: "Asia/Kolkata", currency: "INR", language: "Hindi", climate: "desert", spend: "cheap", blurb: "Mughal stone, markets that swallow a day, and a food map that is the city’s true transit system.", styles: { ...urban, "historical-sites": 0.95, monuments: 0.92 }, interests: { ...urbanActs, "street-food": 0.98, "food-markets": 0.95, museums: 0.75, "walking-tours": 0.85 } },
  { id: "jaipur", name: "Jaipur", country: "India", countryCode: "IN", flag: "🇮🇳", coords: { lng: 75.7873, lat: 26.9124 }, continent: "Asia", timezone: "Asia/Kolkata", currency: "INR", language: "Hindi", climate: "desert", spend: "cheap", blurb: "Pink stone, forts on ridges, and bazaars that still sell to the city, not just to cameras.", styles: { "historical-sites": 0.95, monuments: 0.94, deserts: 0.55, "traditional-villages": 0.6, "city-life": 0.65, architecture: 0.88 }, interests: { "walking-tours": 0.9, "shopping-streets": 0.88, photography: 0.9, "food-markets": 0.8, museums: 0.7 } },
  { id: "goa", name: "Goa", country: "India", countryCode: "IN", flag: "🇮🇳", coords: { lng: 73.8278, lat: 15.4989 }, continent: "Asia", timezone: "Asia/Kolkata", currency: "INR", language: "English", climate: "tropical", spend: "cheap", blurb: "Beaches, Portuguese churches, and a slower Indian coast that still knows how to eat.", styles: { beaches: 0.95, "beach-resort": 0.88, peaceful: 0.7, "historical-sites": 0.6, spas: 0.65 }, interests: { swimming: 0.92, "beach-activities": 0.95, "bars-nightlife": 0.75, "street-food": 0.8, yoga: 0.7 } },
  { id: "udaipur", name: "Udaipur", country: "India", countryCode: "IN", flag: "🇮🇳", coords: { lng: 73.7125, lat: 24.5854 }, continent: "Asia", timezone: "Asia/Kolkata", currency: "INR", language: "Hindi", climate: "desert", spend: "cheap", blurb: "Lakes and palaces stacked in a bowl of hills — India’s most photogenic slow city.", styles: { "lakes-rivers": 0.95, "historical-sites": 0.9, monuments: 0.88, peaceful: 0.85, architecture: 0.85, "traditional-villages": 0.55 }, interests: { boating: 0.9, photography: 0.95, viewpoints: 0.9, "walking-tours": 0.85, "fine-dining": 0.6 } },
  { id: "kathmandu", name: "Kathmandu", country: "Nepal", countryCode: "NP", flag: "🇳🇵", coords: { lng: 85.324, lat: 27.7172 }, continent: "Asia", timezone: "Asia/Kathmandu", currency: "NPR", language: "Nepali", climate: "temperate", spend: "cheap", blurb: "Durbar squares, mountain light, and the start of almost every Himalayan walk.", styles: { mountains: 0.95, "historical-sites": 0.85, "traditional-villages": 0.8, "city-life": 0.55 }, interests: { hiking: 0.95, "walking-tours": 0.85, "food-markets": 0.75, photography: 0.85, "coffee-places": 0.7 } },
  { id: "cape-town", name: "Cape Town", country: "South Africa", countryCode: "ZA", flag: "🇿🇦", coords: { lng: 18.4241, lat: -33.9249 }, continent: "Africa", timezone: "Africa/Johannesburg", currency: "ZAR", language: "English", climate: "southern", spend: "mid", blurb: "A city under a mountain, with beaches, vineyards, and a harbour in the same day.", styles: { mountains: 0.95, beaches: 0.9, "city-life": 0.8, "beach-resort": 0.7, "wildlife-safaris": 0.45, "lakes-rivers": 0.4 }, interests: { hiking: 0.92, swimming: 0.85, "beach-activities": 0.88, "fine-dining": 0.8, viewpoints: 0.95 } },
  { id: "nairobi", name: "Nairobi", country: "Kenya", countryCode: "KE", flag: "🇰🇪", coords: { lng: 36.8219, lat: -1.2921 }, continent: "Africa", timezone: "Africa/Nairobi", currency: "KES", language: "English", climate: "tropical", spend: "cheap", blurb: "A capital with a national park on its edge, and the gateway to real safari country.", styles: { "wildlife-safaris": 0.95, "city-life": 0.75, "adventure-parks": 0.55 }, interests: { photography: 0.85, "food-markets": 0.7, "coffee-places": 0.65, hiking: 0.55, neighborhoods: 0.7 } },
  { id: "cairo", name: "Cairo", country: "Egypt", countryCode: "EG", flag: "🇪🇬", coords: { lng: 31.2357, lat: 30.0444 }, continent: "Africa", timezone: "Africa/Cairo", currency: "EGP", language: "Arabic", climate: "desert", spend: "cheap", blurb: "A river megacity of museums, dust, and monuments that still stop traffic.", styles: { "historical-sites": 0.98, monuments: 0.98, deserts: 0.7, "city-life": 0.85, "lakes-rivers": 0.65 }, interests: { museums: 0.9, "walking-tours": 0.85, "street-food": 0.85, "river-cruises": 0.8, photography: 0.9 } },
  { id: "dubai", name: "Dubai", country: "United Arab Emirates", countryCode: "AE", flag: "🇦🇪", coords: { lng: 55.2708, lat: 25.2048 }, continent: "Asia", timezone: "Asia/Dubai", currency: "AED", language: "Arabic", climate: "desert", spend: "spend", blurb: "Desert meeting a gulf: beaches, towers, and a food scene imported from everywhere.", styles: { ...urban, deserts: 0.85, beaches: 0.8, "beach-resort": 0.9, architecture: 0.92, spas: 0.85 }, interests: { swimming: 0.85, "beach-activities": 0.8, "shopping-streets": 0.95, "fine-dining": 0.9, "bars-nightlife": 0.8, viewpoints: 0.9 } },
  { id: "zanzibar", name: "Stone Town", region: "Zanzibar", country: "Tanzania", countryCode: "TZ", flag: "🇹🇿", coords: { lng: 39.198, lat: -6.1659 }, continent: "Africa", timezone: "Africa/Dar_es_Salaam", currency: "TZS", language: "Swahili", climate: "tropical", spend: "cheap", blurb: "Spice alleys, a warm Indian Ocean, and beaches a short drive from the old town.", styles: { beaches: 0.95, "beach-resort": 0.9, "historical-sites": 0.8, "traditional-villages": 0.7, peaceful: 0.75 }, interests: { swimming: 0.95, snorkeling: 0.9, "beach-activities": 0.92, "street-food": 0.8, "walking-tours": 0.85 } },
  { id: "sydney", name: "Sydney", country: "Australia", countryCode: "AU", flag: "🇦🇺", coords: { lng: 151.2093, lat: -33.8688 }, continent: "Oceania", timezone: "Australia/Sydney", currency: "AUD", language: "English", climate: "southern", spend: "spend", blurb: "A harbour city where the commute can be a ferry and the weekend is a beach.", styles: { ...urban, beaches: 0.95, "beach-resort": 0.75, "lakes-rivers": 0.7 }, interests: { swimming: 0.95, "beach-activities": 0.95, hiking: 0.7, cycling: 0.7, "coffee-places": 0.9, viewpoints: 0.9 } },
  { id: "melbourne", name: "Melbourne", country: "Australia", countryCode: "AU", flag: "🇦🇺", coords: { lng: 144.9631, lat: -37.8136 }, continent: "Oceania", timezone: "Australia/Melbourne", currency: "AUD", language: "English", climate: "southern", spend: "spend", blurb: "Lanes of coffee, a river, and neighbourhoods that treat food as sport.", styles: { ...urban, "lakes-rivers": 0.55 }, interests: { ...urbanActs, "coffee-places": 0.98, "street-art": 0.92, "fine-dining": 0.88, "live-music": 0.85 } },
  { id: "auckland", name: "Auckland", country: "New Zealand", countryCode: "NZ", flag: "🇳🇿", coords: { lng: 174.7633, lat: -36.8485 }, continent: "Oceania", timezone: "Pacific/Auckland", currency: "NZD", language: "English", climate: "southern", spend: "spend", blurb: "A volcanic harbour city: islands, beaches, and a skyline you can sail past.", styles: { ...urban, beaches: 0.8, "lakes-rivers": 0.75, mountains: 0.45 }, interests: { swimming: 0.8, boating: 0.85, hiking: 0.7, "kayaking-canoeing": 0.7, "coffee-places": 0.8 } },
  { id: "milan", name: "Milan", country: "Italy", countryCode: "IT", flag: "🇮🇹", coords: { lng: 9.19, lat: 45.4642 }, continent: "Europe", timezone: "Europe/Rome", currency: "EUR", language: "Italian", climate: "temperate", spend: "spend", blurb: "Fashion, risotto, and a gothic cathedral you can climb.", styles: { ...urban, architecture: 0.92 }, interests: { ...urbanActs, "shopping-streets": 0.95, "fine-dining": 0.9, museums: 0.85 } },
  { id: "munich", name: "Munich", country: "Germany", countryCode: "DE", flag: "🇩🇪", coords: { lng: 11.582, lat: 48.1351 }, continent: "Europe", timezone: "Europe/Berlin", currency: "EUR", language: "German", climate: "temperate", spend: "spend", blurb: "Beer gardens, alpine light, and a city that still closes for lunch in the right neighbourhoods.", styles: { ...urban, mountains: 0.55 }, interests: { ...urbanActs, museums: 0.85, "parks-gardens": 0.9, "winter-sports": 0.55 } },
  { id: "hamburg", name: "Hamburg", country: "Germany", countryCode: "DE", flag: "🇩🇪", coords: { lng: 9.9937, lat: 53.5511 }, continent: "Europe", timezone: "Europe/Berlin", currency: "EUR", language: "German", climate: "temperate", spend: "mid", blurb: "A harbour city of brick warehouses, water, and a music scene that starts after dark.", styles: { ...urban, "lakes-rivers": 0.8 }, interests: { ...urbanActs, "live-music": 0.9, "river-cruises": 0.8 } },
  { id: "zurich", name: "Zurich", country: "Switzerland", countryCode: "CH", flag: "🇨🇭", coords: { lng: 8.5417, lat: 47.3769 }, continent: "Europe", timezone: "Europe/Zurich", currency: "CHF", language: "German", climate: "temperate", spend: "spend", blurb: "A lake city that is precise about coffee, swimming, and getting home on time.", styles: { ...urban, "lakes-rivers": 0.9, peaceful: 0.7 }, interests: { ...urbanActs, swimming: 0.85, museums: 0.8, "fine-dining": 0.88 } },
  { id: "brussels", name: "Brussels", country: "Belgium", countryCode: "BE", flag: "🇧🇪", coords: { lng: 4.3517, lat: 50.8503 }, continent: "Europe", timezone: "Europe/Brussels", currency: "EUR", language: "French", climate: "temperate", spend: "mid", blurb: "Grand Place, fries on a corner, and a capital that is more neighbourhood than institution.", styles: { ...urban, architecture: 0.88 }, interests: { ...urbanActs, "food-markets": 0.85, museums: 0.82 } },
  { id: "manchester", name: "Manchester", country: "United Kingdom", countryCode: "GB", flag: "🇬🇧", coords: { lng: -2.2426, lat: 53.4808 }, continent: "Europe", timezone: "Europe/London", currency: "GBP", language: "English", climate: "temperate", spend: "mid", blurb: "Mills, music, and a food scene that stopped apologising years ago.", styles: { ...urban }, interests: { ...urbanActs, "live-music": 0.95, "bars-nightlife": 0.9 } },
  { id: "boston", name: "Boston", country: "United States", countryCode: "US", flag: "🇺🇸", coords: { lng: -71.0589, lat: 42.3601 }, continent: "North America", timezone: "America/New_York", currency: "USD", language: "English", climate: "temperate", spend: "spend", blurb: "A walkable harbour city of universities, seafood, and neighbourhoods with actual corners.", styles: { ...urban, "historical-sites": 0.88, "lakes-rivers": 0.55 }, interests: { ...urbanActs, museums: 0.88, "walking-tours": 0.9 } },
  { id: "seattle", name: "Seattle", country: "United States", countryCode: "US", flag: "🇺🇸", coords: { lng: -122.3321, lat: 47.6062 }, continent: "North America", timezone: "America/Los_Angeles", currency: "USD", language: "English", climate: "temperate", spend: "spend", blurb: "Water, mountains, and coffee as civic infrastructure.", styles: { ...urban, mountains: 0.7, "lakes-rivers": 0.8 }, interests: { ...urbanActs, "coffee-places": 0.98, hiking: 0.8 } },
  { id: "denver", name: "Denver", country: "United States", countryCode: "US", flag: "🇺🇸", coords: { lng: -104.9903, lat: 39.7392 }, continent: "North America", timezone: "America/Denver", currency: "USD", language: "English", climate: "temperate", spend: "mid", blurb: "A mile-high city with the Rockies on the horizon and a beer scene in the streets.", styles: { ...urban, mountains: 0.85 }, interests: { ...urbanActs, hiking: 0.9, "winter-sports": 0.75 } },
  { id: "atlanta", name: "Atlanta", country: "United States", countryCode: "US", flag: "🇺🇸", coords: { lng: -84.388, lat: 33.749 }, continent: "North America", timezone: "America/New_York", currency: "USD", language: "English", climate: "temperate", spend: "mid", blurb: "A forested capital of music, food, and a downtown you reach through trees.", styles: { ...urban }, interests: { ...urbanActs, "live-music": 0.9, "food-markets": 0.8 } },
  { id: "washington", name: "Washington", country: "United States", countryCode: "US", flag: "🇺🇸", coords: { lng: -77.0369, lat: 38.9072 }, continent: "North America", timezone: "America/New_York", currency: "USD", language: "English", climate: "temperate", spend: "spend", blurb: "Monuments, free museums, and neighbourhoods that are not the Mall.", styles: { ...urban, monuments: 0.98, "historical-sites": 0.95 }, interests: { ...urbanActs, museums: 0.98, "walking-tours": 0.9 } },
  { id: "sao-paulo", name: "São Paulo", country: "Brazil", countryCode: "BR", flag: "🇧🇷", coords: { lng: -46.6333, lat: -23.5505 }, continent: "South America", timezone: "America/Sao_Paulo", currency: "BRL", language: "Portuguese", climate: "tropical", spend: "mid", blurb: "A megacity of food, art, and neighbourhoods that each feel like a different country.", styles: { ...urban }, interests: { ...urbanActs, "fine-dining": 0.9, "street-art": 0.9, "live-music": 0.85 } },
  { id: "shanghai", name: "Shanghai", country: "China", countryCode: "CN", flag: "🇨🇳", coords: { lng: 121.4737, lat: 31.2304 }, continent: "Asia", timezone: "Asia/Shanghai", currency: "CNY", language: "Mandarin", climate: "temperate", spend: "mid", blurb: "A river city of Art Deco, towers, and dumplings you queue for without complaining.", styles: { ...urban, architecture: 0.92, "lakes-rivers": 0.7 }, interests: { ...urbanActs, "street-food": 0.9, museums: 0.8, viewpoints: 0.9 } },
  { id: "beijing", name: "Beijing", country: "China", countryCode: "CN", flag: "🇨🇳", coords: { lng: 116.4074, lat: 39.9042 }, continent: "Asia", timezone: "Asia/Shanghai", currency: "CNY", language: "Mandarin", climate: "temperate", spend: "mid", blurb: "Courtyards, palaces, and a food map that is the city’s real transit system.", styles: { ...urban, "historical-sites": 0.98, monuments: 0.96 }, interests: { ...urbanActs, museums: 0.9, "street-food": 0.9, "walking-tours": 0.88 } },
  { id: "kuala-lumpur", name: "Kuala Lumpur", country: "Malaysia", countryCode: "MY", flag: "🇲🇾", coords: { lng: 101.6869, lat: 3.139 }, continent: "Asia", timezone: "Asia/Kuala_Lumpur", currency: "MYR", language: "Malay", climate: "tropical", spend: "cheap", blurb: "Towers, jungle at the edge, and food courts that are the actual living room.", styles: { ...urban, architecture: 0.85 }, interests: { ...urbanActs, "street-food": 0.98, "food-markets": 0.92 } },
  { id: "jakarta", name: "Jakarta", country: "Indonesia", countryCode: "ID", flag: "🇮🇩", coords: { lng: 106.8456, lat: -6.2088 }, continent: "Asia", timezone: "Asia/Jakarta", currency: "IDR", language: "Indonesian", climate: "tropical", spend: "cheap", blurb: "A hot capital of street food, traffic, and neighbourhoods that run on their own clocks.", styles: { ...urban }, interests: { ...urbanActs, "street-food": 0.95, "coffee-places": 0.85 } },
  { id: "manila", name: "Manila", country: "Philippines", countryCode: "PH", flag: "🇵🇭", coords: { lng: 120.9842, lat: 14.5995 }, continent: "Asia", timezone: "Asia/Manila", currency: "PHP", language: "English", climate: "tropical", spend: "cheap", blurb: "Bay light, jeepneys, and a food culture that does not wait for dinner.", styles: { ...urban, beaches: 0.4 }, interests: { ...urbanActs, "street-food": 0.9, "bars-nightlife": 0.85 } },
  { id: "bengaluru", name: "Bengaluru", country: "India", countryCode: "IN", flag: "🇮🇳", coords: { lng: 77.5946, lat: 12.9716 }, continent: "Asia", timezone: "Asia/Kolkata", currency: "INR", language: "English", climate: "tropical", spend: "cheap", blurb: "Gardens, pubs, and a tech city that still eats on a banana leaf.", styles: { ...urban }, interests: { ...urbanActs, "coffee-places": 0.88, "bars-nightlife": 0.85, "street-food": 0.9, "parks-gardens": 0.8 } },
  { id: "johannesburg", name: "Johannesburg", country: "South Africa", countryCode: "ZA", flag: "🇿🇦", coords: { lng: 28.0473, lat: -26.2041 }, continent: "Africa", timezone: "Africa/Johannesburg", currency: "ZAR", language: "English", climate: "southern", spend: "mid", blurb: "A high-altitude city of art, food, and township history that is still being written.", styles: { ...urban }, interests: { ...urbanActs, museums: 0.8, "street-art": 0.85, "food-markets": 0.8 } },
  { id: "casablanca", name: "Casablanca", country: "Morocco", countryCode: "MA", flag: "🇲🇦", coords: { lng: -7.5898, lat: 33.5731 }, continent: "Africa", timezone: "Africa/Casablanca", currency: "MAD", language: "Arabic", climate: "mediterranean", spend: "cheap", blurb: "Atlantic light, Art Deco, and a mosque that meets the sea.", styles: { ...urban, beaches: 0.55, "historical-sites": 0.7 }, interests: { ...urbanActs, "walking-tours": 0.8, "street-food": 0.85 } },
  { id: "brisbane", name: "Brisbane", country: "Australia", countryCode: "AU", flag: "🇦🇺", coords: { lng: 153.026, lat: -27.4705 }, continent: "Oceania", timezone: "Australia/Brisbane", currency: "AUD", language: "English", climate: "southern", spend: "spend", blurb: "A subtropical river city: ferries, heat, and weekends that start on the water.", styles: { ...urban, "lakes-rivers": 0.8, beaches: 0.45 }, interests: { ...urbanActs, "coffee-places": 0.88, boating: 0.7 } },
  { id: "perth", name: "Perth", country: "Australia", countryCode: "AU", flag: "🇦🇺", coords: { lng: 115.8605, lat: -31.9505 }, continent: "Oceania", timezone: "Australia/Perth", currency: "AUD", language: "English", climate: "southern", spend: "spend", blurb: "Indian Ocean beaches and a city that still feels like it has room.", styles: { ...urban, beaches: 0.92, "beach-resort": 0.7 }, interests: { swimming: 0.92, "beach-activities": 0.9, "coffee-places": 0.85 } },
  { id: "wellington", name: "Wellington", country: "New Zealand", countryCode: "NZ", flag: "🇳🇿", coords: { lng: 174.7762, lat: -41.2865 }, continent: "Oceania", timezone: "Pacific/Auckland", currency: "NZD", language: "English", climate: "southern", spend: "spend", blurb: "Wind, cafes, and a harbour capital you can walk across between museums.", styles: { ...urban, "lakes-rivers": 0.7 }, interests: { ...urbanActs, "coffee-places": 0.95, museums: 0.85 } },
];

export const extraDestinations: Destination[] = SEEDS.map(fromSeed);
