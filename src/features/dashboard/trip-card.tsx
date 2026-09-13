"use client";

import Link from "next/link";
import type { Route } from "next";
import { ArrowRight } from "lucide-react";

import { AvatarStack } from "@/components/ui/avatar";
import { getDestination } from "@/data/destinations";
import { tripTravellers } from "@/data/trips";
import { tripDateRange, nightsLabel } from "@/lib/dashboard/format";
import { cn } from "@/lib/utils";
import type { TripSummary } from "@/lib/types";

import { DestinationCover } from "./destination-cover";
import styles from "./trip-card.module.css";

/**
 * One trip, as a stacked card: photo, then title and meta.
 *
 * Every card opens the planner for that trip.
 */

export interface TripCardProps {
  trip: TripSummary;
}

export function TripCard({ trip }: TripCardProps) {
  const destination = getDestination(trip.destinationId);
  const travellers = tripTravellers(trip.travellerIds);
  const completed = trip.status === "completed";
  const href = `/trip/${trip.plannerTripId ?? trip.id}` as Route;
  const place = destination?.name ?? trip.destinationId;
  const dates = tripDateRange(trip.startDate, trip.endDate, {
    withYear: completed,
  });

  return (
    <Link
      href={href}
      className={cn(styles.card, styles.cardOpenable, completed && styles.cardDone)}
      aria-label={`${trip.name} — open the planner`}
    >
      <DestinationCover
        destinationId={trip.destinationId}
        muted={completed}
        className={styles.photo}
      />

      <div className={styles.body}>
        <h3 className={styles.name}>{trip.name}</h3>
        <p className={styles.meta}>
          {trip.origin.city}
          <span className={styles.arrow} aria-hidden>
            →
          </span>
          {place}
          <span className={styles.sep} aria-hidden>
            ·
          </span>
          <span className={styles.dates}>{dates}</span>
          <span className={styles.sep} aria-hidden>
            ·
          </span>
          {nightsLabel(trip.startDate, trip.endDate)}
        </p>

        <div className={styles.foot}>
          {travellers.length > 0 ? (
            <AvatarStack travellers={travellers} size="xs" max={3} />
          ) : (
            <span />
          )}
          <span className={styles.open}>
            Open planner
            <ArrowRight size={13} strokeWidth={2.4} aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  );
}
