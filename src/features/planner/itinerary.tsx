"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  AlertTriangle,
  CalendarDays,
  ChevronRight,
  MapPin,
  Plus,
  Sparkles,
} from "lucide-react";

import { Hummingbird } from "@/components/brand/hummingbird";
import { AvatarStack } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/chip";
import { ACCOUNT_USER } from "@/data/account";
import { getDestination } from "@/data/destinations";
import { categoryMeta, COMMUTE_LABELS, travellerColor } from "@/lib/categories";
import { cn } from "@/lib/utils";
import {
  activitiesForDay,
  commentsForDisplay,
  commentViewerId,
  conflictIdsForDay,
  conflictsForDay,
  gapsForDay,
  guestsForItem,
  itemHasUnreadComments,
  itemsForDay,
  stayForDay,
  summariseDay,
  type DayGap,
} from "@/lib/trip/schedule";
import {
  dayKey,
  dayLabelLong,
  durationLabel,
  liveProgress,
  minutesIntoDay,
  relativeGapLabel,
  timeLabel,
  timeLabelPill,
  wallNow,
  type ClockFormat,
} from "@/lib/trip/time";
import type { ItineraryItem, Traveller, Trip } from "@/lib/types";
import { useSession } from "@/stores/session-store";
import { useTrip } from "@/stores/trip-store";

import { BedTimeCard } from "./bedtime-card";
import { FreeTimeCard } from "./free-time-card";
import { StayBar } from "./stay-bar";
import { UnreadCommentMark } from "./unread-comment-mark";
import styles from "./itinerary.module.css";

