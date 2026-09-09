import { differenceInCalendarDays, getMonth, parseISO } from "date-fns";

import { flightHours } from "@/lib/geo";
import type {
  Destination,
  DiscoveryPreferences,
  Interest,
  Recommendation,
  ScoreFactor,
  TripStyle,
} from "@/lib/types";

/**
 * The recommendation engine.
 *
 * Two product rules shape this, both inherited from the historical work:
 *
 *  1. It must produce useful results from PARTIAL input. Testing showed that
 *     long questionnaires create friction, so the product reduced its
 *     questions — which only works if scoring degrades gracefully. Factors
 *     the traveller hasn't spoken to are dropped and the remaining weights
 *     renormalise, rather than being scored as zero.
 *
 *  2. It must be able to EXPLAIN itself. Every factor returns its own score,
 *     weight and a human sentence, which is what the "Why here" surface reads.
 *     A score the product can't justify is worse than no score.
 */

/** Base influence of each factor when the traveller has expressed it. */
const BASE_WEIGHTS = {
  budget: 0.2,
  style: 0.26,
  interests: 0.24,
  season: 0.16,
  distance: 0.09,
  duration: 0.05,
} as const;

const STYLE_LABELS: Record<TripStyle, string> = {
  slow: "slow travel",
  adventure: "adventure",
  culture: "culture",
  food: "food",
  nightlife: "nightlife",
  nature: "nature",
  beach: "beaches",
  city: "city life",
};

const INTEREST_LABELS: Record<Interest, string> = {
  museums: "museums",
  architecture: "architecture",
  "live-music": "live music",
  markets: "markets",
  coffee: "coffee",
  "fine-dining": "fine dining",
  "street-food": "street food",
  hiking: "hiking",
  water: "water",
  shopping: "shopping",
  history: "history",
  nightlife: "nightlife",
};

const BUDGET_LABELS = {
  backpack: "Backpack",
  budget: "Budget",
  premium: "Premium",
  luxury: "Luxury",
} as const;

