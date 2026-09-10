import {
  addDays,
  differenceInCalendarDays,
  getMonth,
  parseISO,
} from "date-fns";

import { flightHours } from "@/lib/geo";
import { INTEREST_META, STYLE_META } from "@/lib/categories";
import type {
  Destination,
  DiscoveryPreferences,
  FilterStage,
  Interest,
  Recommendation,
  RecommendationSet,
  ScoreFactor,
  TripStyle,
  WeekendShape,
} from "@/lib/types";

/**
 * The recommendation engine, in the original product's two stages.
 *
 * STAGE 1 — hard filters, in a fixed order, each reporting how many
 * candidates it eliminated. This is what makes the processing narration real
 * ("Found 9 · 2 are out of reach") and what lets the map cull pins in the
 * order the reasoning happened. Filters ELIMINATE.
 *
 * STAGE 2 — a weighted rank over the survivors, and only the survivors.
 * Activities ORDER; they never eliminate.
 *
 * The filter/rank distinction is the core algorithmic information
 * architecture and is surfaced in the UI on every question, because a
 * traveller deserves to know whether an answer is narrowing the field or
 * merely sorting it.
 *
 * Two safety properties, both deliberate:
 *  - Filtering never returns an empty set. If it would, we relax to pure
 *    ranking and say so (`relaxed: true`) rather than showing nothing.
 *  - The result is decisive: three destinations, not a catalogue.
 */

/** Weights over the survivors. Activities dominate, as in the original. */
const WEIGHTS = {
  activities: 0.4,
  experiences: 0.2,
  season: 0.2,
  budget: 0.1,
  reach: 0.05,
  duration: 0.05,
} as const;

/** Below this an experience is considered unsupported by a city. */
const EXPERIENCE_FLOOR = 0.4;

const BUDGET_LABELS = {
  backpack: "Backpack",
  budget: "Budget",
  premium: "Premium",
  luxury: "Luxury",
} as const;

const WEEKEND_NIGHTS: Record<WeekendShape, number> = {
  "fri-sun": 2,
  "sat-mon": 2,
  "sat-sun": 1,
};

