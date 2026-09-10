"use client";

import { motion, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";

import styles from "./meter.module.css";

/* -------------------------------------------------------------------------- */
/* Score ring                                                                */
/* -------------------------------------------------------------------------- */

export interface ScoreRingProps {
  /** 0..100 */
  score: number;
  size?: number;
  /** Renders the number inside the ring. */
  showValue?: boolean;
  className?: string;
  label?: string;
}

/**
 * A destination's match score.
 *
 * The ring is a progress arc rather than a pie: it reads as "how far along a
 * scale" instead of "what share of a whole", which is what a fit score
 * actually means. Colour shifts with the band so a weak match never wears the
 * confident brand violet.
 */
export function ScoreRing({
  score,
  size = 44,
  showValue = true,
  className,
  label,
}: ScoreRingProps) {
  const reduceMotion = useReducedMotion();
  const clamped = Math.max(0, Math.min(100, score));
  const stroke = size >= 40 ? 3.5 : 3;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  /*
   * A full-circle track. An earlier version left an 18% gap at the bottom so
   * the arc had visible ends, but the track's round cap read as a stray tick
   * rather than as a deliberate scale.
   */
  const arc = circumference;
  const filled = (clamped / 100) * arc;

  const tone =
    clamped >= 78 ? "strong" : clamped >= 58 ? "fair" : "weak";

  return (
    <div
      className={cn(styles.ring, styles[`ring_${tone}`], className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={label ?? `Match score ${Math.round(clamped)} out of 100`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--slate-200)"
            strokeWidth={stroke}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--ring-color)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${filled} ${circumference}`}
            initial={{ strokeDasharray: `0 ${circumference}` }}
            animate={{ strokeDasharray: `${filled} ${circumference}` }}
            transition={{ duration: reduceMotion ? 0 : 0.62, ease: [0.2, 0.8, 0.2, 1] }}
          />
        </g>
      </svg>
      {showValue ? (
        <span className={cn(styles.ringValue, "tabular")}>
          {Math.round(clamped)}
        </span>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Factor bar                                                                */
/* -------------------------------------------------------------------------- */

export interface FactorBarProps {
  label: string;
  /** 0..1 */
  score: number;
  /** 0..1 — rendered as the label's weight annotation. */
  weight?: number;
  detail?: string;
  className?: string;
}

/**
 * One reason behind a score. Shows both how well the factor matched and how
 * much it counted, because a perfect match on something that barely mattered
 * is not a reason to book a flight.
 */
export function FactorBar({
  label,
  score,
  weight,
  detail,
  className,
}: FactorBarProps) {
  const reduceMotion = useReducedMotion();
  const pct = Math.max(0, Math.min(1, score)) * 100;
  const tone = score >= 0.72 ? "strong" : score >= 0.45 ? "fair" : "weak";

  return (
    <div className={cn(styles.factor, className)}>
      <div className={styles.factorHead}>
        <span className={styles.factorLabel}>{label}</span>
        {weight !== undefined ? (
          <span className={cn(styles.factorWeight, "tabular")}>
            counts for {Math.round(weight * 100)}%
          </span>
        ) : null}
      </div>
      <div className={styles.factorTrack}>
        <motion.span
          className={cn(styles.factorFill, styles[`fill_${tone}`])}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: reduceMotion ? 0 : 0.5, ease: [0.2, 0.8, 0.2, 1] }}
        />
      </div>
      {detail ? <p className={styles.factorDetail}>{detail}</p> : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Confidence                                                                */
/* -------------------------------------------------------------------------- */

export interface ConfidenceProps {
  /** 0..1 */
  confidence: number;
  className?: string;
}

/**
 * How much the score can be trusted, based on how much the traveller told us.
 * Shown alongside every recommendation so a confident-looking number never
 * overstates thin evidence — the honesty that makes a short question flow
 * defensible.
 */
export function Confidence({ confidence, className }: ConfidenceProps) {
  const filled = Math.round(Math.max(0, Math.min(1, confidence)) * 3);
  const label = filled >= 3 ? "High" : filled >= 2 ? "Fair" : "Low";

  return (
    <span
      className={cn(styles.confidence, className)}
      title={`${label} confidence — based on how much you've told us`}
    >
      <span className={styles.confidenceBars} aria-hidden>
        {[1, 2, 3].map((step) => (
          <span
            key={step}
            className={cn(styles.confBar, step <= filled && styles.confBarOn)}
          />
        ))}
      </span>
      <span className={styles.confidenceLabel}>{label} confidence</span>
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Sparkline — seasonal curve                                                */
/* -------------------------------------------------------------------------- */

export interface SeasonSparkProps {
  /** 12 values, 0..1, January first. */
  values: number[];
  /** Months to emphasise, 0-indexed. */
  highlight?: number[];
  className?: string;
  height?: number;
}

/** Twelve months of weather quality, with the trip window called out. */
export function SeasonSpark({
  values,
  highlight = [],
  className,
  height = 34,
}: SeasonSparkProps) {
  const labels = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

  return (
    <div className={cn(styles.spark, className)}>
      <div className={styles.sparkBars} style={{ height }}>
        {values.map((value, index) => (
          <span
            key={index}
            className={cn(
              styles.sparkBar,
              highlight.includes(index) && styles.sparkBarOn,
            )}
            style={{ height: `${Math.max(8, value * 100)}%` }}
            title={`${labels[index]} — ${Math.round(value * 100)}% pleasant`}
          />
        ))}
      </div>
      <div className={styles.sparkLabels} aria-hidden>
        {labels.map((label, index) => (
          <span
            key={index}
            className={cn(highlight.includes(index) && styles.sparkLabelOn)}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
