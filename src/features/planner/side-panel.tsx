"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useDraggable } from "@dnd-kit/core";
import { motion, useReducedMotion } from "motion/react";
import {
  AlertTriangle,
  Banknote,
  CalendarClock,
  Clock3,
  Copy,
  FileText,
  GripVertical,
  Image as ImageIcon,
  MapPin,
  MessageCircle,
  Paperclip,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Undo2,
  X,
} from "lucide-react";

import { Hummingbird } from "@/components/brand/hummingbird";
import { ACCOUNT_USER } from "@/data/account";
import { searchNycPlaces, type NycPlace } from "@/data/nyc-places";
import { Avatar } from "@/components/ui/avatar";
import { Button, IconButton } from "@/components/ui/button";
import { Tag } from "@/components/ui/chip";
import { Input, Textarea } from "@/components/ui/controls";
import { Select } from "@/components/ui/select";
import { categoryMeta, COMMUTE_LABELS, travellerColor } from "@/lib/categories";
import { partyTravellers } from "@/lib/collaboration";
import { cn } from "@/lib/utils";
import { ideasNearRoute } from "@/lib/trip/assistant";
import { commentsForDisplay, conflictsForDay } from "@/lib/trip/schedule";
import {
  dayLabel,
  durationLabel,
  durationMinutes,
  timeRangeLabel,
} from "@/lib/trip/time";
import {
  IDEA_WHEN_LABELS,
  type Idea,
  type IdeaAttachment,
  type IdeaWhen,
  type ItineraryItem,
  type Place,
  type Trip,
} from "@/lib/types";
import { useSession } from "@/stores/session-store";
import { useTrip, useTripApi } from "@/stores/trip-store";

import styles from "./side-panel.module.css";

const DURATION_OPTIONS = [30, 45, 60, 90, 120, 180].map((minutes) => ({
  value: String(minutes),
  label: durationLabel(minutes),
}));

const WHEN_OPTIONS = (Object.keys(IDEA_WHEN_LABELS) as IdeaWhen[]).map(
  (value) => ({ value, label: IDEA_WHEN_LABELS[value] }),
);

/* -------------------------------------------------------------------------- */
/* Ideas                                                                     */
/* -------------------------------------------------------------------------- */

