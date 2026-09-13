import { ACCOUNT_USER_ID } from "@/data/account";

/**
 * Rank among people you already travel with — not a public board.
 *
 * The island is top five on seals. View all opens the same people across
 * the three records this product already keeps: seals, visited, wishlist.
 */

export type BoardPeriod = "30d" | "90d" | "year";

export type BoardCategory = "seals" | "visited" | "wishlist";

export const BOARD_PERIODS: { value: BoardPeriod; label: string; short: string }[] = [
  { value: "30d", label: "30 days", short: "30d" },
  { value: "90d", label: "90 days", short: "90d" },
  { value: "year", label: "This year", short: "Year" },
];

export const BOARD_CATEGORIES: {
  value: BoardCategory;
  label: string;
  column: string;
}[] = [
  { value: "seals", label: "Seals", column: "Seals" },
  { value: "visited", label: "Visited", column: "Places" },
  { value: "wishlist", label: "Wishlist", column: "Saves" },
];

export interface BoardSeed {
  id: string;
  /** Collection size. Your row is overwritten from live prizes. */
  seals: number;
  delta: Record<BoardPeriod, number>;
  visited: number;
  wishlist: number;
}

export const BOARD_SEEDS: BoardSeed[] = [
  {
    id: "t-maya",
    seals: 5,
    delta: { "30d": 20, "90d": 41, "year": 88 },
    visited: 19,
    wishlist: 14,
  },
  {
    id: ACCOUNT_USER_ID,
    seals: 4,
    delta: { "30d": 8, "90d": 22, "year": 61 },
    visited: 13,
    wishlist: 8,
  },
  {
    id: "t-priya",
    seals: 4,
    delta: { "30d": 3, "90d": 18, "year": 54 },
    visited: 11,
    wishlist: 16,
  },
  {
    id: "t-danny",
    seals: 3,
    delta: { "30d": 2, "90d": 11, "year": 39 },
    visited: 9,
    wishlist: 6,
  },
  {
    id: "t-jonas",
    seals: 3,
    delta: { "30d": 2, "90d": 9, "year": 33 },
    visited: 8,
    wishlist: 5,
  },
  {
    id: "c-nina",
    seals: 2,
    delta: { "30d": 2, "90d": 7, "year": 21 },
    visited: 6,
    wishlist: 9,
  },
  {
    id: "c-theo",
    seals: 1,
    delta: { "30d": 1, "90d": 4, "year": 14 },
    visited: 4,
    wishlist: 7,
  },
  {
    id: "t-elena",
    seals: 4,
    delta: { "30d": 15, "90d": 36, "year": 72 },
    visited: 16,
    wishlist: 11,
  },
  {
    id: "t-kenji",
    seals: 4,
    delta: { "30d": 12, "90d": 28, "year": 64 },
    visited: 14,
    wishlist: 9,
  },
  {
    id: "t-aisha",
    seals: 3,
    delta: { "30d": 10, "90d": 25, "year": 58 },
    visited: 12,
    wishlist: 10,
  },
  {
    id: "b-luca",
    seals: 3,
    delta: { "30d": 7, "90d": 19, "year": 47 },
    visited: 10,
    wishlist: 8,
  },
  {
    id: "b-sofia",
    seals: 3,
    delta: { "30d": 6, "90d": 17, "year": 44 },
    visited: 9,
    wishlist: 12,
  },
  {
    id: "b-amara",
    seals: 2,
    delta: { "30d": 5, "90d": 14, "year": 38 },
    visited: 8,
    wishlist: 7,
  },
  {
    id: "b-noah",
    seals: 2,
    delta: { "30d": 4, "90d": 13, "year": 35 },
    visited: 7,
    wishlist: 6,
  },
  {
    id: "b-hana",
    seals: 2,
    delta: { "30d": 3, "90d": 12, "year": 31 },
    visited: 7,
    wishlist: 9,
  },
  {
    id: "b-omar",
    seals: 2,
    delta: { "30d": 2, "90d": 10, "year": 27 },
    visited: 6,
    wishlist: 5,
  },
  {
    id: "b-lea",
    seals: 1,
    delta: { "30d": 1, "90d": 8, "year": 22 },
    visited: 5,
    wishlist: 8,
  },
  {
    id: "b-ingrid",
    seals: 1,
    delta: { "30d": 1, "90d": 6, "year": 18 },
    visited: 4,
    wishlist: 4,
  },
  {
    id: "b-mateo",
    seals: 1,
    delta: { "30d": 1, "90d": 5, "year": 16 },
    visited: 4,
    wishlist: 6,
  },
  {
    id: "t-tom",
    seals: 1,
    delta: { "30d": 0, "90d": 3, "year": 11 },
    visited: 3,
    wishlist: 5,
  },
];

