"use client";

import { useEffect } from "react";

import styles from "./ports-hunt.module.css";

const DEPARTURE_MS = 5_000;
const DEST_BEAT_MS = 5_000;

const DEST_BEATS = [
  {
    title: "Finding possible destination ports…",
    detail: "Using home, how far you’ll go, and budget.",
  },
  {
    title: "Finding cities near those ports…",
    detail: "Places you can actually visit from a reachable airport.",
  },
] as const;

export interface PortHuntProps {
  kind: "departure" | "dest";
  beat: number;
  onAdvance: () => void;
  onDone: () => void;
  reduceMotion: boolean;
}

export function PortHunt({
  kind,
  beat,
  onAdvance,
  onDone,
  reduceMotion,
}: PortHuntProps) {
  const destTotal = DEST_BEATS.length;

  useEffect(() => {
    if (reduceMotion) {
      const timer = window.setTimeout(onDone, 400);
      return () => window.clearTimeout(timer);
    }
    if (kind === "departure") {
      const timer = window.setTimeout(onDone, DEPARTURE_MS);
      return () => window.clearTimeout(timer);
    }
    if (beat >= destTotal - 1) {
      const timer = window.setTimeout(onDone, DEST_BEAT_MS);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(onAdvance, DEST_BEAT_MS);
    return () => window.clearTimeout(timer);
  }, [kind, beat, destTotal, onAdvance, onDone, reduceMotion]);

  const copy =
    kind === "departure"
      ? {
          title: "Finding your departure port…",
          detail: "The nearest airport you can leave from.",
        }
      : DEST_BEATS[Math.min(beat, destTotal - 1)];

  return (
    <div className={styles.root}>
      <h2 className={styles.title}>{copy.title}</h2>
      <p className={styles.detail}>{copy.detail}</p>
    </div>
  );
}
