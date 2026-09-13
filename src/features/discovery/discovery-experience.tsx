"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Map as MapIcon,
  MapPin,
  SlidersHorizontal,
} from "lucide-react";

import { Logo } from "@/components/brand/mark";
import { BackLink } from "@/components/nav/back-link";
import { Button } from "@/components/ui/button";
import { plannerHrefForDestination } from "@/data/trips";
import { BUDGET_META } from "@/lib/categories";
import { resolvedDates } from "@/lib/discovery/scoring";
import { useIsCompact } from "@/lib/use-media-query";
import { useHideOnScroll } from "@/lib/use-hide-on-scroll";
import { cn } from "@/lib/utils";
import {
  DISCOVERY_STEPS,
  activeRecommendation,
  survivingCount,
  useDiscovery,
  useDiscoveryApi,
} from "@/stores/discovery-store";

import { DiscoveryMap } from "./discovery-map";
import env from "./environment.module.css";
import { PortHunt } from "./ports-hunt";
import { Processing } from "./processing";
import { DestinationBrief, Results } from "./results";
import {
  ActivitiesStep,
  BudgetStep,
  DatesStep,
  ExperiencesStep,
  IncomePrompt,
  OriginStep,
  ScopeStep,
} from "./steps";

import styles from "./discovery-experience.module.css";

const RESULTS_CONSOLE_MAX = 720;

function subscribeViewport(onChange: () => void) {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
}

/**
 * Destination Discovery.
 *
 * A full-screen takeover: Mapbox is the entire canvas. Chrome floats on
 * top. There is no destination field anywhere here — destination is an
 * output.
 *
 * The console sits on the trailing edge as a light frosted panel. One
 * question at a time, six in all, each labelled as narrowing or ordering
 * the field.
 */

