"use client";

import { useMemo } from "react";
import { useDraggable } from "@dnd-kit/core";
import { motion, useReducedMotion } from "motion/react";
import {
  AlertTriangle,
  Banknote,
  CalendarClock,
  Clock3,
  Copy,
  GripVertical,
  MapPin,
  Pencil,
  Sparkles,
  Trash2,
  Undo2,
} from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Button, IconButton } from "@/components/ui/button";
import { Tag } from "@/components/ui/chip";
import { categoryMeta, COMMUTE_LABELS } from "@/lib/categories";
import { cn } from "@/lib/utils";
import { ideasNearRoute } from "@/lib/trip/assistant";
import { conflictsForDay } from "@/lib/trip/schedule";
import {
  dayLabel,
  durationLabel,
  durationMinutes,
  timeRangeLabel,
} from "@/lib/trip/time";
import type { Idea, ItineraryItem, Trip } from "@/lib/types";

import styles from "./side-panel.module.css";

/* -------------------------------------------------------------------------- */
/* Ideas                                                                     */
/* -------------------------------------------------------------------------- */

export interface IdeasRailProps {
  trip: Trip;
  activeDay: string;
  onSchedule: (ideaId: string) => void;
  draggingId: string | null;
}

/**
 * The Ideas backlog.
 *
 * Things a group collects before deciding when to do them. Ordered by how
 * close each one is to the active day's actual route, because proximity is
 * what makes a suggestion usable — a great idea across town on a packed day
 * is not a good idea.
 *
 * Every card is a drag source: dropping one on the grid schedules it.
 */
export function IdeasRail({
  trip,
  activeDay,
  onSchedule,
  draggingId,
}: IdeasRailProps) {
  const ranked = useMemo(
    () => ideasNearRoute(trip, activeDay, trip.ideas),
    [trip, activeDay],
  );

  if (trip.ideas.length === 0) {
    return (
      <div className={styles.emptyIdeas}>
        <p className={styles.emptyIdeasTitle}>Ideas list is empty</p>
        <p className={styles.emptyIdeasBody}>
          Everything that was on the list is now on the calendar. Drag an
          activity here to unschedule it without losing it.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.ideas}>
      <p className={styles.ideasHint}>
        Drag onto a day, or use the button to drop it into the first free slot.
      </p>
      <ul className={styles.ideasList}>
        {ranked.map(({ idea, km, nearest }) => (
          <IdeaCard
            key={idea.id}
            idea={idea}
            trip={trip}
            km={km}
            nearest={nearest}
            onSchedule={() => onSchedule(idea.id)}
            dragging={draggingId === `idea:${idea.id}`}
          />
        ))}
      </ul>
    </div>
  );
}

