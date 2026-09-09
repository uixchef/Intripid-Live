"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  AlertTriangle,
  MapPin,
  MoreHorizontal,
  Plus,
  Sparkles,
} from "lucide-react";

import { AvatarStack } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/chip";
import { categoryMeta, COMMUTE_LABELS } from "@/lib/categories";
import { cn } from "@/lib/utils";
import {
  activitiesForDay,
  conflictIdsForDay,
  conflictsForDay,
  gapsForDay,
  itemsForDay,
  routeForDay,
  stayForDay,
  summariseDay,
} from "@/lib/trip/schedule";
import {
  atMinutes,
  dayLabelLong,
  durationLabel,
  durationMinutes,
  minutesIntoDay,
  relativeGapLabel,
  timeLabel,
  timeRangeLabel,
} from "@/lib/trip/time";
import type { ItineraryItem, Trip, Traveller } from "@/lib/types";

import styles from "./itinerary.module.css";

/**
 * The Itinerary view: one day as an ordered sequence.
 *
 * The grid answers "does it fit". This answers "what happens next" — the
 * rhythm of a day, with travel time between stops made explicit and the
 * relative-time phrasing the historical product used ("3hr later") because it
 * reads as a day rather than a table of timestamps.
 *
 * Stops carry the same letters as the map markers, so the two surfaces are
 * legible together without either one having to be highlighted.
 */

export interface ItineraryProps {
  trip: Trip;
  activeDay: string;
  selectedItemId: string | null;
  hoveredItemId: string | null;
  onSelect: (id: string) => void;
  onOpen: (id: string) => void;
  onHover: (id: string | null) => void;
  onCreate: (day: string, startMinutes: number, durationMin: number) => void;
  onFillGap: (day: string) => void;
}

