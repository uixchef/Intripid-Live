import { getDestination } from "@/data/destinations";
import type {
  AccountUser,
  AppNotification,
  Connection,
  EditorialFeature,
  AvoidPlace,
  SavedDestination,
  VisitedLocation,
  WishlistPlace,
} from "@/lib/types";

/**
 * The seeded account.
 *
 * Deterministic in content AND in time: nothing here is computed from today's
 * date, so the dashboard means the same thing whenever it is opened. Ages on
 * notifications are stored as text for the same reason.
 *
 * Coherence with the rest of the product:
 *  - London is the default departure because Discovery pre-selects
 *    `homeCity` on the origin step, and the seeded New York recommendation
 *    was computed from London. One traveller, one origin, across surfaces.
 *  - The persona's interests, styles and budget are the same values the NYC
 *    trip records in `fromDiscovery`, so the dashboard is describing the
 *    person who would have produced that trip.
 *  - Connection ids match the planner's traveller ids, so the same four
 *    people are the same four people in both places.
 */

export const ACCOUNT_USER_ID = "u-sarthak";

const HOME_ADDRESS_ID = "a-london";

export const ACCOUNT_USER: AccountUser = {
  id: ACCOUNT_USER_ID,
  name: "Sarthak Goyal",
  handle: "uixchef",
  initials: "SG",
  /* 4 keeps him off the four colours the planner's travellers already own. */
  colorIndex: 4,
  homeCity: "London",
  homeCountry: "United Kingdom",
  homeAddress: "14 Folgate Street",
  addresses: [
    {
      id: HOME_ADDRESS_ID,
      street: "14 Folgate Street",
      city: "London",
      postal: "E1 6BX",
      country: "United Kingdom",
      countryCode: "GB",
    },
  ],
  defaultAddressId: HOME_ADDRESS_ID,
  diets: [],
  foodRestrictions: [],
  languages: [
    { id: "english", level: "native" },
    { id: "hindi", level: "fluent" },
  ],
  incomeBand: null,
  documents: {
    nationality: "United Kingdom",
    passportNumber: "",
    passportExpiry: "",
    knownTravellerNumber: "",
    emergencyName: "",
    emergencyPhone: "",
  },
  memberSinceIso: "2023-11-02",
  stats: {
    wishlist: 32,
    visited: 24,
    /*
     * Places ruled out. The original dashboard showed this alongside wishlist
     * and visited, and it is the most distinctive of the three: a recommender
     * that knows where you will not go is more useful than one that only
     * knows where you might.
     */
    avoid: 9,
  },
  badges: [
    {
      id: "night-trains",
      label: "Night trains",
      detail: "Take an overnight train",
      earned: false,
      image: "/identity/badge-empty.png",
    },
    {
      id: "hundred-places",
      label: "Hundred places",
      detail: "Log a hundred stops",
      earned: false,
      image: "/identity/badge-empty.png",
    },
    {
      id: "globe-trotter",
      label: "Globe-trotter",
      detail: "Trips on four continents",
      earned: true,
      image: "/identity/medal-gold.svg",
    },
    {
      id: "city-walker",
      label: "City walker",
      detail: "Twenty cities on foot",
      earned: true,
      image: "/identity/medal-silver.svg",
    },
  ],
  persona: {
    summary:
      "Walks first, books second. Sarthak plans a spine for each day — one thing that has to happen — and leaves the rest open enough to follow a street that looks interesting. Prefers early mornings in a neighbourhood before it fills up, eats where the queue is local, and would rather see one museum properly than three badly.",
    pace: "moderate",
    interests: [],
    styles: ["city-life", "architecture"],
    budget: "premium",
    updatedIso: "2026-08-21",
    /*
     * Read as product rather than decoration, the original dashboard's four
     * badge-like circles sit where the standing inputs to every
     * recommendation belong. So these are not achievements: each one states
     * what it causes Intripid to do differently, which is the only reason a
     * traveller should care that it is on their profile.
     */
    traits: [
      {
        id: "early-riser",
        label: "Early riser",
        effect: "Days start at 8, and mornings get the busiest sights",
        channel: "orange",
      },
      {
        id: "walkable",
        label: "Prefers walking",
        effect: "Ranks cities you can cross on foot, and keeps stops close",
        channel: "teal",
      },
      {
        id: "one-anchor",
        label: "One anchor a day",
        effect: "Schedules a single fixed commitment, then leaves room",
        channel: "purple",
      },
      {
        id: "no-resorts",
        label: "Rules out resorts",
        effect: "Filters out anywhere that only works as a package",
        channel: "pink",
      },
    ],
  },
};

/* -------------------------------------------------------------------------- */
/* Travel footprint                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Cities and stops that populate the identity cover map.
 *
 * This is the travel record: home, trips taken, transits. Discovery's
 * destination list is only a gazetteer — same name, same coordinates —
 * so Tokyo is one point in the product. The hunt never writes here.
 */