export const BOARD_PREVIEW = 5;

/** Extra circle members on the board — not the dashboard connections list. */
export const BOARD_GUESTS: {
  id: string;
  name: string;
  initials: string;
  colorIndex: number;
}[] = [
  { id: "t-elena", name: "Elena Varga", initials: "EV", colorIndex: 4 },
  { id: "t-kenji", name: "Kenji Sato", initials: "KS", colorIndex: 1 },
  { id: "t-aisha", name: "Aisha Rahman", initials: "AR", colorIndex: 0 },
  { id: "b-luca", name: "Luca Bianchi", initials: "LB", colorIndex: 2 },
  { id: "b-sofia", name: "Sofía Herrera", initials: "SH", colorIndex: 3 },
  { id: "b-amara", name: "Amara Diallo", initials: "AD", colorIndex: 5 },
  { id: "b-noah", name: "Noah Berg", initials: "NB", colorIndex: 1 },
  { id: "b-hana", name: "Hana Kim", initials: "HK", colorIndex: 0 },
  { id: "b-omar", name: "Omar Farouk", initials: "OF", colorIndex: 4 },
  { id: "b-lea", name: "Léa Moreau", initials: "LM", colorIndex: 2 },
  { id: "b-ingrid", name: "Ingrid Dahl", initials: "ID", colorIndex: 3 },
  { id: "b-mateo", name: "Mateo Alvarez", initials: "MA", colorIndex: 5 },
  { id: "t-tom", name: "Tom Hughes", initials: "TH", colorIndex: 1 },
];

export const BOARD_COUNTRY: Record<
  string,
  { country: string; countryCode: string; handle: string }
> = {
  [ACCOUNT_USER_ID]: {
    country: "United Kingdom",
    countryCode: "gb",
    handle: "uixchef",
  },
  "t-maya": { country: "United Arab Emirates", countryCode: "ae", handle: "maya" },
  "t-danny": { country: "Nigeria", countryCode: "ng", handle: "danny" },
  "t-priya": { country: "India", countryCode: "in", handle: "priya" },
  "t-jonas": { country: "Sweden", countryCode: "se", handle: "jonas" },
  "c-nina": { country: "Nigeria", countryCode: "ng", handle: "nina" },
  "c-theo": { country: "Sweden", countryCode: "se", handle: "theo" },
  "t-elena": { country: "Hungary", countryCode: "hu", handle: "elena" },
  "t-kenji": { country: "Japan", countryCode: "jp", handle: "kenji" },
  "t-aisha": { country: "Pakistan", countryCode: "pk", handle: "aisha" },
  "t-tom": { country: "United States", countryCode: "us", handle: "tom" },
  "b-luca": { country: "Italy", countryCode: "it", handle: "luca" },
  "b-sofia": { country: "Mexico", countryCode: "mx", handle: "sofia" },
  "b-amara": { country: "Senegal", countryCode: "sn", handle: "amara" },
  "b-noah": { country: "Netherlands", countryCode: "nl", handle: "noah" },
  "b-hana": { country: "South Korea", countryCode: "kr", handle: "hana" },
  "b-omar": { country: "Morocco", countryCode: "ma", handle: "omar" },
  "b-lea": { country: "France", countryCode: "fr", handle: "lea" },
  "b-ingrid": { country: "Norway", countryCode: "no", handle: "ingrid" },
  "b-mateo": { country: "Argentina", countryCode: "ar", handle: "mateo" },
};

export interface BoardPerson {
  id: string;
  name: string;
  initials: string;
  photoUrl?: string;
  colorIndex: number;
  handle: string;
  country: string;
  countryCode: string;
}

