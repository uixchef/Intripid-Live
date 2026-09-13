"use client";

import { format } from "date-fns";
import { createStore } from "zustand/vanilla";

import { DESTINATIONS } from "@/data/destinations";
import {
  coerceFlexibleWindow,
  recommend,
  resolvedDates,
  tripNights,
} from "@/lib/discovery/scoring";
import type {
  BudgetTier,
  DateMode,
  DiscoveryPreferences,
  IncomeBand,
  Interest,
  Origin,
  PopulatedPref,
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
 *   dates       → weekend shape, or month + nights when flexible
 *   scope       → home country, abroad, or no preference
 *   origin      → confirm home, then one nearby departure port
 *   budget      → then income, then destination ports and cities
 *   experiences / activities → live filters, then the three results
 *
 * The premise never moves: the product does not ask where you want to go.
 * Destination is an output.
 */

export type DiscoveryStep =
  | "dates"
  | "origin"
  | "scope"
  | "budget"
  | "populated"
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
  origin: "filter",
  scope: "filter",
  budget: "filter",
  populated: "rank",
  experiences: "filter",
  activities: "filter",
};

export const STEP_LABEL: Record<DiscoveryStep, string> = {
  dates: "Dates",
  origin: "Origin",
  scope: "How far",
  budget: "Budget",
  populated: "Scale",
  experiences: "Must-haves",
  activities: "Activities",
};

export type DiscoveryStage = "intro" | "questions" | "processing" | "results";

/** Sub-step within the current question, when one applies. */
export type DiscoverySubStep =
  | null
  | "weekend-shape"
  | "add-origin"
  | "confirm-origin"
  | "ports-hunt"
  | "dest-hunt"
  | "income";

/** Enough signal to show a real answer. */
const MIN_STEPS_BEFORE_RESULTS = 2;

/**
 * Fixed defaults rather than relative-to-today, so the seeded experience is
 * deterministic and lines up with the April NYC trip.
 */
const DEFAULT_START = "2026-04-14";
const DEFAULT_END = "2026-04-18";
/** The next Friday, for the "this weekend" shortcut. */
const DEFAULT_WEEKEND_START = "2026-04-17";

