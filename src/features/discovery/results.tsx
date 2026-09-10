"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getMonth, parseISO } from "date-fns";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  ArrowUpRight,
  Banknote,
  CalendarRange,
  Clock3,
  Globe,
  Languages,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/chip";
import { Confidence, FactorBar, ScoreRing, SeasonSpark } from "@/components/ui/meter";
import { Modal } from "@/components/ui/overlay";
import { INTEREST_META } from "@/lib/categories";
import { leadReason } from "@/lib/discovery/scoring";
import { cn } from "@/lib/utils";
import type { DiscoveryPreferences, Recommendation } from "@/lib/types";

import styles from "./results.module.css";

/** "New York, United States" — skips a region that just repeats the city. */
function locationLine(recommendation: Recommendation): string {
  const { region, country, name } = recommendation.destination;
  if (!region || region === name || name.includes(region)) return country;
  return `${region}, ${country}`;
}

/* -------------------------------------------------------------------------- */
/* Ranked list                                                               */
/* -------------------------------------------------------------------------- */

export interface ResultsRailProps {
  recommendations: Recommendation[];
  activeId: string | null;
  hoveredId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}

export function ResultsRail({
  recommendations,
  activeId,
  hoveredId,
  onSelect,
  onHover,
}: ResultsRailProps) {
  const reduceMotion = useReducedMotion();
  const strong = recommendations.filter((r) => r.score >= 60);
  const rest = recommendations.filter((r) => r.score < 60);

  return (
    <div className={styles.rail}>
      <header className={styles.railHead}>
        <span className="eyebrow">Your matches</span>
        <h2 className={styles.railTitle}>
          {strong.length > 0
            ? `${strong.length} ${strong.length === 1 ? "place" : "places"} worth your time`
            : "Nothing scored well"}
        </h2>
        <p className={styles.railWhy}>
          {strong.length > 0
            ? "Ranked on fit, not popularity. Open one to see how it scored."
            : "Loosen a preference — the constraints are ruling everything out."}
        </p>
      </header>

      <ol className={styles.list}>
        {recommendations.map((recommendation, index) => {
          const { destination, rank, score } = recommendation;
          const isActive = activeId === destination.id;
          const isHovered = hoveredId === destination.id;
          const isWeak = score < 60;

          return (
            <motion.li
              key={destination.id}
              layout={!reduceMotion}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.34,
                ease: [0.2, 0.8, 0.2, 1],
                delay: reduceMotion ? 0 : Math.min(index * 0.035, 0.28),
              }}
            >
              {rank === rest[0]?.rank && rest.length > 0 && strong.length > 0 ? (
                <p className={styles.divider}>
                  <span>Weaker fits</span>
                </p>
              ) : null}

              <button
                type="button"
                onClick={() => onSelect(destination.id)}
                onPointerEnter={() => onHover(destination.id)}
                onPointerLeave={() => onHover(null)}
                aria-current={isActive}
                className={cn(
                  styles.card,
                  isActive && styles.cardActive,
                  isHovered && styles.cardHovered,
                  isWeak && styles.cardWeak,
                )}
              >
                <span className={cn(styles.rank, "tabular")}>{rank}</span>

                <span className={styles.cardBody}>
                  <span className={styles.cardTop}>
                    <span className={styles.cardName}>
                      {destination.name}
                      <span className={styles.flag} aria-hidden>
                        {destination.flag}
                      </span>
                    </span>
                    <span className={styles.cardWhere}>
                      {locationLine(recommendation)}
                    </span>
                  </span>

                  <span className={styles.cardReason}>
                    {leadReason(recommendation)}
                  </span>

                  {recommendation.matchedInterests.length > 0 ? (
                    <span className={styles.cardTags}>
                      {recommendation.matchedInterests.slice(0, 3).map((interest) => (
                        <Tag key={interest} tone="accent">
                          {INTEREST_META[interest].label}
                        </Tag>
                      ))}
                      {recommendation.estimatedBudgetUsd !== null ? (
                        <Tag tone="neutral">
                          ~${recommendation.estimatedBudgetUsd.toLocaleString()} on
                          the ground
                        </Tag>
                      ) : null}
                    </span>
                  ) : null}
                </span>

                <ScoreRing score={score} size={40} className={styles.cardRing} />
              </button>
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Destination brief — the bridge into planning                              */
/* -------------------------------------------------------------------------- */

export interface DestinationBriefProps {
  recommendation: Recommendation;
  prefs: DiscoveryPreferences;
  onBack: () => void;
  /** Trip id to open, when one is seeded for this destination. */
  tripId: string | null;
}

/**
 * The handoff from discovery to planning.
 *
 * Deliberately not a tourism page. It answers only the questions a traveller
 * has at the moment of committing — why here, does it fit my dates and money,
 * what will I actually do — and then gets out of the way. Photography is
 * absent on purpose: this is a product decision surface, and stock hero images
 * would make it read as marketing.
 */
export function DestinationBrief({
  recommendation,
  prefs,
  onBack,
  tripId,
}: DestinationBriefProps) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [notSeeded, setNotSeeded] = useState(false);
  const { destination, score, confidence, factors, estimatedBudgetUsd } = recommendation;

  const tripMonths = prefs.startDate
    ? [
        getMonth(parseISO(prefs.startDate)),
        ...(prefs.endDate ? [getMonth(parseISO(prefs.endDate))] : []),
      ]
    : [];

  const nights =
    prefs.startDate && prefs.endDate
      ? Math.round(
          (parseISO(prefs.endDate).getTime() - parseISO(prefs.startDate).getTime()) /
            86_400_000,
        )
      : null;

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
      initial={{ opacity: 0, x: -18 }}
      animate={{ opacity: 1, x: 0 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -14 }}
      transition={{ duration: reduceMotion ? 0.14 : 0.32, ease: [0.2, 0.8, 0.2, 1] }}
    >
      <div className={styles.briefScroll}>
        <button type="button" onClick={onBack} className={styles.backLink}>
          <ArrowRight size={13} strokeWidth={2} className={styles.backIcon} />
          All matches
        </button>

        <header className={styles.briefHead}>
          <div className={styles.briefTitleRow}>
            <div className={styles.briefTitleBlock}>
              <span className={styles.briefRank}>
                #{recommendation.rank} match
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

        {/* Trip fit — the practical answer to "does this work for me?" */}
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

        {/* Why here — the explainable score */}
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

        {/* Editorial — three real reasons */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Why you&rsquo;ll love it</h3>
          <ul className={styles.loveList}>
            {destination.whyYoullLoveIt.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </section>

        {/* Seasonal shape */}
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

        {/* What you'd actually do — these are the pins on the map */}
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

        {/* Practical footnotes */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Good to know</h3>
          <ul className={styles.practicalList}>
            <li>
              <Globe size={13} strokeWidth={1.9} />
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
              <Clock3 size={13} strokeWidth={1.9} />
              <span>
                Best in {idealMin}–{idealMax} days
              </span>
            </li>
          </ul>
        </section>
      </div>

      {/* The commit bar stays pinned — the decision is always one reach away. */}
      <footer className={styles.briefFooter}>
        <div className={styles.footerCopy}>
          <p className={styles.footerTitle}>Ready to build it out?</p>
          <p className={styles.footerBody}>
            We&rsquo;ll open a {nights !== null ? `${nights}-night` : ""} timeline
            you can fill in.
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
            This build ships one fully planned trip — five days in New York —
            so the planner can be explored with real content rather than an
            empty grid.
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
