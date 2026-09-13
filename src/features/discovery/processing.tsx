"use client";

import { useEffect } from "react";
import { motion } from "motion/react";

import { Hummingbird } from "@/components/brand/hummingbird";
import type { DiscoveryPreferences, RecommendationSet } from "@/lib/types";

import styles from "./processing.module.css";

/**
 * The narrated search.
 *
 * There is a real delay here and the original product's answer was the right
 * one: narrate the actual work with live counts rather than showing a
 * spinner. Every line is derived from a filter stage that genuinely ran, and
 * the number it reports is the number it eliminated.
 *
 * The bird holds a hover rather than spinning — a hummingbird sustains
 * position, and an indeterminate spinner would be a lie about progress. This
 * is also the one place in discovery where the character is allowed on
 * screen: low information, high uncertainty.
 *
 * The map participates. `stage` is lifted so the canvas can cull pins in the
 * same order the reasoning happened.
 */

export interface ProcessingProps {
  prefs: DiscoveryPreferences;
  result: RecommendationSet;
  /** How many narrated stages have completed. */
  stage: number;
  onAdvance: () => void;
  onDone: () => void;
  reduceMotion: boolean;
}

/** Steps per stage, in ms. Deliberately brisk — no ceremony. */
const STEP_MS = 620;

export function Processing({
  prefs,
  result,
  stage,
  onAdvance,
  onDone,
  reduceMotion,
}: ProcessingProps) {
  const lines = buildLines(prefs, result);
  const total = lines.length;

  useEffect(() => {
    if (reduceMotion) {
      const timer = window.setTimeout(onDone, 500);
      return () => window.clearTimeout(timer);
    }
    if (stage >= total) {
      const timer = window.setTimeout(onDone, 520);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(onAdvance, stage === 0 ? 340 : STEP_MS);
    return () => window.clearTimeout(timer);
  }, [stage, total, onAdvance, onDone, reduceMotion]);

  const shown = reduceMotion ? total : stage;
  const progress = total > 0 ? Math.min(1, shown / total) : 1;

  return (
    <div className={styles.root}>
      <div className={styles.head}>
        <Hummingbird
          mood="focused"
          size={58}
          hovering={!reduceMotion}
          className={styles.bird}
        />
        <div>
          <p className={styles.eyebrow}>Searching</p>
          <h2 className={styles.title}>
            Finding where you can actually get to
          </h2>
        </div>
      </div>

      {/* Real progress, not a shimmer. The Figma bar is different; keep ours. */}
      <div className={styles.track} aria-hidden>
        <motion.span
          className={styles.fill}
          initial={{ width: 0 }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: reduceMotion ? 0 : 0.3, ease: [0.2, 0, 0, 1] }}
        />
      </div>
    </div>
  );
}

interface Line {
  text: string;
  detail: string;
  /** Remaining candidates after this stage, when meaningful. */
  count: number | null;
}

/**
 * The narration. Every line reports a stage that really executed and the
 * count it really produced — the whole point of narrating instead of
 * spinning is that the numbers are true.
 */
function buildLines(
  prefs: DiscoveryPreferences,
  result: RecommendationSet,
): Line[] {
  const first = result.stages[0]?.entered ?? result.ranked.length;

  const lines: Line[] = [
    {
      text: `Opened ${first} destinations we know well`,
      detail: "Only places we can recommend honestly, with real cost data.",
      count: first,
    },
  ];

  let remaining = first;
  for (const stage of result.stages) {
    remaining = stage.entered - stage.removed;
    lines.push({
      text: stage.label,
      detail:
        stage.removed > 0
          ? `${stage.detail} ${stage.removed} ruled out.`
          : `${stage.detail} Nothing ruled out.`,
      count: remaining,
    });
  }

  if (prefs.interests.length > 0) {
    lines.push({
      text: `Ranking the ${remaining} survivors against what you'd like to do`,
      detail: "Activities order the results; they never eliminate a city.",
      count: null,
    });
  } else if (prefs.populated && prefs.populated !== "open") {
    lines.push({
      text:
        prefs.populated === "popular"
          ? "Giving well-known cities a boost"
          : "Giving quieter places a boost",
      detail: "Scale is a preference, not a filter — nothing is ruled out.",
      count: null,
    });
  }

  lines.push({
    text: result.relaxed
      ? "Nothing cleared every filter, so we loosened the must-haves"
      : `Picking the three strongest of ${remaining}`,
    detail: result.relaxed
      ? "We'd rather show you the closest matches than an empty screen."
      : "Each one can tell you exactly why it placed where it did.",
    count: null,
  });

  return lines;
}
