"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { format } from "date-fns";
import { MapPin, MessageSquare, Pencil, Send, Ticket, Trash2, Users, X } from "lucide-react";

import { AvatarStack } from "@/components/ui/avatar";
import { IconButton } from "@/components/ui/button";
import { Popover, Sheet } from "@/components/ui/overlay";
import { ACCOUNT_USER } from "@/data/account";
import { categoryMeta, travellerColor } from "@/lib/categories";
import { useIsCompact } from "@/lib/use-media-query";
import { commentsForDisplay, guestsForItem } from "@/lib/trip/schedule";
import { dateFromDayKey, durationLabel, durationMinutes, timeRangeLabel } from "@/lib/trip/time";
import type { ItineraryItem, Trip } from "@/lib/types";
import { useSession } from "@/stores/session-store";
import { useTrip } from "@/stores/trip-store";

import styles from "./event-peek.module.css";

export function findCreateGhost(): HTMLElement | null {
  return document.querySelector<HTMLElement>("[data-create-ghost]");
}

export function findDayTab(day: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    `[data-day-tab="${CSS.escape(day)}"]`,
  );
}

/** Nested menus and confirm dialogs should not dismiss the editor. */
export function isNestedOverlay(node: Node) {
  const element = node instanceof Element ? node : node.parentElement;
  if (!element) return false;
  if (element.closest("[data-create-ghost]")) return true;
  if (element.closest("[role='listbox']")) return true;
  return Boolean(element.closest("[aria-modal='true']"));
}

export function findEventAnchor(id: string): HTMLElement | null {
  const nodes = Array.from(
    document.querySelectorAll<HTMLElement>(`[data-event="${CSS.escape(id)}"]`),
  );
  if (nodes.length === 0) return null;

  const ranked = [
    ...nodes.filter((node) => node.hasAttribute("data-event-card")),
    ...nodes.filter((node) => !node.hasAttribute("data-event-card")),
  ];

  return (
    ranked.find((node) => {
      const box = node.getBoundingClientRect();
      return (
        box.width > 4 &&
        box.height > 4 &&
        box.bottom > 8 &&
        box.top < window.innerHeight - 8 &&
        box.right > 8 &&
        box.left < window.innerWidth - 8
      );
    }) ?? ranked[0]
  );
}

function isEventTarget(node: Node) {
  const element = node instanceof Element ? node : node.parentElement;
  return Boolean(element?.closest("[data-event]"));
}