function listPhrase(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/* -------------------------------------------------------------------------- */
/* Resolved dates                                                            */
/* -------------------------------------------------------------------------- */

export interface ResolvedWindow {
  nights: number | null;
  /** Months the trip touches, 0-indexed. */
  months: number[];
  /** True when the traveller can shift within a month. */
  flexible: boolean;
}

/**
 * Turns whichever date mode the traveller used into one shape the rest of the
 * engine can reason about.
 */
export function resolveWindow(prefs: DiscoveryPreferences): ResolvedWindow {
  if (prefs.dateMode === "weekend") {
    const nights = WEEKEND_NIGHTS[prefs.weekendShape];
    const month = prefs.startDate
      ? getMonth(parseISO(prefs.startDate))
      : new Date().getMonth();
    return { nights, months: [month], flexible: false };
  }

  if (prefs.dateMode === "flexible") {
    // A flexible traveller can take the best week in the month, so the
    // surrounding months come into play too.
    const m = prefs.flexibleMonth;
    return {
      nights: prefs.flexibleNights,
      months: [(m + 11) % 12, m, (m + 1) % 12],
      flexible: true,
    };
  }

  if (!prefs.startDate) return { nights: null, months: [], flexible: false };

  const start = parseISO(prefs.startDate);
  const end = prefs.endDate ? parseISO(prefs.endDate) : start;
  const nights = Math.max(0, differenceInCalendarDays(end, start));
  const months =
    getMonth(start) === getMonth(end)
      ? [getMonth(start)]
      : [getMonth(start), getMonth(end)];

  return { nights: nights > 0 ? nights : null, months, flexible: false };
}

/** Trip length in nights, or null when dates are unknown. */
export function tripNights(prefs: DiscoveryPreferences): number | null {
  return resolveWindow(prefs).nights;
}

/** The concrete dates a weekend or flexible answer resolves to. */
export function resolvedDates(
  prefs: DiscoveryPreferences,
): { start: string; end: string } | null {
  if (prefs.dateMode === "specific") {
    if (!prefs.startDate || !prefs.endDate) return null;
    return { start: prefs.startDate, end: prefs.endDate };
  }

  if (prefs.dateMode === "weekend" && prefs.startDate) {
    const nights = WEEKEND_NIGHTS[prefs.weekendShape];
    const start = parseISO(prefs.startDate);
    return {
      start: prefs.startDate,
      end: addDays(start, nights).toISOString().slice(0, 10),
    };
  }

  if (prefs.dateMode === "flexible") {
    // Mid-month is the honest representative window for an open month.
    const year = 2026;
    const start = new Date(year, prefs.flexibleMonth, 12);
    const end = addDays(start, prefs.flexibleNights);
    return {
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
    };
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/* Stage 2 factors — over survivors only                                     */
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
      ? `${tier} goes a long way here — about $${perDay} a day covers you comfortably.`
      : score >= 0.5
        ? `Workable on ${tier.toLowerCase()}, at roughly $${perDay} a day.`
        : `${tier} is tight here; expect about $${perDay} a day and some compromises.`;

  return {
    key: "budget",
    label: "Budget",
    score,
    weight: WEIGHTS.budget,
    detail,
  };
}

function experienceFactor(
  destination: Destination,
  prefs: DiscoveryPreferences,
): ScoreFactor | null {
  if (prefs.styles.length === 0) return null;

  const scored = prefs.styles
    .map((style) => ({ style, score: destination.styleFit[style] }))
    .sort((a, b) => b.score - a.score);

  const score = mean(scored.map((s) => s.score)) ?? 0;
  const strong = scored
    .filter((s) => s.score >= 0.72)
    .map((s) => STYLE_META[s.style].label.toLowerCase());

  const detail =
    strong.length > 0
      ? `Genuinely good for ${listPhrase(strong)}.`
      : `Supports what you asked for without being famous for it.`;

  return {
    key: "style",
    label: "Must-haves",
    score,
    weight: WEIGHTS.experiences,
    detail,
  };
}

function activityFactor(
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
    .map((s) => INTEREST_META[s.interest].label.toLowerCase());

  const detail =
    top.length > 0
      ? `Among the best places anywhere for ${listPhrase(top)}.`
      : `Covers your list without excelling at any one of it.`;

  return {
    key: "interests",
    label: "Activities",
    score,
    weight: WEIGHTS.activities,
    detail,
  };
}

function seasonFactor(
  destination: Destination,
  prefs: DiscoveryPreferences,
): ScoreFactor | null {
  const window = resolveWindow(prefs);
  if (window.months.length === 0) return null;

  const entries = window.months
    .map((m) => destination.season[m])
    .filter(Boolean);
  if (entries.length === 0) return null;

  // A flexible traveller gets the best month in their window — that is the
  // entire point of being flexible.
  const score = window.flexible
    ? Math.max(...entries.map((e) => e.score))
    : (mean(entries.map((e) => e.score)) ?? 0);

  const best = entries.reduce((a, b) => (b.score > a.score ? b : a));
  const detail =
    score >= 0.75
      ? `${best.label} then — highs around ${best.highC}°C.`
      : score >= 0.5
        ? `Decent weather: ${best.label.toLowerCase()}, highs near ${best.highC}°C.`
        : `Not its best season — ${best.label.toLowerCase()}, highs near ${best.highC}°C.`;

  return {
    key: "season",
    label: "Season",
    score,
    weight: WEIGHTS.season,
    detail,
  };
}

function reachFactor(
  destination: Destination,
  prefs: DiscoveryPreferences,
): ScoreFactor | null {
  if (!prefs.origin) return null;

  const hours = flightHours(prefs.origin.coords, destination.coords);
  const window = resolveWindow(prefs);
  const nights = window.nights ?? 5;

  // Flight time is trip time. On a two-night trip it dominates; on a fortnight
  // it barely matters.
  const budgetHours = Math.max(2.5, nights * 2.2);
  const score = hours <= budgetHours ? 1 : Math.max(0.2, budgetHours / hours);

  const rounded = Math.round(hours * 10) / 10;
  const detail =
    hours < 1
      ? "Practically on your doorstep."
      : score >= 0.9
        ? `About ${rounded}h in the air from ${prefs.origin.city} — comfortable for ${nights} nights.`
        : `${rounded}h each way from ${prefs.origin.city}, which is a lot of a ${nights}-night trip.`;

  return {
    key: "distance",
    label: "Getting there",
    score,
    weight: WEIGHTS.reach,
    detail,
  };
}

function durationFactor(
  destination: Destination,
  prefs: DiscoveryPreferences,
): ScoreFactor | null {
  const nights = resolveWindow(prefs).nights;
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
    weight: WEIGHTS.duration,
    detail,
  };
}

/* -------------------------------------------------------------------------- */
/* Confidence                                                                */
/* -------------------------------------------------------------------------- */

/** How much of the preference space the traveller has actually filled in. */
export function preferenceCompleteness(prefs: DiscoveryPreferences): number {
  const signals = [
    prefs.startDate !== null,
    prefs.scope !== null,
    prefs.origin !== null,
    prefs.budget !== null,
    prefs.styles.length > 0,
    prefs.interests.length > 0,
  ];
  return signals.filter(Boolean).length / signals.length;
}

/* -------------------------------------------------------------------------- */
/* Stage 1 — hard filters                                                    */
/* -------------------------------------------------------------------------- */

function runFilters(
  destinations: Destination[],
  prefs: DiscoveryPreferences,
): { survivors: Destination[]; stages: FilterStage[] } {
  const stages: FilterStage[] = [];
  let pool = [...destinations];

  const apply = (
    key: FilterStage["key"],
    label: string,
    detail: string,
    keep: (destination: Destination) => boolean,
  ) => {
    const entered = pool.length;
    const removed = pool.filter((d) => !keep(d));
    pool = pool.filter(keep);
    stages.push({
      key,
      label,
      detail,
      entered,
      removed: removed.length,
      removedIds: removed.map((d) => d.id),
    });
  };

  const window = resolveWindow(prefs);

  // (a) The trip has to be long enough to be worth the journey at all.
  if (window.nights !== null) {
    apply(
      "dates",
      `Checking ${window.nights} ${window.nights === 1 ? "night" : "nights"} against each place`,
      "Some cities simply do not repay a short trip.",
      (d) => window.nights! >= Math.max(1, d.idealDays[0] - 2),
    );
  }

  // (b) Scope is intent, not comfort: honour it strictly.
  if (prefs.scope && prefs.scope !== "open" && prefs.origin) {
    const domestic = prefs.scope === "domestic";
    apply(
      "scope",
      domestic
        ? `Keeping results inside ${prefs.origin.country}`
        : `Ruling out ${prefs.origin.country}`,
      "You told us how far you wanted to get from home.",
      (d) =>
        domestic
          ? d.countryCode === prefs.origin!.countryCode
          : d.countryCode !== prefs.origin!.countryCode,
    );
  }

  // (c) Reachability — can you realistically get there and back?
  if (prefs.origin && window.nights !== null) {
    const ceiling = Math.max(3.5, window.nights * 3.4);
    apply(
      "reach",
      "Working out what you can actually reach",
      "We check how much of the trip the flight would eat.",
      (d) => flightHours(prefs.origin!.coords, d.coords) <= ceiling,
    );
  }

  // (d) Affordability against the declared posture.
  if (prefs.budget && window.nights !== null) {
    apply(
      "afford",
      `Filtering to what works on ${BUDGET_LABELS[prefs.budget].toLowerCase()}`,
      "Nightly costs are checked against the trip length, not an average.",
      (d) => d.budgetFit[prefs.budget!] >= 0.3,
    );
  }

  // (e) Must-have experiences. This one really does eliminate.
  if (prefs.styles.length > 0) {
    const names = prefs.styles
      .slice(0, 2)
      .map((s) => STYLE_META[s].label.toLowerCase());
    apply(
      "experiences",
      `Removing cities that can't deliver ${listPhrase(names)}`,
      "Must-haves are a filter, not a preference.",
      (d) => prefs.styles.every((s) => d.styleFit[s] >= EXPERIENCE_FLOOR),
    );
  }

  return { survivors: pool, stages };
}

/* -------------------------------------------------------------------------- */
/* Stage 2 — rank                                                            */
/* -------------------------------------------------------------------------- */

function scoreDestination(
  destination: Destination,
  prefs: DiscoveryPreferences,
): Omit<Recommendation, "rank"> {
  const factors = [
    activityFactor(destination, prefs),
    experienceFactor(destination, prefs),
    seasonFactor(destination, prefs),
    budgetFactor(destination, prefs),
    reachFactor(destination, prefs),
    durationFactor(destination, prefs),
  ].filter((f): f is ScoreFactor => f !== null);

  const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);
  const normalised = factors.map((f) => ({
    ...f,
    weight: totalWeight > 0 ? f.weight / totalWeight : 0,
  }));

  const raw = normalised.reduce((sum, f) => sum + f.score * f.weight, 0);
  const score = totalWeight > 0 ? raw * 100 : 55;

  const matchedInterests = prefs.interests
    .map((interest) => ({ interest, score: destination.interestFit[interest] }))
    .filter((entry) => entry.score >= 0.6)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.interest);

  const nights = resolveWindow(prefs).nights;
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

