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
 * Encoding decision: the card is paper with a category-coloured spine and
 * icon, not a category-coloured fill. The historical product tinted every
 * card, which turned a busy day into a field of pastel noise — the category
 * still needs to be readable at a glance, but it should not be the loudest
 * thing on screen. The spine gives an instant colour read down the column
 * while the content stays on a calm, consistent surface.
 *
 * Commutes render as a slim neutral bar rather than a card: travel time is
 * structure, not something the traveller chose.
 */

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
  letter?: string;
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
      letter,
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

    /** Below ~44px there is only room for one line. */
    const compact = height < 46;
    const roomForMeta = height >= 72;

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
            <Icon size={11} strokeWidth={2} />
            {mode ? COMMUTE_LABELS[mode] : "Travel"}
            <span className={cn(styles.commuteMins, "tabular")}>
              {item.commute?.minutes ?? 0}m
            </span>
          </span>
        </div>
      );
    }

    return (
      <div
        ref={ref}
        data-event={item.id}
        className={cn(
          styles.card,
          selected && styles.selected,
          hovered && styles.hovered,
          conflicted && styles.conflicted,
          warned && !conflicted && styles.warned,
          dimmed && styles.dimmed,
          dragging && styles.dragging,
          compact && styles.compact,
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
          conflicted ? ", has a scheduling conflict" : ""
        }`}
        {...dragHandleProps}
      >
        <span className={styles.spine} aria-hidden />

        <div className={styles.cardInner}>
          <div className={styles.cardHead}>
            {letter ? (
              <span className={styles.letter} aria-hidden>
                {letter}
              </span>
            ) : (
              <span className={styles.icon} aria-hidden>
                <Icon size={12} strokeWidth={2.1} />
              </span>
            )}
            <span className={styles.title}>{item.title}</span>
            {conflicted || warned ? (
              <span
                className={cn(styles.warn, warned && !conflicted && styles.warnAmber)}
                aria-hidden
              >
                <AlertTriangle size={11} strokeWidth={2.4} />
              </span>
            ) : !item.flexible && !isStay ? (
              <span className={styles.anchor} title="Fixed time" aria-hidden>
                <Lock size={9} strokeWidth={2.6} />
              </span>
            ) : null}
          </div>

          {!compact ? (
            <span className={cn(styles.time, "tabular")}>{timeText}</span>
          ) : null}

          {roomForMeta && (item.place || assigned.length > 0) ? (
            <div className={styles.cardFoot}>
              {item.place ? (
                <span className={styles.place}>{item.place.name}</span>
              ) : (
                <span />
              )}
              {assigned.length > 0 ? (
                <AvatarStack travellers={assigned} size="xs" max={3} />
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    );
  },
);
