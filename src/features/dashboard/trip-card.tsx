"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, Plane } from "lucide-react";

import { AvatarStack } from "@/components/ui/avatar";
import { Tag } from "@/components/ui/chip";
import { getDestination } from "@/data/destinations";
import { NYC_TRIP } from "@/data/nyc-trip";
import { TRIP_STATUS_LABEL } from "@/data/trips";
import { CONNECTIONS } from "@/data/account";
import { connectionAsTraveller } from "@/lib/collaboration";
import { tripDateRange, tripScaleLabel } from "@/lib/dashboard/format";
import { cn } from "@/lib/utils";
import type { Traveller, TripSummary } from "@/lib/types";

import { DestinationCover } from "./destination-cover";
import styles from "./trip-card.module.css";

/**
 * One trip.
 *
 * WHAT THE ORIGINAL CARD GOT RIGHT, and what is kept: the route. Origin flag,
 * city and dates on the left; a stop count in the middle; destination flag,
 * city and dates on the right. That row says where you are going, from where,
 * for how long and how full it is, in one glance — it is the best thing in the
 * original screenshot and it is preserved almost literally.
 *
 * WHAT IS FIXED: the original showed three identical cards with the same photo
 * of Tower Bridge for three different trips, and both date pairs on a card
 * were the same. Here every trip has its own destination, its own drawn cover,
 * and one date range rather than two.
 *
 * HONESTY ABOUT WHAT OPENS. Only the New York trip has an itinerary behind it,
 * so only that card offers "Open planner". The rest say "Trip summary" and
 * offer nothing that would open an empty screen. A dashboard where four of
 * five cards lead nowhere is the thing that makes a prototype feel like a
 * prototype.
 */

/**
 * Travellers for the avatar stack.
 *
 * Resolved from the planner's roster first so a person on the New York trip
 * gets their real role and presence; connections fill in the rest. Ids that
 * match nothing are dropped rather than rendered as a blank circle.
 */
function resolveTravellers(ids: string[]): Traveller[] {
  return ids
    .map((id) => {
      const planner = NYC_TRIP.travellers.find((t) => t.id === id);
      if (planner) return planner;
      const connection = CONNECTIONS.find((c) => c.id === id);
      return connection ? connectionAsTraveller(connection) : null;
    })
    .filter((t): t is Traveller => Boolean(t));
}

/** "With Maya" · "With Maya and Jonas" · "4 travellers" */
function peopleLabel(travellers: Traveller[]): string {
  const first = (t: Traveller) => t.name.split(" ")[0];
  if (travellers.length === 1) return `With ${first(travellers[0])}`;
  if (travellers.length === 2)
    return `With ${first(travellers[0])} and ${first(travellers[1])}`;
  return `${travellers.length} travellers`;
}

export interface TripCardProps {
  trip: TripSummary;
}

export function TripCard({ trip }: TripCardProps) {
  const destination = getDestination(trip.destinationId);
  const travellers = resolveTravellers(trip.travellerIds);
  const completed = trip.status === "completed";
  const openable = Boolean(trip.plannerTripId);

  const dates = tripDateRange(trip.startDate, trip.endDate, {
    withYear: completed,
  });

  const card = (
    <>
      <DestinationCover destinationId={trip.destinationId} muted={completed} />

      <div className={styles.body}>
        <div className={styles.top}>
          <Tag
            tone={
              trip.status === "ongoing"
                ? "success"
                : trip.status === "upcoming"
                  ? "brand"
                  : "neutral"
            }
          >
            {TRIP_STATUS_LABEL[trip.status]}
          </Tag>
          {travellers.length > 0 ? (
            <span className={styles.people}>
              <AvatarStack travellers={travellers} size="xs" max={4} />
              {/*
                * Names, not a count, while there is room for them. "1 other
                * traveller" beside a single avatar restates the avatar; "With
                * Maya" says something the avatar cannot.
                */}
              <span className={styles.peopleNote}>{peopleLabel(travellers)}</span>
            </span>
          ) : (
            <span className={styles.peopleNote}>Solo</span>
          )}
        </div>

        <h3 className={styles.name}>{trip.name}</h3>

        {/* The route row, straight from the original. */}
        <div className={styles.route}>
          <span className={styles.end}>
            <span className={styles.flag} aria-hidden>
              {trip.origin.flag}
            </span>
            <span className={styles.endText}>
              <span className={styles.city}>{trip.origin.city}</span>
              <span className={styles.endNote}>Departing</span>
            </span>
          </span>

          <span className={styles.leg} aria-hidden>
            <span className={styles.legLine} />
            <Plane size={11} strokeWidth={2.2} />
            <span className={styles.legLine} />
          </span>

          <span className={cn(styles.end, styles.endTo)}>
            <span className={styles.flag} aria-hidden>
              {destination?.flag}
            </span>
            <span className={styles.endText}>
              <span className={styles.city}>
                {destination?.name ?? trip.destinationId}
              </span>
              <span className={styles.endNote}>
                {destination?.country ?? ""}
              </span>
            </span>
          </span>
        </div>

        <div className={styles.foot}>
          <span className={styles.scale}>
            <CalendarDays size={11} strokeWidth={2.2} aria-hidden />
            <span className={styles.dates}>{dates}</span>
            <span className={styles.dot} aria-hidden>
              ·
            </span>
            <span>{tripScaleLabel(trip)}</span>
          </span>

          {openable ? (
            <span className={styles.open}>
              Open planner
              <ArrowRight size={12} strokeWidth={2.4} aria-hidden />
            </span>
          ) : (
            <span className={styles.summaryNote}>Trip summary</span>
          )}
        </div>

        {trip.note ? <p className={styles.note}>{trip.note}</p> : null}
      </div>
    </>
  );

  /*
   * A whole-card link when there is somewhere to go, a plain article when
   * there is not. Wrapping an unopenable card in a link that goes nowhere —
   * or worse, to a 404 — is exactly the dead affordance this build is meant
   * to avoid.
   */
  return openable ? (
    <Link
      href={`/trip/${trip.plannerTripId}`}
      className={cn(styles.card, styles.cardOpenable)}
      aria-label={`${trip.name} — open the planner`}
    >
      {card}
    </Link>
  ) : (
    <article className={cn(styles.card, completed && styles.cardCompleted)}>
      {card}
    </article>
  );
}