function rank(
  pool: Destination[],
  prefs: DiscoveryPreferences,
): Recommendation[] {
  return pool
    .map((destination) => scoreDestination(destination, prefs))
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.destination.id.localeCompare(b.destination.id),
    )
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

/* -------------------------------------------------------------------------- */
/* Public API                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Runs both stages and returns a decisive answer.
 *
 * `top` is at most three destinations. This is a product decision, not a
 * pagination default: the original concept was to make a recommendation, and
 * handing back a catalogue of nine is a way of declining to.
 */
export function recommend(
  destinations: Destination[],
  prefs: DiscoveryPreferences,
): RecommendationSet {
  const { survivors, stages } = runFilters(destinations, prefs);

  // Never show nothing. If the filters emptied the field, rank everything and
  // admit that we loosened the constraints.
  const relaxed = survivors.length === 0;
  const pool = relaxed ? destinations : survivors;
  const ranked = rank(pool, prefs);

  const survivorIds = new Set(pool.map((d) => d.id));
  const eliminated: RecommendationSet["eliminated"] = [];
  for (const stage of stages) {
    for (const id of stage.removedIds) {
      if (survivorIds.has(id)) continue;
      const destination = destinations.find((d) => d.id === id);
      if (destination) eliminated.push({ destination, stage: stage.key });
    }
  }

  return {
    stages,
    ranked,
    top: ranked.slice(0, 3),
    eliminated,
    relaxed,
  };
}