export interface IdeasRailProps {
  trip: Trip;
  activeDay: string;
  onSchedule: (ideaId: string) => void;
  onShare: (idea: Idea) => void;
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
  onShare,
  draggingId,
}: IdeasRailProps) {
  const ranked = useMemo(
    () => ideasNearRoute(trip, activeDay, trip.ideas),
    [trip, activeDay],
  );
  const [composing, setComposing] = useState(false);

  if (composing) {
    return (
      <div className={cn(styles.ideas, styles.ideasComposing)}>
        <IdeaCompose
          onCancel={() => setComposing(false)}
          onSaved={() => setComposing(false)}
        />
      </div>
    );
  }

  return (
    <div className={styles.ideas}>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        block
        iconLeft={<Plus size={14} strokeWidth={2.4} />}
        onClick={() => setComposing(true)}
      >
        Add an idea
      </Button>

      {trip.ideas.length === 0 ? (
        <div className={styles.emptyIdeas}>
          <Hummingbird mood="curious" size={80} />
          <p className={styles.emptyIdeasTitle}>Ideas list is empty</p>
          <p className={styles.emptyIdeasBody}>
            {trip.destinationId
              ? "Add an idea, or drag an activity here to unschedule it without losing it."
              : "This trip has no destination yet. Keep a thought here until it has a day."}
          </p>
        </div>
      ) : (
        <>
          <p className={styles.ideasHint}>
            Drag onto a day, schedule it, or send it to trip chat.
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
                onShare={() => onShare(idea)}
                dragging={draggingId === `idea:${idea.id}`}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

const EMPTY_COMPOSE = {
  title: "",
  reason: "",
  durationMin: 90,
  when: "flexible" as IdeaWhen,
  place: null as Place | null,
  category: "sightseeing" as Idea["category"],
  attachments: [] as IdeaAttachment[],
};

function IdeaCompose({
  onCancel,
  onSaved,
}: {
  onCancel: () => void;
  onSaved: () => void;
}) {
  const api = useTripApi();
  const sessionId = useSession((s) => s.user?.id ?? ACCOUNT_USER.id);
  const [draft, setDraft] = useState(EMPTY_COMPOSE);
  const [placeQuery, setPlaceQuery] = useState("");
  const [placeOpen, setPlaceOpen] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const places = useMemo(() => searchNycPlaces(placeQuery, 6), [placeQuery]);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      onCancel();
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onCancel]);

  function addFiles(kind: "photo" | "file", list: FileList | null) {
    if (!list?.length) return;
    const next: IdeaAttachment[] = [];
    for (const file of Array.from(list)) {
      const id = `att-${file.name}-${file.size}-${file.lastModified}`;
      if (kind === "photo" && file.type.startsWith("image/")) {
        next.push({ kind: "photo", id, name: file.name, src: URL.createObjectURL(file) });
      } else {
        next.push({ kind: "file", id, name: file.name });
      }
    }
    setDraft((current) => ({
      ...current,
      attachments: [...current.attachments, ...next],
    }));
  }

  function addIdea(event: FormEvent) {
    event.preventDefault();
    const title = draft.title.trim();
    if (!title) return;
    api.getState().addIdea({
      category: draft.category,
      title,
      subtitle:
        draft.when === "flexible" ? undefined : IDEA_WHEN_LABELS[draft.when],
      place: draft.place,
      durationMin: draft.durationMin,
      when: draft.when,
      reason: draft.reason.trim(),
      addedBy: sessionId,
      attachments: draft.attachments.length ? draft.attachments : undefined,
    });
    api.getState().showToast(`Saved “${title}”`, "success");
    onSaved();
  }

  function pickPlace(place: NycPlace) {
    setDraft((current) => ({
      ...current,
      place: {
        name: place.name,
        address: place.address,
        coords: place.coords,
        neighbourhood: place.neighbourhood,
      },
      category: place.category,
      title: current.title.trim() ? current.title : place.name,
    }));
    setPlaceQuery("");
    setPlaceOpen(false);
  }

  return (
    <form className={styles.ideaCompose} onSubmit={addIdea}>
      <Input
        ref={titleRef}
        fieldLabel="Heading"
        value={draft.title}
        placeholder="What should we do?"
        aria-label="Idea heading"
        onChange={(event) =>
          setDraft((current) => ({ ...current, title: event.target.value }))
        }
      />
      <Textarea
        className={styles.ideaNotes}
        value={draft.reason}
        rows={2}
        placeholder="Why this, and anything the group should know"
        aria-label="Idea description"
        onChange={(event) =>
          setDraft((current) => ({ ...current, reason: event.target.value }))
        }
      />
      {draft.place ? (
        <div className={styles.ideaPlacePicked}>
          <MapPin size={14} strokeWidth={2.1} aria-hidden />
          <span>
            <strong>{draft.place.name}</strong>
            <em>
              {draft.place.neighbourhood
                ? `${draft.place.neighbourhood} · ${draft.place.address}`
                : draft.place.address}
            </em>
          </span>
          <IconButton
            label="Clear location"
            size="xs"
            variant="ghost"
            onClick={() => {
              setDraft((current) => ({
                ...current,
                place: null,
                category: "sightseeing",
              }));
              setPlaceQuery("");
            }}
          >
            <X size={14} strokeWidth={2} />
          </IconButton>
        </div>
      ) : (
        <div className={styles.ideaPlaceSearch}>
          <Input
            fieldLabel="Location"
            value={placeQuery}
            placeholder="Search a place"
            aria-label="Idea location"
            onChange={(event) => {
              setPlaceQuery(event.target.value);
              setPlaceOpen(true);
            }}
            onFocus={() => setPlaceOpen(true)}
            onBlur={() => window.setTimeout(() => setPlaceOpen(false), 160)}
            onKeyDown={(event) => {
              if (event.key !== "Enter" || places.length === 0) return;
              event.preventDefault();
              pickPlace(places[0]);
            }}
          />
          {placeOpen ? (
            <ul className={styles.ideaPlaceResults} role="listbox">
              {places.length === 0 ? (
                <li className={styles.ideaPlaceEmpty}>No matching places</li>
              ) : (
                places.map((place) => (
                  <li key={place.id}>
                    <button
                      type="button"
                      className={styles.ideaPlaceResult}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => pickPlace(place)}
                    >
                      <strong>{place.name}</strong>
                      <em>
                        {place.kind}
                        {place.neighbourhood ? ` · ${place.neighbourhood}` : ""}
                      </em>
                    </button>
                  </li>
                ))
              )}
            </ul>
          ) : null}
        </div>
      )}
      <div className={styles.ideaTiming}>
        <Select
          label="How long"
          fieldLabel="Takes"
          size="sm"
          value={String(draft.durationMin)}
          options={DURATION_OPTIONS}
          onChange={(value) =>
            setDraft((current) => ({ ...current, durationMin: Number(value) }))
          }
        />
        <Select
          label="Time of day"
          fieldLabel="When"
          size="sm"
          value={draft.when}
          options={WHEN_OPTIONS}
          onChange={(value) =>
            setDraft((current) => ({ ...current, when: value }))
          }
        />
      </div>
      {draft.attachments.length > 0 ? (
        <ul className={styles.ideaAttachList}>
          {draft.attachments.map((file) => (
            <li key={file.id} className={styles.ideaAttachChip}>
              {file.kind === "photo" ? (
                // eslint-disable-next-line @next/next/no-img-element -- local object URL
                <img src={file.src} alt="" width={28} height={28} />
              ) : (
                <FileText size={12} strokeWidth={2.1} aria-hidden />
              )}
              <span>{file.name}</span>
              <IconButton
                label={`Remove ${file.name}`}
                size="xs"
                variant="ghost"
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    attachments: current.attachments.filter((item) => item.id !== file.id),
                  }))
                }
              >
                <X size={12} strokeWidth={2.2} />
              </IconButton>
            </li>
          ))}
        </ul>
      ) : null}
      <div className={styles.ideaComposeFoot}>
        <input
          ref={photoRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(event) => {
            addFiles("photo", event.target.files);
            event.target.value = "";
          }}
        />
        <input
          ref={fileRef}
          type="file"
          multiple
          hidden
          onChange={(event) => {
            addFiles("file", event.target.files);
            event.target.value = "";
          }}
        />
        <IconButton
          label="Add photos"
          size="sm"
          variant="ghost"
          onClick={() => photoRef.current?.click()}
        >
          <ImageIcon size={16} strokeWidth={2} />
        </IconButton>
        <IconButton
          label="Attach a file"
          size="sm"
          variant="ghost"
          onClick={() => fileRef.current?.click()}
        >
          <Paperclip size={16} strokeWidth={2} />
        </IconButton>
        <div className={styles.ideaComposeActions}>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            variant="primary"
            disabled={draft.title.trim().length === 0}
          >
            Save
          </Button>
        </div>
      </div>
    </form>
  );
}