function destinationPin(
  destinationId: string,
  kind: VisitedLocation["kind"] = "visited",
): VisitedLocation {
  const destination = getDestination(destinationId);
  if (!destination) {
    throw new Error(`Unknown destination id: ${destinationId}`);
  }
  return {
    id: destination.id,
    name: destination.name,
    coords: destination.coords,
    kind,
    countryCode: destination.countryCode,
  };
}

export const VISITED_LOCATIONS: VisitedLocation[] = [
  {
    id: "london",
    name: "London",
    coords: { lng: -0.1276, lat: 51.5072 },
    kind: "home",
    countryCode: "GB",
  },
  destinationPin("copenhagen"),
  destinationPin("marrakesh"),
  destinationPin("tokyo"),
  destinationPin("nyc"),
  destinationPin("lisbon"),
  destinationPin("reykjavik"),
  destinationPin("oaxaca"),
  {
    id: "paris",
    name: "Paris",
    coords: { lng: 2.3522, lat: 48.8566 },
    kind: "visited",
    countryCode: "FR",
  },
  {
    id: "barcelona",
    name: "Barcelona",
    coords: { lng: 2.1734, lat: 41.3851 },
    kind: "visited",
    countryCode: "ES",
  },
  {
    id: "rome",
    name: "Rome",
    coords: { lng: 12.4964, lat: 41.9028 },
    kind: "visited",
    countryCode: "IT",
  },
  {
    id: "amsterdam",
    name: "Amsterdam",
    coords: { lng: 4.9041, lat: 52.3676 },
    kind: "visited",
    countryCode: "NL",
  },
  {
    id: "dubai",
    name: "Dubai",
    coords: { lng: 55.2708, lat: 25.2048 },
    kind: "transit",
    countryCode: "AE",
  },
];

export function wishlistPlaceFromDestination(destinationId: string): WishlistPlace {
  const destination = getDestination(destinationId);
  if (!destination) {
    throw new Error(`Unknown destination id: ${destinationId}`);
  }
  return {
    id: destination.id,
    name: destination.name,
    coords: destination.coords,
    countryCode: destination.countryCode,
  };
}

export const WISHLIST_PLACES: WishlistPlace[] = [
  wishlistPlaceFromDestination("queenstown"),
  wishlistPlaceFromDestination("mexico-city"),
  {
    id: "kyoto",
    name: "Kyoto",
    coords: { lng: 135.7681, lat: 35.0116 },
    countryCode: "JP",
  },
  {
    id: "porto",
    name: "Porto",
    coords: { lng: -8.6291, lat: 41.1579 },
    countryCode: "PT",
  },
  {
    id: "cape-town",
    name: "Cape Town",
    coords: { lng: 18.4241, lat: -33.9249 },
    countryCode: "ZA",
  },
  {
    id: "vienna",
    name: "Vienna",
    coords: { lng: 16.3738, lat: 48.2082 },
    countryCode: "AT",
  },
  {
    id: "seoul",
    name: "Seoul",
    coords: { lng: 126.978, lat: 37.5665 },
    countryCode: "KR",
  },
  {
    id: "new-orleans",
    name: "New Orleans",
    coords: { lng: -90.0715, lat: 29.9511 },
    countryCode: "US",
  },
];

/**
 * Places ruled out. Mix of scales on purpose: Intripid lets you reject a city,
 * a state, a country or a continent, and the globe should show the area you
 * meant — not nine identical pins.
 */
export const AVOID_PLACES: AvoidPlace[] = [
  {
    id: "antarctica",
    name: "Antarctica",
    scale: "continent",
    coords: { lng: 0, lat: -80 },
    iso2: "AQ",
    radiusKm: 0,
  },
  {
    id: "maldives",
    name: "Maldives",
    scale: "country",
    coords: { lng: 73.2207, lat: 3.2028 },
    iso2: "MV",
    radiusKm: 180,
  },
  {
    id: "belize",
    name: "Belize",
    scale: "country",
    coords: { lng: -88.4976, lat: 17.1899 },
    iso2: "BZ",
    radiusKm: 90,
  },
  {
    id: "florida",
    name: "Florida",
    scale: "state",
    coords: { lng: -81.5158, lat: 27.6648 },
    iso2: "US",
    radiusKm: 0,
    polygon: [
      [-87.63, 30.29],
      [-85.4, 31.0],
      [-82.05, 30.36],
      [-81.47, 30.74],
      [-81.23, 25.8],
      [-80.38, 25.2],
      [-80.03, 25.34],
      [-80.68, 24.52],
      [-81.96, 24.52],
      [-82.05, 26.5],
      [-82.85, 27.9],
      [-83.17, 29.18],
      [-87.45, 30.4],
      [-87.63, 30.29],
    ],
  },
  {
    id: "las-vegas",
    name: "Las Vegas",
    scale: "city",
    coords: { lng: -115.1398, lat: 36.1699 },
    iso2: "US",
    radiusKm: 55,
  },
  {
    id: "ibiza",
    name: "Ibiza",
    scale: "city",
    coords: { lng: 1.4206, lat: 38.9067 },
    iso2: "ES",
    radiusKm: 40,
  },
  {
    id: "cancun",
    name: "Cancún",
    scale: "city",
    coords: { lng: -86.8515, lat: 21.1619 },
    iso2: "MX",
    radiusKm: 45,
  },
  {
    id: "magaluf",
    name: "Magaluf",
    scale: "city",
    coords: { lng: 2.535, lat: 39.508 },
    iso2: "ES",
    radiusKm: 28,
  },
  {
    id: "gold-coast",
    name: "Gold Coast",
    scale: "city",
    coords: { lng: 153.4, lat: -28.0167 },
    iso2: "AU",
    radiusKm: 50,
  },
];