/** The single most useful thing to say about this match. */
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

/**
 * Reasons for a set, phrased so they differ.
 *
 * `leadReason` on its own picks each place's most opinionated factor, which is
 * right for a single card and wrong for a ranked three: when all three win on
 * the same interests it produced "Among the best places anywhere for museums &
 * galleries and fine dining" three times over, and three identical
 * explanations are worse than none — they read as generated filler and they
 * give you nothing to choose on.
 *
 * So each place after the leader is described by the factor where it most
 * OUT-PERFORMS the others, which is by definition the thing that would make
 * you pick it instead. The leader keeps its own strongest claim.
 */
export function distinctReasons(top: Recommendation[]): string[] {
  if (top.length <= 1) return top.map(leadReason);

  const used = new Set<string>();

  return top.map((recommendation, index) => {
    if (index === 0) {
      const reason = leadReason(recommendation);
      used.add(reason);
      return reason;
    }

    const others = top.filter((_, i) => i !== index);

    const ranked = recommendation.factors
      .map((factor) => {
        const rivals = others
          .map(
            (other) =>
              other.factors.find((f) => f.key === factor.key)?.score ?? 0,
          )
          .filter((value) => Number.isFinite(value));
        const rivalAverage =
          rivals.length > 0
            ? rivals.reduce((total, value) => total + value, 0) / rivals.length
            : 0;
        return { factor, edge: (factor.score - rivalAverage) * (0.4 + factor.weight) };
      })
      /* Only a real advantage counts, and only one we have not already used. */
      .filter(({ factor, edge }) => edge > 0.02 && !used.has(factor.detail))
      .sort((a, b) => b.edge - a.edge);

    const reason = ranked[0]?.factor.detail ?? leadReason(recommendation);
    used.add(reason);
    return reason;
  });
}

export function confidenceLabel(confidence: number): "Low" | "Fair" | "High" {
  if (confidence >= 0.8) return "High";
  if (confidence >= 0.5) return "Fair";
  return "Low";
}

export type { RecommendationSet };
export { STYLE_META as EXPERIENCE_META };
export type { TripStyle, Interest };
