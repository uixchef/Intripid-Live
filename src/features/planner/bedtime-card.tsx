import { Urbanist } from "next/font/google";

import { cn } from "@/lib/utils";

import styles from "./bedtime-card.module.css";

const urbanist = Urbanist({
  subsets: ["latin"],
  weight: "500",
});

const ART = {
  glowLarge: "/planner/bedtime/glow-large.svg",
  glowSmall: "/planner/bedtime/glow-small.svg",
  star3: "/planner/bedtime/star-3.svg",
  star4: "/planner/bedtime/star-4.svg",
  star5: "/planner/bedtime/star-5.svg",
  moonA: "/planner/bedtime/moon-a.svg",
  moonB: "/planner/bedtime/moon-b.svg",
} as const;

export function BedTimeCard({
  live = false,
  lastDay = false,
}: {
  live?: boolean;
  lastDay?: boolean;
}) {
  const body = live
    ? lastDay
      ? "That’s the last stop of the trip."
      : "Itinerary view has advanced to tomorrow’s schedule as it is past 11 PM."
    : lastDay
      ? "That’s the last stop planned for this trip."
      : "That’s the last stop on this day’s itinerary.";

  return (
    <aside className={styles.root} aria-label="Bed time">
      <div className={styles.copy}>
        <p className={styles.title}>Bed time!</p>
        <p className={cn(styles.body, urbanist.className)}>{body}</p>
      </div>
      <div className={styles.art} aria-hidden>
        <img
          className={styles.glowLarge}
          src={ART.glowLarge}
          alt=""
          width={362}
          height={362}
        />
        <img
          className={styles.glowSmall}
          src={ART.glowSmall}
          alt=""
          width={137}
          height={137}
        />
        <span className={styles.zA}>z</span>
        <span className={styles.zB}>z</span>
        <span className={styles.zC}>z</span>
        <span className={styles.star3}>
          <img src={ART.star3} alt="" width={7.945} height={7.945} />
        </span>
        <span className={styles.star4}>
          <img src={ART.star4} alt="" width={12.576} height={12.576} />
        </span>
        <span className={styles.star5}>
          <img src={ART.star5} alt="" width={19.155} height={19.155} />
        </span>
        <span className={styles.moonA}>
          <img src={ART.moonA} alt="" width={30.226} height={14.694} />
        </span>
        <span className={styles.moonB}>
          <img src={ART.moonB} alt="" width={24.684} height={12.721} />
        </span>
        <span className={styles.moonC}>
          <img src={ART.moonA} alt="" width={30.226} height={14.694} />
        </span>
      </div>
    </aside>
  );
}
