"use client";

import { useCallback, useEffect, useState } from "react";
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

import { Hummingbird } from "@/components/brand/hummingbird";
import { Logo } from "@/components/brand/mark";
import { Button } from "@/components/ui/button";
import { NYC_TRIP_ID } from "@/data/nyc-trip";
import { useIsCompact } from "@/lib/use-media-query";
import { BUDGET_META, INTEREST_META, STYLE_META } from "@/lib/categories";
import { cn } from "@/lib/utils";
import {
  DISCOVERY_STEPS,
  STEP_KIND,
  STEP_LABEL,
  activeRecommendation,
  canSkipToResults,
  dateSummary,
  survivingCount,
  useDiscovery,
  useDiscoveryApi,
} from "@/stores/discovery-store";

import { DiscoveryMap } from "./discovery-map";
import env from "./environment.module.css";
import { Processing } from "./processing";
import { DestinationBrief, Results } from "./results";
import {
  ActivitiesStep,
  BudgetStep,
  DatesStep,
  ExperiencesStep,
  OriginStep,
  ScopeStep,
} from "./steps";

import styles from "./discovery-experience.module.css";

/**
 * Destination Discovery.
 *
 * A full-screen takeover: the map is the entire canvas, and it lives inside
 * an Intripid atmosphere rather than a white app chrome. There is no
 * destination field anywhere here — destination is an output.
 *
 * The console sits on the trailing edge as a light frosted panel, which is
 * where the original product put it and where the environment is deepest, so
 * the glass has real contrast to sit on. One question at a time, six in all,
 * each labelled as narrowing or ordering the field.
 */

