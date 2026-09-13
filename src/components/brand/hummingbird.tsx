import { cn } from "@/lib/utils";

import styles from "./hummingbird.module.css";

/**
 * The Intripid hummingbird — mood stills from the brand personality system.
 *
 * GOVERNANCE: character density is inversely proportional to information
 * density. The bird appears in low-information moments — loading, empty
 * states, first run, celebration. It never appears inside the calendar grid,
 * a score ledger, or a results table. Cutouts have no sky or card behind them.
 *
 * Moods match the case-study system: curious, focused, excited, peaceful,
 * caring, overwhelmed.
 * https://www.uixchef.com/projects/how-a-hummingbird-became-intripid%E2%80%99s-brand-personality-system
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
  /** Support, tips, empathy */
  | "caring"
  /** Empty states, errors — acknowledging that planning is stressful */
  | "overwhelmed";

const MASCOT: Record<HummingbirdMood, string> = {
  curious: "/brand/mascots/curious.png",
  focused: "/brand/mascots/focused.png",
  excited: "/brand/mascots/excited.png",
  peaceful: "/brand/mascots/peaceful.png",
  caring: "/brand/mascots/caring.png",
  overwhelmed: "/brand/mascots/overwhelmed.png",
};

export interface HummingbirdProps {
  mood?: HummingbirdMood;
  size?: number;
  /** Hold in place with the signature micro-hover. Never a spin. */
  hovering?: boolean;
  className?: string;
}

export function Hummingbird({
  mood = "curious",
  size = 72,
  hovering = false,
  className,
}: HummingbirdProps) {
  return (
    <span
      className={cn(styles.root, hovering && styles.hovering, className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={MASCOT[mood]} alt="" width={size} height={size} draggable={false} />
    </span>
  );
}
