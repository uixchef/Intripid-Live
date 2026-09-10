"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Map as MapIcon,
  SlidersHorizontal,
  X,
} from "lucide-react";

import { Logo } from "@/components/brand/mark";
import { Button } from "@/components/ui/button";
import { NYC_TRIP_ID } from "@/data/nyc-trip";
import { BUDGET_META, INTEREST_META, STYLE_META } from "@/lib/categories";
import { cn } from "@/lib/utils";
import {
  DISCOVERY_STEPS,
  activeRecommendation,
  canSkipToResults,
  dateSummary,
  strongMatchCount,
  useDiscovery,
  useDiscoveryApi,
  type DiscoveryStep,
} from "@/stores/discovery-store";

import { DiscoveryMap } from "./discovery-map";
import { Processing } from "./processing";
import { DestinationBrief, ResultsRail } from "./results";
import {
  BudgetStep,
  DatesStep,
  InterestsStep,
  OriginStep,
  StyleStep,
} from "./steps";

import styles from "./discovery-experience.module.css";

/**
 * Destination Discovery.
 *
 * Structure: a full-bleed map canvas with a single console on the left. The
 * console asks one question at a time; the map answers spatially, reframing
 * and re-pinning after every input. That pairing is the argument for the
 * widget-driven approach the original team prototyped against a plain form —
 * on a form, "budget: premium" is a value in a field; here it visibly moves
 * which cities are winning.
 *
 * The escape hatch matters as much as the questions. Results are reachable
 * from step two onward, so the short flow is a genuine offer rather than a
 * shorter questionnaire you still have to finish.
 */

const STEP_LABELS: Record<DiscoveryStep, string> = {
  dates: "Dates",
  origin: "Origin",
  budget: "Budget",
  style: "Style",
  interests: "Interests",
};

