"use client";

import { useState } from "react";
import { Plus, Share2 } from "lucide-react";

import { Hummingbird } from "@/components/brand/hummingbird";
import { Button } from "@/components/ui/button";
import { CountryFlag } from "@/components/ui/country-flag";
import {
  TRIP_FILTERS,
  TRIP_FILTER_LABEL,
  filterTrips,
  tripCounts,
  visitsOutsideTrips,
} from "@/data/trips";
import { cn } from "@/lib/utils";
import type { TripSummary, VisitedLocation } from "@/lib/types";
import type { TripFilter } from "@/data/trips";
import { useSession } from "@/stores/session-store";

import { TripCard } from "./trip-card";
import {
  TravelPoleModal,
  visitedPlacesForPole,
} from "./travel-pole";
import styles from "./travels.module.css";

/**
 * My Travels.
 *
 * The four tabs are the original's, in the original order — All, Completed,
 * Ongoing, Upcoming — because they are a real state machine for a trip and not
 * a filter someone invented. What is added is a count on each, so the tab
 * strip says how much is behind it before you press it.
 *
 * ALL AND COMPLETED INCLUDE LOGGED VISITS. Trips planned on Intripid stay as
 * cards. Places logged on the map (before or without a plan) sit underneath,
 * so those tabs are the whole of "where I have been" without turning a pin
 * into a fake itinerary.
 *
 * ONGOING IS SEEDED EMPTY. A filter with nothing in it is a state this screen
 * genuinely has, and it is worth more on a portfolio dashboard than a fourth
 * invented trip. The empty state names what would be here.
 */

export interface TravelsProps {
  trips: TripSummary[];
  filter: TripFilter;
  onFilter: (filter: TripFilter) => void;
  onNewTrip: () => void;
  /** Opens the identity map on Visited, to log a place. */
  onLogVisit: () => void;
}

export function Travels({
  trips,
  filter,
  onFilter,
  onNewTrip,
  onLogVisit,
}: TravelsProps) {
  const visited = useSession((s) => s.visited);
  const user = useSession((s) => s.user);
  const [poleOpen, setPoleOpen] = useState(false);
  const logged = visitsOutsideTrips(visited, trips);
  const placesOnPole = visitedPlacesForPole(visited);
  const counts = tripCounts(trips, logged.length);
  const visible = filterTrips(trips, filter);
  const showLogged = filter === "all" || filter === "completed";
  const groups =
    filter === "all"
      ? (["upcoming", "ongoing", "completed"] as const)
          .map((status) => ({
            status,
            label: TRIP_FILTER_LABEL[status],
            items: visible.filter((trip) => trip.status === status),
          }))
          .filter((group) => group.items.length > 0)
      : [
          {
            status: filter,
            label: showLogged ? "Trips" : (null as string | null),
            items: visible,
          },
        ];

  const empty = visible.length === 0 && !showLogged;
  const nextUp = trips.find((trip) => trip.status === "upcoming");

  return (
    <>
    <section className={styles.travels} aria-label="My travels">
      <header className={styles.head}>
        <h2 className={styles.title}>My travels</h2>

        <div className={styles.headActions}>
          <Button
            variant="ghost"
            size="sm"
            disabled={!user || placesOnPole.length === 0}
            iconLeft={<Share2 size={14} strokeWidth={2.2} />}
            onClick={() => setPoleOpen(true)}
          >
            Share my travels
          </Button>
          <Button
            variant="secondary"
            size="sm"
            iconLeft={<Plus size={14} strokeWidth={2.4} />}
            onClick={onNewTrip}
          >
            New trip
          </Button>
        </div>
      </header>

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

      {empty ? (
        filter === "ongoing" ? (
          <div className={cn(styles.empty, styles.emptyOngoing)}>
            <Hummingbird
              mood="peaceful"
              hovering
              size={88}
              className={styles.emptyBird}
            />
            <p className={styles.emptyTitle}>Between trips</p>
            <p className={styles.emptyBody}>
              {nextUp
                ? `This is where the itinerary you’re on lives. Nothing is in motion — ${nextUp.name} is still ahead.`
                : "This is where the itinerary you’re on lives. Nothing is in motion right now."}
            </p>
            <div className={styles.emptyActions}>
              {nextUp ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onFilter("upcoming")}
                >
                  See what’s next
                </Button>
              ) : null}
              <Button variant="ghost" size="sm" onClick={onNewTrip}>
                Plan a trip
              </Button>
            </div>
          </div>
        ) : (
          <div className={styles.empty}>
            <Hummingbird mood="curious" size={72} className={styles.emptyBird} />
            <p className={styles.emptyTitle}>
              {`No ${TRIP_FILTER_LABEL[filter].toLowerCase()} trips`}
            </p>
            <p className={styles.emptyBody}>Nothing on this list yet.</p>
          </div>
        )
      ) : (
        <div className={styles.list}>
          {groups.map((group) =>
            group.items.length === 0 ? null : (
              <section
                key={group.status}
                className={styles.group}
                aria-label={group.label ?? undefined}
              >
                {group.label ? (
                  <h3 className={styles.groupLabel}>
                    {group.label}
                    <span className={cn(styles.tabCount, "tabular")}>
                      {group.items.length}
                    </span>
                  </h3>
                ) : null}
                <ul className={styles.stack}>
                  {group.items.map((trip) => (
                    <li key={trip.id}>
                      <TripCard trip={trip} />
                    </li>
                  ))}
                </ul>
              </section>
            ),
          )}
          {showLogged ? (
            <LoggedVisits places={logged} onLogVisit={onLogVisit} />
          ) : null}
        </div>
      )}
    </section>
    {user ? (
      <TravelPoleModal
        open={poleOpen}
        onClose={() => setPoleOpen(false)}
        user={user}
        visited={visited}
      />
    ) : null}
    </>
  );
}

function LoggedVisits({
  places,
  onLogVisit,
}: {
  places: VisitedLocation[];
  onLogVisit: () => void;
}) {
  return (
    <section className={styles.logged} aria-labelledby="logged-visits-title">
      <div className={styles.loggedHead}>
        <div className={styles.loggedCopy}>
          <h3 className={styles.loggedTitle} id="logged-visits-title">
            Logged visits
            {places.length > 0 ? (
              <span className={cn(styles.tabCount, "tabular")}>
                {places.length}
              </span>
            ) : null}
          </h3>
        </div>
        <Button variant="ghost" size="xs" className={styles.logVisit} onClick={onLogVisit}>
          Log a visit
        </Button>
      </div>

      {places.length === 0 ? (
        <p className={styles.loggedEmpty}>Nothing logged yet.</p>
      ) : (
        <ul className={styles.chips}>
          {places.map((place) => (
            <li key={place.id}>
              <span className={styles.chip}>
                <CountryFlag code={place.countryCode} label={place.name} size={22} />
                <span className={styles.chipName}>{place.name}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