function emptyPreferences(): DiscoveryPreferences {
  const flexible = coerceFlexibleWindow(3);
  return {
    dateMode: "specific",
    startDate: DEFAULT_START,
    endDate: DEFAULT_END,
    weekendShape: "fri-sun",
    flexibleMonth: flexible.flexibleMonth,
    flexibleYear: flexible.flexibleYear,
    flexibleNights: 5,
    origin: null,
    originConfirmed: false,
    scope: null,
    budget: null,
    populated: null,
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
  /** Confetti once, on the first card of a result reveal. */
  celebrateOpening: boolean;
  /** How far through the narrated filter stages we are. */
  processingStage: number;
  /** Beat in the post-income destination hunt (0 = ports, 1 = cities). */
  portsHuntBeat: number;
  /** True after the 5s departure-port search. */
  portsFound: boolean;
  /** True after destination ports and cities have been placed. */
  destinationsFound: boolean;
  /** Whether the income normaliser has already been offered this session. */
  incomeAsked: boolean;
  /** True while GPS or address lookup is in flight on the add-origin form. */
  originBusy: boolean;

  begin: () => void;
  goToStep: (step: DiscoveryStep) => void;
  next: () => void;
  back: () => void;
  setSubStep: (subStep: DiscoverySubStep) => void;

  setDateMode: (mode: DateMode) => void;
  setDates: (start: string | null, end: string | null) => void;
  setWeekendShape: (shape: WeekendShape) => void;
    setFlexible: (month: number, nights: number, year: number) => void;
  setScope: (scope: TripScope) => void;
  setOrigin: (origin: Origin) => void;
  confirmOrigin: () => void;
  proposeOrigin: (origin: Origin) => void;
  reopenOrigin: () => void;
  setOriginBusy: (busy: boolean) => void;
  setBudget: (budget: BudgetTier) => void;
  setPopulated: (populated: PopulatedPref) => void;
  setIncomeBand: (band: IncomeBand | null) => void;
  toggleStyle: (style: TripStyle) => void;
  toggleInterest: (interest: Interest) => void;

  startProcessing: () => void;
  advanceProcessing: () => void;
  advancePortsHunt: () => void;
  finishPortsHunt: () => void;
  finishDestHunt: () => void;
  showResults: () => void;
  clearCelebrate: () => void;
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

export function makeDiscoveryStore(dates?: {
  startDate?: string;
  endDate?: string;
}) {
  const prefs = emptyPreferences();
  if (
    dates?.startDate &&
    dates.endDate &&
    dates.endDate >= dates.startDate
  ) {
    prefs.dateMode = "specific";
    prefs.startDate = dates.startDate;
    prefs.endDate = dates.endDate;
  }

  return createStore<DiscoveryState>()((set, get) => ({
    stage: "intro",
    step: "dates",
    subStep: null,
    answered: [],
    prefs,
    result: recomputeFrom(prefs),
    activeId: null,
    hoveredId: null,
    celebrateOpening: false,
    processingStage: 0,
    portsHuntBeat: 0,
    portsFound: false,
    destinationsFound: false,
    incomeAsked: false,
    originBusy: false,

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
      if (step === "origin" && subStep === "ports-hunt") {
        get().finishPortsHunt();
        return;
      }
      if (step === "budget" && subStep === "dest-hunt") {
        get().finishDestHunt();
        return;
      }
      if (step === "origin" && subStep === "add-origin") {
        return;
      }
      if (step === "origin" && subStep === "confirm-origin") {
        const confirmed = { ...p, originConfirmed: true };
        set({
          prefs: confirmed,
          subStep: "ports-hunt",
          portsHuntBeat: 0,
          portsFound: false,
          destinationsFound: false,
          result: recomputeFrom(confirmed),
        });
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
      if (
        step === "budget" &&
        (subStep === "income" || (subStep === null && !state.destinationsFound))
      ) {
        set({
          answered: markAnswered(state.answered, "budget"),
          subStep: "dest-hunt",
          portsHuntBeat: 0,
          destinationsFound: false,
        });
        return;
      }

      const index = DISCOVERY_STEPS.indexOf(step);
      const nextAnswered = markAnswered(state.answered, step);

      if (index >= DISCOVERY_STEPS.length - 1) {
        set({ answered: nextAnswered, subStep: null });
        get().showResults();
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
      if (subStep === "ports-hunt") {
        set({ subStep: "confirm-origin", portsHuntBeat: 0, portsFound: false });
        return;
      }
      if (subStep === "dest-hunt") {
        set({ subStep: null, portsHuntBeat: 0, destinationsFound: false });
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
            : dateMode === "flexible"
              ? {
                  ...current,
                  dateMode,
                  ...coerceFlexibleWindow(
                    current.flexibleMonth,
                    current.flexibleYear,
                  ),
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

    setFlexible: (flexibleMonth, flexibleNights, flexibleYear) => {
      const next = {
        ...get().prefs,
        ...coerceFlexibleWindow(flexibleMonth, flexibleYear),
        flexibleNights,
      };
      set({ prefs: next, result: recomputeFrom(next) });
    },

    setScope: (scope) => {
      const next = { ...get().prefs, scope };
      set({ prefs: next, destinationsFound: false, result: recomputeFrom(next) });
    },

    setOrigin: (origin) => {
      const next = { ...get().prefs, origin, originConfirmed: false };
      set({ prefs: next, portsFound: false, destinationsFound: false, result: recomputeFrom(next) });
    },

    proposeOrigin: (origin) => {
      const next = { ...get().prefs, origin, originConfirmed: false };
      set({
        prefs: next,
        subStep: "confirm-origin",
        portsFound: false,
        destinationsFound: false,
        result: recomputeFrom(next),
      });
    },

    confirmOrigin: () => {
      const next = { ...get().prefs, originConfirmed: true };
      set({ prefs: next, subStep: null, result: recomputeFrom(next) });
    },

    reopenOrigin: () => {
      const next = { ...get().prefs, originConfirmed: false };
      set({ prefs: next, subStep: null, originBusy: false, portsFound: false, destinationsFound: false, result: recomputeFrom(next) });
    },

    setOriginBusy: (originBusy) => set({ originBusy }),

    setBudget: (budget) => {
      const next = { ...get().prefs, budget };
      set({ prefs: next, destinationsFound: false, result: recomputeFrom(next) });
    },

    setPopulated: (populated) => {
      const next = { ...get().prefs, populated };
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

    advancePortsHunt: () =>
      set((state) => ({ portsHuntBeat: state.portsHuntBeat + 1 })),

    finishPortsHunt: () => {
      const { answered, step } = get();
      const index = DISCOVERY_STEPS.indexOf(step);
      set({
        answered: markAnswered(answered, "origin"),
        step: DISCOVERY_STEPS[Math.min(index + 1, DISCOVERY_STEPS.length - 1)],
        subStep: null,
        portsHuntBeat: 0,
        portsFound: true,
      });
    },

    finishDestHunt: () => {
      const { answered } = get();
      set({
        answered: markAnswered(answered, "budget"),
        step: "experiences",
        subStep: null,
        portsHuntBeat: 0,
        destinationsFound: true,
      });
    },

    /*
     * Skip the three-up list. Open on 3rd, then 2nd, then 1st — the set is
     * a sequence, not a catalogue.
     */
    showResults: () => {
      const { answered, step, result } = get();
      const shortlist = result.ranked.slice(0, 8);
      const top = shortlist.slice(0, 3);
      const opening = top[top.length - 1] ?? null;
      set({
        stage: "results",
        answered: markAnswered(answered, step),
        subStep: null,
        result: { ...result, ranked: shortlist, top },
        activeId: opening?.destination.id ?? null,
        celebrateOpening: Boolean(opening),
      });
    },

    clearCelebrate: () => set({ celebrateOpening: false }),

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
        celebrateOpening: false,
        processingStage: 0,
        portsHuntBeat: 0,
        portsFound: false,
        destinationsFound: false,
        incomeAsked: false,
      });
    },
  }));
}

const context = createStoreContext<DiscoveryState>("DiscoveryStore");

export function DiscoveryStoreProvider({
  children,
  startDate,
  endDate,
}: {
  children: React.ReactNode;
  startDate?: string;
  endDate?: string;
}) {
  return (
    <context.Provider
      createStore={() => makeDiscoveryStore({ startDate, endDate })}
    >
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
    const { flexibleMonth, flexibleYear } = coerceFlexibleWindow(
      prefs.flexibleMonth,
      prefs.flexibleYear,
    );
    const month = new Date(flexibleYear, flexibleMonth, 1);
    return `${prefs.flexibleNights} nights in ${format(month, "MMMM yyyy")}`;
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
