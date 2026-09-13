"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { format, getMonth, parseISO } from "date-fns";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";

import { Mark } from "@/components/brand/mark";
import { coverPhotoSrc } from "@/data/place-photos";
import { Button, IconButton } from "@/components/ui/button";
import { Confidence, ScoreRing, SeasonSpark } from "@/components/ui/meter";
import { INTEREST_META, STYLE_META } from "@/lib/categories";
import { distinctReasons, resolveWindow } from "@/lib/discovery/scoring";
import { splitBriefPlaces } from "@/lib/discovery/places";
import { useIsCompact } from "@/lib/use-media-query";
import { cn } from "@/lib/utils";
import {
  INTERESTS,
  type DiscoveryPreferences,
  type FilterStage,
  type Interest,
  type Recommendation,
  type RecommendationSet,
} from "@/lib/types";

import styles from "./results.module.css";

/** Region and country for compact cards. */
function locationLine(recommendation: Recommendation): string {
  const { region, country, name } = recommendation.destination;
  return [region && region !== name ? region : null, country]
    .filter(Boolean)
    .join(", ");
}

/** Full place line as designed: "Mexico City, Ciudad de México, Mexico". */
function placeHeadline(recommendation: Recommendation): string {
  const { name, region, country } = recommendation.destination;
  return [name, region && region !== name ? region : null, country]
    .filter(Boolean)
    .join(", ");
}

function monthName(month: number) {
  return format(new Date(2026, month, 1), "MMMM");
}

const PLACE_LABEL = ["Best match", "Second", "Third"];

const MATCH_EASE = [0.45, 0, 0.15, 1] as const;

const matchPane = {
  enter: { opacity: 0 },
  show: { opacity: 1 },
  leave: { opacity: 0, pointerEvents: "none" as const },
};

/* -------------------------------------------------------------------------- */
/* The decision — exactly three                                              */
/* -------------------------------------------------------------------------- */

export interface ResultsProps {
  result: RecommendationSet;
  activeId: string | null;
  hoveredId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  onAdjust: () => void;
}

/**
 * The result surface.
 *
 * Three destinations, not a catalogue. This is a product decision rather than
 * a pagination default: the original concept was to make a recommendation,
 * and handing back nine options is a way of declining to. The hierarchy is
 * deliberately steep — the best match is a full card carrying its reasoning,
 * the runners-up are compact but clearly still live rather than greyed out.
 */
/** Which answer removed a place, in the user's terms rather than the filter's. */
const RULED_OUT_WHY: Record<FilterStage["key"], string> = {
  dates: "wrong season for your dates",
  scope: "outside the range you chose",
  reach: "too far for the time you have",
  afford: "over your budget",
  experiences: "missing a must-have",
  activities: "missing something you want to do",
};

