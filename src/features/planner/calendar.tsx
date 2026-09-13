"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Plus } from "lucide-react";

import { AiMark } from "@/components/brand/ai-mark";
import { cn } from "@/lib/utils";
import { useIsCompact } from "@/lib/use-media-query";
import { IconButton } from "@/components/ui/button";
import { Popover } from "@/components/ui/overlay";
import {
  conflictIdsForDay,
  conflictsForDay,
  gapsForDay,
  itemsForDay,
  layOutDay,
  stayForDay,
  guestsForItem,
} from "@/lib/trip/schedule";
import {
  atMinutes,
  dayParts,
  durationLabel,
  minutesIntoDay,
  timeLabel,
  timeLabelCompact,
  wallNow,
  type ClockFormat,
} from "@/lib/trip/time";
import type { Conflict, ItineraryItem, Trip } from "@/lib/types";

import { EventCard } from "./event-card";
import { StayBar } from "./stay-bar";
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

/** Visible window. Full day — active hours shade the usual waking span, they do not crop it. */
export const DAY_START_MIN = 0;
export const DAY_END_MIN = 24 * 60;
export const SNAP_MIN = 15;

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
  /** When set, overlay stops any of these travellers are going to, plus group stops. */
  forTravellerIds?: string[] | null;
  dayStartMin?: number;
  dayEndMin?: number;
  /** Usual waking window. Shades time outside it; does not crop the grid. */
  activeStartMin?: number;
  activeEndMin?: number;
  timeFormat?: ClockFormat;
  defaultDurationMin?: number;
  /** Ghost block for the in-place create popover, Google Calendar style. */
  createGhost?: {
    day: string;
    startMinutes: number;
    durationMin: number;
    title?: string;
  } | null;
  /** Fires as the hour grid scrolls — used to tuck compact chrome. */
  onScroll?: (event: { currentTarget: HTMLElement }) => void;
  /** Week / 4-day columns are too narrow for labelled gap chips. */
  denseGaps?: boolean;
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
  forTravellerIds = null,
  dayStartMin = DAY_START_MIN,
  dayEndMin = DAY_END_MIN,
  activeStartMin = DAY_START_MIN,
  activeEndMin = DAY_END_MIN,
  timeFormat = "12h",
  defaultDurationMin = 90,
  createGhost = null,
  onScroll,
  denseGaps = false,
}: CalendarProps) {
  const visibleDays = singleDay ? [activeDay] : days;
  const stay = stayForDay(trip, activeDay);
  const hourCount = Math.max(1, (dayEndMin - dayStartMin) / 60);
  const scrollRef = useRef<HTMLDivElement>(null);
  const userMovedScroll = useRef(false);
  const pinningScroll = useRef(false);
  const hoursPinKey = `${activeStartMin}:${dayStartMin}`;
  const lastHoursPinKey = useRef(hoursPinKey);

  const hours = useMemo(
    () =>
      Array.from({ length: hourCount + 1 }, (_, i) => dayStartMin + i * 60),
    [hourCount, dayStartMin],
  );

  useLayoutEffect(() => {
    if (lastHoursPinKey.current !== hoursPinKey) {
      userMovedScroll.current = false;
      lastHoursPinKey.current = hoursPinKey;
    }
    if (userMovedScroll.current) return;
    const node = scrollRef.current;
    if (!node) return;
    const pxPerMin = hourHeight / 60;
    const labelRoom = 14;
    pinningScroll.current = true;
    node.scrollTop = Math.max(
      0,
      (activeStartMin - dayStartMin) * pxPerMin - labelRoom,
    );
    requestAnimationFrame(() => {
      pinningScroll.current = false;
    });
  }, [activeStartMin, dayStartMin, hourHeight, hoursPinKey]);

  return (
    <div className={styles.root}>
      {/* All-day band: a stay spans nights, not hours. */}
      {stay ? (
        <div className={styles.allDay}>
          <span className={styles.allDayLabel}>Stay</span>
          <div className={styles.allDayTrack}>
            <StayBar
              stay={stay}
              selected={selectedItemId === stay.id}
              onSelect={() => onSelect(stay.id)}
              onOpen={() => onOpen(stay.id)}
            />
          </div>
        </div>
      ) : null}

      <div
        ref={scrollRef}
        className={styles.scroll}
        data-planner-canvas=""
        onScroll={(event) => {
          if (pinningScroll.current) return;
          userMovedScroll.current = true;
          onScroll?.(event);
        }}
      >
        <div
          className={styles.grid}
          style={{
            ["--hour-h" as string]: `${hourHeight}px`,
            ["--hour-count" as string]: hourCount,
            ["--col-count" as string]: visibleDays.length,
          }}
        >
          {/* Hour gutter */}
          <div className={styles.gutter} aria-hidden>
            {hours.slice(0, -1).map((minutes) => (
              <div key={minutes} className={styles.gutterHour}>
                <span className={cn(styles.gutterLabel, "tabular")}>
                  {hourGutterLabel(minutes, timeFormat)}
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
              forTravellerIds={forTravellerIds}
              dayStartMin={dayStartMin}
              dayEndMin={dayEndMin}
              activeStartMin={activeStartMin}
              activeEndMin={activeEndMin}
              timeFormat={timeFormat}
              defaultDurationMin={defaultDurationMin}
              createGhost={createGhost?.day === day ? createGhost : null}
              denseGaps={denseGaps}
            />
          ))}

          <NowMarker
            timeZone={trip.timezone}
            hourHeight={hourHeight}
            dayStartMin={dayStartMin}
            timeFormat={timeFormat}
            days={visibleDays}
          />
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
  forTravellerIds: string[] | null;
  dayStartMin: number;
  dayEndMin: number;
  activeStartMin: number;
  activeEndMin: number;
  timeFormat: ClockFormat;
  defaultDurationMin: number;
  createGhost: {
    day: string;
    startMinutes: number;
    durationMin: number;
    title?: string;
  } | null;
  denseGaps: boolean;
}

function DayColumn({
  trip,
  day,
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
  forTravellerIds,
  dayStartMin,
  dayEndMin,
  activeStartMin,
  activeEndMin,
  timeFormat,
  defaultDurationMin,
  createGhost,
  denseGaps,
}: DayColumnProps) {
  const columnRef = useRef<HTMLDivElement>(null);
  const isCompact = useIsCompact();
  const [drawing, setDrawing] = useState<{ from: number; to: number } | null>(null);

  const { setNodeRef, isOver } = useDroppable({
    id: `day:${day}`,
    data: { day },
  });

  const items = itemsForDay(trip, day).filter((item) => {
    if (!forTravellerIds || forTravellerIds.length === 0) return true;
    return guestsForItem(item, trip).some((person) =>
      forTravellerIds.includes(person.id),
    );
  });
  const laidOut = useMemo(() => layOutDay(items), [items]);
  const conflicts = useMemo(() => conflictIdsForDay(trip, day), [trip, day]);
  const gaps = useMemo(() => gapsForDay(trip, day), [trip, day]);
  const pxPerMin = hourHeight / 60;
  const toPx = (minutes: number) => (minutes - dayStartMin) * pxPerMin;
  const ghostHeight = createGhost
    ? Math.max(26, createGhost.durationMin * pxPerMin)
    : 0;
  const ghostCompact = ghostHeight > 0 && ghostHeight < 38;

  /** Pointer position → snapped minutes within the day. */
  function minutesFromPointer(clientY: number): number {
    const rect = columnRef.current?.getBoundingClientRect();
    if (!rect) return dayStartMin;
    const offset = clientY - rect.top;
    const raw = dayStartMin + offset / pxPerMin;
    return Math.max(
      dayStartMin,
      Math.min(dayEndMin - SNAP_MIN, Math.round(raw / SNAP_MIN) * SNAP_MIN),
    );
  }

  return (
    <div
      className={cn(
        styles.column,
        isOver && styles.columnOver,
      )}
      onClick={(event) => {
        const target = event.target as HTMLElement;
        if (target.closest("[data-event]")) return;
        onDayFocus(day);
      }}
    >
      {/* Hour lines */}
      <div className={styles.lines} aria-hidden>
        {hours.slice(0, -1).map((minutes) => (
          <div key={minutes} className={styles.line} />
        ))}
      </div>
      {activeStartMin > dayStartMin ? (
        <div
          className={styles.hoursShade}
          style={{
            top: 0,
            height: toPx(activeStartMin),
          }}
          aria-hidden
        />
      ) : null}
      {activeEndMin < dayEndMin ? (
        <div
          className={styles.hoursShade}
          style={{
            top: toPx(activeEndMin),
            bottom: 0,
          }}
          aria-hidden
        />
      ) : null}

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
          if (isCompact && target.closest("[data-gap][data-labelled]")) return;
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
            onCreate={() =>
              onCreate(day, gap.startMinutes + 15, defaultDurationMin)
            }
            dense={denseGaps}
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
              {timeLabel(atMinutes(day, Math.min(drawing.from, drawing.to)), timeFormat)}
              {" · "}
              {durationLabel(Math.max(30, Math.abs(drawing.to - drawing.from)))}
            </span>
          </div>
        ) : null}

        {createGhost && !drawing ? (
          <div
            data-create-ghost
            className={cn(
              styles.drawing,
              styles.createGhost,
              ghostCompact && styles.createGhostCompact,
            )}
            style={{
              top: toPx(createGhost.startMinutes),
              height: ghostHeight,
            }}
          >
            <span className={styles.createGhostTitle}>
              {createGhost.title?.trim() || "New activity"}
            </span>
            <span className={cn(styles.createGhostTime, "tabular")}>
              {ghostCompact
                ? timeLabelCompact(
                    atMinutes(day, createGhost.startMinutes),
                    timeFormat,
                  )
                : `${timeLabel(atMinutes(day, createGhost.startMinutes), timeFormat)} · ${durationLabel(createGhost.durationMin)}`}
            </span>
          </div>
        ) : null}

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
   * Overlap geometry, Google Calendar's rules:
   *  - A right gutter is always empty so you can still draw a new activity
   *    through a busy hour.
   *  - Overlapping stops split the remaining width into equal columns.
   *  - The selected stop expands from its column to the gutter so you can
   *    read it; the others stay put underneath.
   */
  const gutter = 12;
  const usable = `100% - ${gutter}px`;
  const left = `calc((${usable}) * ${column / columns} + 1px)`;
  const span = selected && columns > 1 ? columns - column : 1;
  const width = `calc((${usable}) * ${span / columns} - 3px)`;
  const behind = columns > 1 && column < columns - 1 && !selected;

  return (
    <div
      className={styles.eventSlot}
      style={{
        top,
        height,
        left,
        width,
        zIndex: selected ? 12 : hovered ? 10 : columns > 1 ? 3 + column : 1,
      }}
      onPointerEnter={() => onHover(item.id)}
      onPointerLeave={() => onHover(null)}
      onPointerDownCapture={(event) => {
        if (event.button === 0) onSelect();
      }}
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
  dense = false,
}: {
  top: number;
  height: number;
  minutes: number;
  onFill: () => void;
  onCreate: () => void;
  dense?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const isCompact = useIsCompact();
  const [hovered, setHovered] = useState(false);
  /*
   * Under 45 minutes a gap is just breathing room between two stops and needs
   * no label at all — labelling every one of them put "22m free" on the grid
   * more often than it put activities there.
   */
  const worthLabelling = minutes >= 45;
  const roomy = height >= 92;
  const showActions = worthLabelling && (isCompact || hovered);

  return (
    <div
      className={styles.gap}
      data-gap=""
      data-labelled={worthLabelling ? "" : undefined}
      data-compact={isCompact ? "" : undefined}
      style={{ top, height }}
      onPointerEnter={() => {
        if (!isCompact) setHovered(true);
      }}
      onPointerLeave={() => {
        if (!isCompact) setHovered(false);
      }}
    >
      <div className={styles.gapInner}>
        {worthLabelling ? (
          <span className={styles.gapLabel}>{durationLabel(minutes)} free</span>
        ) : null}

        <AnimatePresence>
          {showActions ? (
            <motion.div
              className={styles.gapActions}
              initial={isCompact ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={
                isCompact || reduceMotion ? { opacity: 0 } : { opacity: 0, y: 3 }
              }
              transition={{ duration: reduceMotion || isCompact ? 0.1 : 0.14 }}
            >
              <button
                type="button"
                className={cn(styles.gapButton, dense && styles.gapButtonIcon)}
                aria-label="Add"
                onClick={(event) => {
                  event.stopPropagation();
                  onCreate();
                }}
              >
                <Plus size={dense ? 14 : 11} strokeWidth={2.6} />
                {dense ? null : "Add"}
              </button>
              {roomy ? (
                <button
                  type="button"
                  className={cn(
                    styles.gapButton,
                    styles.gapButtonAi,
                    dense && styles.gapButtonIcon,
                  )}
                  aria-label="Suggest"
                  onClick={(event) => {
                    event.stopPropagation();
                    onFill();
                  }}
                >
                  <AiMark size={dense ? 14 : 12} />
                  {dense ? null : "Suggest"}
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
  /** Phone Day view: GCal week strip — letters + numbers, scrolls sideways. */
  compact?: boolean;
  /**
   * Phone Week / 4-day / Trip: GCal column headers locked to the grid.
   * Not a second strip — each tab sits on its column, no + in the gutter.
   */
  aligned?: boolean;
  /** ISO day key for the real calendar today, when it falls in the trip. */
  todayKey?: string;
  onCreate?: () => void;
}

/**
 * Week-header navigation.
 *
 * Same marks as the month picker: today is a filled disc with inverted
 * type; selected (when it is not today) is a wash disc. No rings, tab
 * bars, or column chrome — the numeral is the only control.
 */
export function DayRail({
  trip,
  days,
  activeDay,
  onSelectDay,
  compact = false,
  aligned = false,
  todayKey,
  onCreate,
}: DayRailProps) {
  const railRef = useRef<HTMLDivElement>(null);

  // Auto-scroll the active day into view on mobile so swipe navigation
  // keeps the selected tab visible in the horizontal strip.
  useLayoutEffect(() => {
    if (!compact) return;
    const rail = railRef.current;
    if (!rail) return;
    const tab = rail.querySelector(`[data-day-tab="${CSS.escape(activeDay)}"]`);
    if (tab instanceof HTMLElement) {
      tab.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [compact, activeDay]);

  return (
    <div
      ref={railRef}
      data-span={days.length}
      className={cn(
        styles.dayRail,
        compact && styles.dayRailCompact,
        aligned && styles.dayRailColumns,
      )}
    >
      {compact ? null : (
      <div className={styles.dayRailGutter}>
        {aligned ? null : onCreate ? (
          <IconButton
            label="Add an activity"
            variant="secondary"
            size="lg"
            className={styles.addActivity}
            onClick={onCreate}
          >
            <Plus size={22} strokeWidth={2} />
          </IconButton>
        ) : null}
      </div>
      )}
      {days.map((day) => {
        const parts = dayParts(day);
        const issues = conflictsForDay(trip, day);
        const errors = issues.filter((issue) => issue.severity === "error");
        const warnings = issues.filter((issue) => issue.severity === "warning");
        const isActive = day === activeDay;
        const isToday = Boolean(todayKey) && day === todayKey;
        const issueLabel =
          errors.length > 0
            ? `, ${errors.length} scheduling clash${errors.length === 1 ? "" : "es"}`
            : warnings.length > 0
              ? `, ${warnings.length} tight connection${warnings.length === 1 ? "" : "s"}`
              : "";

        return (
          <button
            key={day}
            type="button"
            data-day-tab={day}
            onClick={() => onSelectDay(day)}
            aria-current={isActive ? "true" : undefined}
            aria-label={`${parts.weekday} ${parts.dayNum}${
              isToday ? ", today" : ""
            }${isActive ? ", selected" : ""}${issueLabel}`}
            className={cn(
              styles.dayTab,
              isActive && styles.dayTabActive,
              isToday && styles.dayTabToday,
            )}
          >
            <span className={styles.dayWeekday}>
              {compact || aligned
                ? parts.weekday.charAt(0)
                : parts.weekday.toUpperCase()}
            </span>
            <span
              className={cn(
                styles.dayNum,
                "tabular",
                isActive && !isToday && styles.dayNumActive,
                isToday && styles.dayNumToday,
              )}
            >
              {parts.dayNum}
              {errors.length > 0 || warnings.length > 0 ? (
                <DayIssueBadge errors={errors} warnings={warnings} />
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function DayIssueBadge({
  errors,
  warnings,
}: {
  errors: Conflict[];
  warnings: Conflict[];
}) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<HTMLSpanElement | null>(null);
  const hideTimer = useRef<number>(0);
  const issues = errors.length > 0 ? errors : warnings;
  const isError = errors.length > 0;
  const heading = isError
    ? `${errors.length} clash${errors.length === 1 ? "" : "es"} on this day`
    : `${warnings.length} tight connection${warnings.length === 1 ? "" : "s"} on this day`;

  function show() {
    window.clearTimeout(hideTimer.current);
    setOpen(true);
  }

  function hide() {
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setOpen(false), 160);
  }

  return (
    <>
      <span
        ref={setAnchor}
        className={isError ? styles.dayConflict : styles.dayWarning}
        onPointerEnter={show}
        onPointerLeave={hide}
        aria-hidden
      >
        {isError ? (
          <span className={styles.dayConflictCount}>{errors.length}</span>
        ) : null}
      </span>
      <Popover
        open={open}
        onClose={() => setOpen(false)}
        anchor={anchor}
        placement="bottom"
        align="center"
        offset={10}
        width={280}
        label={heading}
        overflowVisible
        tone="dark"
        className={styles.issueTip}
      >
        <span className={styles.issueTipTail} aria-hidden />
        <div className={styles.issueTipBody}>
          <p className={styles.issueTipTitle}>{heading}</p>
          <ul>
            {issues.map((issue) => (
              <li key={`${issue.kind}-${issue.itemIds.join("-")}`}>
                {issue.message}
              </li>
            ))}
          </ul>
        </div>
      </Popover>
    </>
  );
}

/** "9 AM" — the hour gutter language every calendar already taught. */
function hourGutterLabel(minutes: number, clock: ClockFormat): string {
  const h24 = Math.floor(minutes / 60);
  if (clock === "24h") return `${String(h24).padStart(2, "0")}:00`;
  if (h24 === 0) return "12 AM";
  if (h24 === 12) return "12 PM";
  if (h24 < 12) return `${h24} AM`;
  return `${h24 - 12} PM`;
}

/**
 * Google Calendar's now cut: red time in the gutter, a disc on the gutter
 * edge, a hairline across every day on this canvas.
 */
function NowMarker({
  timeZone,
  hourHeight,
  dayStartMin,
  timeFormat,
  days,
}: {
  timeZone: string;
  hourHeight: number;
  dayStartMin: number;
  timeFormat: ClockFormat;
  days: string[];
}) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const wall = wallNow(timeZone, now);
  const col = days.indexOf(wall.day);
  if (col < 0) return null;

  const minutes = wall.minutes + wall.seconds / 60;
  if (minutes < dayStartMin) return null;

  return (
    <div
      className={styles.nowTrack}
      style={{
        top: (minutes - dayStartMin) * (hourHeight / 60),
      }}
      aria-hidden
    >
      <span className={cn(styles.nowTime, "tabular")}>
        {timeLabel(atMinutes(wall.day, wall.minutes), timeFormat)}
      </span>
      <span className={styles.now} style={{ gridColumn: col + 2 }}>
        <span className={styles.nowDot} />
        <span className={styles.nowLine} />
      </span>
    </div>
  );
}

export { minutesIntoDay };