export function DiscoveryExperience() {
  const reduceMotion = useReducedMotion() ?? false;
  const isCompact = useIsCompact();
  const api = useDiscoveryApi();

  const stage = useDiscovery((s) => s.stage);
  const step = useDiscovery((s) => s.step);
  const subStep = useDiscovery((s) => s.subStep);
  const prefs = useDiscovery((s) => s.prefs);
  const answered = useDiscovery((s) => s.answered);
  const result = useDiscovery((s) => s.result);
  const activeId = useDiscovery((s) => s.activeId);
  const hoveredId = useDiscovery((s) => s.hoveredId);
  const processingStage = useDiscovery((s) => s.processingStage);
  const surviving = useDiscovery(survivingCount);
  const canSkip = useDiscovery(canSkipToResults);
  const active = useDiscovery(activeRecommendation);

  /** Mobile: whether the map is expanded over the console. */
  const [mapExpanded, setMapExpanded] = useState(false);

  useEffect(() => {
    if (api.getState().stage === "intro") api.getState().begin();
  }, [api]);

  const stepIndex = DISCOVERY_STEPS.indexOf(step);
  const consoleWidth = active ? 560 : stage === "results" ? 440 : 428;

  /*
   * On a phone the console sits BELOW the map, so it steals no horizontal
   * room. Feeding it the desktop console width as camera padding asked
   * Mapbox to reserve 524px on a 390px-wide map, and the fit collapsed onto
   * whichever two pins survived the clamp — at the opening question that
   * showed Lisbon and Marrakesh instead of the world.
   */
  const mapInsetRight = isCompact ? 0 : consoleWidth;

  const handleSelect = useCallback(
    (id: string) => {
      const state = api.getState();
      if (state.stage !== "results") state.showResults();
      state.setActive(id);
      setMapExpanded(false);
    },
    [api],
  );

  const handleHover = useCallback(
    (id: string | null) => api.getState().setHovered(id),
    [api],
  );

  /* The sub-step gates change what the primary action means. */
  const primaryLabel =
    subStep === "income"
      ? "Use this"
      : subStep === "weekend-shape"
        ? "That's the one"
        : stepIndex === DISCOVERY_STEPS.length - 1
          ? "Find my matches"
          : "Continue";

  /* Origin confirmation owns its own buttons, so hide the generic nav. */
  const hideNav = step === "origin" && subStep === "confirm-origin";

  return (
    <div className={cn(styles.root, env.root, "onEnv")}>
      {/* The Intripid world the map lives inside. */}
      <div className={env.atmosphere} aria-hidden />
      <div className={env.grain} aria-hidden />

      {/* ---------------------------------------------------------------- */}
      {/* Top bar — floats on the environment, not a solid app header       */}
      {/* ---------------------------------------------------------------- */}
      <header className={styles.topbar}>
        <Link href="/" className={styles.brand} aria-label="Intripid home">
          <Logo size={20} />
        </Link>

        {stage === "questions" ? (
          <ol className={styles.stepper} aria-label="Progress">
            {DISCOVERY_STEPS.map((item, index) => {
              const isDone = answered.includes(item);
              const isCurrent = item === step;
              return (
                <li key={item}>
                  <button
                    type="button"
                    className={cn(
                      styles.pip,
                      isCurrent && styles.pipCurrent,
                      isDone && !isCurrent && styles.pipDone,
                    )}
                    onClick={() => api.getState().goToStep(item)}
                    aria-current={isCurrent}
                    title={`${STEP_LABEL[item]} — ${
                      STEP_KIND[item] === "filter"
                        ? "narrows results"
                        : "orders results"
                    }`}
                  >
                    <span className={styles.pipDot} aria-hidden>
                      {isDone && !isCurrent ? (
                        <Check size={9} strokeWidth={3.6} />
                      ) : (
                        index + 1
                      )}
                    </span>
                    <span className={styles.pipLabel}>{STEP_LABEL[item]}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className={styles.topbarTitle}>
            {stage === "processing"
              ? "Searching"
              : active
                ? active.destination.name
                : "Your matches"}
          </p>
        )}

        <div className={styles.topbarEnd}>
          {/* A live count of what is still in the running. */}
          {stage === "questions" ? (
            <span className={styles.liveCount} aria-live="polite">
              <span className={cn(styles.liveNumber, "tabular")}>
                {surviving}
              </span>
              still in the running
            </span>
          ) : null}
          {stage === "results" ? (
            <button
              type="button"
              className={styles.envButton}
              onClick={() => {
                api.getState().setActive(null);
                api.getState().goToStep("experiences");
              }}
            >
              <SlidersHorizontal size={13} strokeWidth={2.1} />
              Adjust
            </button>
          ) : null}
          <Link href="/" className={styles.exitLink} aria-label="Leave discovery">
            <X size={15} strokeWidth={2.2} />
          </Link>
        </div>
      </header>

      {/* ---------------------------------------------------------------- */}
      {/* Canvas                                                            */}
      {/* ---------------------------------------------------------------- */}
      <div className={styles.body}>
        <div
          className={cn(
            styles.mapWrap,
            env.well,
            mapExpanded && styles.mapWrapExpanded,
          )}
        >
          <DiscoveryMap
            stage={stage}
            step={step}
            origin={prefs.origin?.coords ?? null}
            originLabel={prefs.origin?.city ?? null}
            originConfirmed={prefs.originConfirmed}
            result={result}
            processingStage={processingStage}
            activeId={activeId}
            hoveredId={hoveredId}
            onSelect={handleSelect}
            onHover={handleHover}
            insetRight={mapInsetRight}
            reduceMotion={reduceMotion}
          />
          <div className={env.wellVignette} aria-hidden />
        </div>

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

        {/* -------------------------------------------------------------- */}
        {/* Console — trailing edge, light frosted glass                    */}
        {/* -------------------------------------------------------------- */}
        <motion.aside
          className={cn(
            styles.console,
            env.glass,
            /*
             * The console wraps its content rather than running the full
             * height of the well in the two stages that do not fill it.
             *
             * At results: three cards and a ruled-out list do not fill 780px,
             * and a panel with 380px of empty glass under it reads as an
             * unfinished layout rather than as breathing room.
             *
             * While searching it earns something better than tidiness — the
             * panel grows by one line as each stage of reasoning lands, so
             * the search visibly accumulates instead of sitting inside a
             * fixed frame waiting to be filled.
             */
            ((stage === "results" && !active) || stage === "processing") &&
              styles.consoleFit,
            mapExpanded && styles.consoleHidden,
          )}
          animate={{ width: consoleWidth }}
          initial={false}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { duration: 0.26, ease: [0.2, 0, 0, 1] }
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
                  onClick={() => api.getState().goToStep("experiences")}
                >
                  {STYLE_META[style].label}
                </button>
              ))}
              {prefs.styles.length > 2 ? (
                <button
                  type="button"
                  className={styles.summaryChip}
                  onClick={() => api.getState().goToStep("experiences")}
                >
                  +{prefs.styles.length - 2}
                </button>
              ) : null}
              {prefs.interests.length > 0 ? (
                <button
                  type="button"
                  className={cn(styles.summaryChip, styles.summaryChipYours)}
                  onClick={() => api.getState().goToStep("activities")}
                >
                  {prefs.interests.length === 1
                    ? INTEREST_META[prefs.interests[0]].label
                    : `${prefs.interests.length} activities`}
                </button>
              ) : null}
            </div>
          ) : null}

          <div
            className={cn(
              styles.consoleScroll,
              active && styles.consoleScrollBrief,
            )}
          >
            <AnimatePresence mode="wait" initial={false}>
              {stage === "processing" ? (
                <motion.div
                  key="processing"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: reduceMotion ? 0.1 : 0.2 }}
                >
                  <Processing
                    prefs={prefs}
                    result={result}
                    stage={processingStage}
                    onAdvance={() => api.getState().advanceProcessing()}
                    onDone={() => api.getState().showResults()}
                    reduceMotion={reduceMotion}
                  />
                </motion.div>
              ) : stage === "results" && active ? (
                <DestinationBrief
                  key={`brief-${active.destination.id}`}
                  recommendation={active}
                  prefs={prefs}
                  top={result.top}
                  onBack={() => api.getState().setActive(null)}
                  onSelect={(id) => api.getState().setActive(id)}
                  tripId={
                    active.destination.id === "nyc" ? NYC_TRIP_ID : null
                  }
                />
              ) : stage === "results" ? (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: reduceMotion ? 0.1 : 0.22 }}
                >
                  <Results
                    result={result}
                    activeId={activeId}
                    hoveredId={hoveredId}
                    onSelect={handleSelect}
                    onHover={handleHover}
                    onAdjust={() => api.getState().goToStep("experiences")}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key={`${step}-${subStep ?? "main"}`}
                  initial={{ opacity: 0, x: 14 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -14 }}
                  transition={{
                    duration: reduceMotion ? 0.1 : 0.2,
                    ease: [0.2, 0, 0, 1],
                  }}
                >
                  {step === "dates" ? (
                    <DatesStep
                      prefs={prefs}
                      subStep={subStep}
                      onModeChange={(mode) => api.getState().setDateMode(mode)}
                      onDatesChange={(start, end) =>
                        api.getState().setDates(start, end)
                      }
                      onWeekendShape={(shape) =>
                        api.getState().setWeekendShape(shape)
                      }
                      onFlexible={(month, nights) =>
                        api.getState().setFlexible(month, nights)
                      }
                    />
                  ) : step === "scope" ? (
                    <ScopeStep
                      prefs={prefs}
                      onScopeChange={(scope) => api.getState().setScope(scope)}
                    />
                  ) : step === "origin" ? (
                    <OriginStep
                      prefs={prefs}
                      subStep={subStep}
                      onOriginChange={(origin) =>
                        api.getState().setOrigin(origin)
                      }
                      onConfirm={() => api.getState().confirmOrigin()}
                      onReopen={() => api.getState().reopenOrigin()}
                    />
                  ) : step === "budget" ? (
                    <BudgetStep
                      prefs={prefs}
                      subStep={subStep}
                      topDailyByTier={
                        result.ranked[0]?.destination.dailyBudgetUsd ?? null
                      }
                      onBudgetChange={(budget) =>
                        api.getState().setBudget(budget)
                      }
                      onIncomeBand={(band) =>
                        api.getState().setIncomeBand(band)
                      }
                      onSkipIncome={() => {
                        api.getState().setIncomeBand(null);
                        api.getState().setSubStep(null);
                        api.getState().next();
                      }}
                    />
                  ) : step === "experiences" ? (
                    <ExperiencesStep
                      prefs={prefs}
                      removedCount={
                        result.stages.find((s) => s.key === "experiences")
                          ?.removed ?? 0
                      }
                      onToggleStyle={(style) =>
                        api.getState().toggleStyle(style)
                      }
                    />
                  ) : (
                    <ActivitiesStep
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
           * The console is full height, and the early questions are short. On
           * the very first one that space carries the product's premise — a
           * low-information moment, which is exactly where the character is
           * allowed. From the second question on it carries the live
           * front-runners, so every answer visibly moves the answer.
           */}
          {stage === "questions" && subStep === null ? (
            answered.length === 0 ? (
              <div className={styles.premise}>
                <Hummingbird mood="curious" size={52} className={styles.premiseBird} />
                <p className={styles.premiseText}>
                  We&rsquo;ll never ask where you want to go. That&rsquo;s the
                  answer, not the question.
                </p>
              </div>
            ) : (
              <div className={styles.leaders}>
                <div className={styles.leadersHead}>
                  <span className={styles.leadersLabel}>Leading right now</span>
                  <span className={styles.leadersCount}>
                    {surviving} in the running
                  </span>
                </div>
                <ol className={styles.leadersList}>
                  {result.ranked.slice(0, 3).map((recommendation, index) => (
                    <li key={recommendation.destination.id}>
                      <button
                        type="button"
                        className={styles.leader}
                        onPointerEnter={() =>
                          handleHover(recommendation.destination.id)
                        }
                        onPointerLeave={() => handleHover(null)}
                        onClick={() =>
                          handleSelect(recommendation.destination.id)
                        }
                      >
                        <span className={cn(styles.leaderRank, "tabular")}>
                          {index + 1}
                        </span>
                        <span className={styles.leaderName}>
                          {recommendation.destination.name}
                        </span>
                        <span className={cn(styles.leaderScore, "tabular")}>
                          {Math.round(recommendation.score)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ol>
              </div>
            )
          ) : null}

          {stage === "questions" && !hideNav ? (
            <footer className={styles.consoleFooter}>
              <div className={styles.navRow}>
                <Button
                  variant="ghost"
                  size="md"
                  iconLeft={<ArrowLeft size={14} strokeWidth={2.1} />}
                  onClick={() => api.getState().back()}
                >
                  Back
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  iconRight={<ArrowRight size={14} strokeWidth={2.1} />}
                  onClick={() => api.getState().next()}
                >
                  {primaryLabel}
                </Button>
              </div>

              {/*
               * The escape hatch. A short flow is only honest if you can leave
               * it at any point and still get a real answer.
               */}
              {canSkip &&
              stepIndex < DISCOVERY_STEPS.length - 1 &&
              subStep === null ? (
                <button
                  type="button"
                  className={styles.skip}
                  onClick={() => api.getState().startProcessing()}
                >
                  <span className={cn(styles.skipCount, "tabular")}>
                    {surviving}
                  </span>
                  <span className={styles.skipLabel}>
                    places still fit — show me the best three now
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
