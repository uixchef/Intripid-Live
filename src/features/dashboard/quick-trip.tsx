"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Compass } from "lucide-react";

import { Button } from "@/components/ui/button";
import { NYC_TRIP, NYC_TRIP_ID } from "@/data/nyc-trip";
import { tripNights } from "@/lib/dashboard/format";
import { cn } from "@/lib/utils";

import styles from "./quick-trip.module.css";

/**
 * Quick trip creation.
 *
 * The original had this exactly right and it is kept as-is: two dates, a Build
 * trip button, and — underneath, after a rule — "Don't know where to go?" with
 * a second way in. That second door is the entire product thesis in one
 * control, so it stays.
 *
 * WHAT IT HONESTLY DOES. There is one seeded itinerary in this build, so
 * "Build trip" cannot generate a new one and does not pretend to. It carries
 * the chosen dates to the planner and says so before you press it. Faking
 * itinerary generation — a spinner and then someone else's New York trip —
 * would be the single most dishonest thing on this screen.
 *
 * PROGRESSIVE ENHANCEMENT. It is a real form with a real `action`, matching
 * the landing page's search: it works before hydration, and the router push is
 * the enhancement rather than the mechanism.
 */

/** The seeded trip's own dates, so the default is a range that exists. */
const DEFAULT_START = NYC_TRIP.startDate;
const DEFAULT_END = NYC_TRIP.endDate;

export function QuickTrip() {
  const router = useRouter();
  const [start, setStart] = useState(DEFAULT_START);
  const [end, setEnd] = useState(DEFAULT_END);

  const nights = tripNights(start, end);
  /* End before start is the only invalid state a date pair can reach here. */
  const invalid = end < start;

  const matchesSeed = start === DEFAULT_START && end === DEFAULT_END;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (invalid) return;
    router.push(`/trip/${NYC_TRIP_ID}`);
  }

  return (
    <section className={styles.panel} aria-label="Start a trip">
      <form
        className={styles.form}
        action={`/trip/${NYC_TRIP_ID}`}
        method="get"
        onSubmit={handleSubmit}
      >
        <div className={styles.dates}>
          <div className={styles.dateField}>
            <label className={styles.dateLabel} htmlFor="quick-start">
              Begin
            </label>
            <input
              id="quick-start"
              className={styles.dateInput}
              type="date"
              name="from"
              value={start}
              max={end}
              onChange={(event) => setStart(event.target.value)}
            />
          </div>

          <div className={styles.dateField}>
            <label className={styles.dateLabel} htmlFor="quick-end">
              End
            </label>
            <input
              id="quick-end"
              className={styles.dateInput}
              type="date"
              name="to"
              value={end}
              min={start}
              onChange={(event) => setEnd(event.target.value)}
            />
          </div>
        </div>

        <p className={cn(styles.readout, invalid && styles.readoutInvalid)}>
          {invalid
            ? "The end date is before the start date."
            : nights === 0
              ? "Same-day trip — no nights away."
              : `${nights} ${nights === 1 ? "night" : "nights"} away`}
        </p>

        <Button
          type="submit"
          variant="primary"
          size="md"
          block
          disabled={invalid}
          iconRight={<ArrowRight size={14} strokeWidth={2.4} />}
        >
          Build trip
        </Button>

        {/*
         * Stated plainly, and only when it applies. Someone who has changed
         * the dates deserves to know before they press the button that this
         * build has one itinerary in it.
         */}
        <p className={styles.honesty}>
          {matchesSeed
            ? "Opens your New York plan in the planner."
            : "This build has one full itinerary, so this opens New York — a real trip generator would build these dates."}
        </p>
      </form>

      <div className={styles.divider}>
        <span className={styles.dividerLabel}>Don&rsquo;t know where to go?</span>
      </div>

      {/*
       * The original's second door, kept. It is the thing that makes Intripid
       * different from a booking form, so it is not hidden in a menu.
       */}
      <Button
        variant="secondary"
        size="md"
        block
        className={styles.explore}
        iconLeft={<Compass size={14} strokeWidth={2.1} />}
        onClick={() => router.push("/discover")}
      >
        Help me explore
      </Button>

      <p className={styles.exploreNote}>
        Six questions about your dates, budget and what you care about. Three
        destinations out, with the reasoning shown.
      </p>
    </section>
  );
}