/* -------------------------------------------------------------------------- */
/* Connections                                                                */
/* -------------------------------------------------------------------------- */

/**
 * The dashboard end of the planner's collaboration model.
 *
 * The ids are the planner's traveller ids on purpose: opening the New York
 * trip shows the same four people, with the same avatar colours. The history
 * line is what makes the list worth having — it is the answer to "why is this
 * person being suggested", which a bare avatar grid never gives you.
 */
export const CONNECTIONS: Connection[] = [
  {
    id: "t-maya",
    name: "Maya Rasheed",
    handle: "maya",
    initials: "MR",
    photoUrl: "/avatars/maya-rasheed.jpg",
    colorIndex: 0,
    history: ["Five days in New York", "Copenhagen weekend"],
    onCurrentTrip: true,
    relation: "friend",
    invite: "connected",
  },
  {
    id: "t-danny",
    name: "Danny Okonkwo",
    handle: "danny",
    initials: "DO",
    colorIndex: 1,
    history: ["Five days in New York", "Marrakesh, off the grid"],
    onCurrentTrip: true,
    relation: "friend",
    invite: "connected",
  },
  {
    id: "t-priya",
    name: "Priya Venkatesan",
    handle: "priya",
    initials: "PV",
    photoUrl: "/avatars/priya-venkatesan.jpg",
    colorIndex: 2,
    history: ["Five days in New York", "Tokyo in blossom season"],
    onCurrentTrip: true,
    relation: "colleague",
    invite: "connected",
  },
  {
    id: "t-jonas",
    name: "Jonas Lindqvist",
    handle: "jonas",
    initials: "JL",
    colorIndex: 3,
    history: ["Five days in New York", "Reykjavík in the dark"],
    onCurrentTrip: true,
    relation: "friend",
    invite: "connected",
  },
  {
    id: "c-nina",
    name: "Nina Okafor",
    handle: "nina",
    initials: "NO",
    /* 4 and 5 match the planner's own connection list, so the same person is
       never two different colours across the two surfaces. */
    colorIndex: 4,
    history: ["Lisbon, 2024"],
    onCurrentTrip: false,
    relation: "friend",
    invite: "connected",
  },
  {
    id: "c-theo",
    name: "Theo Lindqvist",
    handle: "theo",
    initials: "TL",
    colorIndex: 5,
    history: ["Tokyo in blossom season"],
    onCurrentTrip: false,
    relation: "family",
    invite: "connected",
  },
  {
    id: "c-amira",
    name: "Amira Hassan",
    handle: "amira",
    initials: "AH",
    colorIndex: 0,
    history: [],
    onCurrentTrip: false,
    relation: "friend",
    invite: "sent",
    email: "amira.hassan@example.com",
  },
  {
    id: "c-leo",
    name: "Leo Martins",
    handle: "leo",
    initials: "LM",
    colorIndex: 1,
    history: [],
    onCurrentTrip: false,
    relation: "colleague",
    invite: "sent",
    email: "leo.martins@example.com",
  },
  {
    id: "c-sofia",
    name: "Sofia Alvarez",
    handle: "sofia",
    initials: "SA",
    colorIndex: 2,
    history: [],
    onCurrentTrip: false,
    relation: "friend",
    invite: "received",
  },
  {
    id: "c-camille",
    name: "Camille Dupont",
    handle: "camille",
    initials: "CD",
    colorIndex: 3,
    history: [],
    onCurrentTrip: false,
    relation: "colleague",
    invite: "received",
  },
];

/** Restore demo pending requests that an older saved session never stored. */
export function withSeededConnectionRequests(people: Connection[]): Connection[] {
  const byId = new Map(people.map((person) => [person.id, person]));
  for (const person of CONNECTIONS) {
    if (
      (person.invite === "sent" || person.invite === "received") &&
      !byId.has(person.id)
    ) {
      byId.set(person.id, person);
    }
  }
  return [...byId.values()];
}

