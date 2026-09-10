"use client";

import { Compass, Plus } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  TRIP_FILTERS,
  TRIP_FILTER_LABEL,
  filterTrips,
  tripCounts,
} from "@/data/trips";
import { cn } from "@/lib/utils";
import type { TripSummary } from "@/lib/types";
import type { TripFilter } from "@/data/trips";

import { TripCard } from "./trip-card";
import styles from "./travels.module.css";

/**
 * My Travels.
 *
 * The four tabs are the original's, in the original order — All, Completed,
 * Ongoing, Upcoming — because they are a real state machine for a trip and not
 * a filter someone invented. What is added is a count on each, so the tab
 * strip says how much is behind it before you press it. That is the one thing
 * the original's tabs could not tell you, and it is the reason an empty tab
 * feels like a bug rather than a fact.
 *
 * ONGOING IS SEEDED EMPTY. A filter with nothing in it is a state this screen
 * genuinely has, and it is worth more on a portfolio dashboard than a fourth
 * invented trip. The empty state names what would be here and offers the one
 * action that would put something in it.
 */

export interface TravelsProps {
  trips: TripSummary[];
  filter: TripFilter;
  onFilter: (filter: TripFilter) => void;
  onNewTrip: () => void;
}

export function Travels({ trips, filter, onFilter, onNewTrip }: TravelsProps) {
  const counts = tripCounts(trips);
  const visible = filterTrips(trips, filter);

  return (
    <section className={styles.travels} aria-label="My travels">
      <header className={styles.head}>
        <div className={styles.headText}>
          <h2 className={styles.title}>My travels</h2>
          <p className={styles.sub}>
            {counts.all} {counts.all === 1 ? "trip" : "trips"} ·{" "}
            {counts.upcoming} upcoming
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          iconLeft={<Plus size={14} strokeWidth={2.4} />}
          onClick={onNewTrip}
        >
          New trip
        </Button>
      </header>

      {/*
       * A tab strip, not a Segmented control. Segmented is for switching a
       * view of one thing; these four are filters over a set, they carry
       * counts, and there are four of them — which is one more than a pill
       * holds at this width without shrinking the type.
       */}
      <div className={styles.tabs} role="tablist" aria-label="Filter trips">
        {TRIP_FILTERS.map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={filter === item}
            className={cn(styles.tab, filter === item && styles.tabOn)}
            onClick={() => onFilter(item)}
          >
            {TRIP_FILTER_LABEL[item]}
            <span className={cn(styles.tabCount, "tabular")}>
              {counts[item]}
            </span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>
            {filter === "ongoing"
              ? "Nothing in progress"
              : `No ${TRIP_FILTER_LABEL[filter].toLowerCase()} trips`}
          </p>
          {/*
           * Neither line promises an automatic transition. Status is stored
           * rather than derived from today's date (see src/data/trips.ts for
           * why), so copy that said trips "move between these tabs on their
           * own as their dates arrive" would be describing a mechanism this
           * build does not have.
           */}
          <p className={styles.emptyBody}>
            {filter === "ongoing"
              ? "A trip you are currently on shows here, with the current day's plan on top."
              : "Nothing on this list yet."}
          </p>
          <div className={styles.emptyActions}>
            <Button
              variant="secondary"
              size="sm"
              iconLeft={<Plus size={13} strokeWidth={2.4} />}
              onClick={onNewTrip}
            >
              New trip
            </Button>
            <Link href="/discover" className={styles.emptyLink}>
              <Compass size={12} strokeWidth={2.2} aria-hidden />
              Or find where to go
            </Link>
          </div>
        </div>
      ) : (
        <ul className={styles.grid}>
          {visible.map((trip) => (
            <li key={trip.id} className={styles.gridItem}>
              <TripCard trip={trip} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
