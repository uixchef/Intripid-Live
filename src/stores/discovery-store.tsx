"use client";

import { format } from "date-fns";
import { createStore } from "zustand/vanilla";

import { DESTINATIONS } from "@/data/destinations";
import { recommend, resolvedDates, tripNights } from "@/lib/discovery/scoring";
import type {
  BudgetTier,
  DateMode,
  DiscoveryPreferences,
  IncomeBand,
  Interest,
  Origin,
  Recommendation,
  RecommendationSet,
  TripScope,
  TripStyle,
  WeekendShape,
} from "@/lib/types";

import { createStoreContext } from "./create-store-context";

/**
 * Destination Discovery state.
 *
 * Six questions, in the original product's order, each one labelled as a
 * FILTER (it narrows the field) or a RANK (it orders it). Three of them carry
 * clarifying sub-steps that the previous build had dropped:
 *
 *   dates       → weekend shape, or month + nights when flexible
 *   origin      → confirm the pin on the map before we trust it
 *   budget      → optional, once-per-session income normalisation
 *
 * The premise never moves: the product does not ask where you want to go.
 * Destination is an output.
 */

export type DiscoveryStep =
  | "dates"
  | "scope"
  | "origin"
  | "budget"
  | "experiences"
  | "activities";

export const DISCOVERY_STEPS: readonly DiscoveryStep[] = [
  "dates",
  "scope",
  "origin",
  "budget",
  "experiences",
  "activities",
] as const;

/** Whether answering this question eliminates candidates or merely orders them. */
export const STEP_KIND: Record<DiscoveryStep, "filter" | "rank"> = {
  dates: "filter",
  scope: "filter",
  origin: "filter",
  budget: "filter",
  experiences: "filter",
  activities: "rank",
};

export const STEP_LABEL: Record<DiscoveryStep, string> = {
  dates: "Dates",
  scope: "How far",
  origin: "Origin",
  budget: "Budget",
  experiences: "Must-haves",
  activities: "Activities",
};

export type DiscoveryStage = "intro" | "questions" | "processing" | "results";

/** Sub-step within the current question, when one applies. */
export type DiscoverySubStep = null | "weekend-shape" | "confirm-origin" | "income";

/** Enough signal to show a real answer. */
const MIN_STEPS_BEFORE_RESULTS = 2;

export const ORIGIN_OPTIONS: (Origin & { label?: string })[] = [
  { label: "Home", city: "London", country: "United Kingdom", countryCode: "GB", coords: { lng: -0.1276, lat: 51.5072 } },
  { city: "San Francisco", country: "United States", countryCode: "US", coords: { lng: -122.4194, lat: 37.7749 } },
  { city: "Chicago", country: "United States", countryCode: "US", coords: { lng: -87.6298, lat: 41.8781 } },
  { city: "Berlin", country: "Germany", countryCode: "DE", coords: { lng: 13.405, lat: 52.52 } },
  { city: "Toronto", country: "Canada", countryCode: "CA", coords: { lng: -79.3832, lat: 43.6532 } },
  { city: "Singapore", country: "Singapore", countryCode: "SG", coords: { lng: 103.8198, lat: 1.3521 } },
  { city: "Mumbai", country: "India", countryCode: "IN", coords: { lng: 72.8777, lat: 19.076 } },
  { city: "Sydney", country: "Australia", countryCode: "AU", coords: { lng: 151.2093, lat: -33.8688 } },
];

/**
 * Fixed defaults rather than relative-to-today, so the seeded experience is
 * deterministic and lines up with the April NYC trip.
 */
const DEFAULT_START = "2026-04-14";
const DEFAULT_END = "2026-04-18";
/** The next Friday, for the "this weekend" shortcut. */
const DEFAULT_WEEKEND_START = "2026-04-17";

function emptyPreferences(): DiscoveryPreferences {
  return {
    dateMode: "specific",
    startDate: DEFAULT_START,
    endDate: DEFAULT_END,
    weekendShape: "fri-sun",
    flexibleMonth: 3,
    flexibleNights: 5,
    origin: null,
    originConfirmed: false,
    scope: null,
    budget: null,
    incomeBand: null,
    styles: [],
    interests: [],
  };
}

