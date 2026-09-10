"use client";

import { forwardRef } from "react";
import { AlertTriangle, Lock } from "lucide-react";

import { AvatarStack } from "@/components/ui/avatar";
import { categoryMeta, COMMUTE_LABELS } from "@/lib/categories";
import { cn } from "@/lib/utils";
import { durationLabel, timeLabelCompact } from "@/lib/trip/time";
import type { ItineraryItem, Traveller } from "@/lib/types";

import styles from "./event-card.module.css";

/**
 * A scheduled item on the grid.
 *
 * ENCODING. The card is a lightly tinted surface with a category spine, and
 * nothing else: no border, no icon, no avatar unless it matters, no marker
 * letter. An earlier pass gave every card a saturated letter badge and a full
 * border, which put roughly thirty coloured circles and thirty boxes on a
 * five-day grid — the day stopped being readable as a shape. Calendar
 * software earns density by removing chrome, not by decorating cells.
 *
 * The map/calendar identity is carried by live coupling instead — hover or
 * select a card and its pin lifts, and vice versa — which is a better signal
 * than matching letters because it answers "which one" at the moment you ask.
 *
 * TRUNCATION. Height decides what the card can honestly show, in four tiers
 * rather than by clipping whatever overflows. A 30-minute coffee gets one
 * line and its time; a three-hour museum gets two lines, its time and its
 * venue. Nothing is bottom-pinned: content grows down from the title so the
 * eye always lands in the same place.
 *
 * Commutes render as a rule with a centred label, not as a card: travel time
 * is structure, not something the traveller chose.
 */

/** What a card can afford to show at a given height. */
type Tier = "xs" | "sm" | "md" | "lg" | "xl";

/*
 * The boundaries are the arithmetic, not round numbers: 8px of padding, a
 * 14px title line, a 15px time line, a 15px venue line. Guessing produced a
 * 51px card that rendered two title lines and then clipped its own time in
 * half — the one thing worse than a truncated title is a truncated fact.
 */
function tierFor(height: number): Tier {
  if (height < 38) return "xs"; //  title (1) + start time, one row
  if (height < 53) return "sm"; //  title (1) + time
  if (height < 70) return "md"; //  title (2) + time
  if (height < 118) return "lg"; // title (2) + time + venue
  return "xl"; //                   title (3) + time + venue
}

export interface EventCardProps {
  item: ItineraryItem;
  travellers: Traveller[];
  /** Height in px, so the card knows which variant it can afford. */
  height: number;
  selected?: boolean;
  hovered?: boolean;
  conflicted?: boolean;
  warned?: boolean;
  dimmed?: boolean;
  dragging?: boolean;
  /** True when this card is overlapped and pushed behind another. */
  stacked?: boolean;
  onSelect?: () => void;
  onOpen?: () => void;
  style?: React.CSSProperties;
  className?: string;
  /** dnd-kit listeners/attributes, spread onto the card. */
  dragHandleProps?: Record<string, unknown>;
}

