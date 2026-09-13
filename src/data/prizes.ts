import { CONTINENTS } from "@/data/continents";
import type {
  AvoidPlace,
  TravelBadge,
  VisitedLocation,
  WishlistPlace,
} from "@/lib/types";

/** A prize with live progress, for the collection board. */
export interface Prize {
  id: string;
  label: string;
  detail: string;
  hint: string;
  image: string;
  /** Figma level-row mark — glow already in the asset. */
  seal: string;
  earned: boolean;
  current: number;
  target: number;
  earnedOn?: string;
}

function continentName(countryCode?: string): string | null {
  if (!countryCode) return null;
  const iso = countryCode.toUpperCase();
  return CONTINENTS.find((continent) => continent.iso2Group.includes(iso))?.name ?? null;
}

function citiesVisited(visited: VisitedLocation[]): number {
  return visited.filter((place) => place.kind === "visited").length;
}

function continentsTouched(visited: VisitedLocation[]): number {
  const names = new Set<string>();
  for (const place of visited) {
    if (place.kind === "transit") continue;
    const name = continentName(place.countryCode);
    if (name && name !== "Antarctica") names.add(name);
  }
  return names.size;
}

function worn(badges: TravelBadge[], id: string): TravelBadge | undefined {
  return badges.find((badge) => badge.id === id);
}

function medal(earned: boolean, image: string, fallback: string): string {
  return earned ? image : fallback;
}

/**
 * The collection behind the identity medals.
 *
 * The four worn badges stay the profile pin. The board adds only prizes that
 * can be scored from footprint already on the account — so "close" is real.
 */
export function prizeCollection(
  badges: TravelBadge[],
  visited: VisitedLocation[],
  wishlist: WishlistPlace[],
  avoids: AvoidPlace[],
): Prize[] {
  const cities = citiesVisited(visited);
  const continents = continentsTouched(visited);
  const empty = "/identity/badge-empty.png";
  const gold = worn(badges, "globe-trotter");
  const walker = worn(badges, "city-walker");
  const trains = worn(badges, "night-trains");
  const hundred = worn(badges, "hundred-places");

  const globeEarned = gold?.earned ?? continents >= 4;
  const walkerEarned = walker?.earned ?? cities >= 20;
  const trainsEarned = trains?.earned ?? false;
  const hundredEarned = hundred?.earned ?? cities >= 100;
  const savedEarned = wishlist.length >= 10;
  const nosEarned = avoids.length >= 5;

  return [
    {
      id: "globe-trotter",
      label: "Globe-trotter",
      detail: "Trips on four continents",
      hint: "The fourth continent locked this. Wear it.",
      image: medal(globeEarned, gold?.image ?? "/identity/medal-gold.svg", empty),
      seal: "/identity/seals/earned-1.png",
      earned: globeEarned,
      current: Math.min(continents, 4),
      target: 4,
      earnedOn: globeEarned ? "Oct 2025" : undefined,
    },
    {
      id: "city-walker",
      label: "City walker",
      detail: "Twenty cities on foot",
      hint: walkerEarned
        ? "Logged as walked — the medal stays even as the count grows."
        : `${20 - cities} more cities and this is yours.`,
      image: medal(walkerEarned, walker?.image ?? "/identity/medal-silver.svg", empty),
      seal: "/identity/seals/earned-2.png",
      earned: walkerEarned,
      current: walkerEarned ? 20 : cities,
      target: 20,
      earnedOn: walkerEarned ? "Jun 2025" : undefined,
    },
    {
      id: "saved-ten",
      label: "Saved ten",
      detail: "Keep ten places on the wishlist",
      hint:
        wishlist.length >= 10
          ? "The list is long enough to plan from."
          : `${10 - wishlist.length} more save${10 - wishlist.length === 1 ? "" : "s"} and this is yours.`,
      image: medal(savedEarned, "/identity/medal-silver.svg", empty),
      seal: "/identity/seals/earned-3.png",
      earned: savedEarned,
      current: Math.min(wishlist.length, 10),
      target: 10,
    },
    {
      id: "knows-the-nos",
      label: "Knows the nos",
      detail: "Rule out five places you will not go",
      hint: nosEarned
        ? "Discovery already stays off these."
        : `${Math.max(0, 5 - avoids.length)} more and the recommender can skip them.`,
      image: medal(nosEarned, "/identity/medal-silver.svg", empty),
      seal: "/identity/seals/earned-4.png",
      earned: nosEarned,
      current: Math.min(avoids.length, 5),
      target: 5,
      earnedOn: nosEarned ? "Aug 2025" : undefined,
    },
    {
      id: "night-trains",
      label: "Night trains",
      detail: "Take an overnight train",
      hint: "Put a sleeper on any trip. One night in motion is enough.",
      image: medal(trainsEarned, trains?.image ?? "/identity/medal-gold.svg", empty),
      seal: "/identity/seals/earned-2.png",
      earned: trainsEarned,
      current: trainsEarned ? 1 : 0,
      target: 1,
    },
    {
      id: "hundred-places",
      label: "Hundred places",
      detail: "Log a hundred stops",
      hint: `${cities} of 100 cities on the footprint. This one is a long game.`,
      image: medal(hundredEarned, hundred?.image ?? "/identity/medal-gold.svg", empty),
      seal: "/identity/seals/earned-1.png",
      earned: hundredEarned,
      current: Math.min(cities, 100),
      target: 100,
    },
  ];
}

export function nextPrize(prizes: Prize[]): Prize | null {
  const open = prizes.filter((prize) => !prize.earned);
  if (open.length === 0) return null;
  return [...open].sort(
    (a, b) => b.current / b.target - a.current / a.target || a.target - b.target,
  )[0];
}

export function prizeProgress(prize: Prize): number {
  if (prize.target <= 0) return prize.earned ? 100 : 0;
  return Math.min(100, Math.round((prize.current / prize.target) * 100));
}

/** Level, ring fill, and the next seal — used on the identity mark and the board. */
export function prizeProgressSummary(
  badges: TravelBadge[],
  visited: VisitedLocation[],
  wishlist: WishlistPlace[],
  avoids: AvoidPlace[],
) {
  const prizes = prizeCollection(badges, visited, wishlist, avoids);
  const earned = prizes.filter((prize) => prize.earned);
  const next = nextPrize(prizes);
  return {
    prizes,
    earned,
    next,
    level: earned.length,
    ringPct: next ? prizeProgress(next) : 100,
  };
}

/**
 * Perks on the board once Rewards is filled.
 *
 * These are Intripid's version of the Gokollab gift cards: things the
 * product can actually do, not a mystery box of merch.
 */
export const BOARD_REWARDS: { id: string; title: string; body: string }[] = [
  {
    id: "early-cities",
    title: "Early look at seasonal cities",
    body: "See new Discovery cities a day before they rotate onto the board.",
  },
  {
    id: "open-slot",
    title: "A surprise half-day",
    body: "We’ll drop a curated run of stops into an open slot on your next trip.",
  },
  {
    id: "advisor-hour",
    title: "Advisor on a sticky day",
    body: "A travel advisor takes one conflicted afternoon and proposes a fix.",
  },
];
