"use client";

import { addDays, format } from "date-fns";
import { createStore } from "zustand/vanilla";

import { DESTINATIONS } from "@/data/destinations";
import { recommend } from "@/lib/discovery/scoring";
import type {
  BudgetTier,
  DateMode,
  DiscoveryPreferences,
  Interest,
  Origin,
  Recommendation,
  TripScope,
  TripStyle,
} from "@/lib/types";

import { createStoreContext } from "./create-store-context";

/**
 * Destination Discovery state.
 *
 * The historical product learned that too many questions created friction, so
 * this flow is deliberately short — five steps, two of which are optional —
 * and it recomputes recommendations after EVERY answer. The traveller can
 * bail out to results at any point from step two onward, which is what makes
 * the reduced question set honest rather than merely shorter.
 */

export type DiscoveryStep =
  | "dates"
  | "origin"
  | "budget"
  | "style"
  | "interests";

export const DISCOVERY_STEPS: readonly DiscoveryStep[] = [
  "dates",
  "origin",
  "budget",
  "style",
  "interests",
] as const;

export type DiscoveryStage = "intro" | "questions" | "processing" | "results";

/** Steps after which the traveller has enough signal to see useful results. */
const MIN_STEPS_BEFORE_RESULTS = 2;

export const ORIGIN_OPTIONS: Origin[] = [
  { city: "London", country: "United Kingdom", countryCode: "GB", coords: { lng: -0.1276, lat: 51.5072 } },
  { city: "San Francisco", country: "United States", countryCode: "US", coords: { lng: -122.4194, lat: 37.7749 } },
  { city: "Chicago", country: "United States", countryCode: "US", coords: { lng: -87.6298, lat: 41.8781 } },
  { city: "Berlin", country: "Germany", countryCode: "DE", coords: { lng: 13.405, lat: 52.52 } },
  { city: "Toronto", country: "Canada", countryCode: "CA", coords: { lng: -79.3832, lat: 43.6532 } },
  { city: "Singapore", country: "Singapore", countryCode: "SG", coords: { lng: 103.8198, lat: 1.3521 } },
  { city: "Mumbai", country: "India", countryCode: "IN", coords: { lng: 72.8777, lat: 19.076 } },
  { city: "Sydney", country: "Australia", countryCode: "AU", coords: { lng: 151.2093, lat: -33.8688 } },
];

/**
 * Default dates: a week-long trip starting a comfortable distance out. Fixed
 * rather than relative to "today" so the seeded experience is deterministic
 * and the NYC trip's April dates always line up.
 */
const DEFAULT_START = "2026-04-14";
const DEFAULT_END = "2026-04-18";

function emptyPreferences(): DiscoveryPreferences {
  return {
    dateMode: "exact",
    startDate: DEFAULT_START,
    endDate: DEFAULT_END,
    origin: null,
    scope: null,
    budget: null,
    styles: [],
    interests: [],
  };
}

export interface DiscoveryState {
  stage: DiscoveryStage;
  step: DiscoveryStep;
  /** Steps the traveller has answered, in order. Drives progress and escape. */
  answered: DiscoveryStep[];
  prefs: DiscoveryPreferences;
  recommendations: Recommendation[];
  /** Which recommendation is open in the detail surface. */
  activeId: string | null;
  /** Hover coupling between the map and the result list. */
  hoveredId: string | null;
  /** Narrated processing steps, revealed one at a time. */
  processingIndex: number;

  begin: () => void;
  goToStep: (step: DiscoveryStep) => void;
  next: () => void;
  back: () => void;
  setDateMode: (mode: DateMode) => void;
  setDates: (start: string | null, end: string | null) => void;
  setOrigin: (origin: Origin) => void;
  setScope: (scope: TripScope) => void;
  setBudget: (budget: BudgetTier) => void;
  toggleStyle: (style: TripStyle) => void;
  toggleInterest: (interest: Interest) => void;
  startProcessing: () => void;
  advanceProcessing: () => void;
  showResults: () => void;
  setActive: (id: string | null) => void;
  setHovered: (id: string | null) => void;
  reset: () => void;
}

function recomputeFrom(prefs: DiscoveryPreferences): Recommendation[] {
  return recommend(DESTINATIONS, prefs);
}

function markAnswered(
  answered: DiscoveryStep[],
  step: DiscoveryStep,
): DiscoveryStep[] {
  return answered.includes(step) ? answered : [...answered, step];
}

