"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { plannerHrefForDates } from "@/data/trips";
import { DateRangeField } from "@/features/landing/date-range-field";
import { ExploreCta } from "@/features/landing/explore-cta";

import styles from "./quick-trip.module.css";

/**
 * Quick trip creation.
 *
 * Dates only — the planner opens empty on those nights. Destination is not
 * asked here; Help me explore is the door when the place is unknown.
 */

const DEFAULT_START = "2026-06-18";
const DEFAULT_END = "2026-06-22";

export function QuickTrip() {
  const router = useRouter();
  const [start, setStart] = useState(DEFAULT_START);
  const [end, setEnd] = useState(DEFAULT_END);

  const invalid = end < start;
  const href = plannerHrefForDates(start, end);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (invalid) return;
    router.push(href);
  }

  return (
    <section className={styles.panel} aria-label="Start a trip">
      <header className={styles.head}>
        <h2 className={styles.title}>Start a trip</h2>
      </header>

      <form
        className={styles.form}
        action="/trip/draft"
        method="get"
        onSubmit={handleSubmit}
      >
        <DateRangeField
          start={start}
          end={end}
          onChange={(nextStart, nextEnd) => {
            setStart(nextStart);
            setEnd(nextEnd);
          }}
          className={styles.dates}
          tone="outlined"
          invalid={invalid}
        />
        {invalid ? (
          <p className="srOnly" role="alert">
            The end date is before the start date.
          </p>
        ) : null}
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
      </form>

      <div className={styles.divider}>
        <span className={styles.dividerLabel}>Don&rsquo;t know where to go?</span>
      </div>

      <div className={styles.exploreWrap}>
        <ExploreCta />
      </div>
    </section>
  );
}
