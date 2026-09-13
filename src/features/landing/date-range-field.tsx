"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  addDays,
  addMonths,
  addYears,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getDay,
  isSameDay,
  isSameMonth,
  nextSaturday,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
  subYears,
} from "date-fns";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

import { Popover, Sheet } from "@/components/ui/overlay";
import { useIsCompact } from "@/lib/use-media-query";
import { cn } from "@/lib/utils";

import styles from "./date-range-field.module.css";

/**
 * Dual-month range picker, from Figma 858:23557 / 858:27670.
 *
 * Two months, year-and-month chevrons, a month/year overlay on the title,
 * today as a dot (or a ring if it is also selected), and trip-length chips.
 * HighLevel's blue is mapped to Intripid purple. Presets are upcoming stays,
 * not analytics ranges — yesterday is not a trip.
 */

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function dateFromKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function keyFromDate(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function inRange(key: string, start: string | null, end: string | null) {
  if (!start || !end) return false;
  const [from, to] = start <= end ? [start, end] : [end, start];
  return key >= from && key <= to;
}

function monthDays(month: Date) {
  const start = startOfMonth(month);
  return eachDayOfInterval({
    start: startOfWeek(start, { weekStartsOn: 0 }),
    end: endOfWeek(endOfMonth(start), { weekStartsOn: 0 }),
  });
}

/** Friday–Sunday still ahead; if it is already Sunday, the next weekend. */
function thisWeekend(today: Date) {
  const day = getDay(today);
  const thisSunday = endOfWeek(today, { weekStartsOn: 1 });
  const thisFriday = addDays(thisSunday, -2);

  if (day === 0) {
    const start = addDays(thisSunday, 5);
    return [start, addDays(start, 2)] as const;
  }

  const start = today > thisFriday ? today : thisFriday;
  return [start, thisSunday] as const;
}

function nextWeekend(today: Date) {
  const start = addDays(endOfWeek(today, { weekStartsOn: 1 }), 5);
  return [start, addDays(start, 2)] as const;
}

function upcomingSaturday(today: Date) {
  return getDay(today) === 6 ? startOfDay(today) : nextSaturday(today);
}

export function DateRangeField({
  start,
  end,
  onChange,
  className,
  startLabel = "Begin",
  endLabel = "End",
  tone = "onDark",
  invalid = false,
  readOnly = false,
  mode = "range",
}: {
  start: string | null;
  end: string | null;
  onChange: (start: string, end: string) => void;
  className?: string;
  startLabel?: string;
  endLabel?: string;
  /** `onDark` is the landing doorway. `outlined` is the light console. */
  tone?: "onDark" | "outlined";
  invalid?: boolean;
  /** Shows the range without opening the picker — used for resolved weekends. */
  readOnly?: boolean;
  /** `single` is one date (passport expiry). Same calendar, no trip presets. */
  mode?: "range" | "single";
}) {
  const compact = useIsCompact();
  const single = mode === "single";
  const pickerLabel = single
    ? `Choose ${startLabel.toLowerCase()}`
    : "Choose trip dates";
  const anchorRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"calendar" | "monthYear">("calendar");
  const [cursor, setCursor] = useState(() =>
    dateFromKey(start ?? keyFromDate(new Date())),
  );
  const [draftStart, setDraftStart] = useState(start ?? "");
  const [draftEnd, setDraftEnd] = useState<string | null>(end);
  const [pickingEnd, setPickingEnd] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);

  const todayKey = keyFromDate(new Date());
  const previewEnd = draftEnd ?? (pickingEnd ? hovered : null);
  const rangeEnd =
    previewEnd && draftStart
      ? previewEnd < draftStart
        ? draftStart
        : previewEnd
      : draftEnd;
  const rangeStart =
    previewEnd && draftStart && previewEnd < draftStart
      ? previewEnd
      : draftStart || null;

  const leftMonth = cursor;
  const years = useMemo(() => {
    const year = cursor.getFullYear();
    return single
      ? Array.from({ length: 16 }, (_, i) => year - 1 + i)
      : Array.from({ length: 12 }, (_, i) => year - 7 + i);
  }, [cursor, single]);

  function openPicker() {
    if (readOnly) return;
    if (open) {
      closePicker();
      return;
    }
    const fallback = keyFromDate(new Date());
    setCursor(dateFromKey(start ?? fallback));
    setDraftStart(start ?? "");
    setDraftEnd(single ? start : end);
    setPickingEnd(!single && Boolean(start) && !end);
    setHovered(null);
    setView("calendar");
    setOpen(true);
  }

  function closePicker() {
    setOpen(false);
    setPickingEnd(false);
    setHovered(null);
    setView("calendar");
  }

  function confirm() {
    if (!draftStart) return;
    if (single) {
      onChange(draftStart, draftStart);
      closePicker();
      return;
    }
    if (!draftEnd) return;
    const nextStart = draftStart <= draftEnd ? draftStart : draftEnd;
    const nextEnd = draftStart <= draftEnd ? draftEnd : draftStart;
    onChange(nextStart, nextEnd);
    closePicker();
  }

  function applyRange(nextStart: string, nextEnd: string) {
    setDraftStart(nextStart);
    setDraftEnd(nextEnd);
    setPickingEnd(false);
    setCursor(dateFromKey(nextStart));
    onChange(nextStart, nextEnd);
    closePicker();
  }

  function pickDay(key: string) {
    if (single) {
      setDraftStart(key);
      setDraftEnd(key);
      setPickingEnd(false);
      return;
    }
    if (!pickingEnd || !draftStart) {
      setDraftStart(key);
      setDraftEnd(null);
      setPickingEnd(true);
      return;
    }
    const nextStart = key < draftStart ? key : draftStart;
    const nextEnd = key < draftStart ? draftStart : key;
    setDraftStart(nextStart);
    setDraftEnd(nextEnd);
    setPickingEnd(false);
  }

  function presetThisWeekend() {
    const [from, to] = thisWeekend(new Date());
    applyRange(keyFromDate(from), keyFromDate(to));
  }

  function presetNextWeekend() {
    const [from, to] = nextWeekend(new Date());
    applyRange(keyFromDate(from), keyFromDate(to));
  }

  function presetAWeek() {
    const from = upcomingSaturday(new Date());
    applyRange(keyFromDate(from), keyFromDate(addDays(from, 6)));
  }

  function presetTwoWeeks() {
    const from = upcomingSaturday(new Date());
    applyRange(keyFromDate(from), keyFromDate(addDays(from, 13)));
  }

  const picker =
    view === "monthYear" ? (
      <MonthYearMenu
        cursor={cursor}
        years={years}
        onSelect={(month) => {
          setCursor(month);
          setView("calendar");
        }}
      />
    ) : (
      <div className={styles.cal}>
        <div className={styles.months}>
          <MonthPane
            month={leftMonth}
            todayKey={todayKey}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            onPick={pickDay}
            onHover={setHovered}
            onPrevMonth={() => setCursor((m) => subMonths(m, 1))}
            onNextMonth={() => setCursor((m) => addMonths(m, 1))}
            onPrevYear={() => setCursor((m) => subYears(m, 1))}
            onNextYear={() => setCursor((m) => addYears(m, 1))}
            onOpenMonthYear={() => setView("monthYear")}
          />
          {single ? null : (
            <MonthPane
              month={addMonths(cursor, 1)}
              todayKey={todayKey}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              onPick={pickDay}
              onHover={setHovered}
              onPrevMonth={() => setCursor((m) => subMonths(m, 1))}
              onNextMonth={() => setCursor((m) => addMonths(m, 1))}
              onPrevYear={() => setCursor((m) => subYears(m, 1))}
              onNextYear={() => setCursor((m) => addYears(m, 1))}
              onOpenMonthYear={() => setView("monthYear")}
            />
          )}
        </div>

        {single ? null : (
          <div className={styles.presets}>
            <button type="button" className={styles.chip} onClick={presetThisWeekend}>
              This weekend
            </button>
            <button type="button" className={styles.chip} onClick={presetNextWeekend}>
              Next weekend
            </button>
            <button type="button" className={styles.chip} onClick={presetAWeek}>
              A week
            </button>
            <button type="button" className={styles.chip} onClick={presetTwoWeeks}>
              2 weeks
            </button>
          </div>
        )}

        <div className={styles.actions}>
          <button type="button" className={styles.cancel} onClick={closePicker}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.confirm}
            onClick={confirm}
            disabled={!draftStart || (!single && !draftEnd)}
          >
            Confirm
          </button>
        </div>
      </div>
    );

  return (
    <div
      ref={anchorRef}
      className={cn(styles.wrap, className)}
      data-tone={tone}
      data-mode={mode}
      data-filled={start ? "" : undefined}
      data-invalid={invalid || undefined}
      data-readonly={readOnly || undefined}
    >
      <button
        type="button"
        className={styles.trigger}
        aria-haspopup={readOnly ? undefined : "dialog"}
        aria-expanded={readOnly ? undefined : open}
        aria-invalid={invalid || undefined}
        aria-disabled={readOnly || undefined}
        disabled={readOnly}
        aria-label={
          single
            ? start
              ? `${startLabel}, ${format(dateFromKey(start), "d MMMM yyyy")}`
              : pickerLabel
            : start && end
              ? `Trip dates, ${format(dateFromKey(start), "d MMMM yyyy")} to ${format(dateFromKey(end), "d MMMM yyyy")}`
              : pickerLabel
        }
        onClick={openPicker}
      >
        <span className={styles.field}>
          <span className={styles.label}>{startLabel}</span>
          <span className={cn(styles.value, !start && styles.valueEmpty)}>
            {start
              ? format(dateFromKey(start), "d MMM yyyy")
              : single
                ? ""
                : "Add date"}
          </span>
          {tone === "outlined" ? (
            <Calendar className={styles.fieldIcon} size={16} strokeWidth={1.8} aria-hidden />
          ) : null}
        </span>
        {single ? null : (
          <span className={styles.field}>
            <span className={styles.label}>{endLabel}</span>
            <span className={cn(styles.value, !end && styles.valueEmpty)}>
              {end ? format(dateFromKey(end), "d MMM yyyy") : "Add date"}
            </span>
            {tone === "outlined" ? (
              <Calendar className={styles.fieldIcon} size={16} strokeWidth={1.8} aria-hidden />
            ) : null}
          </span>
        )}
      </button>
      {single ? null : (
        <>
          <input type="hidden" name="from" value={start ?? ""} />
          <input type="hidden" name="to" value={end ?? ""} />
        </>
      )}

      {readOnly ? null : (
        compact ? (
          <Sheet
            open={open}
            onClose={closePicker}
            label={pickerLabel}
            fit
            layer="modal"
            className={styles.sheet}
          >
            {picker}
          </Sheet>
        ) : (
          <Popover
            open={open}
            onClose={closePicker}
            anchor={anchorRef.current}
            placement="bottom"
            align={tone === "outlined" ? "end" : "center"}
            offset={10}
            label={pickerLabel}
            className={styles.popover}
          >
            {picker}
          </Popover>
        )
      )}
    </div>
  );
}