export const EventCard = forwardRef<HTMLDivElement, EventCardProps>(
  function EventCard(
    {
      item,
      travellers,
      height,
      selected = false,
      hovered = false,
      conflicted = false,
      warned = false,
      dimmed = false,
      dragging = false,
      stacked = false,
      onSelect,
      onOpen,
      style,
      className,
      dragHandleProps,
    },
    ref,
  ) {
    const meta = categoryMeta(item.category);
    const Icon = meta.icon;
    const isCommute = item.kind === "commute";
    const isStay = item.kind === "stay";
    const tier = tierFor(height);

    const assigned = item.assignedTo
      .map((id) => travellers.find((t) => t.id === id))
      .filter((t): t is Traveller => Boolean(t));

    const timeText =
      item.start && item.end
        ? `${timeLabelCompact(item.start)}–${timeLabelCompact(item.end)}`
        : "";

    if (isCommute) {
      const mode = item.commute?.mode;
      return (
        <div
          ref={ref}
          data-event={item.id}
          className={cn(
            styles.commute,
            selected && styles.commuteSelected,
            dimmed && styles.dimmed,
            className,
          )}
          style={style}
          onClick={(e) => {
            e.stopPropagation();
            onSelect?.();
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelect?.();
            }
          }}
          aria-label={`${item.title}, ${durationLabel(item.commute?.minutes ?? 0)}`}
        >
          <span className={styles.commuteRule} aria-hidden />
          <span className={styles.commuteLabel}>
            <Icon size={10} strokeWidth={2} />
            {mode ? COMMUTE_LABELS[mode] : "Travel"}
            <span className={cn(styles.commuteMins, "tabular")}>
              {item.commute?.minutes ?? 0}m
            </span>
          </span>
        </div>
      );
    }

    /* The badge slot holds at most one thing, in priority order: a clash
     * outranks a tight connection, which outranks "this time is fixed". */
    const badge = conflicted ? (
      <span className={styles.warn} title="Overlaps another activity">
        <AlertTriangle size={11} strokeWidth={2.4} />
      </span>
    ) : warned ? (
      <span
        className={cn(styles.warn, styles.warnAmber)}
        title="Tight connection"
      >
        <AlertTriangle size={11} strokeWidth={2.4} />
      </span>
    ) : !item.flexible && !isStay && tier !== "xs" ? (
      <span className={styles.anchor} title="Fixed time — booked or ticketed">
        <Lock size={9} strokeWidth={2.6} />
      </span>
    ) : null;

    return (
      <div
        ref={ref}
        data-event={item.id}
        data-event-card=""
        className={cn(
          styles.card,
          styles[tier],
          selected && styles.selected,
          hovered && !selected && styles.hovered,
          conflicted && styles.conflicted,
          warned && !conflicted && styles.warned,
          dimmed && styles.dimmed,
          dragging && styles.dragging,
          stacked && styles.stacked,
          isStay && styles.stay,
          className,
        )}
        style={{
          ...style,
          ["--cat-color" as string]: meta.color,
          ["--cat-soft" as string]: meta.soft,
          ["--cat-ink" as string]: meta.ink,
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.();
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onOpen?.();
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onOpen?.();
          } else if (e.key === " ") {
            e.preventDefault();
            onSelect?.();
          }
        }}
        aria-label={`${item.title}${timeText ? `, ${timeText}` : ""}${
          conflicted ? ", overlaps another activity" : ""
        }`}
        {...dragHandleProps}
      >
        <span className={styles.spine} aria-hidden />

        <div className={styles.cardInner}>
          {/*
           * At the smallest tier the time joins the title on one row, the way
           * every good calendar handles a half-hour event — two stacked lines
           * in 30px is how you get illegible 9px type.
           */}
          {tier === "xs" ? (
            <div className={styles.row}>
              <span className={styles.title}>{item.title}</span>
              {badge}
              {timeText ? (
                <span className={cn(styles.timeInline, "tabular")}>
                  {timeLabelCompact(item.start!)}
                </span>
              ) : null}
            </div>
          ) : (
            <>
              <div className={styles.row}>
                <span className={styles.title}>{item.title}</span>
                {badge}
              </div>
              {timeText ? (
                <span className={cn(styles.time, "tabular")}>{timeText}</span>
              ) : null}
              {(tier === "lg" || tier === "xl") &&
              (item.place || assigned.length > 0) ? (
                <div className={styles.meta}>
                  {item.place ? (
                    <span className={styles.place}>{item.place.name}</span>
                  ) : (
                    <span />
                  )}
                  {/*
                   * Avatars appear only when the activity is NOT for everyone.
                   * Showing all four on every card said nothing; showing two
                   * says "this one is just Priya and Jules".
                   */}
                  {assigned.length > 0 &&
                  assigned.length < travellers.length ? (
                    <AvatarStack travellers={assigned} size="xs" max={3} />
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    );
  },
);