export interface DiscoveryState {
  stage: DiscoveryStage;
  step: DiscoveryStep;
  subStep: DiscoverySubStep;
  answered: DiscoveryStep[];
  prefs: DiscoveryPreferences;
  result: RecommendationSet;
  /** Which of the top three is open in the detail surface. */
  activeId: string | null;
  hoveredId: string | null;
  /** How far through the narrated filter stages we are. */
  processingStage: number;
  /** Whether the income normaliser has already been offered this session. */
  incomeAsked: boolean;

  begin: () => void;
  goToStep: (step: DiscoveryStep) => void;
  next: () => void;
  back: () => void;
  setSubStep: (subStep: DiscoverySubStep) => void;

  setDateMode: (mode: DateMode) => void;
  setDates: (start: string | null, end: string | null) => void;
  setWeekendShape: (shape: WeekendShape) => void;
  setFlexible: (month: number, nights: number) => void;
  setScope: (scope: TripScope) => void;
  setOrigin: (origin: Origin) => void;
  confirmOrigin: () => void;
  reopenOrigin: () => void;
  setBudget: (budget: BudgetTier) => void;
  setIncomeBand: (band: IncomeBand | null) => void;
  toggleStyle: (style: TripStyle) => void;
  toggleInterest: (interest: Interest) => void;

  startProcessing: () => void;
  advanceProcessing: () => void;
  showResults: () => void;
  setActive: (id: string | null) => void;
  setHovered: (id: string | null) => void;
  reset: () => void;
}