function MonthPane({
  month,
  todayKey,
  rangeStart,
  rangeEnd,
  onPick,
  onHover,
  onPrevMonth,
  onNextMonth,
  onPrevYear,
  onNextYear,
  onOpenMonthYear,
}: {
  month: Date;
  todayKey: string;
  rangeStart: string | null;
  rangeEnd: string | null;
  onPick: (key: string) => void;
  onHover: (key: string | null) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onPrevYear: () => void;
  onNextYear: () => void;
  onOpenMonthYear: () => void;
}) {
  const days = monthDays(month);

  return (
    <div className={styles.pane}>
      <div className={styles.nav}>
        <div className={styles.navCluster}>
          <button
            type="button"
            className={styles.navBtn}
            aria-label="Previous year"
            onClick={onPrevYear}
          >
            <ChevronsLeft size={16} strokeWidth={2} />
          </button>
          <button
            type="button"
            className={styles.navBtn}
            aria-label="Previous month"
            onClick={onPrevMonth}
          >
            <ChevronLeft size={16} strokeWidth={2} />
          </button>
        </div>
        <button
          type="button"
          className={styles.monthBtn}
          onClick={onOpenMonthYear}
        >
          <span>{format(month, "MMM")}</span>
          <span>{format(month, "yyyy")}</span>
        </button>
        <div className={styles.navCluster}>
          <button
            type="button"
            className={styles.navBtn}
            aria-label="Next month"
            onClick={onNextMonth}
          >
            <ChevronRight size={16} strokeWidth={2} />
          </button>
          <button
            type="button"
            className={styles.navBtn}
            aria-label="Next year"
            onClick={onNextYear}
          >
            <ChevronsRight size={16} strokeWidth={2} />
          </button>
        </div>
      </div>

      <div className={styles.weekdays} aria-hidden>
        {WEEKDAYS.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div className={styles.grid} onMouseLeave={() => onHover(null)}>
        {days.map((day) => {
          const key = keyFromDate(day);
          const outside = !isSameMonth(day, month);
          const isStart = key === rangeStart;
          const isEnd = Boolean(rangeEnd) && key === rangeEnd;
          const between = inRange(key, rangeStart, rangeEnd);
          const isToday = key === todayKey && !isStart && !isEnd;

          return (
            <button
              key={key}
              type="button"
              className={cn(
                styles.day,
                outside && styles.dayMuted,
                between && styles.dayIn,
                isStart && styles.dayStart,
                isEnd && styles.dayEnd,
                (isStart || isEnd) && styles.dayEdge,
                isToday && styles.dayToday,
              )}
              aria-label={format(day, "EEEE d MMMM yyyy")}
              aria-pressed={isStart || isEnd}
              onMouseEnter={() => onHover(key)}
              onClick={() => onPick(key)}
            >
              <span className={styles.dayNum}>{format(day, "d")}</span>
              {isSameDay(day, new Date()) ? (
                <span className={styles.todayDot} aria-hidden />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MonthYearMenu({
  cursor,
  years,
  onSelect,
}: {
  cursor: Date;
  years: number[];
  onSelect: (month: Date) => void;
}) {
  const [month, setMonth] = useState(cursor.getMonth());
  const [year, setYear] = useState(cursor.getFullYear());
  const selectedMonthRef = useRef<HTMLButtonElement>(null);
  const selectedYearRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    for (const node of [selectedMonthRef.current, selectedYearRef.current]) {
      const col = node?.parentElement;
      if (!node || !col) continue;
      col.scrollTop = node.offsetTop - col.clientHeight / 2 + node.clientHeight / 2;
    }
  }, []);

  return (
    <div className={styles.monthYear}>
      <div className={styles.monthYearHead}>
        <p>Month</p>
        <p>Year</p>
      </div>
      <div className={styles.monthYearBody}>
        <div className={styles.monthYearCol} role="listbox" aria-label="Month">
          {MONTHS.map((label, index) => (
            <button
              key={label}
              ref={index === month ? selectedMonthRef : undefined}
              type="button"
              role="option"
              aria-selected={index === month}
              className={cn(styles.monthYearItem, index === month && styles.monthYearItemOn)}
              onClick={() => {
                setMonth(index);
                onSelect(new Date(year, index, 1));
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div className={styles.monthYearRule} aria-hidden />
        <div className={styles.monthYearCol} role="listbox" aria-label="Year">
          {years.map((value) => (
            <button
              key={value}
              ref={value === year ? selectedYearRef : undefined}
              type="button"
              role="option"
              aria-selected={value === year}
              className={cn(styles.monthYearItem, value === year && styles.monthYearItemOn)}
              onClick={() => {
                setYear(value);
                onSelect(new Date(value, month, 1));
              }}
            >
              {value}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
