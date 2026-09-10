"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, Loader2 } from "lucide-react";

import { INTEREST_META, STYLE_META } from "@/lib/categories";
import { cn } from "@/lib/utils";
import type { DiscoveryPreferences, Recommendation } from "@/lib/types";

import styles from "./processing.module.css";

/**
 * The narrated recommendation pass.
 *
 * Inherited directly from the historical product, which narrated its work
 * ("Found 72 possible destination ports — these ports exist but not all of
 * them will be reachable"). It is the right pattern and worth keeping: naming
 * each step makes the ranking legible instead of magical, and it earns the
 * two seconds it costs.
 *
 * Every line is derived from the traveller's actual answers and the actual
 * result set. Nothing here is decorative filler.
 */

export interface ProcessingProps {
  prefs: DiscoveryPreferences;
  recommendations: Recommendation[];
  onDone: () => void;
}

export function Processing({ prefs, recommendations, onDone }: ProcessingProps) {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);

  const lines = useMemo(() => {
    const total = recommendations.length;
    const reachable = recommendations.filter((r) => {
      const distance = r.factors.find((f) => f.key === "distance");
      return !distance || distance.score > 0.3;
    }).length;

    const inSeason = recommendations.filter((r) => {
      const season = r.factors.find((f) => f.key === "season");
      return !season || season.score >= 0.55;
    }).length;

    const strong = recommendations.filter((r) => r.score >= 70).length;

    const styleWords = prefs.styles
      .slice(0, 3)
      .map((s) => STYLE_META[s].label.toLowerCase());
    const interestWords = prefs.interests
      .slice(0, 3)
      .map((i) => INTEREST_META[i].label.toLowerCase());

    const steps: { text: string; detail: string }[] = [
      {
        text: `Opened ${total} destinations`,
        detail: "Everything we know well enough to recommend honestly.",
      },
    ];

    if (prefs.origin) {
      steps.push({
        text: `${reachable} are worth the flight from ${prefs.origin.city}`,
        detail:
          prefs.scope === "domestic"
            ? `Filtered to ${prefs.origin.country}, as you asked.`
            : prefs.scope === "international"
              ? `Ruled out ${prefs.origin.country}.`
              : "Distance costs trip time, so far places need to earn it.",
      });
    }

    if (prefs.startDate) {
      steps.push({
        text: `${inSeason} are in decent shape for your dates`,
        detail:
          prefs.dateMode === "flexible"
            ? "You're flexible, so we took each place's best nearby month."
            : "Seasonal weather scored month by month, not as an annual average.",
      });
    }

    if (styleWords.length > 0) {
      steps.push({
        text: `Weighed ${styleWords.join(", ")} against what each place actually does well`,
        detail: "Trip style carries the most weight of anything you told us.",
      });
    }

    if (interestWords.length > 0) {
      steps.push({
        text: `Checked ${interestWords.join(", ")} city by city`,
        detail: "Used to break ties, and to explain the ranking afterwards.",
      });
    }

    steps.push({
      text: `${strong} strong ${strong === 1 ? "match" : "matches"}, ranked`,
      detail: "Each one can tell you why it placed where it did.",
    });

    return steps;
  }, [prefs, recommendations]);

  // Advance the narration, then hand over.
  useEffect(() => {
    if (reduceMotion) {
      const timer = window.setTimeout(onDone, 420);
      return () => window.clearTimeout(timer);
    }

    if (index >= lines.length) {
      const timer = window.setTimeout(onDone, 460);
      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(
      () => setIndex((value) => value + 1),
      index === 0 ? 340 : 400,
    );
    return () => window.clearTimeout(timer);
  }, [index, lines.length, onDone, reduceMotion]);

  const progress = Math.min(1, index / lines.length);

  return (
    <div className={styles.root}>
      <div className={styles.head}>
        <span className="eyebrow">Working</span>
        <h2 className={styles.title}>Reading your answers</h2>
      </div>

      <div className={styles.track} aria-hidden>
        <motion.span
          className={styles.fill}
          initial={{ width: 0 }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: reduceMotion ? 0 : 0.34, ease: [0.2, 0.8, 0.2, 1] }}
        />
      </div>

      <ol className={styles.lines} aria-live="polite">
        <AnimatePresence initial={false}>
          {lines.slice(0, reduceMotion ? lines.length : index).map((line, i) => (
            <motion.li
              key={line.text}
              className={styles.line}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
            >
              <span
                className={cn(
                  styles.bullet,
                  i === index - 1 && !reduceMotion
                    ? styles.bulletActive
                    : styles.bulletDone,
                )}
                aria-hidden
              >
                {i === index - 1 && !reduceMotion ? (
                  <Loader2 size={11} strokeWidth={2.6} />
                ) : (
                  <Check size={11} strokeWidth={3} />
                )}
              </span>
              <span className={styles.lineBody}>
                <span className={styles.lineText}>{line.text}</span>
                <span className={styles.lineDetail}>{line.detail}</span>
              </span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>
    </div>
  );
}
