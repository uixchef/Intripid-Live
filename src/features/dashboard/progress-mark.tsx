"use client";

import { cn } from "@/lib/utils";
import type { AccountUser } from "@/lib/types";

import { AccountMark } from "./account-mark";
import styles from "./progress-mark.module.css";

/** Radius of the progress stroke in the 100×100 viewBox — sits at the rim. */
const RING_R = 48;
const RING_C = 2 * Math.PI * RING_R;

export interface ProgressMarkProps {
  user: AccountUser;
  level: number;
  /** 0–100 fill of the ring — progress to the next prize. */
  progress: number;
  /** Figma mark is 80px face. Identity uses the same ratios at 116px. */
  size?: "sm" | "lg";
  className?: string;
}

/**
 * Photo (or initials) with a progress ring around it.
 *
 * The ring sits outside the face, with a paper gap and an outer paper stroke
 * so the mark punches out of the identity map instead of colliding with it.
 */
export function ProgressMark({
  user,
  level,
  progress,
  size = "sm",
  className,
}: ProgressMarkProps) {
  const offset = RING_C * (1 - Math.min(100, Math.max(0, progress)) / 100);

  return (
    <span
      className={cn(styles.root, size === "lg" && styles.lg, className)}
      aria-hidden
    >
      <svg className={styles.ring} viewBox="0 0 100 100">
        <circle
          className={styles.track}
          cx="50"
          cy="50"
          r={RING_R}
          fill="none"
          strokeWidth="3"
        />
        <circle
          className={styles.fill}
          cx="50"
          cy="50"
          r={RING_R}
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={RING_C}
          strokeDashoffset={offset}
          transform="rotate(-90 50 50)"
        />
      </svg>
      <AccountMark
        user={user}
        className={styles.face}
        fallbackClassName={styles.faceFallback}
      />
      <span className={styles.chip} title={`Level ${level}. Seals collected.`}>
        {level}
      </span>
    </span>
  );
}