/** Formats a list the way a person would say it. */
function listPhrase(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** Mean of the values, or null when there is nothing to average. */
function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * The months a trip touches. Exact dates give the real months; flexible dates
 * widen to the surrounding season; a weekend is treated as its own month.
 */
function tripMonths(prefs: DiscoveryPreferences): number[] {
  if (!prefs.startDate) return [];

  const start = parseISO(prefs.startDate);
  const startMonth = getMonth(start);

  if (prefs.dateMode === "flexible") {
    // Flexible travellers can shift by a few weeks either way.
    return [(startMonth + 11) % 12, startMonth, (startMonth + 1) % 12];
  }

  const end = prefs.endDate ? parseISO(prefs.endDate) : start;
  const endMonth = getMonth(end);

  return startMonth === endMonth ? [startMonth] : [startMonth, endMonth];
}

/** Trip length in nights, or null when dates are unknown. */
export function tripNights(prefs: DiscoveryPreferences): number | null {
  if (!prefs.startDate || !prefs.endDate) return null;
  const nights = differenceInCalendarDays(
    parseISO(prefs.endDate),
    parseISO(prefs.startDate),
  );
  return nights > 0 ? nights : null;
}

/* -------------------------------------------------------------------------- */
/* Individual factors                                                        */
/* -------------------------------------------------------------------------- */

function budgetFactor(
  destination: Destination,
  prefs: DiscoveryPreferences,
): ScoreFactor | null {
  if (!prefs.budget) return null;

  const score = destination.budgetFit[prefs.budget];
  const perDay = destination.dailyBudgetUsd[prefs.budget];
  const tier = BUDGET_LABELS[prefs.budget];

  const detail =
    score >= 0.75
      ? `${tier} goes a long way here — around $${perDay} a day covers you comfortably.`
      : score >= 0.5
        ? `Workable on ${tier.toLowerCase()}, at roughly $${perDay} a day.`
        : `${tier} is tight here; expect about $${perDay} a day and some compromises.`;

  return {
    key: "budget",
    label: "Budget",
    score,
    weight: BASE_WEIGHTS.budget,
    detail,
  };
}

function styleFactor(
  destination: Destination,
  prefs: DiscoveryPreferences,
): ScoreFactor | null {
  if (prefs.styles.length === 0) return null;

  const scored = prefs.styles
    .map((style) => ({ style, score: destination.styleFit[style] }))
    .sort((a, b) => b.score - a.score);

  const score = mean(scored.map((s) => s.score)) ?? 0;
  const strong = scored.filter((s) => s.score >= 0.7).map((s) => STYLE_LABELS[s.style]);
  const weak = scored.filter((s) => s.score < 0.4).map((s) => STYLE_LABELS[s.style]);

  let detail: string;
  if (strong.length > 0 && weak.length > 0) {
    detail = `Strong on ${listPhrase(strong)}, though ${listPhrase(weak)} is not its strength.`;
  } else if (strong.length > 0) {
    detail = `Built for ${listPhrase(strong)}.`;
  } else if (weak.length > 0) {
    detail = `A stretch for ${listPhrase(weak)}.`;
  } else {
    detail = `A reasonable fit for the kind of trip you described.`;
  }

  return {
    key: "style",
    label: "Trip style",
    score,
    weight: BASE_WEIGHTS.style,
    detail,
  };
}

function interestsFactor(
  destination: Destination,
  prefs: DiscoveryPreferences,
): ScoreFactor | null {
  if (prefs.interests.length === 0) return null;

  const scored = prefs.interests
    .map((interest) => ({ interest, score: destination.interestFit[interest] }))
    .sort((a, b) => b.score - a.score);

  const score = mean(scored.map((s) => s.score)) ?? 0;
  const top = scored
    .filter((s) => s.score >= 0.7)
    .slice(0, 3)
    .map((s) => INTEREST_LABELS[s.interest]);

  const detail =
    top.length > 0
      ? `Delivers on ${listPhrase(top)}.`
      : `Covers your interests without excelling at any one of them.`;

  return {
    key: "interests",
    label: "Interests",
    score,
    weight: BASE_WEIGHTS.interests,
    detail,
  };
}

function seasonFactor(
  destination: Destination,
  prefs: DiscoveryPreferences,
): ScoreFactor | null {
  const months = tripMonths(prefs);
  if (months.length === 0) return null;

  const entries = months.map((m) => destination.season[m]).filter(Boolean);
  if (entries.length === 0) return null;

  // Flexible travellers get the best month in their window, not the average —
  // that is the whole point of being flexible.
  const score =
    prefs.dateMode === "flexible"
      ? Math.max(...entries.map((e) => e.score))
      : (mean(entries.map((e) => e.score)) ?? 0);

  const best = entries.reduce((a, b) => (b.score > a.score ? b : a));
  const detail =
    score >= 0.75
      ? `${best.label} at that time of year — highs around ${best.highC}°C.`
      : score >= 0.5
        ? `Decent weather then: ${best.label.toLowerCase()}, highs near ${best.highC}°C.`
        : `Not its best season — ${best.label.toLowerCase()}, highs near ${best.highC}°C.`;

  return {
    key: "season",
    label: "Season",
    score,
    weight: BASE_WEIGHTS.season,
    detail,
  };
}

function distanceFactor(
  destination: Destination,
  prefs: DiscoveryPreferences,
): ScoreFactor | null {
  if (!prefs.origin) return null;

  const sameCountry = destination.countryCode === prefs.origin.countryCode;
  const hours = flightHours(prefs.origin.coords, destination.coords);

  // Scope is a hard-ish preference: it filters intent, not just comfort.
  let scopeScore = 1;
  if (prefs.scope === "domestic" && !sameCountry) scopeScore = 0.08;
  if (prefs.scope === "international" && sameCountry) scopeScore = 0.12;

  // Beyond ~4h, distance starts costing real trip time.
  const reachScore = hours <= 4 ? 1 : Math.max(0.25, 1 - (hours - 4) / 18);
  const score = scopeScore * reachScore;

  const roundedHours = Math.round(hours * 10) / 10;
  let detail: string;
  if (prefs.scope === "domestic" && !sameCountry) {
    detail = `Outside ${prefs.origin.country}, which you asked to avoid.`;
  } else if (prefs.scope === "international" && sameCountry) {
    detail = `Still inside ${prefs.origin.country} — you wanted to leave.`;
  } else if (hours < 1) {
    detail = `Practically on your doorstep.`;
  } else {
    detail = `About ${roundedHours}h in the air from ${prefs.origin.city}.`;
  }

  return {
    key: "distance",
    label: "Getting there",
    score,
    weight: BASE_WEIGHTS.distance,
    detail,
  };
}

function durationFactor(
  destination: Destination,
  prefs: DiscoveryPreferences,
): ScoreFactor | null {
  const nights = tripNights(prefs);
  if (nights === null) return null;

  const [min, max] = destination.idealDays;
  let score = 1;
  if (nights < min) score = Math.max(0.3, nights / min);
  else if (nights > max) score = Math.max(0.55, 1 - (nights - max) / (max * 2));

  const detail =
    score >= 0.9
      ? `${nights} nights is about right for ${destination.name}.`
      : nights < min
        ? `Tight in ${nights} nights — ${min} is the realistic minimum.`
        : `You could see it in ${min}–${max} days; ${nights} leaves room to slow down.`;

  return {
    key: "duration",
    label: "Trip length",
    score,
    weight: BASE_WEIGHTS.duration,
    detail,
  };
}

/* -------------------------------------------------------------------------- */
/* Aggregate                                                                 */
/* -------------------------------------------------------------------------- */

/** How much of the preference space the traveller has actually filled in. */
export function preferenceCompleteness(prefs: DiscoveryPreferences): number {
  const signals = [
    prefs.startDate !== null,
    prefs.origin !== null,
    prefs.scope !== null,
    prefs.budget !== null,
    prefs.styles.length > 0,
    prefs.interests.length > 0,
  ];
  return signals.filter(Boolean).length / signals.length;
}

function scoreDestination(
  destination: Destination,
  prefs: DiscoveryPreferences,
): Omit<Recommendation, "rank"> {
  const factors = [
    budgetFactor(destination, prefs),
    styleFactor(destination, prefs),
    interestsFactor(destination, prefs),
    seasonFactor(destination, prefs),
    distanceFactor(destination, prefs),
    durationFactor(destination, prefs),
  ].filter((f): f is ScoreFactor => f !== null);

  // Renormalise so that partial input still spans the full 0..100 range.
  const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);
  const normalised = factors.map((f) => ({
    ...f,
    weight: totalWeight > 0 ? f.weight / totalWeight : 0,
  }));

  const raw = normalised.reduce((sum, f) => sum + f.score * f.weight, 0);

  // With no input at all, fall back to a neutral prior rather than zero.
  const score = totalWeight > 0 ? raw * 100 : 55;

  const matchedInterests = prefs.interests
    .map((interest) => ({ interest, score: destination.interestFit[interest] }))
    .filter((entry) => entry.score >= 0.6)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.interest);

  const nights = tripNights(prefs);
  const estimatedBudgetUsd =
    nights !== null && prefs.budget
      ? nights * destination.dailyBudgetUsd[prefs.budget]
      : null;

  return {
    destination,
    score: Math.round(score * 10) / 10,
    confidence: preferenceCompleteness(prefs),
    factors: normalised.sort((a, b) => b.weight - a.weight),
    matchedInterests,
    estimatedBudgetUsd,
  };
}

