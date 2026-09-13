"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

import { IconButton } from "@/components/ui/button";
import { Popover } from "@/components/ui/overlay";
import { cn } from "@/lib/utils";
import { dateFromDayKey } from "@/lib/trip/time";
import { useTrip } from "@/stores/trip-store";

import styles from "./month-picker.module.css";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"] as const;
const COMPACT_MONTHS = 25;
const COMPACT_OFFSET = 12;

function monthCells(month: Date, weekStartsOn: 0 | 1) {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn });
  const end = endOfWeek(endOfMonth(month), { weekStartsOn });
  return eachDayOfInterval({ start, end });
}

function chipLabel(month: Date, today: Date) {
  return month.getFullYear() === today.getFullYear()
    ? format(month, "MMM")
    : format(month, "MMM yyyy");
}

export function MonthPicker({
  activeDay,
  todayKey,
  tripDays,
  onSelect,
  compact = false,
  picker = true,
}: {
  activeDay: string;
  todayKey: string;
  tripDays: string[];
  onSelect: (day: string) => void;
  compact?: boolean;
  /** Compact sliding date picker. Off for month-scale views. */
  picker?: boolean;
}) {
  const weekStartsOn = useTrip((s) => s.prefs.weekStartsOn);
  const weekdays =
    weekStartsOn === 1
      ? (["M", "T", "W", "T", "F", "S", "S"] as const)
      : WEEKDAYS;
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const [cursor, setCursor] = useState(() => dateFromDayKey(activeDay));
  const chipsRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const canPick = !compact || picker;

  const tripSet = useMemo(() => new Set(tripDays), [tripDays]);
  const today = dateFromDayKey(todayKey);
  const months = useMemo(
    () =>
      Array.from({ length: COMPACT_MONTHS }, (_, i) =>
        addMonths(
          addMonths(startOfMonth(dateFromDayKey(activeDay)), -COMPACT_OFFSET),
          i,
        ),
      ),
    [activeDay],
  );
  const cells = useMemo(
    () => monthCells(cursor, weekStartsOn),
    [cursor, weekStartsOn],
  );

  const stripHost =
    typeof document !== "undefined"
      ? document.querySelector("[data-month-slot]")
      : null;

  useEffect(() => {
    if (!canPick) setOpen(false);
  }, [canPick]);

  useEffect(() => {
    if (!open) return;
    setCursor(dateFromDayKey(activeDay));
  }, [open, activeDay]);

  useEffect(() => {
    if (!open || !compact) return;
    const chip = chipsRef.current?.querySelector("[data-chip-on]");
    if (chip instanceof HTMLElement) {
      chip.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
    }
  }, [open, compact, cursor]);

  useEffect(() => {
    if (!open || !compact) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      event.preventDefault();
      setOpen(false);
    };
    const onPointer = (event: PointerEvent) => {
      const node = event.target as Node | null;
      if (!node) return;
      if (anchor?.contains(node)) return;
      if (stripRef.current?.contains(node)) return;
      setOpen(false);
    };
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open, compact, anchor]);

  const dayButton = (date: Date, month: Date) => {
    const key = format(date, "yyyy-MM-dd");
    const inMonth = isSameMonth(date, month);
    const isToday = key === todayKey;
    const isActive = key === activeDay;
    const inTrip = tripSet.has(key);

    return (
      <button
        key={key}
        type="button"
        className={cn(
          styles.cell,
          compact && styles.cellMobile,
          !inMonth && styles.cellMuted,
          inTrip && styles.cellTrip,
          isActive && !isToday && styles.cellActive,
          isToday && styles.cellToday,
        )}
        onClick={() => {
          onSelect(key);
          setOpen(false);
        }}
      >
        {format(date, "d")}
        {inTrip ? <span className={styles.cellDot} aria-hidden /> : null}
      </button>
    );
  };

  const calendar = (
    <>
      <div className={styles.weekdays} aria-hidden>
        {weekdays.map((day, index) => (
          <span key={`${day}-${index}`}>{day}</span>
        ))}
      </div>
      <div className={cn(styles.grid, compact && styles.gridMobile)}>
        {cells.map((date) => dayButton(date, cursor))}
      </div>
    </>
  );

  const labelDate = dateFromDayKey(activeDay);

  return (
    <>
      {canPick ? (
        <button
          ref={setAnchor}
          type="button"
          className={cn(styles.trigger, compact && styles.triggerCompact)}
          aria-haspopup={compact ? "dialog" : "listbox"}
          aria-expanded={open}
          aria-label={format(labelDate, "MMMM yyyy")}
          onClick={() => setOpen((value) => !value)}
        >
          {format(labelDate, compact ? "MMMM" : "MMMM yyyy")}
          <ChevronDown size={compact ? 18 : 16} strokeWidth={2} aria-hidden />
        </button>
      ) : (
        <span className={cn(styles.trigger, styles.triggerCompact, styles.triggerStatic)}>
          {format(labelDate, "MMMM")}
        </span>
      )}

      {compact
        ? open && stripHost
          ? createPortal(
              <div
                ref={stripRef}
                className={styles.mobileStrip}
                role="dialog"
                aria-label="Choose a date"
              >
                <div className={styles.mobileCal}>{calendar}</div>
                <div ref={chipsRef} className={styles.chips}>
                  {months.map((month) => {
                    const on = isSameMonth(month, cursor);
                    return (
                      <button
                        key={format(month, "yyyy-MM")}
                        type="button"
                        aria-pressed={on}
                        aria-label={format(month, "MMMM yyyy")}
                        data-chip-on={on ? "" : undefined}
                        className={cn(styles.chip, on && styles.chipOn)}
                        onClick={() => setCursor(startOfMonth(month))}
                      >
                        {chipLabel(month, today)}
                      </button>
                    );
                  })}
                </div>
              </div>,
              stripHost,
            )
          : null
        : (
          <Popover
            open={open}
            onClose={() => setOpen(false)}
            anchor={anchor}
            placement="bottom"
            align="start"
            offset={6}
            width={336}
            label="Choose a date"
            className={styles.popover}
          >
            <div className={styles.panel}>
              <header className={styles.head}>
                <p className={styles.headTitle}>{format(cursor, "MMMM yyyy")}</p>
                <div className={styles.headNav}>
                  <IconButton
                    label="Previous month"
                    size="xs"
                    variant="ghost"
                    onClick={() => setCursor((current) => addMonths(current, -1))}
                  >
                    <ChevronLeft size={16} strokeWidth={2} />
                  </IconButton>
                  <IconButton
                    label="Next month"
                    size="xs"
                    variant="ghost"
                    onClick={() => setCursor((current) => addMonths(current, 1))}
                  >
                    <ChevronRight size={16} strokeWidth={2} />
                  </IconButton>
                </div>
              </header>
              {calendar}
            </div>
          </Popover>
        )}
    </>
  );
}
