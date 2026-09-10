import { cn } from "@/lib/utils";

import styles from "./hummingbird.module.css";

/**
 * The Intripid hummingbird — the expressive register of the mark.
 *
 * GOVERNANCE (inherited, and the rule that resolves playfulness against
 * utility): character density is inversely proportional to information
 * density. The bird appears only in low-information, high-uncertainty
 * moments — loading, empty states, first run, celebration. It never appears
 * inside the calendar grid, the score ledger, a cost table or the results
 * panel. For functional use at small sizes there is the geometric `Mark`.
 *
 * Mood is driven by EYE and POSTURE only, which is what keeps the character
 * cheap to animate and legible at 40px. The palette is the inherited one:
 * violet body, teal wings, orange beak.
 */

export type HummingbirdMood =
  /** Discovery, "where should I go?" */
  | "curious"
  /** Working, building an itinerary */
  | "focused"
  /** Completed plans, progress */
  | "excited"
  /** Reassurance */
  | "peaceful"
  /** Empty states, errors — acknowledging that planning is stressful */
  | "overwhelmed";

export interface HummingbirdProps {
  mood?: HummingbirdMood;
  size?: number;
  /** Hold in place with the signature micro-hover. Never a spin. */
  hovering?: boolean;
  className?: string;
}

/** Eye geometry per mood. The eye was the studied feature; it carries the read. */
const EYES: Record<
  HummingbirdMood,
  { open: boolean; pupilY?: number; lidPath?: string; browPath?: string }
> = {
  curious: { open: true, pupilY: 25.4 },
  // Looking down at the work.
  focused: { open: true, pupilY: 26.8, browPath: "M30.4 21.6h6.4" },
  // Eye squeezed shut in a happy arc.
  excited: { open: false, lidPath: "M30.8 25.6c1.2-1.9 4.2-1.9 5.4 0" },
  // Softly closed.
  peaceful: { open: false, lidPath: "M30.8 25.9h5.4" },
  // Wide, with a raised brow.
  overwhelmed: { open: true, pupilY: 24.4, browPath: "M29.8 20.3l7.2-1.6" },
};

export function Hummingbird({
  mood = "curious",
  size = 72,
  hovering = false,
  className,
}: HummingbirdProps) {
  const eye = EYES[mood];
  const tilt = mood === "curious" ? -6 : mood === "overwhelmed" ? 4 : 0;

  return (
    <span
      className={cn(styles.root, hovering && styles.hovering, className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg
        viewBox="0 0 72 72"
        width={size}
        height={size}
        fill="none"
        style={{ transform: `rotate(${tilt}deg)` }}
      >
        {/* Far wing, behind the body */}
        <path
          d="M33 33c-7.5-6.8-17.4-8.4-25.6-4.3-1.6.8-1.4 3.1.3 3.7 7.6 2.6 13 6.6 16.6 12.2.9 1.4 3 1.2 3.7-.3L36 36.6c.6-1.3.2-2.8-.9-3.6L33 33Z"
          fill="var(--teal-700)"
          opacity="0.85"
        />

        {/* Body — a teardrop that tapers into the tail */}
        <path
          d="M38.6 12.4c9 0 16.3 7.3 16.3 16.3 0 5.6-2.8 10.5-7.1 13.5L18.4 62.9c-1.8 1.2-4-1-2.8-2.9l14.1-21.6a16.3 16.3 0 0 1 8.9-26Z"
          fill="var(--purple-500)"
        />

        {/* Body shading, low contrast — gives volume without a gradient */}
        <path
          d="M38.6 12.4c9 0 16.3 7.3 16.3 16.3 0 5.6-2.8 10.5-7.1 13.5L18.4 62.9c-1.8 1.2-4-1-2.8-2.9l14.1-21.6c.4-.6.6-1.3.6-2 8.3 1 15.6-3.7 18-11.8a16.2 16.2 0 0 0-9.7-12.2Z"
          fill="var(--purple-700)"
          opacity="0.22"
        />

        {/* Near wing — the part that reads as motion */}
        <path
          d="M32.8 30.2c-5.6-3.6-13.2-4.2-20.8-1.4-1.5.5-1.6 2.6-.2 3.3 6.6 3.1 11 7.1 13.6 12.4.7 1.4 2.7 1.4 3.5 0l5.2-9.7c.6-1.2.3-2.6-.8-3.3l-.5-1.3Z"
          fill="var(--teal-400)"
        />

        {/* Beak — the one unmistakable feature */}
        <path
          d="M54.4 24.2l14.9-4.6c1.4-.4 2.4 1.5 1.2 2.4L57 32l-2.6-7.8Z"
          fill="var(--orange-400)"
        />
        <path
          d="M54.4 24.2l14.9-4.6c1.4-.4 2.4 1.5 1.2 2.4l-5.8 4.3-10.3-2.1Z"
          fill="var(--orange-500)"
          opacity="0.5"
        />

        {/* Eye */}
        {eye.open ? (
          <>
            <circle cx="33.6" cy="25.2" r="5.4" fill="var(--slate-0)" />
            <circle
              cx="34.4"
              cy={eye.pupilY ?? 25.4}
              r={mood === "overwhelmed" ? 2.5 : 2.9}
              fill="var(--slate-900)"
            />
            <circle cx="35.6" cy={(eye.pupilY ?? 25.4) - 1.2} r="0.95" fill="var(--slate-0)" />
          </>
        ) : (
          <path
            d={eye.lidPath}
            stroke="var(--slate-900)"
            strokeWidth="1.9"
            strokeLinecap="round"
            fill="none"
          />
        )}

        {/* Brow — only where the mood needs it */}
        {eye.browPath ? (
          <path
            d={eye.browPath}
            stroke="var(--slate-900)"
            strokeWidth="1.7"
            strokeLinecap="round"
            opacity="0.72"
          />
        ) : null}
      </svg>
    </span>
  );
}
