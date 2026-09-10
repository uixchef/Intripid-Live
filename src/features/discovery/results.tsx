"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getMonth, parseISO } from "date-fns";
import { motion } from "motion/react";
import {
  ArrowLeft,
  ArrowUpRight,
  Banknote,
  CalendarRange,
  Clock3,
  Languages,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Confidence,
  FactorBar,
  ScoreRing,
  SeasonSpark,
} from "@/components/ui/meter";
import { Modal } from "@/components/ui/overlay";
import { INTEREST_META } from "@/lib/categories";
import { distinctReasons, resolveWindow } from "@/lib/discovery/scoring";
import { cn } from "@/lib/utils";
import type {
  DiscoveryPreferences,
  FilterStage,
  Recommendation,
  RecommendationSet,
} from "@/lib/types";

import styles from "./results.module.css";

/** "New York, United States" — skips a region that just repeats the city. */
function locationLine(recommendation: Recommendation): string {
  const { region, country, name } = recommendation.destination;
  if (!region || region === name || name.includes(region)) return country;
  return `${region}, ${country}`;
}

const PLACE_LABEL = ["Best match", "Second", "Third"];

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

  /*
   * Phrased against each other, not independently — see `distinctReasons`.
   * Three cards that all say "among the best anywhere for museums and fine
   * dining" give you nothing to choose on.
   */
  const reasons = useMemo(() => distinctReasons(result.top), [result.top]);

  if (!best) {
    return (
      <div className={styles.empty}>
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
  /** The full top three, so the brief can offer the other two. */
  top: Recommendation[];
  onBack: () => void;
  onSelect: (id: string) => void;
  tripId: string | null;
}

/**
 * The handoff from discovery to planning.
 *
 * Deliberately not a tourism page. It answers only the questions a traveller
 * has at the moment of committing — why here, does it fit my dates and money,
 * what will I actually do — then gets out of the way.
 *
 * The other two matches stay reachable in the header as a ranked selector,
 * which replaces the original's corner ribbon and floating chevrons: the set
 * size is visible and switching is one tap.
 */
export function DestinationBrief({
  recommendation,
  prefs,
  top,
  onBack,
  onSelect,
  tripId,
}: DestinationBriefProps) {
  const router = useRouter();
  const [notSeeded, setNotSeeded] = useState(false);
  const { destination, score, confidence, factors, estimatedBudgetUsd } =
    recommendation;

  const window = resolveWindow(prefs);
  const tripMonths = window.months.length
    ? window.months
    : prefs.startDate
      ? [getMonth(parseISO(prefs.startDate))]
      : [];
  const nights = window.nights;

  const [idealMin, idealMax] = destination.idealDays;
  const lengthNote =
    nights === null
      ? `${idealMin}–${idealMax} days is about right here.`
      : nights < idealMin
        ? `You have ${nights} nights; ${idealMin} is the realistic minimum.`
        : nights > idealMax
          ? `${nights} nights is generous — there's room to go slowly.`
          : `${nights} nights fits ${destination.name} well.`;

  return (
    <motion.div
      className={styles.brief}
      data-brief=""
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12 }}
      transition={{ duration: 0.26, ease: [0.2, 0, 0, 1] }}
    >
      <div className={styles.briefNav}>
        <button type="button" onClick={onBack} className={styles.backLink}>
          <ArrowLeft size={13} strokeWidth={2.2} />
          All three
        </button>
        <div className={styles.slots} role="tablist" aria-label="Your matches">
          {top.map((entry, index) => (
            <button
              key={entry.destination.id}
              type="button"
              role="tab"
              aria-selected={entry.destination.id === destination.id}
              className={cn(
                styles.slot,
                entry.destination.id === destination.id && styles.slotOn,
              )}
              onClick={() => onSelect(entry.destination.id)}
            >
              <span className={styles.slotRank}>{index + 1}</span>
              <span className={styles.slotName}>{entry.destination.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.briefScroll}>
        <header className={styles.briefHead}>
          <div className={styles.briefTitleRow}>
            <div className={styles.briefTitleBlock}>
              <span className={styles.briefRank}>
                {PLACE_LABEL[recommendation.rank - 1] ??
                  `#${recommendation.rank} match`}
              </span>
              <h2 className={styles.briefName}>
                {destination.name}
                <span className={styles.briefFlag} aria-hidden>
                  {destination.flag}
                </span>
              </h2>
              <p className={styles.briefWhere}>{locationLine(recommendation)}</p>
            </div>
            <div className={styles.briefScore}>
              <ScoreRing score={score} size={54} />
              <Confidence confidence={confidence} />
            </div>
          </div>

          <p className={styles.briefBlurb}>{destination.blurb}</p>
        </header>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Does it fit?</h3>
          <dl className={styles.fitGrid}>
            <div className={styles.fitCell}>
              <dt>
                <CalendarRange size={13} strokeWidth={1.9} />
                Your window
              </dt>
              <dd>{nights !== null ? `${nights} nights` : "Not set"}</dd>
              <p>{lengthNote}</p>
            </div>
            <div className={styles.fitCell}>
              <dt>
                <Banknote size={13} strokeWidth={1.9} />
                On the ground
              </dt>
              <dd className="tabular">
                {estimatedBudgetUsd !== null
                  ? `~$${estimatedBudgetUsd.toLocaleString()}`
                  : "Set a budget"}
              </dd>
              <p>
                {prefs.budget
                  ? `About $${destination.dailyBudgetUsd[prefs.budget]} a day per person, excluding flights.`
                  : "Pick a budget band to see an estimate."}
              </p>
            </div>
          </dl>
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Why it placed here</h3>
          <div className={styles.factors}>
            {factors.map((factor) => (
              <FactorBar
                key={factor.key}
                label={factor.label}
                score={factor.score}
                weight={factor.weight}
                detail={factor.detail}
              />
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Why you&rsquo;ll love it</h3>
          <ul className={styles.loveList}>
            {destination.whyYoullLoveIt.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Through the year</h3>
          <SeasonSpark
            values={destination.season.map((month) => month.score)}
            highlight={tripMonths}
          />
          {tripMonths.length > 0 ? (
            <p className={styles.sectionNote}>
              {destination.season[tripMonths[0]].label} when you&rsquo;re going —
              highs around {destination.season[tripMonths[0]].highC}°C, lows{" "}
              {destination.season[tripMonths[0]].lowC}°C.
            </p>
          ) : null}
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>
            What you&rsquo;d actually do
            <span className={styles.sectionHint}>Shown on the map</span>
          </h3>
          <ul className={styles.attractionList}>
            {destination.attractions.slice(0, 5).map((attraction) => (
              <li key={attraction.name}>
                <span className={styles.attractionName}>{attraction.name}</span>
                <span className={styles.attractionNote}>{attraction.note}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Good to know</h3>
          <ul className={styles.practicalList}>
            <li>
              <Clock3 size={13} strokeWidth={1.9} />
              <span>{destination.timezone.replace(/_/g, " ")}</span>
            </li>
            <li>
              <Banknote size={13} strokeWidth={1.9} />
              <span>{destination.currency}</span>
            </li>
            <li>
              <Languages size={13} strokeWidth={1.9} />
              <span>{destination.language}</span>
            </li>
            <li>
              <CalendarRange size={13} strokeWidth={1.9} />
              <span>
                Best in {idealMin}–{idealMax} days
              </span>
            </li>
          </ul>
        </section>
      </div>

      <footer className={styles.briefFooter}>
        <div className={styles.footerCopy}>
          <p className={styles.footerTitle}>Ready to build it out?</p>
          <p className={styles.footerBody}>
            We&rsquo;ll open a{" "}
            {nights !== null ? `${nights}-night` : ""} timeline you can fill in.
          </p>
        </div>
        <Button
          variant="primary"
          size="lg"
          iconRight={<ArrowUpRight size={15} strokeWidth={2.2} />}
          onClick={() => {
            if (tripId) router.push(`/trip/${tripId}`);
            else setNotSeeded(true);
          }}
        >
          Start planning
        </Button>
      </footer>

      <Modal
        open={notSeeded}
        onClose={() => setNotSeeded(false)}
        label="Itinerary not seeded"
        width={430}
      >
        <div className={styles.modalBody}>
          <span className={styles.modalIcon} aria-hidden>
            <Sparkles size={16} strokeWidth={1.9} />
          </span>
          <h3 className={styles.modalTitle}>
            {destination.name} has no seeded itinerary yet
          </h3>
          <p className={styles.modalText}>
            This build ships one fully planned trip — five days in New York — so
            the planner can be explored with real content rather than an empty
            grid.
          </p>
          <div className={styles.modalActions}>
            <Button variant="ghost" onClick={() => setNotSeeded(false)}>
              Keep looking
            </Button>
            <Button
              variant="primary"
              iconRight={<ArrowUpRight size={14} strokeWidth={2.2} />}
              onClick={() => router.push("/trip/nyc-spring")}
            >
              Open the New York trip
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