/**
 * Itinerary as a phone-width journal of stop cards.
 *
 * The attached reference is a stacked day list: timeline, date kicker, time
 * as pills, a four-up of conditions. We keep that object — not weather, and
 * not a stretched desktop poster. The stay is header context, not a stop.
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
  section?: boolean;
  onScroll?: (event: { currentTarget: HTMLElement }) => void;
}

type Thought = { person: Traveller; text: string };

const COMMENTS_VISIBLE = 3;

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
  section = false,
  onScroll,
}: ItineraryProps) {
  const reduceMotion = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const prefs = useTrip((s) => s.prefs);
  const clock = prefs.timeFormat;
  const city = getDestination(trip.destinationId)?.name ?? null;
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  const wall = wallNow(trip.timezone, now);

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
  const issueIds = useMemo(() => {
    const errors = conflicts.errors;
    const warnings = conflicts.warnings;
    const errorIds = activities
      .filter((item) => errors.has(item.id))
      .map((item) => item.id);
    const warnIds = activities
      .filter((item) => warnings.has(item.id))
      .map((item) => item.id);
    return [...errorIds, ...warnIds];
  }, [activities, conflicts]);
  const gaps = useMemo(() => gapsForDay(trip, activeDay), [trip, activeDay]);
  const summary = summariseDay(trip, activeDay);
  const stay = stayForDay(trip, activeDay);

  function jumpToIssue() {
    if (issueIds.length === 0) return;
    const at = selectedItemId ? issueIds.indexOf(selectedItemId) : -1;
    const next = issueIds[at >= 0 ? (at + 1) % issueIds.length : 0];
    onSelect(next);
    const card = rootRef.current?.querySelector<HTMLElement>(
      `[data-event="${CSS.escape(next)}"]`,
    );
    card?.scrollIntoView({
      block: "center",
      inline: "nearest",
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }

  const commuteBefore = useMemo(() => {
    const map = new Map<string, ItineraryItem>();
    for (const item of all) {
      if (item.kind === "commute" && item.commute) {
        map.set(item.commute.toItemId, item);
      }
    }
    return map;
  }, [all]);

  const cards: ItineraryItem[] = activities;
  const timeline = useMemo(() => {
    const rows: Array<
      | { type: "gap"; gap: DayGap }
      | { type: "card"; item: ItineraryItem; index: number }
    > = [];
    let gi = 0;
    for (let index = 0; index < cards.length; index += 1) {
      const item = cards[index];
      const start = item.start
        ? minutesIntoDay(item.start)
        : Number.POSITIVE_INFINITY;
      while (gi < gaps.length && gaps[gi].startMinutes < start) {
        rows.push({ type: "gap", gap: gaps[gi] });
        gi += 1;
      }
      rows.push({ type: "card", item, index });
    }
    while (gi < gaps.length) {
      rows.push({ type: "gap", gap: gaps[gi] });
      gi += 1;
    }
    return rows;
  }, [cards, gaps]);

  if (cards.length === 0) {
    return (
      <div
        ref={rootRef}
        className={cn(styles.root, section && styles.section)}
        onScroll={onScroll}
      >
        <DayHeader
          day={activeDay}
          summary={summary}
          conflictCount={0}
        />
        {stay ? (
          <StayBand
            stay={stay}
            selected={selectedItemId === stay.id}
            onSelect={() => onSelect(stay.id)}
            onOpen={() => onOpen(stay.id)}
          />
        ) : null}
        <div className={styles.empty}>
          <Hummingbird mood="curious" size={96} className={styles.emptyBird} />
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
              onClick={() =>
                onCreate(activeDay, 10 * 60, prefs.defaultDurationMin)
              }
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
    <div
      ref={rootRef}
      className={cn(styles.root, section && styles.section)}
      onScroll={onScroll}
    >
      <DayHeader
        day={activeDay}
        summary={summary}
        conflictCount={conflictList.length}
        onJumpToIssue={jumpToIssue}
      />
      {stay ? (
        <StayBand
          stay={stay}
          selected={selectedItemId === stay.id}
          onSelect={() => onSelect(stay.id)}
          onOpen={() => onOpen(stay.id)}
        />
      ) : null}

      <div className={styles.dayStack}>
      <ol className={styles.list}>
        {timeline.map((row, rowIndex) => {
          if (row.type === "gap") {
            return (
              <li key={`gap-${row.gap.startMinutes}-${row.gap.endMinutes}`}>
                <FreeTimeCard
                  day={activeDay}
                  gap={row.gap}
                  clock={clock}
                  onFill={() => onFillGap(activeDay)}
                  onAdd={() =>
                    onCreate(
                      activeDay,
                      row.gap.startMinutes + 15,
                      prefs.defaultDurationMin,
                    )
                  }
                />
              </li>
            );
          }

          const { item, index } = row;
          const previous = cards[index - 1];
          const commute = commuteBefore.get(item.id) ?? null;
          const freeBefore =
            Boolean(item.start) &&
            gaps.some(
              (gap) => gap.endMinutes === minutesIntoDay(item.start!),
            );
          const gapMinutes =
            !freeBefore && previous?.end && item.start
              ? minutesIntoDay(item.start) - minutesIntoDay(previous.end)
              : null;
          const kicker = kickerFor(item, commute, gapMinutes, activeDay);

          return (
            <motion.li
              key={item.id}
              layout={!reduceMotion}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.32,
                ease: [0.2, 0.8, 0.2, 1],
                delay: reduceMotion ? 0 : Math.min(index * 0.04, 0.28),
              }}
            >
              <StopCard
                item={item}
                day={activeDay}
                trip={trip}
                city={city}
                clock={clock}
                linked={rowIndex > 0}
                fromGap={freeBefore}
                kicker={kicker}
                isSelected={selectedItemId === item.id}
                isHovered={hoveredItemId === item.id}
                conflicted={conflicts.errors.has(item.id)}
                warned={conflicts.warnings.has(item.id)}
                onSelect={onSelect}
                onOpen={onOpen}
                onHover={onHover}
                wall={wall}
              />
            </motion.li>
          );
        })}
      </ol>

      <BedTimeCard
        live={wall.day >= trip.startDate && wall.day <= trip.endDate}
        lastDay={activeDay === trip.endDate}
      />
      </div>
    </div>
  );
}

function kickerFor(
  item: ItineraryItem,
  commute: ItineraryItem | null,
  gapMinutes: number | null,
  day: string,
): string {
  if (commute?.commute) {
    return `${COMMUTE_LABELS[commute.commute.mode]} · ${durationLabel(commute.commute.minutes)}`;
  }
  if (gapMinutes !== null) return relativeGapLabel(gapMinutes);
  const area = item.place?.neighbourhood;
  if (area) return area;
  return categoryMeta(item.category).label;
}

function StopCard({
  item,
  day,
  trip,
  city,
  clock,
  linked,
  fromGap = false,
  kicker,
  isSelected,
  isHovered,
  conflicted,
  warned,
  onSelect,
  onOpen,
  onHover,
  wall,
}: {
  item: ItineraryItem;
  day: string;
  trip: Trip;
  city: string | null;
  clock: ClockFormat;
  linked: boolean;
  fromGap?: boolean;
  kicker: string;
  isSelected: boolean;
  isHovered: boolean;
  conflicted: boolean;
  warned: boolean;
  onSelect: (id: string) => void;
  onOpen: (id: string) => void;
  onHover: (id: string | null) => void;
  wall: { day: string; minutes: number };
}) {
  const meta = categoryMeta(item.category);
  const Icon = meta.icon;
  const place = placeLine(item, city);
  const guests = guestsForItem(item, trip);
  const thoughts = commentsForDisplay(item, trip);
  const commentSeen = useTrip((s) => s.commentSeen);
  const sessionId = useSession((s) => s.user?.id ?? ACCOUNT_USER.id);
  const unreadComments = itemHasUnreadComments(
    item,
    commentViewerId(trip.travellers, sessionId),
    commentSeen,
  );

  return (
    <div
      data-event={item.id}
      className={cn(
        styles.card,
        styles.paper,
        linked && styles.linked,
        isSelected && styles.cardSelected,
        isHovered && styles.cardHovered,
        conflicted && styles.cardConflicted,
        warned && !conflicted && styles.cardWarned,
        unreadComments && styles.hasUnread,
      )}
      style={{ ["--cat-color" as string]: meta.color }}
      onClick={() => onSelect(item.id)}
      onDoubleClick={() => onOpen(item.id)}
      onPointerEnter={() => onHover(item.id)}
      onPointerLeave={() => onHover(null)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(item.id);
        }
      }}
    >
      {linked ? (
        <span
          className={cn(styles.railAbove, fromGap && styles.railFromGap)}
          aria-hidden
        />
      ) : null}
      <span className={styles.rail} aria-hidden />
      {unreadComments ? <UnreadCommentMark className={styles.unreadMark} /> : null}
      <p className={styles.kicker}>{kicker}</p>
      <span className={styles.glyph} aria-hidden>
        <Icon size={15} strokeWidth={2} />
      </span>
      <div className={styles.body}>
        <h4 className={styles.title}>{item.title}</h4>
        {place ? <p className={styles.place}>{place}</p> : null}

        <div className={styles.metaRow}>
          <TimeRow item={item} day={day} clock={clock} wall={wall} />
          {guests.length > 0 ? (
            <span className={styles.who}>
              <AvatarStack travellers={guests} size="xs" max={4} />
            </span>
          ) : null}
        </div>

        {thoughts.length > 0 ? (
          <CommentsBlock thoughts={thoughts} onOpen={() => onSelect(item.id)} />
        ) : null}

        {conflicted || warned ? (
          <div className={cn(styles.alert, warned && !conflicted && styles.alertWarn)}>
            <AlertTriangle className={styles.alertIcon} size={16} strokeWidth={2} />
            <p className={styles.alertCopy}>
              {conflicted ? "This overlaps another stop" : "Tight connection"}
            </p>
            <button
              type="button"
              className={styles.alertCta}
              onClick={(event) => {
                event.stopPropagation();
                onOpen(item.id);
              }}
            >
              Open to resolve
              <ChevronRight size={16} strokeWidth={2} aria-hidden />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function TimeRow({
  item,
  day,
  clock,
  wall,
}: {
  item: ItineraryItem;
  day: string;
  clock: ClockFormat;
  wall: { day: string; minutes: number };
}) {
  if (item.kind === "stay" && item.start && item.end) {
    const checkIn = dayKey(item.start) === day;
    const checkOut = dayKey(item.end) === day;
    if (checkIn && !checkOut) {
      return (
        <div className={styles.timeSingle}>
          <span className={styles.timeCaption}>Check-in</span>
          <span className={styles.pill}>{timeLabelPill(item.start, clock)}</span>
        </div>
      );
    }
    if (checkOut && !checkIn) {
      return (
        <div className={styles.timeSingle}>
          <span className={styles.timeCaption}>Check-out</span>
          <span className={styles.pill}>{timeLabelPill(item.end, clock)}</span>
        </div>
      );
    }
  }

  if (!item.start || !item.end) {
    return (
      <div className={styles.timeSingle}>
        <span className={styles.timeCaption}>When</span>
        <span className={styles.pill}>Open</span>
      </div>
    );
  }

  const progress = liveProgress(item.start, item.end, wall);
  const when = `${timeLabel(item.start, clock)} to ${timeLabel(item.end, clock)}`;

  return (
    <div
      className={cn(styles.timeRange, progress != null && styles.timeLive)}
      aria-label={progress != null ? `${when}, happening now` : when}
    >
      <span className={styles.pill}>{timeLabelPill(item.start, clock)}</span>
      <span className={styles.bar} aria-hidden>
        {progress != null ? (
          <span
            className={styles.barFill}
            style={{ width: `${Math.max(progress, 0.06) * 100}%` }}
          />
        ) : null}
      </span>
      <span className={styles.pill}>{timeLabelPill(item.end, clock)}</span>
    </div>
  );
}

function CommentsBlock({
  thoughts,
  onOpen,
}: {
  thoughts: Thought[];
  onOpen: () => void;
}) {
  const visible = thoughts.slice(0, COMMENTS_VISIBLE);
  const extra = thoughts.length - visible.length;

  return (
    <ul className={styles.comments}>
      {visible.map((thought) => (
        <li key={`${thought.person.id}-${thought.text.slice(0, 24)}`}>
          <p className={styles.commentsCopy}>
            <span
              className={styles.commentsWho}
              style={{ color: travellerColor(thought.person.colorIndex) }}
            >
              {thought.person.name.split(" ")[0]}
            </span>
            {thought.text}
          </p>
        </li>
      ))}
      {extra > 0 ? (
        <li>
          <button
            type="button"
            className={styles.commentsMore}
            onClick={(event) => {
              event.stopPropagation();
              onOpen();
            }}
          >
            +{extra} more
          </button>
        </li>
      ) : null}
    </ul>
  );
}

function placeLine(item: ItineraryItem, city: string | null): string | null {
  const area = item.place?.neighbourhood ?? item.place?.name ?? null;
  if (area && city) return `${area}, ${city}`;
  return area ?? item.subtitle ?? null;
}

function DayHeader({
  day,
  summary,
  conflictCount,
  onJumpToIssue,
}: {
  day: string;
  summary: ReturnType<typeof summariseDay>;
  conflictCount: number;
  onJumpToIssue?: () => void;
}) {
  return (
    <header className={styles.header}>
      <div className={styles.headerTop}>
        <h3 className={styles.dayTitle}>{dayLabelLong(day)}</h3>
        {conflictCount > 0 ? (
          <Tag
            tone="danger"
            onClick={onJumpToIssue}
            aria-label={
              conflictCount === 1
                ? "Show the scheduling issue"
                : `Show the next of ${conflictCount} scheduling issues`
            }
          >
            {conflictCount} {conflictCount === 1 ? "issue" : "issues"}
          </Tag>
        ) : null}
      </div>
      <p className={styles.meta}>
        <span>
          <CalendarDays size={15} strokeWidth={2} aria-hidden />
          {summary.activityCount === 0
            ? "Open day"
            : `${summary.activityCount} ${summary.activityCount === 1 ? "stop" : "stops"}`}
        </span>
        <span className={styles.metaRule} aria-hidden>
          |
        </span>
        <span>
          <MapPin size={15} strokeWidth={2} aria-hidden />
          {summary.busyMinutes > 0
            ? durationLabel(summary.busyMinutes)
            : "Unscheduled"}
        </span>
      </p>
    </header>
  );
}

function StayBand({
  stay,
  selected,
  onSelect,
  onOpen,
}: {
  stay: ItineraryItem;
  selected: boolean;
  onSelect: () => void;
  onOpen: () => void;
}) {
  return (
    <div className={styles.allDay}>
      <span className={styles.allDayLabel}>Stay</span>
      <StayBar
        stay={stay}
        selected={selected}
        onSelect={onSelect}
        onOpen={onOpen}
      />
    </div>
  );
}