function IdeaCard({
  idea,
  trip,
  km,
  nearest,
  onSchedule,
  dragging,
}: {
  idea: Idea;
  trip: Trip;
  km: number;
  nearest: string;
  onSchedule: () => void;
  dragging: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `idea:${idea.id}`,
    data: { kind: "idea", idea },
  });

  const meta = categoryMeta(idea.category);
  const Icon = meta.icon;
  const author = trip.travellers.find((t) => t.id === idea.addedBy);
  const fromAssistant = idea.addedBy === "assistant";

  return (
    <li
      ref={setNodeRef}
      data-idea={idea.id}
      className={cn(
        styles.idea,
        (dragging || isDragging) && styles.ideaDragging,
      )}
      style={{ ["--cat-color" as string]: meta.color }}
    >
      <span
        data-idea-grip=""
        className={styles.ideaGrip}
        {...listeners}
        {...attributes}
        aria-hidden
      >
        <GripVertical size={13} strokeWidth={2} />
      </span>

      <div className={styles.ideaBody}>
        <div className={styles.ideaTop}>
          <span className={styles.ideaIcon} aria-hidden>
            <Icon size={12} strokeWidth={2.1} />
          </span>
          <h5 className={styles.ideaTitle}>{idea.title}</h5>
        </div>

        <p className={styles.ideaReason}>{idea.reason}</p>

        <div className={styles.ideaMeta}>
          <span className={styles.ideaDuration}>
            <Clock3 size={10} strokeWidth={2.2} />
            {durationLabel(idea.durationMin)}
          </span>
          {Number.isFinite(km) && nearest ? (
            <span className={styles.ideaNear} title={`Near ${nearest}`}>
              <MapPin size={10} strokeWidth={2.2} />
              {km < 0.9 ? "walking distance" : `${km.toFixed(1)} km away`}
            </span>
          ) : null}
          {idea.costUsd ? (
            <span className={cn(styles.ideaCost, "tabular")}>${idea.costUsd}</span>
          ) : null}
        </div>

        <div className={styles.ideaFoot}>
          {fromAssistant ? (
            <Tag tone="energy" icon={<Sparkles size={9} strokeWidth={2.4} />}>
              Suggested
            </Tag>
          ) : author ? (
            <span className={styles.ideaAuthor}>
              <Avatar traveller={author} size="xs" />
              {author.name.split(" ")[0]}
            </span>
          ) : null}
          <Button variant="ghost" size="xs" onClick={onSchedule}>
            Schedule
          </Button>
        </div>
      </div>
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/* Details                                                                   */
/* -------------------------------------------------------------------------- */

export interface DetailsPanelProps {
  trip: Trip;
  item: ItineraryItem;
  activeDay: string;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onUnschedule: () => void;
  onToggleAssignee: (travellerId: string) => void;
}

/**
 * The selected item, in full.
 *
 * Lives permanently in the right column rather than in a modal, so reading an
 * activity never covers the day it belongs to. Quick actions are here; the
 * full edit form slides in as its own panel.
 */
export function DetailsPanel({
  trip,
  item,
  activeDay,
  onEdit,
  onDelete,
  onDuplicate,
  onUnschedule,
  onToggleAssignee,
}: DetailsPanelProps) {
  const reduceMotion = useReducedMotion();
  const meta = categoryMeta(item.category);
  const Icon = meta.icon;

  const conflicts = conflictsForDay(trip, activeDay).filter((conflict) =>
    conflict.itemIds.includes(item.id),
  );

  const author = trip.travellers.find((t) => t.id === item.createdBy);
  const isCommute = item.kind === "commute";
  const isStay = item.kind === "stay";

  return (
    <motion.div
      className={styles.details}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0.12 : 0.24, ease: [0.2, 0.8, 0.2, 1] }}
    >
      <div className={styles.detailsScroll}>
        <header
          className={styles.detailsHead}
          style={{ ["--cat-color" as string]: meta.color }}
        >
          <div className={styles.detailsBadgeRow}>
            <span className={styles.detailsCat}>
              <Icon size={12} strokeWidth={2.2} />
              {meta.label}
            </span>
            {!item.flexible && !isStay ? <Tag tone="neutral">Fixed time</Tag> : null}
            {isStay ? <Tag tone="brand">Whole trip</Tag> : null}
          </div>

          <h3 className={styles.detailsTitle}>{item.title}</h3>
          {item.subtitle ? (
            <p className={styles.detailsSubtitle}>{item.subtitle}</p>
          ) : null}
        </header>

        {conflicts.length > 0 ? (
          <div className={styles.detailsConflict} role="alert">
            <AlertTriangle size={13} strokeWidth={2.2} />
            <div>
              {conflicts.map((conflict) => (
                <p key={conflict.message}>{conflict.message}</p>
              ))}
            </div>
          </div>
        ) : null}

        <dl className={styles.detailsFacts}>
          <div>
            <dt>
              <CalendarClock size={12} strokeWidth={2} />
              When
            </dt>
            <dd>
              {item.start && item.end ? (
                <>
                  <span className="tabular">
                    {timeRangeLabel(item.start, item.end)}
                  </span>
                  <span className={styles.factSub}>
                    {dayLabel(item.start)} ·{" "}
                    {durationLabel(durationMinutes(item.start, item.end))}
                  </span>
                </>
              ) : (
                "Not scheduled"
              )}
            </dd>
          </div>

          {item.place ? (
            <div>
              <dt>
                <MapPin size={12} strokeWidth={2} />
                Where
              </dt>
              <dd>
                {item.place.name}
                <span className={styles.factSub}>{item.place.address}</span>
              </dd>
            </div>
          ) : null}

          {isCommute && item.commute ? (
            <div>
              <dt>
                <Clock3 size={12} strokeWidth={2} />
                Journey
              </dt>
              <dd>
                {COMMUTE_LABELS[item.commute.mode]}
                <span className={styles.factSub}>
                  {durationLabel(item.commute.minutes)} ·{" "}
                  {item.commute.distanceKm.toFixed(1)} km
                </span>
              </dd>
            </div>
          ) : null}

          {item.costUsd ? (
            <div>
              <dt>
                <Banknote size={12} strokeWidth={2} />
                Cost
              </dt>
              <dd className="tabular">
                ${item.costUsd}
                <span className={styles.factSub}>per person, estimated</span>
              </dd>
            </div>
          ) : null}
        </dl>

        {item.booking ? (
          <div className={styles.booking}>
            <span className="eyebrow">Booking</span>
            <code>{item.booking}</code>
          </div>
        ) : null}

        {item.notes ? (
          <div className={styles.notes}>
            <span className="eyebrow">Note</span>
            <p>{item.notes}</p>
            {author ? (
              <span className={styles.notesAuthor}>
                <Avatar traveller={author} size="xs" />
                {author.name}
              </span>
            ) : null}
          </div>
        ) : null}

        {/* Per-activity participants: being on the trip and being on this
            activity are different things, which is what makes the avatar
            stack on a card mean something. */}
        {!isCommute ? (
          <div className={styles.who}>
            <span className="eyebrow">Who&rsquo;s going</span>
            <p className={styles.whoHint}>
              {item.assignedTo.length === 0
                ? "Everyone on the trip — tap someone to leave them out"
                : `${item.assignedTo.length} of ${trip.travellers.length} travellers`}
            </p>
            <ul className={styles.whoList}>
              {trip.travellers.map((traveller) => {
                const on =
                  item.assignedTo.length === 0 ||
                  item.assignedTo.includes(traveller.id);
                return (
                  <li key={traveller.id}>
                    <button
                      type="button"
                      className={cn(styles.whoChip, on && styles.whoChipOn)}
                      onClick={() => onToggleAssignee(traveller.id)}
                      aria-pressed={on}
                    >
                      <Avatar traveller={traveller} size="xs" />
                      {traveller.name.split(" ")[0]}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </div>

      <footer className={styles.detailsActions}>
        <Button
          variant="secondary"
          size="sm"
          iconLeft={<Pencil size={13} strokeWidth={2} />}
          onClick={onEdit}
        >
          Edit
        </Button>
        {!isStay ? (
          <>
            <IconButton
              label="Move to Ideas"
              size="sm"
              variant="ghost"
              onClick={onUnschedule}
            >
              <Undo2 size={14} strokeWidth={2} />
            </IconButton>
            <IconButton
              label="Duplicate"
              size="sm"
              variant="ghost"
              onClick={onDuplicate}
            >
              <Copy size={14} strokeWidth={2} />
            </IconButton>
            <IconButton
              label="Remove from trip"
              size="sm"
              variant="danger"
              onClick={onDelete}
            >
              <Trash2 size={14} strokeWidth={2} />
            </IconButton>
          </>
        ) : null}
      </footer>
    </motion.div>
  );
}