/* -------------------------------------------------------------------------- */
/* Notifications                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Every notification resolves to somewhere in the product.
 *
 * That is the whole rule, and it is why there are four rather than twenty:
 * a dashboard notification that cannot be acted on is a badge that makes you
 * feel behind for no reason.
 */
export const NOTIFICATIONS: AppNotification[] = [
  {
    id: "n-clash",
    kind: "advisor",
    title: "Thursday has a clash",
    detail:
      "Klimt at the Neue Galerie overlaps Madison Avenue by 90 minutes. The advisor has a fix ready.",
    age: "2h",
    href: "/trip/nyc-spring",
    read: false,
  },
  {
    id: "n-danny",
    kind: "collaboration",
    title: "Danny added the Village Vanguard",
    detail: "Friday, 8:30pm. He has left the second set unbooked.",
    age: "5h",
    href: "/trip/nyc-spring",
    read: false,
  },
  {
    id: "n-blossom",
    kind: "season",
    title: "Tokyo's blossom window is closing",
    detail:
      "Peak is late March. If it matters this year, the decision needs making in the next few weeks.",
    age: "2d",
    href: "/discover",
    read: true,
  },
  {
    id: "n-priya",
    kind: "collaboration",
    title: "Priya is no longer on Saturday's dinner",
    detail: "She has flights that afternoon. The table is still for four.",
    age: "4d",
    href: "/trip/nyc-spring",
    read: true,
  },
];

/* -------------------------------------------------------------------------- */
/* Editorial                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Seasonal features, pointed back into the product.
 *
 * The original dashboard ran a Cherry Blossom news card. The idea is kept and
 * the framing is changed: this is not news, it is a window that is closing.
 * The support column rotates through a few, because a single place goes stale
 * the second you have already decided not to go this year.
 */
export const EDITORIALS: EditorialFeature[] = [
  {
    id: "e-blossom",
    destinationId: "tokyo",
    eyebrow: "Worth travelling for",
    headline: "Tokyo, in the ten days the blossom holds",
    body:
      "Hanami is not a month, it is about ten days, and they move by up to two weeks a year. Go in that window and the parks stay open past dark with the trees lit; miss it by a week and you have an ordinary — still very good — trip to Tokyo.",
    window: "Late March – early April",
    because: "You rank cities on museums and food, and Tokyo leads on both",
  },
  {
    id: "e-lisbon-light",
    destinationId: "lisbon",
    eyebrow: "Worth travelling for",
    headline: "Lisbon, before the hills cook",
    body:
      "The light is the reason people stay an extra day: tiled façades, a tidal river, and miradouros that stack the city in layers. Come before high summer and you get the same views without the cruise-ship noon, plus sardines that actually belong to the season.",
    window: "April – June",
    because: "Architecture, coffee and markets are how you choose a city, and Lisbon is built for all three",
  },
  {
    id: "e-harbour",
    destinationId: "copenhagen",
    eyebrow: "Worth travelling for",
    headline: "Copenhagen, while the harbour is a pool",
    body:
      "For a few months the city treats the water as a street: swim off Islands Brygge, cycle home in daylight at ten, eat outside without a reservation war. Miss that window and it is still a design capital — just one you experience from the inside of a café.",
    window: "June – August",
    because: "You travel for culture and food, and Copenhagen is public about both",
  },
  {
    id: "e-medina",
    destinationId: "marrakesh",
    eyebrow: "Worth travelling for",
    headline: "Marrakesh, in the months the medina breathes",
    body:
      "Summer in the red city is a test. From autumn through early spring the souks are walkable, the courtyards are the point, and Jemaa el-Fnaa at ten is food rather than endurance. That is the version worth a flight.",
    window: "October – April",
    because: "Markets and food sit at the top of how you travel, and the medina is both",
  },
];

/* -------------------------------------------------------------------------- */
/* Saved                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Kept for later.
 *
 * This is what the original dashboard's "Weekend Getaways — Coming Soon"
 * poster becomes. A locked panel advertising a feature that does not exist
 * costs a permanent slot on the busiest screen in the product and gives
 * nothing back; the same slot holding the places you have already shown
 * interest in is immediately useful and needs no new backend.
 */
export const SAVED_DESTINATIONS: SavedDestination[] = [
  {
    destinationId: "lisbon",
    reason: "Saved from Discovery — matched on food and walkability",
    window: "March to June",
  },
  {
    destinationId: "copenhagen",
    reason: "Maya suggested it after the last trip",
    window: "May to August",
  },
  {
    destinationId: "oaxaca",
    reason: "Saved for the markets",
    window: "October to April",
  },
];
