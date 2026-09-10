"use client";

import { useMemo, useRef, useState } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Plus, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  activitiesForDay,
  conflictIdsForDay,
  gapsForDay,
  itemsForDay,
  layOutDay,
  stayForDay,
  summariseDay,
} from "@/lib/trip/schedule";
import {
  atMinutes,
  dayParts,
  durationLabel,
  minutesIntoDay,
  timeLabel,
} from "@/lib/trip/time";
import type { ItineraryItem, Trip } from "@/lib/types";

import { EventCard } from "./event-card";
import styles from "./calendar.module.css";

/**
 * The Plan grid.
 *
 * A trip is a timeline before it is a list, and this is the surface that can
 * say what does NOT fit — the reason the calendar remains the anchor rather
 * than a view option. Days are columns, hours are rows, and everything on it
 * is derived from the trip's items so the grid, the map and the list can never
 * disagree.
 *
 * The grid's job is to disappear. Hour rules are near-invisible in isolation
 * and unmistakable in ranks; day boundaries are one step stronger; nothing
 * else draws a line. What Intripid adds on top of that familiar geometry is
 * the reasoning: commutes between stops, free time as a real affordance
 * rather than blank space, and clashes stated on the two cards that collide.
 */

/** Visible window. Deliberately not 00:00–24:00 — nobody plans at 4am. */
export const DAY_START_MIN = 7 * 60;
export const DAY_END_MIN = 23 * 60;
export const SNAP_MIN = 15;

const HOUR_COUNT = (DAY_END_MIN - DAY_START_MIN) / 60;

export interface CalendarProps {
  trip: Trip;
  days: string[];
  activeDay: string;
  selectedItemId: string | null;
  hoveredItemId: string | null;
  draggingId: string | null;
  hourHeight: number;
  onSelect: (id: string) => void;
  onOpen: (id: string) => void;
  onHover: (id: string | null) => void;
  onDayFocus: (day: string) => void;
  onCreate: (day: string, startMinutes: number, durationMin: number) => void;
  onFillGap: (day: string) => void;
  /** Single-day mode for narrow viewports. */
  singleDay?: boolean;
}