export function makeDiscoveryStore() {
  const prefs = emptyPreferences();

  return createStore<DiscoveryState>()((set, get) => ({
    stage: "intro",
    step: "dates",
    answered: [],
    prefs,
    recommendations: recomputeFrom(prefs),
    activeId: null,
    hoveredId: null,
    processingIndex: 0,

    begin: () => set({ stage: "questions", step: "dates" }),

    goToStep: (step) => set({ stage: "questions", step }),

    next: () => {
      const { step, answered } = get();
      const index = DISCOVERY_STEPS.indexOf(step);
      const nextAnswered = markAnswered(answered, step);

      if (index >= DISCOVERY_STEPS.length - 1) {
        set({ answered: nextAnswered });
        get().startProcessing();
        return;
      }

      set({ step: DISCOVERY_STEPS[index + 1], answered: nextAnswered });
    },

    back: () => {
      const { step, stage } = get();
      if (stage === "results") {
        set({ stage: "questions", step: "interests", activeId: null });
        return;
      }
      const index = DISCOVERY_STEPS.indexOf(step);
      if (index <= 0) {
        set({ stage: "intro" });
        return;
      }
      set({ step: DISCOVERY_STEPS[index - 1] });
    },

    setDateMode: (dateMode) => {
      const current = get().prefs;
      // "The Weekend" is a concrete shortcut, not just a mode: pick the next one.
      const next: DiscoveryPreferences =
        dateMode === "weekend"
          ? {
              ...current,
              dateMode,
              startDate: "2026-04-17",
              endDate: "2026-04-19",
            }
          : { ...current, dateMode };

      set({ prefs: next, recommendations: recomputeFrom(next) });
    },

    setDates: (startDate, endDate) => {
      const next = { ...get().prefs, startDate, endDate };
      set({ prefs: next, recommendations: recomputeFrom(next) });
    },

    setOrigin: (origin) => {
      const next = { ...get().prefs, origin };
      set({ prefs: next, recommendations: recomputeFrom(next) });
    },

    setScope: (scope) => {
      const next = { ...get().prefs, scope };
      set({ prefs: next, recommendations: recomputeFrom(next) });
    },

    setBudget: (budget) => {
      const next = { ...get().prefs, budget };
      set({ prefs: next, recommendations: recomputeFrom(next) });
    },

    toggleStyle: (style) => {
      const current = get().prefs;
      const styles = current.styles.includes(style)
        ? current.styles.filter((s) => s !== style)
        : [...current.styles, style];
      const next = { ...current, styles };
      set({ prefs: next, recommendations: recomputeFrom(next) });
    },

    toggleInterest: (interest) => {
      const current = get().prefs;
      const interests = current.interests.includes(interest)
        ? current.interests.filter((i) => i !== interest)
        : [...current.interests, interest];
      const next = { ...current, interests };
      set({ prefs: next, recommendations: recomputeFrom(next) });
    },

    startProcessing: () =>
      set({ stage: "processing", processingIndex: 0, activeId: null }),

    advanceProcessing: () =>
      set((state) => ({ processingIndex: state.processingIndex + 1 })),

    showResults: () => {
      const { answered, step } = get();
      /*
       * Deliberately does NOT open the top result. Landing straight in the
       * winner's brief hides the fact that there was a ranked field at all,
       * and the comparison is the product.
       */
      set({
        stage: "results",
        answered: markAnswered(answered, step),
        activeId: null,
      });
    },

    setActive: (activeId) => set({ activeId }),
    setHovered: (hoveredId) => set({ hoveredId }),

    reset: () => {
      const fresh = emptyPreferences();
      set({
        stage: "intro",
        step: "dates",
        answered: [],
        prefs: fresh,
        recommendations: recomputeFrom(fresh),
        activeId: null,
        hoveredId: null,
        processingIndex: 0,
      });
    },
  }));
}

const context = createStoreContext<DiscoveryState>("DiscoveryStore");

export function DiscoveryStoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <context.Provider createStore={makeDiscoveryStore}>
      {children}
    </context.Provider>
  );
}

export const useDiscovery = context.useStoreSelector;
export const useDiscoveryApi = context.useStoreApi;

/* -------------------------------------------------------------------------- */
/* Selectors                                                                 */
/* -------------------------------------------------------------------------- */

/** Whether the traveller has answered enough to jump straight to results. */
export function canSkipToResults(state: DiscoveryState): boolean {
  return state.answered.length >= MIN_STEPS_BEFORE_RESULTS;
}

/** How strongly the current results are supported, as a 0..1 fraction. */
export function answeredFraction(state: DiscoveryState): number {
  return state.answered.length / DISCOVERY_STEPS.length;
}

/** Destinations scoring well enough to be worth showing, for the live count. */
export function strongMatchCount(state: DiscoveryState): number {
  return state.recommendations.filter((r) => r.score >= 60).length;
}

export function activeRecommendation(
  state: DiscoveryState,
): Recommendation | null {
  if (!state.activeId) return null;
  return (
    state.recommendations.find((r) => r.destination.id === state.activeId) ??
    null
  );
}

/** A readable label for the chosen dates, used in summary chips. */
export function dateSummary(prefs: DiscoveryPreferences): string {
  if (!prefs.startDate) return "Any time";
  const start = new Date(`${prefs.startDate}T00:00:00`);
  if (!prefs.endDate) return format(start, "d MMM");
  const end = new Date(`${prefs.endDate}T00:00:00`);
  const sameMonth = start.getMonth() === end.getMonth();
  const suffix = prefs.dateMode === "flexible" ? " · flexible" : "";
  return sameMonth
    ? `${format(start, "d")}–${format(end, "d MMM")}${suffix}`
    : `${format(start, "d MMM")} – ${format(end, "d MMM")}${suffix}`;
}

/** Default end date when the traveller picks only a start. */
export function defaultEndFor(start: string): string {
  return format(addDays(new Date(`${start}T00:00:00`), 4), "yyyy-MM-dd");
}
