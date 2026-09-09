"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, CalendarRange, Compass, MapPin } from "lucide-react";

import { Logo } from "@/components/brand/mark";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/chip";
import { ScoreRing } from "@/components/ui/meter";
import { DESTINATIONS } from "@/data/destinations";
import { leadReason, recommend } from "@/lib/discovery/scoring";

import styles from "./landing.module.css";

/**
 * The entry.
 *
 * Not a marketing page — the product's own front door. It states the premise
 * (you may not know where to go yet), shows what the output actually looks
 * like, and offers two ways in. The preview is computed by the real scoring
 * engine against a real preference set, so what you see here is what the
 * product would actually say.
 */

/** A representative traveller, used only to compute the preview ranking. */
const PREVIEW_PREFS = {
  dateMode: "exact" as const,
  startDate: "2026-04-14",
  endDate: "2026-04-18",
  origin: {
    city: "London",
    country: "United Kingdom",
    countryCode: "GB",
    coords: { lng: -0.1276, lat: 51.5072 },
  },
  scope: "international" as const,
  budget: "premium" as const,
  styles: ["city" as const, "culture" as const, "food" as const],
  interests: ["museums" as const, "fine-dining" as const, "architecture" as const],
};

export function Landing() {
  const reduceMotion = useReducedMotion();
  const preview = recommend(DESTINATIONS, PREVIEW_PREFS).slice(0, 3);

  return (
    <main className={styles.root}>
      <div className={styles.grain} aria-hidden />

      <header className={styles.header}>
        <Logo size={21} />
        <Link href="/trip/nyc-spring" className={styles.headerLink}>
          Open the New York trip
          <ArrowRight size={13} strokeWidth={2.2} />
        </Link>
      </header>

      <div className={styles.body}>
        <motion.section
          className={styles.copy}
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0.2 : 0.55, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <span className="eyebrow">Destination discovery</span>

          <h1 className={styles.headline}>
            You don&rsquo;t need to know
            <br />
            <em>where</em> yet.
          </h1>

          <p className={styles.lede}>
            Most travel tools start with a search box, which only works if you
            already have the answer. Intripid starts with your dates, your
            money and what you actually enjoy — then shows you where those
            things point, and why.
          </p>

          <div className={styles.actions}>
            <Link href="/discover">
              <Button
                variant="primary"
                size="lg"
                iconRight={<ArrowRight size={15} strokeWidth={2.2} />}
              >
                Find where to go
              </Button>
            </Link>
            <span className={styles.actionsNote}>
              Five questions. You can stop after two.
            </span>
          </div>

          <ul className={styles.premise}>
            <li>
              <span className={styles.premiseIcon} aria-hidden>
                <Compass size={14} strokeWidth={1.9} />
              </span>
              <span>
                <strong>Ranked, not listed.</strong> Every place explains how it
                scored and how much of that rests on guesswork.
              </span>
            </li>
            <li>
              <span className={styles.premiseIcon} aria-hidden>
                <MapPin size={14} strokeWidth={1.9} />
              </span>
              <span>
                <strong>The map does the talking.</strong> Answers move pins in
                real time instead of filling in a form you can&rsquo;t see.
              </span>
            </li>
            <li>
              <span className={styles.premiseIcon} aria-hidden>
                <CalendarRange size={14} strokeWidth={1.9} />
              </span>
              <span>
                <strong>Then it becomes a timeline.</strong> A trip is a
                schedule with stays, meals and travel time — not a list of
                bookmarks.
              </span>
            </li>
          </ul>
        </motion.section>

        {/* What the output looks like, from the real engine. */}
        <section className={styles.preview} aria-label="Example recommendations">
          <div className={styles.previewHead}>
            <span className="eyebrow">A sample answer</span>
            <p className={styles.previewMeta}>
              5 nights from London · Premium · city, culture, food
            </p>
          </div>

          <ol className={styles.previewList}>
            {preview.map((recommendation, index) => (
              <motion.li
                key={recommendation.destination.id}
                className={styles.previewCard}
                initial={
                  reduceMotion ? { opacity: 0 } : { opacity: 0, y: 22, scale: 0.97 }
                }
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  duration: reduceMotion ? 0.2 : 0.5,
                  ease: [0.2, 0.8, 0.2, 1],
                  delay: reduceMotion ? 0 : 0.16 + index * 0.09,
                }}
              >
                <span className={styles.previewRank}>{recommendation.rank}</span>
                <span className={styles.previewBody}>
                  <span className={styles.previewName}>
                    {recommendation.destination.name}
                    <span aria-hidden>{recommendation.destination.flag}</span>
                  </span>
                  <span className={styles.previewReason}>
                    {leadReason(recommendation)}
                  </span>
                  <span className={styles.previewTags}>
                    {recommendation.matchedInterests.slice(0, 2).map((interest) => (
                      <Tag key={interest} tone="accent">
                        {interest.replace("-", " ")}
                      </Tag>
                    ))}
                  </span>
                </span>
                <ScoreRing score={recommendation.score} size={38} />
              </motion.li>
            ))}
          </ol>

          <p className={styles.previewFoot}>
            Change one answer and this order changes.
          </p>
        </section>
      </div>

      {/* The whole product in one line — discovery is only the first third. */}
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
      </footer>
    </main>
  );
}