export function Calendar({
  trip,
  days,
  activeDay,
  selectedItemId,
  hoveredItemId,
  draggingId,
  hourHeight,
  onSelect,
  onOpen,
  onHover,
  onDayFocus,
  onCreate,
  onFillGap,
  singleDay = false,
}: CalendarProps) {
  const visibleDays = singleDay ? [activeDay] : days;
  const stay = stayForDay(trip, activeDay);

  const hours = useMemo(
    () =>
      Array.from({ length: HOUR_COUNT + 1 }, (_, i) => DAY_START_MIN + i * 60),
    [],
  );

  return (
    <div className={styles.root}>
      {/* All-day band: a stay spans nights, not hours. */}
      {stay ? (
        <div className={styles.allDay}>
          <span className={styles.allDayLabel}>Stay</span>
          <div className={styles.allDayTrack}>
            <button
              type="button"
              className={cn(
                styles.stayBar,
                selectedItemId === stay.id && styles.stayBarSelected,
              )}
              onClick={() => onSelect(stay.id)}
              onDoubleClick={() => onOpen(stay.id)}
            >
              <span className={styles.stayName}>{stay.title}</span>
              {/* Only show the venue when it adds something the title doesn't. */}
              {stay.place && stay.place.name !== stay.title ? (
                <span className={styles.stayPlace}>{stay.place.name}</span>
              ) : stay.place ? (
                <span className={styles.stayPlace}>{stay.place.address}</span>
              ) : null}
              {stay.booking ? (
                <span className={styles.stayBooking}>{stay.booking}</span>
              ) : null}
            </button>
          </div>
        </div>
      ) : null}

      <div className={styles.scroll}>
        <div
          className={styles.grid}
          style={{
            ["--hour-h" as string]: `${hourHeight}px`,
            ["--col-count" as string]: visibleDays.length,
          }}
        >
          {/* Hour gutter */}
          <div className={styles.gutter} aria-hidden>
            {hours.slice(0, -1).map((minutes) => (
              <div key={minutes} className={styles.gutterHour}>
                <span className={cn(styles.gutterLabel, "tabular")}>
                  {timeLabel(atMinutes("2026-01-01", minutes))
                    .replace(":00", "")
                    .toLowerCase()}
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {visibleDays.map((day) => (
            <DayColumn
              key={day}
              trip={trip}
              day={day}
              isActive={day === activeDay}
              hourHeight={hourHeight}
              hours={hours}
              selectedItemId={selectedItemId}
              hoveredItemId={hoveredItemId}
              draggingId={draggingId}
              onSelect={onSelect}
              onOpen={onOpen}
              onHover={onHover}
              onDayFocus={onDayFocus}
              onCreate={onCreate}
              onFillGap={onFillGap}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Day column                                                                */
/* -------------------------------------------------------------------------- */

interface DayColumnProps {
  trip: Trip;
  day: string;
  isActive: boolean;
  hourHeight: number;
  hours: number[];
  selectedItemId: string | null;
  hoveredItemId: string | null;
  draggingId: string | null;
  onSelect: (id: string) => void;
  onOpen: (id: string) => void;
  onHover: (id: string | null) => void;
  onDayFocus: (day: string) => void;
  onCreate: (day: string, startMinutes: number, durationMin: number) => void;
  onFillGap: (day: string) => void;
}

function DayColumn({
  trip,
  day,
  isActive,
  hourHeight,
  hours,
  selectedItemId,
  hoveredItemId,
  draggingId,
  onSelect,
  onOpen,
  onHover,
  onDayFocus,
  onCreate,
  onFillGap,
}: DayColumnProps) {
  const columnRef = useRef<HTMLDivElement>(null);
  const [drawing, setDrawing] = useState<{ from: number; to: number } | null>(null);

  const { setNodeRef, isOver } = useDroppable({
    id: `day:${day}`,
    data: { day },
  });

  const items = itemsForDay(trip, day);
  const laidOut = useMemo(() => layOutDay(items), [items]);
  const conflicts = useMemo(() => conflictIdsForDay(trip, day), [trip, day]);
  const gaps = useMemo(() => gapsForDay(trip, day), [trip, day]);
  const pxPerMin = hourHeight / 60;
  const toPx = (minutes: number) => (minutes - DAY_START_MIN) * pxPerMin;

  /** Pointer position → snapped minutes within the day. */
  function minutesFromPointer(clientY: number): number {
    const rect = columnRef.current?.getBoundingClientRect();
    if (!rect) return DAY_START_MIN;
    const offset = clientY - rect.top;
    const raw = DAY_START_MIN + offset / pxPerMin;
    return Math.max(
      DAY_START_MIN,
      Math.min(DAY_END_MIN - SNAP_MIN, Math.round(raw / SNAP_MIN) * SNAP_MIN),
    );
  }

  return (
    <div
      className={cn(
        styles.column,
        isActive && styles.columnActive,
        isOver && styles.columnOver,
      )}
      onClick={() => onDayFocus(day)}
    >
      {/* Hour lines */}
      <div className={styles.lines} aria-hidden>
        {hours.slice(0, -1).map((minutes) => (
          <div key={minutes} className={styles.line} />
        ))}
      </div>

      {/*
       * The drop + draw surface. Dragging on empty time creates an activity
       * with that exact range, which is faster than opening a form and typing
       * two times.
       */}
      <div
        ref={(node) => {
          columnRef.current = node;
          setNodeRef(node);
        }}
        className={styles.surface}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          const target = event.target as HTMLElement;
          // Only start drawing on genuinely empty grid.
          if (target.closest("[data-event]") || target.closest("button")) return;
          const start = minutesFromPointer(event.clientY);
          setDrawing({ from: start, to: start + 30 });
          (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!drawing) return;
          const to = minutesFromPointer(event.clientY);
          setDrawing((current) => (current ? { ...current, to } : null));
        }}
        onPointerUp={() => {
          if (!drawing) return;
          const from = Math.min(drawing.from, drawing.to);
          const to = Math.max(drawing.from, drawing.to);
          const duration = Math.max(30, to - from);
          setDrawing(null);
          onCreate(day, from, duration);
        }}
        onPointerCancel={() => setDrawing(null)}
      >
        {/* Free-time affordances — the strongest AI idea in the original. */}
        {gaps.map((gap) => (
          <GapSlot
            key={`${gap.startMinutes}-${gap.endMinutes}`}
            top={toPx(gap.startMinutes)}
            height={(gap.endMinutes - gap.startMinutes) * pxPerMin}
            minutes={gap.minutes}
            onFill={() => {
              onDayFocus(day);
              onFillGap(day);
            }}
            onCreate={() => onCreate(day, gap.startMinutes + 15, 90)}
          />
        ))}

        {/* Live preview of the range being drawn */}
        {drawing ? (
          <div
            className={styles.drawing}
            style={{
              top: toPx(Math.min(drawing.from, drawing.to)),
              height:
                Math.max(30, Math.abs(drawing.to - drawing.from)) * pxPerMin,
            }}
          >
            <span className="tabular">
              {timeLabel(atMinutes(day, Math.min(drawing.from, drawing.to)))}
              {" · "}
              {durationLabel(Math.max(30, Math.abs(drawing.to - drawing.from)))}
            </span>
          </div>
        ) : null}

        {/* Events */}
        {laidOut.map(({ item, startMinutes, endMinutes, column, columns }) => (
          <DraggableEvent
            key={item.id}
            item={item}
            trip={trip}
            top={toPx(startMinutes)}
            /*
             * A floor of 26px, not 22: below that an 11px title has nowhere
             * to sit, and a card you cannot read is worse than one that
             * slightly overstates its length.
             */
            height={Math.max(26, (endMinutes - startMinutes) * pxPerMin)}
            column={column}
            columns={columns}
            selected={selectedItemId === item.id}
            hovered={hoveredItemId === item.id}
            conflicted={conflicts.errors.has(item.id)}
            warned={conflicts.warnings.has(item.id)}
            dimmed={
              Boolean(selectedItemId) &&
              selectedItemId !== item.id &&
              item.kind !== "commute"
            }
            dragging={draggingId === item.id}
            onSelect={() => onSelect(item.id)}
            onOpen={() => onOpen(item.id)}
            onHover={onHover}
          />
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Draggable event                                                           */
/* -------------------------------------------------------------------------- */

interface DraggableEventProps {
  item: ItineraryItem;
  trip: Trip;
  top: number;
  height: number;
  column: number;
  columns: number;
  selected: boolean;
  hovered: boolean;
  conflicted: boolean;
  warned: boolean;
  dimmed: boolean;
  dragging: boolean;
  onSelect: () => void;
  onOpen: () => void;
  onHover: (id: string | null) => void;
}

function DraggableEvent({
  item,
  trip,
  top,
  height,
  column,
  columns,
  selected,
  hovered,
  conflicted,
  warned,
  dimmed,
  dragging,
  onSelect,
  onOpen,
  onHover,
}: DraggableEventProps) {
  /*
   * A stay is a fact, not a preference: check-in times are set by the hotel.
   * Locked items are not draggable, and the card says why rather than
   * silently ignoring the gesture.
   */
  const locked = item.kind === "stay";

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: item.id,
    disabled: locked,
    data: { kind: "item", item },
  });

  /*
   * Overlap geometry.
   *
   * Equal columns with a small deliberate overlap, rather than the cascade
   * some calendars use: a cascade hides the start time of everything behind
   * it, and start time is the one fact a clash is about. The 5% overlap is
   * what makes the layering visible at all — without it two abutting cards
   * read as one wide card split by a hairline.
   *
   * Whichever card is selected or hovered comes to the front, so you can
   * always read the whole of the one you are working on.
   */
  const step = 100 / columns;
  const overlapPct = columns > 1 ? 5 : 0;
  const leftPct = column * step;
  const widthPct = Math.min(step + overlapPct, 100 - leftPct);
  const behind = columns > 1 && column < columns - 1;

  return (
    <div
      className={styles.eventSlot}
      style={{
        top,
        height,
        left: `calc(${leftPct}% + 1px)`,
        width: `calc(${widthPct}% - ${columns > 1 ? 3 : 3}px)`,
        zIndex: selected ? 9 : hovered ? 8 : columns > 1 ? 2 + column : 1,
      }}
      onPointerEnter={() => onHover(item.id)}
      onPointerLeave={() => onHover(null)}
    >
      <EventCard
        ref={setNodeRef}
        item={item}
        travellers={trip.travellers}
        height={height}
        selected={selected}
        hovered={hovered}
        conflicted={conflicted}
        warned={warned}
        dimmed={dimmed}
        dragging={dragging || isDragging}
        stacked={behind}
        onSelect={onSelect}
        onOpen={onOpen}
        className={styles.eventFill}
        dragHandleProps={locked ? undefined : { ...listeners, ...attributes }}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Gap slot                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Unscheduled time, treated as an opportunity.
 *
 * The copy and the two-option shape come straight from the historical
 * product's best AI moment: an inline card between the two activities that
 * create the gap, rather than a suggestion buried in a sidebar.
 */
function GapSlot({
  top,
  height,
  minutes,
  onFill,
  onCreate,
}: {
  top: number;
  height: number;
  minutes: number;
  onFill: () => void;
  onCreate: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const [hovered, setHovered] = useState(false);
  /*
   * Under 45 minutes a gap is just breathing room between two stops and needs
   * no label at all — labelling every one of them put "22m free" on the grid
   * more often than it put activities there.
   */
  const worthLabelling = minutes >= 45;
  const roomy = height >= 92;

  return (
    <div
      className={styles.gap}
      style={{ top, height }}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <div className={styles.gapInner}>
        {worthLabelling ? (
          <span className={styles.gapLabel}>{durationLabel(minutes)} free</span>
        ) : null}

        <AnimatePresence>
          {hovered ? (
            <motion.div
              className={styles.gapActions}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 3 }}
              transition={{ duration: reduceMotion ? 0.1 : 0.14 }}
            >
              <button
                type="button"
                className={styles.gapButton}
                onClick={(event) => {
                  event.stopPropagation();
                  onCreate();
                }}
              >
                <Plus size={11} strokeWidth={2.6} />
                Add
              </button>
              {roomy ? (
                <button
                  type="button"
                  className={cn(styles.gapButton, styles.gapButtonAi)}
                  onClick={(event) => {
                    event.stopPropagation();
                    onFill();
                  }}
                >
                  <Sparkles size={11} strokeWidth={2.4} />
                  Suggest
                </button>
              ) : null}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Day header rail                                                           */
/* -------------------------------------------------------------------------- */

export interface DayRailProps {
  trip: Trip;
  days: string[];
  activeDay: string;
  onSelectDay: (day: string) => void;
  /** Highlight only the active day (single-day mode). */
  compact?: boolean;
}

/**
 * Day navigation that carries the shape of each day: how many stops, how full,
 * and whether anything is wrong. The historical version was a grey band of
 * dates; this one is a summary you can plan from.
 */
export function DayRail({
  trip,
  days,
  activeDay,
  onSelectDay,
  compact = false,
}: DayRailProps) {
  return (
    <div className={cn(styles.dayRail, compact && styles.dayRailCompact)}>
      {days.map((day, index) => {
        const parts = dayParts(day);
        const summary = summariseDay(trip, day);
        const isActive = day === activeDay;
        const activities = activitiesForDay(trip, day);
        const load = Math.min(1, summary.busyMinutes / (10 * 60));

        return (
          <button
            key={day}
            type="button"
            data-day-tab={day}
            onClick={() => onSelectDay(day)}
            aria-current={isActive}
            className={cn(styles.dayTab, isActive && styles.dayTabActive)}
          >
            {/*
             * Two rows, not four. The previous stack — index, date, count,
             * bar — spent 110px of vertical space on five headers before a
             * single hour of the day was visible.
             */}
            <span className={styles.dayDate}>
              <span className={styles.dayWeekday}>{parts.weekday}</span>
              <span className={cn(styles.dayNum, "tabular")}>{parts.dayNum}</span>
              <span className={styles.dayMonth}>{parts.month}</span>
              {summary.errorCount > 0 ? (
                <span className={styles.dayConflict} title="Scheduling clash">
                  {summary.errorCount}
                </span>
              ) : summary.warningCount > 0 ? (
                /* Advisory: a dot, not a count in alarm red. */
                <span
                  className={styles.dayWarning}
                  title={`${summary.warningCount} tight connection${
                    summary.warningCount === 1 ? "" : "s"
                  }`}
                  aria-label={`${summary.warningCount} tight connection${
                    summary.warningCount === 1 ? "" : "s"
                  }`}
                />
              ) : null}
            </span>

            <span className={styles.dayMeta}>
              <span className={styles.dayIndex}>Day {index + 1}</span>
              <span className={styles.dayMetaDot} aria-hidden>
                ·
              </span>
              {activities.length === 0
                ? "nothing planned"
                : `${activities.length} ${activities.length === 1 ? "stop" : "stops"}`}
            </span>

            {/* A load bar reads faster than a duration string. */}
            <span className={styles.dayLoad} aria-hidden>
              <span
                className={styles.dayLoadFill}
                style={{ width: `${load * 100}%` }}
              />
            </span>
          </button>
        );
      })}
    </div>
  );
}

export { minutesIntoDay };