export interface BoardRow extends BoardPerson {
  rank: number;
  /** Score for the active category and period. */
  value: number;
  seals: number;
  visited: number;
  wishlist: number;
  /**
   * Rank change versus the next-wider period (30d vs 90d, 90d vs year).
   * Positive = rose.
   */
  move: number;
}

function metric(
  seed: BoardSeed,
  category: BoardCategory,
  period: BoardPeriod,
  live?: { seals: number; visited: number; wishlist: number },
): number {
  const seals = live?.seals ?? seed.seals;
  const visited = live?.visited ?? seed.visited;
  const wishlist = live?.wishlist ?? seed.wishlist;
  if (category === "seals") {
    return period === "year" ? seals : seed.delta[period];
  }
  const total = category === "visited" ? visited : wishlist;
  if (period === "year") return total;
  const share = seed.delta[period] / Math.max(1, seed.delta.year);
  return Math.max(0, Math.round(total * share));
}

function profileFor(id: string, fallbackHandle: string): {
  country: string;
  countryCode: string;
  handle: string;
} {
  return (
    BOARD_COUNTRY[id] ?? {
      country: "—",
      countryCode: "",
      handle: fallbackHandle,
    }
  );
}

type LiveYou = { id: string; seals: number; visited: number; wishlist: number };

function scorePeople(
  people: BoardPerson[],
  period: BoardPeriod,
  category: BoardCategory,
  liveYou: LiveYou,
) {
  return people
    .map((person) => {
      const seed = BOARD_SEEDS.find((row) => row.id === person.id);
      if (!seed) return null;
      const live =
        person.id === liveYou.id
          ? {
              seals: liveYou.seals,
              visited: liveYou.visited,
              wishlist: liveYou.wishlist,
            }
          : undefined;
      return {
        ...person,
        seals: metric(seed, "seals", period, live),
        visited: metric(seed, "visited", period, live),
        wishlist: metric(seed, "wishlist", period, live),
        value: metric(seed, category, period, live),
      };
    })
    .filter(
      (
        row,
      ): row is BoardPerson & {
        seals: number;
        visited: number;
        wishlist: number;
        value: number;
      } => row !== null,
    )
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
}

function comparePeriod(period: BoardPeriod): BoardPeriod {
  if (period === "30d") return "90d";
  if (period === "90d") return "year";
  return "90d";
}

/**
 * Rank the circle for one period and one record.
 * Your seals / visited / wishlist overwrite the seed so the board
 * matches the progress rail on the same screen.
 */
export function rankBoard(
  people: BoardPerson[],
  period: BoardPeriod,
  category: BoardCategory,
  liveYou: LiveYou,
): BoardRow[] {
  const scored = scorePeople(people, period, category, liveYou);
  const previous = scorePeople(
    people,
    comparePeriod(period),
    category,
    liveYou,
  );
  const priorRank = new Map(previous.map((row, index) => [row.id, index + 1]));

  return scored.map((row, index) => {
    const rank = index + 1;
    return {
      ...row,
      rank,
      move: (priorRank.get(row.id) ?? rank) - rank,
    };
  });
}

export function boardPersonFromUser(
  user: {
    id: string;
    name: string;
    handle: string;
    initials: string;
    photoUrl?: string;
    colorIndex: number;
    homeCountry: string;
  },
): BoardPerson {
  const listed = profileFor(user.id, user.handle);
  return {
    id: user.id,
    name: user.name,
    initials: user.initials,
    photoUrl: user.photoUrl,
    colorIndex: user.colorIndex,
    handle: user.handle,
    country: user.homeCountry || listed.country,
    countryCode: listed.countryCode,
  };
}

export function boardPersonFromConnection(person: {
  id: string;
  name: string;
  initials: string;
  photoUrl?: string;
  colorIndex: number;
  handle?: string;
}): BoardPerson {
  const listed = profileFor(
    person.id,
    person.handle ||
      person.name.toLowerCase().replace(/[^a-z]+/g, "").slice(0, 12),
  );
  return {
    id: person.id,
    name: person.name,
    initials: person.initials,
    photoUrl: person.photoUrl,
    colorIndex: person.colorIndex,
    handle: listed.handle,
    country: listed.country,
    countryCode: listed.countryCode,
  };
}
