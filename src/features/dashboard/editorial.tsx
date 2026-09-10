"use client";

import Link from "next/link";
import { ArrowRight, CalendarClock } from "lucide-react";

import { getDestination } from "@/data/destinations";
import type { EditorialFeature } from "@/lib/types";

import { DestinationCover } from "./destination-cover";
import styles from "./editorial.module.css";

/**
 * One seasonal feature.
 *
 * The original ran a Cherry Blossom news card with "Plan Trip Here" and "Know
 * More" side by side, plus a share icon and a bookmark icon. Four actions on
 * a card whose job is to make you curious about one place.
 *
 * KEPT: the idea that a home screen should sometimes tell you about a place,
 * and that the place should be seasonal — travel is time-sensitive and a
 * recommender that ignores the calendar is missing its best argument.
 *
 * CHANGED: it is not news, and it has one action. The card states the window,
 * states why it is being shown to THIS traveller, and offers the one thing
 * that can act on it. "Know More" would need an article that does not exist,
 * and a share button on a seasonal tip is a social gesture nobody makes.
 */

export interface EditorialCardProps {
  feature: EditorialFeature;
}

export function EditorialCard({ feature }: EditorialCardProps) {
  const destination = getDestination(feature.destinationId);

  return (
    <section className={styles.card} aria-label="Seasonal destination feature">
      <DestinationCover destinationId={feature.destinationId} />

      <div className={styles.body}>
        <p className={styles.eyebrow}>{feature.eyebrow}</p>
        <h2 className={styles.headline}>{feature.headline}</h2>
        <p className={styles.text}>{feature.body}</p>

        <p className={styles.window}>
          <CalendarClock size={11} strokeWidth={2.2} aria-hidden />
          {feature.window}
        </p>

        {/*
         * Why this, why now, why you. Without it a feature card is a banner;
         * with it, it is the recommender talking.
         */}
        <p className={styles.because}>{feature.because}.</p>

        <Link href="/discover" className={styles.action}>
          Check it against your dates
          <ArrowRight size={13} strokeWidth={2.4} aria-hidden />
        </Link>

        {destination ? (
          <p className={styles.footNote}>
            Discovery scores {destination.name} on your budget, your interests
            and the month you pick.
          </p>
        ) : null}
      </div>
    </section>
  );
}