function recomputeFrom(prefs: DiscoveryPreferences): RecommendationSet {
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
    subStep: null,
    answered: [],
    prefs,
    result: recomputeFrom(prefs),
    activeId: null,
    hoveredId: null,
    processingStage: 0,
    incomeAsked: false,

    begin: () => set({ stage: "questions", step: "dates", subStep: null }),

    goToStep: (step) => set({ stage: "questions", step, subStep: null }),

    setSubStep: (subStep) => set({ subStep }),

    next: () => {
      const state = get();
      const { step, subStep, prefs: p } = state;

      /*
       * Sub-steps are gates, not decoration. Origin in particular must end in
       * a map confirmation — origin accuracy silently determines every
       * recommendation, so it is never trusted untyped.
       */
      if (step === "dates" && subStep === null && p.dateMode === "weekend") {
        set({ subStep: "weekend-shape" });
        return;
      }
      if (step === "origin" && subStep === null && p.origin && !p.originConfirmed) {
        set({ subStep: "confirm-origin" });
        return;
      }
      if (
        step === "budget" &&
        subStep === null &&
        p.budget &&
        !state.incomeAsked
      ) {
        set({ subStep: "income", incomeAsked: true });
        return;
      }

      const index = DISCOVERY_STEPS.indexOf(step);
      const nextAnswered = markAnswered(state.answered, step);

      if (index >= DISCOVERY_STEPS.length - 1) {
        set({ answered: nextAnswered, subStep: null });
        get().startProcessing();
        return;
      }

      set({
        step: DISCOVERY_STEPS[index + 1],
        subStep: null,
        answered: nextAnswered,
      });
    },

    /** Back is never a lesser action — every step reverses cleanly. */
    back: () => {
      const { step, subStep, stage } = get();

      if (stage === "results") {
        set({ stage: "questions", step: "activities", subStep: null, activeId: null });
        return;
      }
      if (subStep !== null) {
        set({ subStep: null });
        return;
      }

      const index = DISCOVERY_STEPS.indexOf(step);
      if (index <= 0) {
        set({ stage: "intro" });
        return;
      }
      set({ step: DISCOVERY_STEPS[index - 1], subStep: null });
    },

    setDateMode: (dateMode) => {
      const current = get().prefs;
      const next: DiscoveryPreferences =
        dateMode === "weekend"
          ? { ...current, dateMode, startDate: DEFAULT_WEEKEND_START, endDate: null }
          : dateMode === "specific"
            ? {
                ...current,
                dateMode,
                startDate: current.startDate ?? DEFAULT_START,
                endDate: current.endDate ?? DEFAULT_END,
              }
            : { ...current, dateMode };

      set({ prefs: next, result: recomputeFrom(next) });
    },

    setDates: (startDate, endDate) => {
      const next = { ...get().prefs, startDate, endDate };
      set({ prefs: next, result: recomputeFrom(next) });
    },

    setWeekendShape: (weekendShape) => {
      const next = { ...get().prefs, weekendShape };
      set({ prefs: next, result: recomputeFrom(next) });
    },

    setFlexible: (flexibleMonth, flexibleNights) => {
      const next = { ...get().prefs, flexibleMonth, flexibleNights };
      set({ prefs: next, result: recomputeFrom(next) });
    },

    setScope: (scope) => {
      const next = { ...get().prefs, scope };
      set({ prefs: next, result: recomputeFrom(next) });
    },

    setOrigin: (origin) => {
      // A new origin invalidates the previous confirmation.
      const next = { ...get().prefs, origin, originConfirmed: false };
      set({ prefs: next, result: recomputeFrom(next) });
    },

    confirmOrigin: () => {
      const next = { ...get().prefs, originConfirmed: true };
      set({ prefs: next, subStep: null, result: recomputeFrom(next) });
      get().next();
    },

    reopenOrigin: () => {
      const next = { ...get().prefs, originConfirmed: false };
      set({ prefs: next, subStep: null, result: recomputeFrom(next) });
    },

    setBudget: (budget) => {
      const next = { ...get().prefs, budget };
      set({ prefs: next, result: recomputeFrom(next) });
    },

    setIncomeBand: (incomeBand) => {
      const next = { ...get().prefs, incomeBand };
      set({ prefs: next, result: recomputeFrom(next) });
    },

    toggleStyle: (style) => {
      const current = get().prefs;
      const styles = current.styles.includes(style)
        ? current.styles.filter((s) => s !== style)
        : [...current.styles, style];
      const next = { ...current, styles };
      set({ prefs: next, result: recomputeFrom(next) });
    },

    toggleInterest: (interest) => {
      const current = get().prefs;
      const interests = current.interests.includes(interest)
        ? current.interests.filter((i) => i !== interest)
        : [...current.interests, interest];
      const next = { ...current, interests };
      set({ prefs: next, result: recomputeFrom(next) });
    },

    startProcessing: () =>
      set({ stage: "processing", processingStage: 0, activeId: null }),

    advanceProcessing: () =>
      set((state) => ({ processingStage: state.processingStage + 1 })),

    /*
     * Land on the ranked three, not inside the winner. Seeing the set is what
     * makes the choice a choice.
     */
    showResults: () => {
      const { answered, step } = get();
      set({
        stage: "results",
        answered: markAnswered(answered, step),
        subStep: null,
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
        subStep: null,
        answered: [],
        prefs: fresh,
        result: recomputeFrom(fresh),
        activeId: null,
        hoveredId: null,
        processingStage: 0,
        incomeAsked: false,
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

export function canSkipToResults(state: DiscoveryState): boolean {
  return state.answered.length >= MIN_STEPS_BEFORE_RESULTS;
}

/** Survivors still in the running — what the map should be showing. */
export function survivingCount(state: DiscoveryState): number {
  return state.result.ranked.length;
}

export function activeRecommendation(
  state: DiscoveryState,
): Recommendation | null {
  if (!state.activeId) return null;
  return (
    state.result.ranked.find((r) => r.destination.id === state.activeId) ?? null
  );
}

/** A readable label for the chosen dates, used in summary chips. */
export function dateSummary(prefs: DiscoveryPreferences): string {
  if (prefs.dateMode === "weekend") {
    const dates = resolvedDates(prefs);
    if (!dates) return "This weekend";
    const start = new Date(`${dates.start}T00:00:00`);
    const end = new Date(`${dates.end}T00:00:00`);
    return `${format(start, "d")}–${format(end, "d MMM")}`;
  }

  if (prefs.dateMode === "flexible") {
    const month = new Date(2026, prefs.flexibleMonth, 1);
    return `${prefs.flexibleNights} nights in ${format(month, "MMMM")}`;
  }

  if (!prefs.startDate) return "Any time";
  const start = new Date(`${prefs.startDate}T00:00:00`);
  if (!prefs.endDate) return format(start, "d MMM");
  const end = new Date(`${prefs.endDate}T00:00:00`);
  return start.getMonth() === end.getMonth()
    ? `${format(start, "d")}–${format(end, "d MMM")}`
    : `${format(start, "d MMM")} – ${format(end, "d MMM")}`;
}

export { tripNights };