export function Results({
  result,
  activeId,
  hoveredId,
  onSelect,
  onHover,
  onAdjust,
}: ResultsProps) {
  const [best, ...rest] = result.top;
  const removed = result.eliminated.length;
  const empty = !best;

  /*
   * Phrased against each other, not independently — see `distinctReasons`.
   * Three cards that all say "among the best anywhere for museums and fine
   * dining" give you nothing to choose on.
   */
  const reasons = useMemo(() => distinctReasons(result.top), [result.top]);

  if (empty) {
    return (
      <div className={styles.empty}>
        <span className={styles.emptyBird} aria-hidden>
          <Mark size={88} />
        </span>
        <p className={styles.emptyTitle}>Nothing fits those constraints</p>
        <p className={styles.emptyBody}>
          Loosen a must-have or widen the dates and we&rsquo;ll try again.
        </p>
        <Button variant="secondary" onClick={onAdjust}>
          Adjust the answers
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.results}>
      <header className={styles.resultsHead}>
        <p className={styles.resultsEyebrow}>
          {result.relaxed ? "Closest matches" : "Our recommendation"}
        </p>
        <h2 className={styles.resultsTitle}>
          {result.relaxed
            ? "Nothing cleared every must-have"
            : "Three places that fit"}
        </h2>
        <p className={styles.resultsWhy}>
          {result.relaxed
            ? "We loosened the must-haves rather than show you an empty screen. These came closest."
            : removed > 0
              ? `We ruled out ${removed} ${removed === 1 ? "place" : "places"} to get here. Open one to see how it scored.`
              : "Ranked on fit, not popularity. Open one to see how it scored."}
        </p>
      </header>

      {/* The winner leads. */}
      <button
        type="button"
        onClick={() => onSelect(best.destination.id)}
        onPointerEnter={() => onHover(best.destination.id)}
        onPointerLeave={() => onHover(null)}
        aria-current={activeId === best.destination.id}
        className={cn(
          styles.bestCard,
          activeId === best.destination.id && styles.bestCardActive,
          hoveredId === best.destination.id && styles.bestCardHovered,
        )}
      >
        <span className={styles.bestBadge}>
          <Sparkles size={11} strokeWidth={2.4} aria-hidden />
          Best match
        </span>

        <span className={styles.bestTop}>
          <span className={styles.bestNameBlock}>
            <span className={styles.bestName}>
              {best.destination.name}
              <span className={styles.flag} aria-hidden>
                {best.destination.flag}
              </span>
            </span>
            <span className={styles.bestWhere}>{locationLine(best)}</span>
          </span>
          <ScoreRing score={best.score} size={52} />
        </span>

        <span className={styles.bestReason}>{reasons[0]}</span>

        <span className={styles.bestMeta}>
          {best.matchedInterests.slice(0, 3).map((interest) => (
            <span key={interest} className={styles.metaChip}>
              {INTEREST_META[interest].label}
            </span>
          ))}
          {best.estimatedBudgetUsd !== null ? (
            <span
              className={cn(styles.metaChip, styles.metaChipCost, "tabular")}
            >
              ~${best.estimatedBudgetUsd.toLocaleString()} on the ground
            </span>
          ) : null}
        </span>
      </button>

      {/* The runners-up stay live: compact, never disabled. */}
      {rest.length > 0 ? (
        <div className={styles.runnersUp}>
          {rest.map((recommendation, index) => (
            <button
              key={recommendation.destination.id}
              type="button"
              onClick={() => onSelect(recommendation.destination.id)}
              onPointerEnter={() => onHover(recommendation.destination.id)}
              onPointerLeave={() => onHover(null)}
              aria-current={activeId === recommendation.destination.id}
              className={cn(
                styles.runnerCard,
                activeId === recommendation.destination.id &&
                  styles.runnerCardActive,
                hoveredId === recommendation.destination.id &&
                  styles.runnerCardHovered,
              )}
            >
              <span className={styles.runnerPlace}>
                {PLACE_LABEL[index + 1]}
              </span>
              <span className={styles.runnerBody}>
                <span className={styles.runnerName}>
                  {recommendation.destination.name}
                  <span className={styles.flag} aria-hidden>
                    {recommendation.destination.flag}
                  </span>
                </span>
                <span className={styles.runnerReason}>
                  {reasons[index + 1]}
                </span>
              </span>
              <ScoreRing score={recommendation.score} size={38} />
            </button>
          ))}
        </div>
      ) : null}

      {/*
       * What did not make it, and which answer removed it. This is the
       * clearest thing the surface can say about how it works, and it is also
       * a genuine decision aid: seeing that Lisbon went out on budget rather
       * than on interests tells you which answer to change.
       */}
      {result.eliminated.length > 0 ? (
        <div className={styles.ruledOut}>
          <p className={styles.ruledOutLabel}>Ruled out</p>
          <ul className={styles.ruledOutList}>
            {result.eliminated.slice(0, 4).map((entry) => (
              <li key={entry.destination.id} className={styles.ruledOutItem}>
                <span className={styles.ruledOutName}>
                  {entry.destination.name}
                </span>
                <span className={styles.ruledOutWhy}>
                  {RULED_OUT_WHY[entry.stage]}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <button type="button" className={styles.adjust} onClick={onAdjust}>
        Not quite right? Adjust your answers
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Destination brief — the bridge into planning                              */
/* -------------------------------------------------------------------------- */

export interface DestinationBriefProps {
  recommendation: Recommendation;
  prefs: DiscoveryPreferences;
  top: Recommendation[];
  onBack: () => void;
  onSelect: (id: string) => void;
  onNext: () => void;
  onAdjust: () => void;
  plannerHref: Route;
  celebrate: boolean;
  onCelebrateDone: () => void;
}

function activityScores(
  recommendation: Recommendation,
  prefs: DiscoveryPreferences,
): { label: string; score: number }[] {
  const { destination } = recommendation;
  const picked =
    prefs.interests.length > 0
      ? prefs.interests
      : ([...INTERESTS] as Interest[]);
  const fromInterests = picked
    .map((interest) => ({
      label: INTEREST_META[interest].label,
      score: Math.round((destination.interestFit[interest] ?? 0) * 100),
    }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);

  if (fromInterests.length > 0) return fromInterests;

  return prefs.styles
    .map((style) => ({
      label: STYLE_META[style].label,
      score: Math.round((destination.styleFit[style] ?? 0) * 100),
    }))
    .sort((a, b) => b.score - a.score);
}

function PlaceCard({
  attraction,
  variant = "spot",
}: {
  attraction: Recommendation["destination"]["attractions"][number];
  variant?: "spot" | "event";
}) {
  const photo = attraction.photo;
  return (
    <article className={cn(styles.spotCard, variant === "event" && styles.eventCard)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo ?? "/discovery/pins/place.png"}
        alt=""
        width={200}
        height={variant === "event" ? 200 : 160}
        className={styles.spotPhoto}
        onError={(event) => {
          event.currentTarget.src = "/discovery/pins/place.png";
        }}
      />
      <div className={styles.spotBody}>
        <p className={styles.spotName}>{attraction.name}</p>
        {variant === "event" && attraction.note ? (
          <p className={styles.spotMeta}>{attraction.note}</p>
        ) : null}
      </div>
    </article>
  );
}

function ConfettiBurst({ onDone }: { onDone: () => void }) {
  const reduceMotion = useReducedMotion();
  const [alive, setAlive] = useState(!reduceMotion);

  useEffect(() => {
    onDone();
    if (!alive) return;
    const timer = window.setTimeout(() => setAlive(false), 1600);
    return () => window.clearTimeout(timer);
    // Fire once on mount so a new parent callback does not retrigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alive]);

  if (!alive || typeof document === "undefined") return null;

  return createPortal(
    <div className={styles.confetti} aria-hidden>
      {Array.from({ length: 32 }, (_, index) => (
        <span key={index} className={styles.confettiPiece} />
      ))}
    </div>,
    document.body,
  );
}

/**
 * One match at a time, 3rd → 2nd → 1st. Confetti fires on the opening card.
 */
export function DestinationBrief({
  recommendation,
  prefs,
  top,
  onBack,
  onNext,
  onAdjust,
  plannerHref,
  celebrate,
  onCelebrateDone,
}: DestinationBriefProps) {
  const router = useRouter();
  const isCompact = useIsCompact();
  const reduceMotion = useReducedMotion();
  const actionSize = isCompact ? "md" : "lg";
  const actionIcon = isCompact ? 14 : 15;
  const navIcon = isCompact ? 14 : 16;
  const paneRef = useRef<HTMLDivElement>(null);
  const [moreScores, setMoreScores] = useState(false);
  const [tab, setTab] = useState("why");
  const { destination, estimatedBudgetUsd } = recommendation;

  const reveal = [...top].reverse();
  const revealIndex = Math.max(
    0,
    reveal.findIndex((entry) => entry.destination.id === destination.id),
  );
  const isOpening = revealIndex === 0;
  const hasPrev = revealIndex > 0;
  const hasNext = revealIndex < reveal.length - 1;
  const matchRank =
    top.findIndex((entry) => entry.destination.id === destination.id) + 1;

  const tripWindow = resolveWindow(prefs);
  const tripMonths = tripWindow.months.length
    ? tripWindow.months
    : prefs.startDate
      ? [getMonth(parseISO(prefs.startDate))]
      : [];
  const nights = tripWindow.nights;
  const seasonMonths =
    tripMonths.length > 0
      ? tripMonths.map((month) => destination.season[month]).filter(Boolean)
      : destination.season;
  const season = seasonMonths[0] ?? null;
  const seasonHigh = Math.round(
    seasonMonths.reduce((sum, month) => sum + month.highC, 0) /
      Math.max(1, seasonMonths.length),
  );
  const seasonLow = Math.round(
    seasonMonths.reduce((sum, month) => sum + month.lowC, 0) /
      Math.max(1, seasonMonths.length),
  );
  const seasonFit = Math.round(
    (seasonMonths.reduce((sum, month) => sum + month.score, 0) /
      Math.max(1, seasonMonths.length)) *
      100,
  );
  const seasonWindow =
    tripMonths.length === 0
      ? "Year round"
      : tripMonths.length === 1
        ? monthName(tripMonths[0])
        : `${monthName(tripMonths[0])} – ${monthName(tripMonths[tripMonths.length - 1])}`;
  const scores = activityScores(recommendation, prefs);
  const visibleScores = moreScores ? scores : scores.slice(0, 4);
  const { immersive, exciting, food } = splitBriefPlaces(destination.attractions);
  const cover =
    coverPhotoSrc(destination.id) ?? "/discovery/pins/place.png";

  const tabs = [
    { id: "why", label: "Why here", count: destination.whyYoullLoveIt.length },
    { id: "scores", label: "Scores", count: scores.length },
    immersive.length > 0
      ? { id: "attractions", label: "Famous attractions", count: immersive.length }
      : null,
    exciting.length > 0
      ? { id: "activities", label: "Recommendations", count: exciting.length }
      : null,
    food.length > 0
      ? { id: "food", label: "Food & dining", count: food.length }
      : null,
  ].filter(
    (item): item is { id: string; label: string; count: number } => item !== null,
  );

  const tabKey = tabs.map((item) => item.id).join("|");
  const jumpLock = useRef(false);

  const jump = (id: string) => {
    setTab(id);
    const root = paneRef.current;
    const section = root?.querySelector(`#brief-${id}`);
    const tabsEl = root?.querySelector("[role='tablist']");
    if (!root || !(section instanceof HTMLElement)) return;
    jumpLock.current = true;
    const tabsH = tabsEl instanceof HTMLElement ? tabsEl.offsetHeight : 40;
    root.scrollTo({
      top: Math.max(0, section.offsetTop - tabsH - 8),
      behavior: reduceMotion ? "auto" : "smooth",
    });
    window.setTimeout(() => {
      jumpLock.current = false;
    }, reduceMotion ? 50 : 700);
  };

  const prevIndex = useRef(revealIndex);
  const direction = revealIndex >= prevIndex.current ? 1 : -1;
  useEffect(() => {
    prevIndex.current = revealIndex;
    setMoreScores(false);
    setTab("why");
  }, [revealIndex]);

  useEffect(() => {
    const root = paneRef.current;
    if (!root) return;
    const ids = tabKey.split("|").filter(Boolean);
    let frame = 0;

    const sync = () => {
      if (jumpLock.current || ids.length === 0) return;
      const tabsEl = root.querySelector("[role='tablist']");
      const offset =
        (tabsEl instanceof HTMLElement ? tabsEl.offsetHeight : 40) + 12;
      const y = root.scrollTop + offset;
      let next = ids[0];
      for (const id of ids) {
        const section = root.querySelector(`#brief-${id}`);
        if (!(section instanceof HTMLElement)) continue;
        if (section.offsetTop <= y) next = id;
      }
      setTab((current) => (current === next ? current : next));
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        sync();
      });
    };

    root.addEventListener("scroll", onScroll, { passive: true });
    sync();
    return () => {
      root.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [destination.id, tabKey]);

  useEffect(() => {
    const tabsEl = paneRef.current?.querySelector("[role='tablist']");
    const button = paneRef.current?.querySelector(`[data-brief-tab="${tab}"]`);
    if (!(tabsEl instanceof HTMLElement) || !(button instanceof HTMLElement)) {
      return;
    }
    const left = button.offsetLeft;
    const right = left + button.offsetWidth;
    const viewLeft = tabsEl.scrollLeft;
    const viewRight = viewLeft + tabsEl.clientWidth;
    if (left >= viewLeft && right <= viewRight) return;
    tabsEl.scrollTo({
      left: Math.max(0, left - 24),
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, [tab, reduceMotion, destination.id]);

  const paneTransition = reduceMotion
    ? { duration: 0.16, ease: MATCH_EASE }
    : { duration: 0.4, ease: MATCH_EASE };

  return (
    <motion.div
      className={styles.brief}
      data-brief=""
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0.12 : 0.32, ease: MATCH_EASE }}
    >
      {isOpening && celebrate ? (
        <ConfettiBurst onDone={onCelebrateDone} />
      ) : null}

      <div className={styles.briefStage}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={destination.id}
            ref={paneRef}
            className={styles.briefScroll}
            custom={direction}
            variants={matchPane}
            initial={reduceMotion ? { opacity: 0 } : "enter"}
            animate={reduceMotion ? { opacity: 1 } : "show"}
            exit={reduceMotion ? { opacity: 0 } : "leave"}
            transition={paneTransition}
          >
        <div className={styles.hero}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cover}
            alt=""
            width={720}
            height={240}
            aria-hidden
            onError={(event) => {
              event.currentTarget.src = "/discovery/pins/place.png";
            }}
          />
          {matchRank > 0 ? (
            <span
              className={styles.heroRank}
              aria-label={`Match ${matchRank} of ${top.length}`}
            >
              #{matchRank}
            </span>
          ) : null}
        </div>

        <header className={styles.briefHead}>
          <h2 className={styles.briefName}>
            <span className={styles.briefFlag} aria-hidden>
              {destination.flag}
            </span>
            <span className={styles.briefTitle}>
              {placeHeadline(recommendation)}
            </span>
          </h2>
          <p className={styles.briefBlurb}>{destination.blurb}</p>
        </header>

        <div className={styles.briefTabs} role="tablist" aria-label="In this brief">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              data-brief-tab={item.id}
              className={cn(styles.briefTab, tab === item.id && styles.briefTabOn)}
              onClick={() => jump(item.id)}
            >
              {item.label}
              {item.count > 0 ? (
                <span className={styles.tabCount}>{item.count}</span>
              ) : null}
            </button>
          ))}
        </div>

        <section id="brief-why" className={styles.briefBlock}>
          <h3 className={styles.blockTitle}>Why you&rsquo;ll love it</h3>
          <ul className={styles.loveList}>
            {destination.whyYoullLoveIt.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </section>

        {scores.length > 0 ? (
          <section id="brief-scores" className={styles.briefBlock}>
            <div className={styles.blockHead}>
              <h3 className={styles.blockTitle}>Experience &amp; activities</h3>
              <p className={styles.blockLead}>
                Scores reflect how well this city matches your chosen
                experiences and activities.
              </p>
            </div>
            <div className={styles.scoreSheet}>
              {visibleScores.map((row) => (
                <div key={row.label} className={styles.scoreBar}>
                  <span
                    className={styles.scoreFill}
                    style={{ width: `${row.score}%` }}
                  />
                  <span className={styles.scoreLabel}>{row.label}</span>
                  <span className={cn(styles.scorePill, "tabular")}>
                    {row.score}
                  </span>
                </div>
              ))}
              {scores.length > 4 ? (
                <button
                  type="button"
                  className={cn(
                    styles.viewMore,
                    moreScores && styles.viewMoreOpen,
                  )}
                  onClick={() => setMoreScores((value) => !value)}
                >
                  {moreScores ? "View less" : "View more"}
                  <ChevronDown size={16} strokeWidth={2.2} />
                </button>
              ) : null}
            </div>
          </section>
        ) : null}

        <section
          id={scores.length > 0 ? undefined : "brief-scores"}
          className={styles.briefBlock}
        >
          <div className={styles.blockHead}>
            <h3 className={styles.blockTitle}>Seasonal weather</h3>
            <p className={styles.blockLead}>
              How pleasant the weather is in {destination.name} through the
              year, with your dates highlighted.
            </p>
          </div>
          <div className={styles.weatherCard}>
            <p className={styles.weatherCardHead}>
              {tripMonths.length > 0
                ? `Trip window · ${seasonWindow}`
                : seasonWindow}
            </p>
            <div className={styles.weatherCardBody}>
              <dl className={styles.weatherStats}>
                <div className={styles.weatherStat}>
                  <dt>High</dt>
                  <dd className="tabular">{seasonHigh}°C</dd>
                </div>
                <div className={styles.weatherStat}>
                  <dt>Low</dt>
                  <dd className="tabular">{seasonLow}°C</dd>
                </div>
                <div className={styles.weatherStat}>
                  <dt>Pleasant</dt>
                  <dd className="tabular">{seasonFit}%</dd>
                </div>
              </dl>
              <SeasonSpark
                values={destination.season.map((month) => month.score)}
                highlight={tripMonths}
                height={44}
              />
              {season ? (
                <p className={styles.weatherNote}>
                  {season.label} when you&rsquo;re going.
                </p>
              ) : null}
            </div>
          </div>
        </section>

        {immersive.length > 0 ? (
          <section id="brief-attractions" className={styles.briefBlock}>
            <div className={styles.blockHead}>
              <h3 className={styles.blockTitle}>
                Immersive experiences: dive into the heart of {destination.name}
              </h3>
              <p className={styles.blockLead}>
                Places that make {destination.name} itself, chosen against what
                you said you care about.
              </p>
            </div>
            <div className={styles.spotRail}>
              {immersive.map((attraction) => (
                <PlaceCard key={attraction.name} attraction={attraction} />
              ))}
            </div>
          </section>
        ) : null}

        {exciting.length > 0 ? (
          <section id="brief-activities" className={styles.briefBlock}>
            <div className={styles.blockHead}>
              <h3 className={styles.blockTitle}>
                Exciting activities: adventure awaits at every corner
              </h3>
              <p className={styles.blockLead}>
                Things to do that match the energy of the trip.
              </p>
            </div>
            <div className={styles.spotRail}>
              {exciting.map((attraction) => (
                <PlaceCard
                  key={attraction.name}
                  attraction={attraction}
                  variant="event"
                />
              ))}
            </div>
          </section>
        ) : null}

        {food.length > 0 ? (
          <section id="brief-food" className={styles.briefBlock}>
            <div className={styles.blockHead}>
              <h3 className={styles.blockTitle}>Food &amp; dining</h3>
              <p className={styles.blockLead}>
                Where to eat in {destination.name}, from the everyday to the
                booked-ahead.
              </p>
            </div>
            <div className={styles.spotRail}>
              {food.map((attraction) => (
                <PlaceCard
                  key={attraction.name}
                  attraction={attraction}
                  variant="event"
                />
              ))}
            </div>
          </section>
        ) : null}

        {estimatedBudgetUsd !== null ? (
          <p className={styles.budgetNote}>
            About ${estimatedBudgetUsd.toLocaleString()} on the ground
            {nights !== null ? ` for ${nights} nights` : ""}, per person.
          </p>
        ) : null}
          </motion.div>
        </AnimatePresence>
      </div>

      <footer className={styles.briefFooter}>
        <div className={styles.footerNav} role="group" aria-label="Matches">
          <IconButton
            label="Previous match"
            size={actionSize}
            variant="secondary"
            disabled={!hasPrev}
            onClick={onBack}
          >
            <ArrowLeft size={navIcon} strokeWidth={2.2} />
          </IconButton>
          <IconButton
            label="Next match"
            size={actionSize}
            variant="secondary"
            disabled={!hasNext}
            onClick={onNext}
          >
            <ArrowRight size={navIcon} strokeWidth={2.2} />
          </IconButton>
        </div>
        <div className={styles.footerActions}>
          <Button
            variant="secondary"
            size={actionSize}
            iconLeft={<SlidersHorizontal size={actionIcon} strokeWidth={2.2} />}
            onClick={onAdjust}
          >
            Adjust
          </Button>
          <Button
            variant="primary"
            size={actionSize}
            iconRight={<ArrowUpRight size={actionIcon} strokeWidth={2.2} />}
            onClick={() => router.push(plannerHref)}
          >
            Build trip here
          </Button>
        </div>
      </footer>
    </motion.div>
  );
}