function guestLine(names: string[], everyone: boolean) {
  if (everyone) return "Everyone";
  if (names.length === 0) return "Nobody going";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export function EventPeek({
  trip,
  item,
  anchor,
  onClose,
  onEdit,
  onDelete,
}: {
  trip: Trip;
  item: ItineraryItem;
  anchor: HTMLElement | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isCompact = useIsCompact();
  const meta = categoryMeta(item.category);
  const clock = useTrip((s) => s.prefs.timeFormat);
  const addItemComment = useTrip((s) => s.addItemComment);
  const markItemCommentsSeen = useTrip((s) => s.markItemCommentsSeen);
  const sessionId = useSession((s) => s.user?.id ?? ACCOUNT_USER.id);
  const fromId =
    trip.travellers.find((person) => person.id === sessionId)?.id ??
    trip.travellers.find((person) => person.role === "owner")?.id ??
    trip.travellers[0]?.id ??
    "";
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const day = item.start ? item.start.slice(0, 10) : null;
  const guests = guestsForItem(item, trip);
  const everyone = item.assignedTo.length === 0;
  const comments = commentsForDisplay(item, trip);

  useEffect(() => {
    markItemCommentsSeen(item.id);
  }, [item.id, item.comments?.length, markItemCommentsSeen]);

  function resizeInput() {
    const node = inputRef.current;
    if (!node) return;
    node.style.height = "auto";
    node.style.height = `${Math.min(node.scrollHeight, 132)}px`;
  }

  function submitComment() {
    if (!draft.trim() || !fromId) return;
    addItemComment(item.id, draft, fromId);
    setDraft("");
    if (inputRef.current) inputRef.current.style.height = "auto";
  }

  function onComposer(event: FormEvent) {
    event.preventDefault();
    submitComment();
  }

  const composer = (
    <form className={styles.composer} onSubmit={onComposer}>
      <textarea
        ref={inputRef}
        className={styles.input}
        rows={1}
        value={draft}
        placeholder="Add a comment…"
        aria-label="Add a comment"
        onChange={(event) => {
          setDraft(event.target.value);
          resizeInput();
        }}
        onKeyDown={(event: KeyboardEvent<HTMLTextAreaElement>) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            submitComment();
          }
        }}
      />
      <IconButton
        type="submit"
        label="Add comment"
        size="sm"
        variant="primary"
        disabled={!draft.trim()}
      >
        <Send size={15} strokeWidth={2.2} />
      </IconButton>
    </form>
  );

  const details = (
      <>
        <div className={styles.toolbar}>
          <IconButton label="Edit" size="sm" variant="ghost" onClick={onEdit}>
            <Pencil size={16} strokeWidth={1.9} />
          </IconButton>
          {item.kind !== "stay" ? (
            <IconButton label="Remove" size="sm" variant="ghost" onClick={onDelete}>
              <Trash2 size={16} strokeWidth={1.9} />
            </IconButton>
          ) : null}
          <IconButton label="Close" size="sm" variant="ghost" onClick={onClose}>
            <X size={16} strokeWidth={1.9} />
          </IconButton>
        </div>

        <div className={styles.head}>
          <span
            className={styles.swatch}
            style={{ background: meta.color }}
            aria-hidden
          />
          <div className={styles.headCopy}>
            <h3 className={styles.title}>{item.title}</h3>
            {item.start && item.end ? (
              <>
                <p className={styles.date}>
                  {day ? format(dateFromDayKey(day), "EEEE, MMMM d") : null}
                </p>
                <p className={styles.time}>
                  {timeRangeLabel(item.start, item.end, clock)}
                  <span> · {durationLabel(durationMinutes(item.start, item.end))}</span>
                </p>
              </>
            ) : (
              <p className={styles.date}>Not scheduled</p>
            )}
          </div>
        </div>

        <div className={styles.rows}>
          {item.place ? (
            <div className={styles.row}>
              <MapPin size={18} strokeWidth={1.8} />
              <div className={styles.rowCopy}>
                <p className={styles.primary}>{item.place.name}</p>
                <p className={styles.secondary}>{item.place.address}</p>
              </div>
            </div>
          ) : null}

          {item.booking ? (
            <div className={styles.row}>
              <Ticket size={18} strokeWidth={1.8} />
              <div className={styles.rowCopy}>
                <p className={styles.primary}>Booking</p>
                <p className={styles.secondary}>{item.booking}</p>
              </div>
            </div>
          ) : null}

          <div className={styles.row}>
            <Users size={18} strokeWidth={1.8} />
            <div className={styles.rowCopy}>
              <p className={styles.primary}>
                {guestLine(
                  guests.map((person) => person.name.split(" ")[0]),
                  everyone,
                )}
              </p>
              <AvatarStack travellers={guests} size="xs" max={4} />
            </div>
          </div>

          {comments.length > 0 || !isCompact ? (
          <div className={styles.row}>
            <MessageSquare size={18} strokeWidth={1.8} />
            <div className={styles.commentCol}>
              {comments.length > 0 ? (
                <ul className={styles.comments}>
                  {comments.map((comment) => (
                    <li key={`${comment.person.id}-${comment.text.slice(0, 12)}`}>
                      <p className={styles.commentText}>
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
              ) : null}
              {isCompact ? null : composer}
            </div>
          </div>
          ) : null}
        </div>
      </>
  );

  if (isCompact) {
    return (
      <Sheet
        open
        onClose={onClose}
        label={item.title}
        snapPoints={[0.48, 0.72, 0.92]}
        initialSnapIndex={1}
        className={styles.sheet}
        bodyClassName={styles.sheetBody}
      >
        <div className={styles.sheetFrame}>
          <div className={styles.sheetScroll}>{details}</div>
          <div className={styles.sheetComposer}>{composer}</div>
        </div>
      </Sheet>
    );
  }

  return (
    <Popover
      open={Boolean(anchor)}
      onClose={onClose}
      anchor={anchor}
      placement="right"
      align="start"
      offset={12}
      width={360}
      label={item.title}
      className={styles.popover}
      ignoreOutsideClick={isEventTarget}
      draggable
      dragKey={item.id}
    >
      <div className={styles.root}>{details}</div>
    </Popover>
  );
}