export function DiscoveryExperience() {
  const reduceMotion = useReducedMotion() ?? false;
  const isCompact = useIsCompact();
  const api = useDiscoveryApi();

  const stage = useDiscovery((s) => s.stage);
  const step = useDiscovery((s) => s.step);
  const subStep = useDiscovery((s) => s.subStep);
  const prefs = useDiscovery((s) => s.prefs);
  const result = useDiscovery((s) => s.result);
  const activeId = useDiscovery((s) => s.activeId);
  const celebrateOpening = useDiscovery((s) => s.celebrateOpening);
  const hoveredId = useDiscovery((s) => s.hoveredId);
  const processingStage = useDiscovery((s) => s.processingStage);
  const portsHuntBeat = useDiscovery((s) => s.portsHuntBeat);
  const portsFound = useDiscovery((s) => s.portsFound);
  const destinationsFound = useDiscovery((s) => s.destinationsFound);
  const surviving = useDiscovery(survivingCount);
  const active = useDiscovery(activeRecommendation);

  /** Mobile: whether the map is expanded over the console. */
  const [mapExpanded, setMapExpanded] = useState(false);
  const scrollChrome = useHideOnScroll(isCompact && !mapExpanded);
  /** White lockup on dark globe; black lockup when land behind chrome is light. */
  const [chromeOnDark, setChromeOnDark] = useState(true);
  const chromeRegionRef = useRef<HTMLDivElement>(null);
  const sheetDockRef = useRef<HTMLDivElement>(null);
  const [mapInsetBottom, setMapInsetBottom] = useState(0);

  useEffect(() => {
    if (api.getState().stage === "intro") api.getState().begin();
  }, [api]);

  const stepIndex = DISCOVERY_STEPS.indexOf(step);
  const viewportWidth = useSyncExternalStore(
    subscribeViewport,
    () => window.innerWidth,
    () => 1440,
  );
  /* Questions + processing stay on one width so the card does not reflow. */
  const consoleWidth =
    stage === "results"
      ? Math.min(RESULTS_CONSOLE_MAX, Math.round(viewportWidth * 0.5))
      : 428;

  /*
   * On a phone the console sits BELOW the map, so it steals no horizontal
   * room. Feeding it the desktop console width as camera padding asked
   * Mapbox to reserve 524px on a 390px-wide map, and the fit collapsed onto
   * whichever two pins survived the clamp — at the opening question that
   * showed Lisbon and Marrakesh instead of the world.
   */
  const pagePad = 16;
  const mapInsetRight =
    isCompact || mapExpanded ? 0 : consoleWidth + pagePad;
  const mapGutter = isCompact ? 24 : 48;
  const mapInsetTop = isCompact ? 72 : 80;
  const mapCameraBottom = isCompact
    ? Math.max(20, mapInsetBottom)
    : 64;

  useLayoutEffect(() => {
    if (!isCompact) {
      setMapInsetBottom(0);
      return;
    }
    const node = sheetDockRef.current;
    if (!node) return;
    const update = () => {
      const card = node.querySelector("aside");
      const cardHidden =
        !card || getComputedStyle(card).display === "none";
      if (cardHidden) {
        setMapInsetBottom(Math.round(node.getBoundingClientRect().height));
        return;
      }
      setMapInsetBottom(
        Math.max(
          0,
          Math.round(window.innerHeight - card.getBoundingClientRect().top),
        ),
      );
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    const card = node.querySelector("aside");
    if (card) observer.observe(card);
    return () => observer.disconnect();
  }, [isCompact, mapExpanded, stage, step, subStep]);

  useEffect(() => {
    if (stage !== "results") setMapExpanded(false);
  }, [stage]);

  const handleSelect = useCallback(
    (id: string) => {
      const state = api.getState();
      if (state.stage !== "results") state.showResults();
      state.setActive(id);
      setMapExpanded(false);
    },
    [api],
  );

  const handleCelebrateDone = useCallback(
    () => api.getState().clearCelebrate(),
    [api],
  );

  const handleHover = useCallback(
    (id: string | null) => api.getState().setHovered(id),
    [api],
  );

  /* The sub-step gates change what the primary action means. */
  const primaryLabel =
    subStep === "weekend-shape"
      ? "That's the one"
      : stepIndex === DISCOVERY_STEPS.length - 1
        ? "Find my matches"
        : "Continue";

  const addingOrigin = step === "origin" && subStep === "add-origin";
  const huntingDeparture = subStep === "ports-hunt";
  const huntingDest = subStep === "dest-hunt";
  const hunting = huntingDeparture || huntingDest;
  const searching = hunting;
  const originBusy = useDiscovery((s) => s.originBusy);

  return (
    <div
      className={cn(
        styles.root,
        env.root,
        "onEnv",
        mapExpanded && styles.rootMapExpanded,
        scrollChrome.hidden && styles.rootChromeHidden,
      )}
      style={
        {
          ["--map-inset-bottom" as string]: `${mapInsetBottom}px`,
        }
      }
    >
      {/* Mapbox is the page — chrome floats over it. */}
      <div
        className={cn(
          styles.mapWrap,
          mapExpanded && styles.mapWrapExpanded,
        )}
      >
        <DiscoveryMap
          stage={stage}
          step={step}
          origin={prefs.origin?.coords ?? null}
          originLabel={prefs.origin?.city ?? null}
          originConfirmed={prefs.originConfirmed}
          huntKind={
            huntingDeparture ? "departure" : huntingDest ? "dest" : null
          }
          huntBeat={hunting ? portsHuntBeat : null}
          portsFound={portsFound}
          destinationsFound={destinationsFound}
          home={prefs.origin}
          scope={prefs.scope}
          result={result}
          processingStage={processingStage}
          activeId={activeId}
          hoveredId={hoveredId}
          onSelect={handleSelect}
          onHover={handleHover}
          insetRight={mapInsetRight}
          insetTop={mapInsetTop}
          insetBottom={mapCameraBottom}
          insetLeft={mapGutter}
          reduceMotion={reduceMotion}
          chromeRegionRef={chromeRegionRef}
          onChromeOnDark={setChromeOnDark}
        />
      </div>

      <header className={styles.topbar}>
        <div
          ref={chromeRegionRef}
          className={styles.topbarStart}
          data-on-dark={chromeOnDark ? "true" : "false"}
        >
          <BackLink fallback="/" className={styles.backLink}>
            <ArrowLeft size={15} strokeWidth={2} />
          </BackLink>
          <Logo size={36} onDark={chromeOnDark} priority />
        </div>

        <span />

        <div className={styles.topbarEnd} />
      </header>

      <div className={styles.body}>
        {stage === "results" && mapExpanded ? (
          <button
            type="button"
            className={styles.mapReveal}
            onClick={() => setMapExpanded(false)}
          >
            <MapPin size={13} strokeWidth={2.2} />
            Places
          </button>
        ) : null}

        <div className={styles.sheetDock} ref={sheetDockRef}>
        <button
          type="button"
          className={styles.mapToggle}
          aria-pressed={mapExpanded}
          aria-label={
            mapExpanded
              ? stage === "results"
                ? "Show places"
                : "Back to questions"
              : "Show map"
          }
          onClick={() => setMapExpanded((value) => !value)}
        >
          {mapExpanded ? (
            <>
              {stage === "results" ? (
                <MapPin size={13} strokeWidth={2.2} />
              ) : (
                <SlidersHorizontal size={13} strokeWidth={2.2} />
              )}
              {stage === "results" ? "Places" : "Questions"}
            </>
          ) : (
            <>
              <MapIcon size={13} strokeWidth={2.2} />
              Map
            </>
          )}
        </button>

        {/* -------------------------------------------------------------- */}
        {/* Console — solid card on the map, not glass. */}
        <motion.aside
          className={cn(
            styles.console,
            searching && styles.consoleSearching,
            stage === "results" && styles.consoleResults,
            mapExpanded && styles.consoleHidden,
          )}
          style={{ ["--console-max-w" as string]: `${consoleWidth}px` }}
          initial={false}
        >
          {searching ? (
            <span className={styles.siri} aria-hidden>
              <span className={styles.siriBloom} />
              <span className={styles.siriRing} />
              <span className={styles.siriWash} />
            </span>
          ) : null}

          {stage === "results" ? (
            <button
              type="button"
              className={styles.consoleCollapse}
              onClick={() => setMapExpanded(true)}
            >
              <MapIcon size={13} strokeWidth={2.2} />
              Map
            </button>
          ) : null}

          <div
            className={cn(
              styles.consoleScroll,
              active && styles.consoleScrollBrief,
            )}
            onScroll={scrollChrome.onScroll}
          >
            <div className={styles.consoleScrollInner}>
              {stage === "questions" ? (
                <span className={styles.consoleMascotClip}>
                  <img
                    className={styles.consoleMascot}
                    src="/discovery/hummingbird-peek.png"
                    alt=""
                    width={91}
                    height={121}
                    aria-hidden
                  />
                </span>
              ) : null}
            <AnimatePresence mode="wait" initial={false}>
              {stage === "processing" ? (
                <motion.div
                  key="processing"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: reduceMotion ? 0.1 : 0.36 }}
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
                  key="brief"
                  recommendation={active}
                  prefs={prefs}
                  top={result.top}
                  onBack={() => {
                    const reveal = [...result.top].reverse();
                    const index = reveal.findIndex(
                      (entry) => entry.destination.id === active.destination.id,
                    );
                    if (index > 0) {
                      api.getState().setActive(reveal[index - 1].destination.id);
                      return;
                    }
                    api.getState().goToStep("activities");
                  }}
                  onSelect={(id) => api.getState().setActive(id)}
                  onNext={() => {
                    const reveal = [...result.top].reverse();
                    const index = reveal.findIndex(
                      (entry) => entry.destination.id === active.destination.id,
                    );
                    const next = reveal[index + 1];
                    if (next) api.getState().setActive(next.destination.id);
                  }}
                  onAdjust={() => {
                    api.getState().setActive(null);
                    api.getState().goToStep("experiences");
                  }}
                  plannerHref={plannerHrefForDestination(
                    active.destination.id,
                    resolvedDates(prefs) ?? undefined,
                  )}
                  celebrate={celebrateOpening}
                  onCelebrateDone={handleCelebrateDone}
                />
              ) : stage === "results" ? (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: reduceMotion ? 0.1 : 0.36 }}
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
                  key={`${step}-${subStep === "income" ? "main" : (subStep ?? "main")}`}
                  initial={{ opacity: 0, x: 14 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -14 }}
                  transition={{
                    duration: reduceMotion ? 0.1 : 0.38,
                    ease: [0.22, 1, 0.36, 1],
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
                      onFlexible={(month, nights, year) =>
                        api.getState().setFlexible(month, nights, year)
                      }
                    />
                  ) : hunting ? (
                    <PortHunt
                      kind={huntingDeparture ? "departure" : "dest"}
                      beat={portsHuntBeat}
                      onAdvance={() => api.getState().advancePortsHunt()}
                      onDone={() =>
                        huntingDeparture
                          ? api.getState().finishPortsHunt()
                          : api.getState().finishDestHunt()
                      }
                      reduceMotion={reduceMotion}
                    />
                  ) : step === "origin" ? (
                    <OriginStep
                      prefs={prefs}
                      subStep={subStep}
                      onOriginChange={(origin) =>
                        api.getState().setOrigin(origin)
                      }
                      onOpenAdd={() => api.getState().setSubStep("add-origin")}
                      onProposeOrigin={(origin) =>
                        api.getState().proposeOrigin(origin)
                      }
                    />
                  ) : step === "scope" ? (
                    <ScopeStep
                      prefs={prefs}
                      onScopeChange={(scope) => api.getState().setScope(scope)}
                    />
                  ) : step === "budget" ? (
                    <BudgetStep
                      prefs={prefs}
                      topDailyByTier={
                        result.ranked[0]?.destination.dailyBudgetUsd ?? null
                      }
                      onBudgetChange={(budget) =>
                        api.getState().setBudget(budget)
                      }
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
                      removedCount={
                        result.stages.find((s) => s.key === "activities")
                          ?.removed ?? 0
                      }
                      onToggleInterest={(interest) =>
                        api.getState().toggleInterest(interest)
                      }
                    />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
            </div>
          </div>

          {stage === "questions" && !hunting ? (
            <footer className={styles.consoleFooter}>
              <div className={styles.navRow}>
                <Button
                  variant="ghost"
                  size="md"
                  iconLeft={<ArrowLeft size={14} strokeWidth={2.1} />}
                  disabled={originBusy || (stepIndex === 0 && subStep === null)}
                  onClick={() => api.getState().back()}
                >
                  Back
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  iconRight={<ArrowRight size={14} strokeWidth={2.1} />}
                  type={addingOrigin ? "submit" : "button"}
                  form={addingOrigin ? "discovery-add-origin" : undefined}
                  loading={originBusy}
                  onClick={
                    addingOrigin ? undefined : () => api.getState().next()
                  }
                >
                  {primaryLabel}
                </Button>
              </div>
            </footer>
          ) : null}
        </motion.aside>
        </div>
      </div>

      <IncomePrompt
        open={stage === "questions" && step === "budget" && subStep === "income"}
        tierLabel={prefs.budget ? BUDGET_META[prefs.budget].label : "that budget"}
        value={prefs.incomeBand}
        onPick={(band) => api.getState().setIncomeBand(band)}
        onSkip={() => {
          api.getState().setIncomeBand(null);
          api.getState().setSubStep(null);
          api.getState().next();
        }}
        onContinue={() => api.getState().next()}
      />
    </div>
  );
}