export function DiscoveryExperience() {
  const reduceMotion = useReducedMotion();
  const api = useDiscoveryApi();

  const stage = useDiscovery((s) => s.stage);
  const step = useDiscovery((s) => s.step);
  const prefs = useDiscovery((s) => s.prefs);
  const answered = useDiscovery((s) => s.answered);
  const recommendations = useDiscovery((s) => s.recommendations);
  const activeId = useDiscovery((s) => s.activeId);
  const hoveredId = useDiscovery((s) => s.hoveredId);
  const strongCount = useDiscovery(strongMatchCount);
  const canSkip = useDiscovery(canSkipToResults);
  const active = useDiscovery(activeRecommendation);

  /** Mobile: whether the map is expanded over the console. */
  const [mapExpanded, setMapExpanded] = useState(false);

  // Entering the flow directly should not sit on the intro stage.
  useEffect(() => {
    if (api.getState().stage === "intro") api.getState().begin();
  }, [api]);

  const stepIndex = DISCOVERY_STEPS.indexOf(step);

  /**
   * How many candidates the map shows. Early on, a full board of pins would
   * imply more certainty than two answers can support, so the map reveals
   * more of the field as the traveller tells us more.
   */
  const visibleCount = useMemo(() => {
    if (stage === "results") return recommendations.length;
    if (answered.length <= 1) return 3;
    if (answered.length === 2) return 5;
    return recommendations.length;
  }, [stage, answered.length, recommendations.length]);

  const topDailyByTier = recommendations[0]?.destination.dailyBudgetUsd ?? null;

  const consoleWidth = active ? 560 : stage === "results" ? 440 : 420;

  const handleSelect = useCallback(
    (id: string) => {
      const state = api.getState();
      if (state.stage !== "results") {
        // Selecting a pin mid-flow is a legitimate shortcut: show results with
        // that destination open rather than ignoring the click.
        state.showResults();
      }
      state.setActive(id);
      setMapExpanded(false);
    },
    [api],
  );

  const handleHover = useCallback(
    (id: string | null) => api.getState().setHovered(id),
    [api],
  );

  return (
    <div className={styles.root}>
      {/* -------------------------------------------------------------- */}
      {/* Top bar                                                        */}
      {/* -------------------------------------------------------------- */}
      <header className={styles.topbar}>
        <Link href="/" className={styles.brand} aria-label="Intripid home">
          <Logo size={19} />
        </Link>

        <div className={styles.topbarCentre}>
          {stage === "questions" ? (
            <ol className={styles.stepper} aria-label="Discovery progress">
              {DISCOVERY_STEPS.map((item, index) => {
                const isDone = answered.includes(item);
                const isCurrent = item === step;
                return (
                  <li key={item}>
                    <button
                      type="button"
                      className={cn(
                        styles.stepPip,
                        isCurrent && styles.stepPipCurrent,
                        isDone && !isCurrent && styles.stepPipDone,
                      )}
                      onClick={() => api.getState().goToStep(item)}
                      aria-current={isCurrent}
                    >
                      <span className={styles.stepPipDot} aria-hidden>
                        {isDone && !isCurrent ? (
                          <Check size={9} strokeWidth={3.4} />
                        ) : (
                          index + 1
                        )}
                      </span>
                      <span className={styles.stepPipLabel}>
                        {STEP_LABELS[item]}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          ) : stage === "results" ? (
            <p className={styles.topbarTitle}>
              {active ? active.destination.name : "Your matches"}
            </p>
          ) : null}
        </div>

        <div className={styles.topbarEnd}>
          {stage === "results" ? (
            <Button
              variant="ghost"
              size="sm"
              iconLeft={<SlidersHorizontal size={13} strokeWidth={2} />}
              onClick={() => {
                api.getState().setActive(null);
                api.getState().goToStep("style");
              }}
            >
              Adjust
            </Button>
          ) : null}
          {/* A link, not a button-in-link: nesting interactive elements is invalid. */}
          <Link href="/" className={styles.exitLink} aria-label="Leave discovery">
            <X size={15} strokeWidth={2} />
          </Link>
        </div>
      </header>

      {/* -------------------------------------------------------------- */}
      {/* Canvas                                                         */}
      {/* -------------------------------------------------------------- */}
      <div className={styles.body}>
        <div
          className={cn(styles.mapWrap, mapExpanded && styles.mapWrapExpanded)}
        >
          <DiscoveryMap
            stage={stage}
            step={step}
            origin={prefs.origin?.coords ?? null}
            originLabel={prefs.origin?.city ?? null}
            recommendations={recommendations}
            visibleCount={visibleCount}
            activeId={activeId}
            hoveredId={hoveredId}
            onSelect={handleSelect}
            onHover={handleHover}
            insetLeft={consoleWidth}
          />
        </div>

        {/* Mobile map/console toggle */}
        <button
          type="button"
          className={styles.mapToggle}
          onClick={() => setMapExpanded((value) => !value)}
        >
          {mapExpanded ? (
            <>
              <SlidersHorizontal size={13} strokeWidth={2.2} />
              {stage === "results" ? "Matches" : "Questions"}
            </>
          ) : (
            <>
              <MapIcon size={13} strokeWidth={2.2} />
              Map
            </>
          )}
        </button>

        <motion.aside
          className={cn(styles.console, mapExpanded && styles.consoleHidden)}
          animate={{ width: consoleWidth }}
          initial={false}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { duration: 0.34, ease: [0.2, 0.8, 0.2, 1] }
          }
        >
          {/* Answered summary — state you can see and jump back into. */}
          {stage !== "processing" && answered.length > 0 && !active ? (
            <div className={styles.summary}>
              {answered.includes("dates") ? (
                <button
                  type="button"
                  className={styles.summaryChip}
                  onClick={() => api.getState().goToStep("dates")}
                >
                  {dateSummary(prefs)}
                </button>
              ) : null}
              {prefs.origin ? (
                <button
                  type="button"
                  className={styles.summaryChip}
                  onClick={() => api.getState().goToStep("origin")}
                >
                  from {prefs.origin.city}
                </button>
              ) : null}
              {prefs.budget ? (
                <button
                  type="button"
                  className={styles.summaryChip}
                  onClick={() => api.getState().goToStep("budget")}
                >
                  {BUDGET_META[prefs.budget].label}
                </button>
              ) : null}
              {prefs.styles.slice(0, 2).map((style) => (
                <button
                  key={style}
                  type="button"
                  className={styles.summaryChip}
                  onClick={() => api.getState().goToStep("style")}
                >
                  {STYLE_META[style].label}
                </button>
              ))}
              {prefs.styles.length > 2 ? (
                <button
                  type="button"
                  className={styles.summaryChip}
                  onClick={() => api.getState().goToStep("style")}
                >
                  +{prefs.styles.length - 2}
                </button>
              ) : null}
              {prefs.interests.length > 0 ? (
                <button
                  type="button"
                  className={styles.summaryChip}
                  onClick={() => api.getState().goToStep("interests")}
                >
                  {prefs.interests.length === 1
                    ? INTEREST_META[prefs.interests[0]].label
                    : `${prefs.interests.length} interests`}
                </button>
              ) : null}
            </div>
          ) : null}

          <div className={styles.consoleScroll}>
            <AnimatePresence mode="wait" initial={false}>
              {stage === "processing" ? (
                <motion.div
                  key="processing"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
                  transition={{ duration: reduceMotion ? 0.12 : 0.26 }}
                >
                  <Processing
                    prefs={prefs}
                    recommendations={recommendations}
                    onDone={() => api.getState().showResults()}
                  />
                </motion.div>
              ) : stage === "results" && active ? (
                <DestinationBrief
                  key={`brief-${active.destination.id}`}
                  recommendation={active}
                  prefs={prefs}
                  onBack={() => api.getState().setActive(null)}
                  tripId={active.destination.id === "nyc" ? NYC_TRIP_ID : null}
                />
              ) : stage === "results" ? (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
                  transition={{ duration: reduceMotion ? 0.12 : 0.28 }}
                >
                  <ResultsRail
                    recommendations={recommendations}
                    activeId={activeId}
                    hoveredId={hoveredId}
                    onSelect={handleSelect}
                    onHover={handleHover}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 18 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -18 }}
                  transition={{ duration: reduceMotion ? 0.12 : 0.26, ease: [0.2, 0.8, 0.2, 1] }}
                >
                  {step === "dates" ? (
                    <DatesStep
                      prefs={prefs}
                      onModeChange={(mode) => api.getState().setDateMode(mode)}
                      onDatesChange={(start, end) =>
                        api.getState().setDates(start, end)
                      }
                    />
                  ) : step === "origin" ? (
                    <OriginStep
                      prefs={prefs}
                      onOriginChange={(origin) => api.getState().setOrigin(origin)}
                      onScopeChange={(scope) => api.getState().setScope(scope)}
                    />
                  ) : step === "budget" ? (
                    <BudgetStep
                      prefs={prefs}
                      topDailyByTier={topDailyByTier}
                      onBudgetChange={(budget) => api.getState().setBudget(budget)}
                    />
                  ) : step === "style" ? (
                    <StyleStep
                      prefs={prefs}
                      onToggleStyle={(style) => api.getState().toggleStyle(style)}
                    />
                  ) : (
                    <InterestsStep
                      prefs={prefs}
                      onToggleInterest={(interest) =>
                        api.getState().toggleInterest(interest)
                      }
                    />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/*
           * The live front-runners. This is the whole argument for asking
           * questions on a map instead of in a form: the answer is already
           * forming, and you can watch your last input move it.
           */}
          {stage === "questions" && answered.length >= 1 && !active ? (
            <div className={styles.liveMatches}>
              <div className={styles.liveHead}>
                <span className="eyebrow">Leading right now</span>
                <span className={styles.liveCount}>
                  {strongCount > 0
                    ? `${strongCount} strong`
                    : `${recommendations.length} candidates`}
                </span>
              </div>
              <ol className={styles.liveList}>
                {recommendations.slice(0, 3).map((recommendation) => (
                  <li key={recommendation.destination.id}>
                    <button
                      type="button"
                      className={styles.liveItem}
                      onPointerEnter={() =>
                        handleHover(recommendation.destination.id)
                      }
                      onPointerLeave={() => handleHover(null)}
                      onClick={() => handleSelect(recommendation.destination.id)}
                    >
                      <span className={cn(styles.liveRank, "tabular")}>
                        {recommendation.rank}
                      </span>
                      <span className={styles.liveName}>
                        {recommendation.destination.name}
                      </span>
                      <span className={cn(styles.liveScore, "tabular")}>
                        {Math.round(recommendation.score)}
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}

          {/* Question navigation */}
          {stage === "questions" ? (
            <footer className={styles.consoleFooter}>
              <div className={styles.navRow}>
                <Button
                  variant="ghost"
                  size="md"
                  iconLeft={<ArrowLeft size={14} strokeWidth={2} />}
                  onClick={() => api.getState().back()}
                >
                  Back
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  iconRight={<ArrowRight size={14} strokeWidth={2} />}
                  onClick={() => api.getState().next()}
                >
                  {stepIndex === DISCOVERY_STEPS.length - 1
                    ? "See matches"
                    : "Continue"}
                </Button>
              </div>

              {/*
               * The reason a five-step flow is honest: you can leave at any
               * point and still get a real answer.
               */}
              {canSkip && stepIndex < DISCOVERY_STEPS.length - 1 ? (
                <button
                  type="button"
                  className={styles.skip}
                  onClick={() => api.getState().startProcessing()}
                >
                  <span className={styles.skipCount}>
                    {strongCount > 0 ? strongCount : recommendations.length}
                  </span>
                  <span className={styles.skipLabel}>
                    {strongCount > 0
                      ? `strong ${strongCount === 1 ? "match" : "matches"} already — skip ahead`
                      : "candidates so far — skip ahead"}
                  </span>
                  <ChevronRight size={14} strokeWidth={2.2} />
                </button>
              ) : null}
            </footer>
          ) : null}
        </motion.aside>
      </div>
    </div>
  );
}
