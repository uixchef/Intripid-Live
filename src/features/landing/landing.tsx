"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, CalendarRange, Compass, MapPin } from "lucide-react";

import { Hummingbird } from "@/components/brand/hummingbird";
import { Logo } from "@/components/brand/mark";
import { Button } from "@/components/ui/button";
import { ScoreRing } from "@/components/ui/meter";
import { DESTINATIONS } from "@/data/destinations";
import { INTEREST_META } from "@/lib/categories";
import { distinctReasons, recommend } from "@/lib/discovery/scoring";
import type { DiscoveryPreferences } from "@/lib/types";

import env from "../discovery/environment.module.css";
import styles from "./landing.module.css";

/**
 * The doorway.
 *
 * Not a marketing page — the product's own front door, and deliberately in
 * the discovery environment rather than a neutral app shell, so the world you
 * are about to enter is visible before you enter it.
 *
 * The preview is computed by the real engine against a real preference set,
 * so the three cards are what the product would actually say.
 */

const PREVIEW_PREFS: DiscoveryPreferences = {
  dateMode: "specific",
  startDate: "2026-04-14",
  endDate: "2026-04-18",
  weekendShape: "fri-sun",
  flexibleMonth: 3,
  flexibleNights: 5,
  origin: {
    city: "London",
    country: "United Kingdom",
    countryCode: "GB",
    coords: { lng: -0.1276, lat: 51.5072 },
  },
  originConfirmed: true,
  scope: "international",
  budget: "premium",
  incomeBand: null,
  styles: ["city", "culture", "food"],
  interests: ["museums", "fine-dining", "architecture"],
};

export function Landing() {
  const preview = recommend(DESTINATIONS, PREVIEW_PREFS).top;
  /* Phrased against each other, so the doorway does not show three cards
     that all say the same sentence. */
  const previewReasons = distinctReasons(preview);

  return (
    <main className={`${styles.root} ${env.root} onEnv`}>
      <div className={env.atmosphere} aria-hidden />
      <div className={env.grain} aria-hidden />

      <header className={styles.header}>
        <Logo size={21} />
        <Link href="/trip/nyc-spring" className={styles.headerLink}>
          <span>Open the New York trip</span>
          <ArrowRight size={13} strokeWidth={2.2} />
        </Link>
      </header>

      <div className={styles.body}>
        <motion.section
          className={styles.copy}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, ease: [0.2, 0, 0, 1] }}
        >
          <span className={styles.eyebrow}>Destination discovery</span>

          <h1 className={styles.headline}>
            You don&rsquo;t need to know
            <br />
            <em>where</em> yet.
          </h1>

          <p className={styles.lede}>
            Most travel tools open with a search box, which only helps if you
            already have the answer. Intripid starts with your dates, your
            money and what you actually care about — then shows you where those
            things point, and why.
          </p>

          <div className={styles.actions}>
            <Link href="/discover">
              <Button
                variant="primary"
                size="lg"
                iconRight={<ArrowRight size={15} strokeWidth={2.2} />}
              >
                Help me explore
              </Button>
            </Link>
            <span className={styles.actionsNote}>
              Six questions. You can stop after two.
            </span>
          </div>

          <ul className={styles.premise}>
            <li>
              <span className={styles.premiseIcon} aria-hidden>
                <Compass size={14} strokeWidth={2} />
              </span>
              <span>
                <strong>Three places, not a catalogue.</strong> Every one
                explains how it scored and how much of that rests on guesswork.
              </span>
            </li>
            <li>
              <span className={styles.premiseIcon} aria-hidden>
                <MapPin size={14} strokeWidth={2} />
              </span>
              <span>
                <strong>The map does the talking.</strong> Answers cull pins in
                real time instead of filling a form you can&rsquo;t see.
              </span>
            </li>
            <li>
              <span className={styles.premiseIcon} aria-hidden>
                <CalendarRange size={14} strokeWidth={2} />
              </span>
              <span>
                <strong>Then it becomes a timeline.</strong> A trip is a
                schedule with stays, meals and travel time — not a list of
                bookmarks.
              </span>
            </li>
          </ul>
        </motion.section>

        {/* What the output actually looks like, from the real engine. */}
        <motion.section
          className={`${styles.preview} ${env.glass}`}
          aria-label="Example recommendation"
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.46, ease: [0.2, 0, 0, 1], delay: 0.1 }}
        >
          <div className={styles.previewHead}>
            <div>
              <span className={styles.previewEyebrow}>A real answer</span>
              <p className={styles.previewMeta}>
                5 nights from London · Premium · city, culture, food
              </p>
            </div>
            <Hummingbird mood="curious" size={44} className={styles.bird} />
          </div>

          <ol className={styles.previewList}>
            {preview.map((recommendation, index) => (
              <li
                key={recommendation.destination.id}
                className={
                  index === 0 ? styles.previewCardBest : styles.previewCard
                }
              >
                {index === 0 ? (
                  <span className={styles.bestTag}>Best match</span>
                ) : (
                  <span className={styles.rankTag}>{index + 1}</span>
                )}
                <span className={styles.previewBody}>
                  <span className={styles.previewName}>
                    {recommendation.destination.name}
                    <span aria-hidden>{recommendation.destination.flag}</span>
                  </span>
                  <span className={styles.previewReason}>
                    {previewReasons[index]}
                  </span>
                  {index === 0 ? (
                    <span className={styles.previewTags}>
                      {recommendation.matchedInterests
                        .slice(0, 2)
                        .map((interest) => (
                          <span key={interest} className={styles.previewTag}>
                            {INTEREST_META[interest].label}
                          </span>
                        ))}
                    </span>
                  ) : null}
                </span>
                <ScoreRing
                  score={recommendation.score}
                  size={index === 0 ? 44 : 34}
                />
              </li>
            ))}
          </ol>

          <p className={styles.previewFoot}>
            Change one answer and this changes.
          </p>
        </motion.section>
      </div>

      <footer className={styles.journey}>
        <ol className={styles.journeySteps}>
          <li className={styles.journeyStepOn}>
            <span className={styles.journeyNum}>1</span>
            Narrow it down
          </li>
          <li>
            <span className={styles.journeyNum}>2</span>
            Choose a destination
          </li>
          <li>
            <span className={styles.journeyNum}>3</span>
            Build the timeline
          </li>
        </ol>
        <p className={styles.tagline}>
          Smart enough to plan the trip. Warm enough to make you want to take
          it.
        </p>
      </footer>
    </main>
  );
}