/**
 * Ranks every destination for the given preferences.
 *
 * Deterministic: equal scores break by destination id so the order never
 * flickers between renders.
 */
export function recommend(
  destinations: Destination[],
  prefs: DiscoveryPreferences,
): Recommendation[] {
  return destinations
    .map((destination) => scoreDestination(destination, prefs))
    .sort((a, b) => b.score - a.score || a.destination.id.localeCompare(b.destination.id))
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

/**
 * The single most useful thing to say about this match.
 *
 * Ranked by how far a factor departs from neutral, weighted by influence —
 * not by raw score. Sorting by score alone always surfaced the trip-style
 * factor, so every card in the list said "Built for city life and food" and
 * the ranking looked arbitrary. An opinionated factor ("Premium goes a long
 * way here", "Not its best season") differentiates; a bland one does not.
 */
export function leadReason(recommendation: Recommendation): string {
  const best = [...recommendation.factors]
    .filter((f) => f.score >= 0.55 || f.score <= 0.35)
    .sort(
      (a, b) =>
        Math.abs(b.score - 0.55) * (0.4 + b.weight) -
        Math.abs(a.score - 0.55) * (0.4 + a.weight),
    )[0];

  return best?.detail ?? recommendation.destination.blurb;
}

/** Coarse confidence banding, used for the label next to a score. */
export function confidenceLabel(confidence: number): "Low" | "Fair" | "High" {
  if (confidence >= 0.8) return "High";
  if (confidence >= 0.5) return "Fair";
  return "Low";
}