function IdeaCard({
  idea,
  trip,
  km,
  nearest,
  onSchedule,
  onShare,
  dragging,
}: {
  idea: Idea;
  trip: Trip;
  km: number;
  nearest: string;
  onSchedule: () => void;
  onShare: () => void;
  dragging: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `idea:${idea.id}`,
    data: { kind: "idea", idea },
  });

  const meta = categoryMeta(idea.category);
  const Icon = meta.icon;
  const sessionId = useSession((s) => s.user?.id ?? ACCOUNT_USER.id);
  const author = trip.travellers.find((t) => t.id === idea.addedBy);
  const fromAssistant = idea.addedBy === "assistant";
  const fromYou = idea.addedBy === sessionId;
  const whenLabel =
    idea.when && idea.when !== "flexible" ? IDEA_WHEN_LABELS[idea.when] : null;

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

        {idea.reason ? <p className={styles.ideaReason}>{idea.reason}</p> : null}

        {idea.attachments && idea.attachments.length > 0 ? (
          <ul className={styles.ideaAttachList}>
            {idea.attachments.map((file) => (
              <li key={file.id} className={styles.ideaAttachChip}>
                {file.kind === "photo" ? (
                  // eslint-disable-next-line @next/next/no-img-element -- local object URL
                  <img src={file.src} alt="" width={28} height={28} />
                ) : (
                  <FileText size={12} strokeWidth={2.1} aria-hidden />
                )}
                <span>{file.name}</span>
              </li>
            ))}
          </ul>
        ) : null}

        <div className={styles.ideaMeta}>
          <span className={styles.ideaDuration}>
            <Clock3 size={10} strokeWidth={2.2} />
            {durationLabel(idea.durationMin)}
            {whenLabel ? ` · ${whenLabel.toLowerCase()}` : ""}
          </span>
          {idea.place ? (
            <span
              className={styles.ideaNear}
              title={
                Number.isFinite(km) && nearest
                  ? `Near ${nearest}`
                  : idea.place.address
              }
            >
              <MapPin size={10} strokeWidth={2.2} />
              {Number.isFinite(km) && nearest
                ? km < 0.9
                  ? "walking distance"
                  : `${km.toFixed(1)} km away`
                : idea.place.neighbourhood ?? idea.place.name}
            </span>
          ) : null}
          {idea.costUsd ? (
            <span className={cn(styles.ideaCost, "tabular")}>${idea.costUsd}</span>
          ) : null}
        </div>

        <div className={styles.ideaFoot}>
          {fromAssistant ? (
            <Tag tone="brand" icon={<Sparkles size={9} strokeWidth={2.4} />}>
              Suggested
            </Tag>
          ) : fromYou ? (
            <span className={styles.ideaAuthor}>You</span>
          ) : author ? (
            <span className={styles.ideaAuthor}>
              <Avatar traveller={author} size="xs" />
              {author.name.split(" ")[0]}
            </span>
          ) : (
            <span />
          )}
          <div className={styles.ideaActions}>
            <IconButton
              label="Send to trip chat"
              size="xs"
              variant="ghost"
              onClick={onShare}
            >
              <MessageCircle size={14} strokeWidth={2} />
            </IconButton>
            <Button variant="ghost" size="xs" onClick={onSchedule}>
              Schedule
            </Button>
          </div>
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
  /** Hand the clash to the advisor. Absent where there is nowhere to send it. */
  onResolveConflict?: () => void;
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
  onResolveConflict,
}: DetailsPanelProps) {
  const reduceMotion = useReducedMotion();
  const clock = useTrip((s) => s.prefs.timeFormat);
  const markItemCommentsSeen = useTrip((s) => s.markItemCommentsSeen);
  const meta = categoryMeta(item.category);
  const Icon = meta.icon;

  const conflicts = conflictsForDay(trip, activeDay).filter((conflict) =>
    conflict.itemIds.includes(item.id),
  );

  const comments = commentsForDisplay(item, trip);
  const isCommute = item.kind === "commute";
  const isStay = item.kind === "stay";
  const party = partyTravellers(trip.travellers);

  useEffect(() => {
    markItemCommentsSeen(item.id);
  }, [item.id, item.comments?.length, markItemCommentsSeen]);

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
            <div className={styles.detailsConflictBody}>
              {conflicts.map((conflict) => (
                <p key={conflict.message}>{conflict.message}</p>
              ))}
              {/*
               * Stating a problem without offering the fix makes the panel a
               * bystander. This is the same advisor action the day tab and the
               * rail offer, reached from the card that has the problem.
               */}
              {onResolveConflict ? (
                <button
                  type="button"
                  className={styles.detailsConflictAction}
                  onClick={onResolveConflict}
                >
                  <Sparkles size={11} strokeWidth={2.4} aria-hidden />
                  Ask the advisor to fix it
                </button>
              ) : null}
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
                    {timeRangeLabel(item.start, item.end, clock)}
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

        {comments.length > 0 ? (
          <div className={styles.comments}>
            <span className="eyebrow">Comments</span>
            <ul className={styles.commentList}>
              {comments.map((comment) => (
                <li key={`${comment.person.id}-${comment.text.slice(0, 24)}`}>
                  <p>
                    <span
                      className={styles.commentFrom}
                      style={{ color: travellerColor(comment.person.colorIndex) }}
                    >
                      {comment.person.name.split(" ")[0]}
                    </span>
                    {comment.text}
                  </p>
                </li>
              ))}
            </ul>
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
                ? "Everyone going — tap someone to leave them out"
                : `${item.assignedTo.filter((id) => party.some((person) => person.id === id)).length} of ${party.length} travellers`}
            </p>
            <ul className={styles.whoList}>
              {party.map((traveller) => {
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
              label="Move to ideas"
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
              variant="ghost"
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