export function Itinerary({
  trip,
  activeDay,
  selectedItemId,
  hoveredItemId,
  onSelect,
  onOpen,
  onHover,
  onCreate,
  onFillGap,
}: ItineraryProps) {
  const reduceMotion = useReducedMotion();

  const stops = useMemo(() => routeForDay(trip, activeDay), [trip, activeDay]);
  const all = useMemo(() => itemsForDay(trip, activeDay), [trip, activeDay]);
  const activities = useMemo(
    () => activitiesForDay(trip, activeDay),
    [trip, activeDay],
  );
  const conflicts = useMemo(
    () => conflictIdsForDay(trip, activeDay),
    [trip, activeDay],
  );
  const conflictList = useMemo(
    () => conflictsForDay(trip, activeDay),
    [trip, activeDay],
  );
  const gaps = useMemo(() => gapsForDay(trip, activeDay), [trip, activeDay]);
  const summary = summariseDay(trip, activeDay);
  const stay = stayForDay(trip, activeDay);

  const letterOf = useMemo(() => {
    const map = new Map<string, string>();
    for (const stop of stops) map.set(stop.item.id, stop.letter);
    return map;
  }, [stops]);

  /** Commutes keyed by the activity they lead into, so they render inline. */
  const commuteBefore = useMemo(() => {
    const map = new Map<string, ItineraryItem>();
    for (const item of all) {
      if (item.kind === "commute" && item.commute) {
        map.set(item.commute.toItemId, item);
      }
    }
    return map;
  }, [all]);

  if (activities.length === 0) {
    return (
      <div className={styles.root}>
        <DayHeader
          day={activeDay}
          summary={summary}
          stay={stay}
          conflictCount={conflictList.length}
        />
        <div className={styles.empty}>
          <span className={styles.emptyMark} aria-hidden>
            <MapPin size={18} strokeWidth={1.7} />
          </span>
          <p className={styles.emptyTitle}>This day is completely open</p>
          <p className={styles.emptyBody}>
            A blank day is not a mistake — some of the best ones are. When
            you&rsquo;re ready, add a stop or let the assistant propose
            something near where you&rsquo;re staying.
          </p>
          <div className={styles.emptyActions}>
            <Button
              variant="secondary"
              iconLeft={<Plus size={14} strokeWidth={2.2} />}
              onClick={() => onCreate(activeDay, 10 * 60, 90)}
            >
              Add a stop
            </Button>
            <Button
              variant="ghost"
              iconLeft={<Sparkles size={14} strokeWidth={2} />}
              onClick={() => onFillGap(activeDay)}
            >
              Suggest something
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <DayHeader
        day={activeDay}
        summary={summary}
        stay={stay}
        conflictCount={conflictList.length}
      />

      {conflictList.length > 0 ? (
        <div className={styles.conflictBanner} role="alert">
          <AlertTriangle size={14} strokeWidth={2.1} />
          <div>
            {conflictList.slice(0, 2).map((conflict) => (
              <p key={conflict.message}>{conflict.message}</p>
            ))}
          </div>
        </div>
      ) : null}

      <ol className={styles.list}>
        {activities.map((item, index) => {
          const previous = activities[index - 1];
          const commute = commuteBefore.get(item.id);
          const gapMinutes =
            previous?.end && item.start
              ? minutesIntoDay(item.start) - minutesIntoDay(previous.end)
              : null;

          const meta = categoryMeta(item.category);
          const Icon = meta.icon;
          const isSelected = selectedItemId === item.id;
          const conflicted = conflicts.errors.has(item.id);
          const warned = conflicts.warnings.has(item.id);
          const assigned = item.assignedTo
            .map((id) => trip.travellers.find((t) => t.id === id))
            .filter((t): t is Traveller => Boolean(t));

          return (
            <motion.li
              key={item.id}
              layout={!reduceMotion}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.3,
                ease: [0.2, 0.8, 0.2, 1],
                delay: reduceMotion ? 0 : Math.min(index * 0.028, 0.24),
              }}
            >
              {/* Travel time between stops, stated rather than implied. */}
              {commute ? (
                <div className={styles.leg}>
                  <span className={styles.legLine} aria-hidden />
                  <span className={styles.legLabel}>
                    {COMMUTE_LABELS[commute.commute!.mode]} ·{" "}
                    {durationLabel(commute.commute!.minutes)}
                    <span className={styles.legDistance}>
                      {commute.commute!.distanceKm.toFixed(1)} km
                    </span>
                  </span>
                </div>
              ) : gapMinutes !== null && gapMinutes > 5 ? (
                <div className={styles.leg}>
                  <span className={styles.legLine} aria-hidden />
                  <span className={cn(styles.legLabel, styles.legLabelQuiet)}>
                    {relativeGapLabel(gapMinutes)}
                  </span>
                </div>
              ) : null}

              <div
                className={cn(
                  styles.stop,
                  isSelected && styles.stopSelected,
                  hoveredItemId === item.id && styles.stopHovered,
                  conflicted && styles.stopConflicted,
                  warned && !conflicted && styles.stopWarned,
                )}
                style={{ ["--cat-color" as string]: meta.color }}
                onClick={() => onSelect(item.id)}
                onDoubleClick={() => onOpen(item.id)}
                onPointerEnter={() => onHover(item.id)}
                onPointerLeave={() => onHover(null)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    onOpen(item.id);
                  }
                }}
              >
                <span className={styles.stopLetter} aria-hidden>
                  {letterOf.get(item.id) ?? "·"}
                </span>

                <div className={styles.stopBody}>
                  <div className={styles.stopTop}>
                    <span className={styles.stopIcon} aria-hidden>
                      <Icon size={13} strokeWidth={2} />
                    </span>
                    <h4 className={styles.stopTitle}>{item.title}</h4>
                    {conflicted || warned ? (
                      <AlertTriangle
                        size={13}
                        strokeWidth={2.2}
                        className={cn(
                          styles.stopWarn,
                          warned && !conflicted && styles.stopWarnAmber,
                        )}
                      />
                    ) : null}
                    <button
                      type="button"
                      className={styles.stopMore}
                      aria-label={`Edit ${item.title}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpen(item.id);
                      }}
                    >
                      <MoreHorizontal size={14} strokeWidth={2} />
                    </button>
                  </div>

                  {item.subtitle ? (
                    <p className={styles.stopSubtitle}>{item.subtitle}</p>
                  ) : null}

                  {item.place ? (
                    <p className={styles.stopPlace}>
                      <MapPin size={11} strokeWidth={2} />
                      <span>{item.place.address}</span>
                    </p>
                  ) : null}

                  <div className={styles.stopMeta}>
                    <span className={cn(styles.stopTime, "tabular")}>
                      {item.start && item.end
                        ? timeRangeLabel(item.start, item.end)
                        : "Unscheduled"}
                    </span>
                    {item.start && item.end ? (
                      <span className={styles.stopDuration}>
                        {durationLabel(durationMinutes(item.start, item.end))}
                      </span>
                    ) : null}
                    {!item.flexible ? <Tag tone="neutral">Fixed</Tag> : null}
                    {item.costUsd ? (
                      <span className={cn(styles.stopCost, "tabular")}>
                        ${item.costUsd}
                      </span>
                    ) : null}
                    {assigned.length > 0 ? (
                      <span className={styles.stopWho}>
                        <AvatarStack travellers={assigned} size="xs" max={3} />
                      </span>
                    ) : null}
                  </div>

                  {item.notes ? (
                    <p className={styles.stopNote}>{item.notes}</p>
                  ) : null}
                </div>
              </div>
            </motion.li>
          );
        })}
      </ol>

      {/* Free time offered at the end of the list too, not only on the grid. */}
      {gaps.length > 0 ? (
        <div className={styles.gapCard}>
          <div className={styles.gapCopy}>
            <p className={styles.gapTitle}>
              You have {durationLabel(gaps[0].minutes)} free
            </p>
            <p className={styles.gapBody}>
              From {timeLabel(atMinutes(activeDay, gaps[0].startMinutes))}. Want
              something near where you already are?
            </p>
          </div>
          <div className={styles.gapActions}>
            <Button
              variant="secondary"
              size="sm"
              iconLeft={<Sparkles size={13} strokeWidth={2} />}
              onClick={() => onFillGap(activeDay)}
            >
              Find something nearby
            </Button>
            <Button
              variant="ghost"
              size="sm"
              iconLeft={<Plus size={13} strokeWidth={2.2} />}
              onClick={() => onCreate(activeDay, gaps[0].startMinutes + 15, 90)}
            >
              Add my own
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Day header                                                                */
/* -------------------------------------------------------------------------- */

function DayHeader({
  day,
  summary,
  stay,
  conflictCount,
}: {
  day: string;
  summary: ReturnType<typeof summariseDay>;
  stay: ItineraryItem | null;
  conflictCount: number;
}) {
  return (
    <header className={styles.dayHeader}>
      <div className={styles.dayHeaderTop}>
        <h3 className={styles.dayTitle}>{dayLabelLong(day)}</h3>
        {conflictCount > 0 ? (
          <Tag tone="danger">
            {conflictCount} {conflictCount === 1 ? "issue" : "issues"}
          </Tag>
        ) : null}
      </div>
      <p className={styles.daySummary}>
        {summary.activityCount === 0
          ? "Nothing planned"
          : `${summary.activityCount} stops · ${durationLabel(summary.busyMinutes)} scheduled`}
        {summary.commuteMinutes > 0
          ? ` · ${durationLabel(summary.commuteMinutes)} travelling`
          : ""}
        {summary.costUsd > 0 ? ` · $${summary.costUsd}` : ""}
      </p>
      {stay ? (
        <p className={styles.dayStay}>
          Staying at <strong>{stay.title}</strong>
        </p>
      ) : null}
    </header>
  );
}
