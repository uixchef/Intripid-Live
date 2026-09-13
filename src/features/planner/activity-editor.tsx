"use client";

import {
  useId,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { format } from "date-fns";
import {
  ChevronDown,
  Circle,
  Clock,
  Lock,
  MapPin,
  MessageSquare,
  Ticket,
  TramFront,
  Trash2,
  Users,
  X,
} from "lucide-react";

import { Avatar, AvatarStack } from "@/components/ui/avatar";
import { Button, IconButton } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { searchNycPlaces, type NycPlace } from "@/data/nyc-places";
import {
  ACTIVITY_TYPE_META,
  ACTIVITY_TYPES,
  activityTypeOf,
  categoryMeta,
  COMMUTE_LABELS,
  type ActivityType,
} from "@/lib/categories";
import { partyTravellers, ROLE_LABELS, withOrganizerFirst } from "@/lib/collaboration";
import { cn } from "@/lib/utils";
import {
  atMinutes,
  dateFromDayKey,
  durationLabel,
  shiftDayKey,
  timeLabel,
} from "@/lib/trip/time";
import { type CommuteMode, type Traveller, type Trip } from "@/lib/types";
import { useTrip, type EditorDraft } from "@/stores/trip-store";

import styles from "./activity-editor.module.css";

const SLOT = 15;
const COMMUTE_MODES: CommuteMode[] = ["walk", "subway", "taxi", "ferry", "bike"];

function patchForType(type: ActivityType, draft: EditorDraft): Partial<EditorDraft> {
  const spec = ACTIVITY_TYPE_META[type];
  const leavingStay = draft.kind === "stay" && spec.kind !== "stay";
  const enteringStay = spec.kind === "stay" && draft.kind !== "stay";
  const enteringCommute = spec.kind === "commute" && draft.kind !== "commute";
  const leavingCommute = draft.kind === "commute" && spec.kind !== "commute";
  return {
    kind: spec.kind,
    category: spec.category,
    flexible: spec.kind === "stay" ? false : draft.flexible,
    endDay: enteringStay
      ? draft.endDay > draft.day
        ? draft.endDay
        : shiftDayKey(draft.day, 1)
      : draft.endDay,
    startMinutes: leavingStay ? 10 * 60 : draft.startMinutes,
    durationMin: leavingStay ? 90 : draft.durationMin,
    commuteMode: spec.kind === "commute" ? draft.commuteMode : draft.commuteMode,
    ...(enteringCommute
      ? {
          fromPlaceName: draft.fromPlaceName || draft.placeName,
          fromPlaceAddress: draft.fromPlaceAddress || draft.placeAddress,
          fromPlaceCoords: draft.fromPlaceCoords ?? draft.placeCoords,
          placeName: "",
          placeAddress: "",
          placeCoords: null,
        }
      : {}),
    ...(leavingCommute
      ? {
          placeName: draft.placeName || draft.fromPlaceName,
          placeAddress: draft.placeAddress || draft.fromPlaceAddress,
          placeCoords: draft.placeCoords ?? draft.fromPlaceCoords,
        }
      : {}),
  };
}

export interface ActivityEditorProps {
  trip: Trip;
  draft: EditorDraft;
  mode: "create" | "edit";
  days: string[];
  onChange: (patch: Partial<EditorDraft>) => void;
  onCommit: () => void;
  onCancel: () => void;
  onDelete?: () => void;
  compact?: boolean;
}

export function ActivityEditor({
  trip,
  draft,
  mode,
  days,
  onChange,
  onCommit,
  onCancel,
  onDelete,
  compact = false,
}: ActivityEditorProps) {
  const clock = useTrip((s) => s.prefs.timeFormat);
  const dayStart = useTrip((s) => s.prefs.dayStartHour) * 60;
  const dayEnd = useTrip((s) => s.prefs.dayEndHour) * 60;
  const titleRef = useRef<HTMLInputElement>(null);
  const timedRef = useRef({
    startMinutes: draft.startMinutes,
    durationMin: draft.durationMin,
  });
  const [placeQuery, setPlaceQuery] = useState("");
  const [placeSlot, setPlaceSlot] = useState<"from" | "to" | "place" | null>(null);
  const [guestQuery, setGuestQuery] = useState("");
  const [guestOpen, setGuestOpen] = useState(false);
  const [guestIndex, setGuestIndex] = useState(0);
  const party = partyTravellers(trip.travellers);
  const partyIds = party.map((person) => person.id);
  const going = guestsOnStop(party, draft.assignedTo);
  const guestMatches = guestCandidates(party, going, guestQuery);
  const activityType = activityTypeOf(draft.kind, draft.category);
  const typeMeta = ACTIVITY_TYPE_META[activityType];
  const lodging = activityType === "lodging";
  const transport = activityType === "transportation";

  const results = useMemo(
    () => searchNycPlaces(placeQuery, 6),
    [placeQuery],
  );

  const dayCap = 24 * 60 - SLOT;
  const workingSpan = Math.max(SLOT, dayEnd - dayStart);
  const allDay =
    draft.startMinutes === dayStart && draft.durationMin === workingSpan;
  const invalidEnd = lodging
    ? draft.endDay <= draft.day
    : draft.durationMin < SLOT || draft.startMinutes > dayCap;

  const startOptions = useMemo(() => {
    const options = slots(0, dayCap).map((minutes) => ({
      value: String(minutes),
      label: timeLabel(atMinutes("2000-01-01", minutes), clock),
    }));
    if (!options.some((option) => option.value === String(draft.startMinutes))) {
      options.unshift({
        value: String(draft.startMinutes),
        label: timeLabel(atMinutes("2000-01-01", draft.startMinutes), clock),
      });
    }
    return options;
  }, [clock, draft.startMinutes]);

  const endOptions = useMemo(() => {
    const options = [];
    for (
      let minutes = draft.startMinutes + SLOT;
      minutes <= 24 * 60 - 1;
      minutes += SLOT
    ) {
      options.push({
        value: String(minutes - draft.startMinutes),
        label: timeLabel(atMinutes("2000-01-01", minutes), clock),
        hint: durationLabel(minutes - draft.startMinutes),
      });
    }
    if (
      draft.durationMin >= SLOT &&
      !options.some((option) => option.value === String(draft.durationMin))
    ) {
      const end = Math.min(24 * 60 - 1, draft.startMinutes + draft.durationMin);
      options.unshift({
        value: String(draft.durationMin),
        label: timeLabel(atMinutes("2000-01-01", end), clock),
        hint: durationLabel(draft.durationMin),
      });
    }
    return options;
  }, [clock, draft.durationMin, draft.startMinutes]);

  useEffect(() => {
    if (mode === "create") titleRef.current?.focus();
  }, [mode]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.key !== "Enter") return;
      event.preventDefault();
      if (!invalidEnd) onCommit();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [invalidEnd, onCommit]);

  useEffect(() => {
    if (!allDay) {
      timedRef.current = {
        startMinutes: draft.startMinutes,
        durationMin: draft.durationMin,
      };
    }
  }, [allDay, draft.startMinutes, draft.durationMin]);

  function applyPlace(slot: "from" | "to" | "place", place: NycPlace) {
    const picked = {
      name: place.name,
      address: place.address,
      coords: place.coords,
      id: place.id,
    };
    if (slot === "from") {
      onChange({
        fromPlaceId: picked.id,
        fromPlaceName: picked.name,
        fromPlaceAddress: picked.address,
        fromPlaceCoords: picked.coords,
        ...(draft.title.trim().length === 0 && !draft.placeName
          ? { title: picked.name }
          : {}),
      });
    } else {
      const nextType = activityTypeOf(
        place.category === "stay" ? "stay" : place.category === "transit" ? "commute" : "activity",
        place.category,
      );
      const spec = ACTIVITY_TYPE_META[nextType];
      onChange({
        placeId: picked.id,
        placeName: picked.name,
        placeAddress: picked.address,
        placeCoords: picked.coords,
        ...(draft.title.trim().length === 0 ? { title: picked.name } : {}),
        ...(mode === "create" && slot === "place"
          ? { category: spec.category, kind: spec.kind }
          : {}),
      });
    }
    setPlaceQuery("");
    setPlaceSlot(null);
  }

  function toggleAllDay(next: boolean) {
    if (next) {
      onChange({ startMinutes: dayStart, durationMin: workingSpan });
      return;
    }
    onChange(timedRef.current);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (invalidEnd) return;
    onCommit();
  }

  return (
    <form
      className={cn(styles.root, compact && styles.rootFull)}
      onSubmit={submit}
      onKeyDown={(event) => {
        if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
          event.preventDefault();
          if (!invalidEnd) onCommit();
        }
      }}
    >
      <header className={cn(styles.head, compact && styles.headBar)}>
        {compact ? (
          <>
            <IconButton label="Close" size="md" variant="ghost" onClick={onCancel}>
              <X size={22} strokeWidth={2} />
            </IconButton>
            <div className={styles.headActions}>
              {mode === "edit" && onDelete ? (
                <IconButton label="Delete" size="md" variant="ghost" onClick={onDelete}>
                  <Trash2 size={18} strokeWidth={2} />
                </IconButton>
              ) : null}
              <button
                type="submit"
                className={styles.saveText}
                disabled={invalidEnd}
              >
                Save
              </button>
            </div>
          </>
        ) : (
          <>
            {mode === "edit" && onDelete ? (
              <IconButton label="Delete" size="sm" variant="ghost" onClick={onDelete}>
                <Trash2 size={16} strokeWidth={2} />
              </IconButton>
            ) : null}
            <IconButton label="Close" size="sm" variant="ghost" onClick={onCancel}>
              <X size={18} strokeWidth={2} />
            </IconButton>
          </>
        )}
      </header>

      <div className={styles.body}>
        <label className={styles.titleWrap}>
          <span className="srOnly">Title</span>
          <input
            ref={titleRef}
            className={styles.title}
            value={draft.title}
            placeholder={compact ? "Add title" : typeMeta.titlePlaceholder}
            onChange={(event) => onChange({ title: event.target.value })}
          />
        </label>

        {transport ? (
          <>
            <Row icon={<Circle size={14} strokeWidth={2.2} />}>
              <PlaceField
                name={draft.fromPlaceName}
                address={draft.fromPlaceAddress}
                coords={draft.fromPlaceCoords}
                query={placeSlot === "from" ? placeQuery : ""}
                open={placeSlot === "from"}
                placeholder="Begin location"
                results={results}
                onQuery={(value) => {
                  setPlaceSlot("from");
                  setPlaceQuery(value);
                }}
                onOpen={() => {
                  setPlaceSlot("from");
                  setPlaceQuery("");
                }}
                onClose={() => setPlaceSlot((current) => (current === "from" ? null : current))}
                onSelect={(place) => applyPlace("from", place)}
                onClear={() =>
                  onChange({
                    fromPlaceId: null,
                    fromPlaceName: "",
                    fromPlaceAddress: "",
                    fromPlaceCoords: null,
                  })
                }
              />
            </Row>
            <Row icon={<MapPin size={18} strokeWidth={1.8} />}>
              <PlaceField
                name={draft.placeName}
                address={draft.placeAddress}
                coords={draft.placeCoords}
                query={placeSlot === "to" ? placeQuery : ""}
                open={placeSlot === "to"}
                placeholder="End location"
                results={results}
                onQuery={(value) => {
                  setPlaceSlot("to");
                  setPlaceQuery(value);
                }}
                onOpen={() => {
                  setPlaceSlot("to");
                  setPlaceQuery("");
                }}
                onClose={() => setPlaceSlot((current) => (current === "to" ? null : current))}
                onSelect={(place) => applyPlace("to", place)}
                onClear={() =>
                  onChange({
                    placeId: null,
                    placeName: "",
                    placeAddress: "",
                    placeCoords: null,
                  })
                }
              />
            </Row>
          </>
        ) : (
          <Row icon={<MapPin size={18} strokeWidth={1.8} />}>
            <PlaceField
              name={draft.placeName}
              address={draft.placeAddress}
              coords={draft.placeCoords}
              query={placeSlot === "place" ? placeQuery : ""}
              open={placeSlot === "place"}
              placeholder={typeMeta.locationPlaceholder}
              results={results}
              onQuery={(value) => {
                setPlaceSlot("place");
                setPlaceQuery(value);
              }}
              onOpen={() => {
                setPlaceSlot("place");
                setPlaceQuery("");
              }}
              onClose={() => setPlaceSlot((current) => (current === "place" ? null : current))}
              onSelect={(place) => applyPlace("place", place)}
              onClear={() =>
                onChange({
                  placeId: null,
                  placeName: "",
                  placeAddress: "",
                  placeCoords: null,
                })
              }
            />
          </Row>
        )}

        <div className={styles.types} role="radiogroup" aria-label="Activity type">
          {ACTIVITY_TYPES.map((type) => {
            const spec = ACTIVITY_TYPE_META[type];
            const meta = categoryMeta(spec.category);
            const selected = type === activityType;
            return (
              <button
                key={type}
                type="button"
                role="radio"
                aria-checked={selected}
                className={cn(styles.typeTab, selected && styles.typeTabOn)}
                style={
                  selected
                    ? { background: meta.soft, color: meta.ink }
                    : undefined
                }
                onClick={() => onChange(patchForType(type, draft))}
              >
                {spec.label}
              </button>
            );
          })}
        </div>

        <Row icon={<Clock size={18} strokeWidth={1.8} />}>
          {lodging ? (
            <div className={styles.when}>
              <Select
                className={cn(styles.whenSelect, styles.whenDate)}
                label="Check-in"
                size="sm"
                value={draft.day}
                onChange={(day) =>
                  onChange({
                    day,
                    endDay: draft.endDay > day ? draft.endDay : shiftDayKey(day, 1),
                  })
                }
                options={days.map((day) => ({
                  value: day,
                  label: `In ${format(dateFromDayKey(day), "EEE d MMM")}`,
                }))}
              />
              <span className={styles.to}>–</span>
              <Select
                className={styles.whenSelect}
                label="Check-out"
                size="sm"
                value={draft.endDay}
                onChange={(endDay) => onChange({ endDay })}
                options={days
                  .filter((day) => day > draft.day)
                  .map((day) => ({
                    value: day,
                    label: `Out ${format(dateFromDayKey(day), "EEE d MMM")}`,
                  }))}
              />
            </div>
          ) : (
            <div className={styles.when}>
              <Select
                className={cn(styles.whenSelect, styles.whenDate)}
                label="Date"
                size="sm"
                value={draft.day}
                onChange={(day) => onChange({ day, endDay: day })}
                options={days.map((day) => ({
                  value: day,
                  label: format(dateFromDayKey(day), "EEE d MMM"),
                }))}
              />
              {allDay ? null : (
                <>
                  <Select
                    className={styles.whenSelect}
                    label={transport ? "Departs" : "Start time"}
                    size="sm"
                    value={String(draft.startMinutes)}
                    onChange={(value) => {
                      const startMinutes = Number(value);
                      const cap = Math.max(SLOT, 24 * 60 - SLOT - startMinutes);
                      onChange({
                        startMinutes,
                        durationMin: Math.min(Math.max(SLOT, draft.durationMin), cap),
                      });
                    }}
                    options={startOptions}
                  />
                  <span className={styles.to}>–</span>
                  <Select
                    className={styles.whenSelect}
                    label={transport ? "Arrives" : "End time"}
                    size="sm"
                    value={String(draft.durationMin)}
                    onChange={(value) => onChange({ durationMin: Number(value) })}
                    options={endOptions}
                  />
                </>
              )}
              {transport ? null : (
                <label className={styles.allDay}>
                  <input
                    type="checkbox"
                    checked={allDay}
                    onChange={(event) => toggleAllDay(event.target.checked)}
                  />
                  All day
                </label>
              )}
            </div>
          )}
          {invalidEnd ? (
            <p className={styles.warn} role="alert">
              {lodging ? "Check-out is before check-in." : "Ends before it starts."}
            </p>
          ) : null}
        </Row>

        {transport ? (
          <Row icon={<TramFront size={18} strokeWidth={1.8} />}>
            <div className={styles.busy} role="group" aria-label="How you’re getting there">
              {COMMUTE_MODES.map((modeOption) => (
                <button
                  key={modeOption}
                  type="button"
                  className={cn(
                    styles.busyBtn,
                    draft.commuteMode === modeOption && styles.busyOn,
                  )}
                  onClick={() => onChange({ commuteMode: modeOption })}
                >
                  {COMMUTE_LABELS[modeOption]}
                </button>
              ))}
            </div>
          </Row>
        ) : null}

        {typeMeta.bookingPlaceholder ? (
          <Row icon={<Ticket size={18} strokeWidth={1.8} />}>
            <input
              className={styles.plain}
              value={draft.booking}
              placeholder={typeMeta.bookingPlaceholder}
              aria-label={typeMeta.bookingPlaceholder}
              onChange={(event) => onChange({ booking: event.target.value })}
            />
          </Row>
        ) : null}

        <Row icon={<Users size={18} strokeWidth={1.8} />}>
          <GuestField
            label={typeMeta.guestsLabel}
            query={guestQuery}
            open={guestOpen}
            highlight={guestIndex}
            going={going}
            matches={guestMatches}
            onQuery={(value) => {
              setGuestQuery(value);
              setGuestOpen(true);
              setGuestIndex(0);
            }}
            onOpen={setGuestOpen}
            onHighlight={setGuestIndex}
            onAdd={(person) => {
              setAssigned(
                onChange,
                partyIds,
                going.map((entry) => entry.id),
                person.id,
                "add",
              );
              setGuestQuery("");
              setGuestIndex(0);
              setGuestOpen(false);
            }}
            onRemove={(person) =>
              setAssigned(
                onChange,
                partyIds,
                going.map((entry) => entry.id),
                person.id,
                "remove",
              )
            }
          />
        </Row>

        {mode === "create" ? (
          <Row icon={<MessageSquare size={18} strokeWidth={1.8} />}>
            <textarea
              className={cn(styles.plain, styles.thought)}
              value={draft.comment}
              rows={2}
              placeholder="Leave a thought for the group…"
              aria-label="Comment"
              onChange={(event) => onChange({ comment: event.target.value })}
            />
          </Row>
        ) : null}

        {lodging || transport ? null : (
          <Row icon={<Lock size={18} strokeWidth={1.8} />}>
            <div className={styles.busy} role="group" aria-label="Scheduling">
              <button
                type="button"
                className={cn(styles.busyBtn, !draft.flexible && styles.busyOn)}
                onClick={() => onChange({ flexible: false })}
              >
                Fixed
              </button>
              <button
                type="button"
                className={cn(styles.busyBtn, draft.flexible && styles.busyOn)}
                onClick={() => onChange({ flexible: true })}
              >
                Flexible
              </button>
            </div>
          </Row>
        )}
      </div>
      {compact ? null : (
      <footer className={styles.foot}>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={invalidEnd}>
          Save
        </Button>
      </footer>
      )}
    </form>
  );
}

function Row({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={styles.row}>
      <span className={styles.rowIcon} aria-hidden>
        {icon}
      </span>
      <div className={styles.rowBody}>{children}</div>
    </div>
  );
}

function PlaceField({
  name,
  address,
  coords,
  query,
  open,
  placeholder,
  results,
  onQuery,
  onOpen,
  onClose,
  onSelect,
  onClear,
}: {
  name: string;
  address: string;
  coords: { lng: number; lat: number } | null;
  query: string;
  open: boolean;
  placeholder: string;
  results: NycPlace[];
  onQuery: (value: string) => void;
  onOpen: () => void;
  onClose: () => void;
  onSelect: (place: NycPlace) => void;
  onClear: () => void;
}) {
  if (coords) {
    return (
      <div className={styles.place}>
        <div>
          <strong>{name}</strong>
          <span>{address}</span>
        </div>
        <IconButton label={`Remove ${placeholder.toLowerCase()}`} size="xs" variant="ghost" onClick={onClear}>
          <X size={14} strokeWidth={2} />
        </IconButton>
      </div>
    );
  }

  return (
    <div className={styles.search}>
      <input
        className={styles.plain}
        value={query}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(event) => onQuery(event.target.value)}
        onFocus={onOpen}
        onBlur={() => window.setTimeout(onClose, 160)}
      />
      {open ? (
        <ul className={styles.results} role="listbox">
          {results.length === 0 ? (
            <li className={styles.empty}>No matching places</li>
          ) : (
            results.map((place) => (
              <li key={place.id}>
                <button
                  type="button"
                  className={styles.result}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => onSelect(place)}
                >
                  <span>
                    <strong>{place.name}</strong>
                    <em>
                      {place.kind}
                      {place.neighbourhood ? ` · ${place.neighbourhood}` : ""}
                    </em>
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}

function guestsOnStop(party: Traveller[], assignedTo: string[]) {
  const ordered = withOrganizerFirst(party);
  if (assignedTo.length === 0) return ordered;
  const selected = new Set(assignedTo);
  return ordered.filter((person) => selected.has(person.id));
}

function guestCandidates(party: Traveller[], going: Traveller[], query: string) {
  const taken = new Set(going.map((person) => person.id));
  const needle = query.trim().toLowerCase();
  return withOrganizerFirst(party).filter((person) => {
    if (taken.has(person.id)) return false;
    if (!needle) return true;
    return (
      person.name.toLowerCase().includes(needle) ||
      person.initials.toLowerCase().includes(needle)
    );
  });
}

function encodeAssigned(partyIds: string[], nextIds: string[]) {
  if (nextIds.length === 0 || nextIds.length === partyIds.length) return [];
  return nextIds;
}

function setAssigned(
  onChange: (patch: Partial<EditorDraft>) => void,
  partyIds: string[],
  currentIds: string[],
  personId: string,
  action: "add" | "remove",
) {
  const next =
    action === "add"
      ? [...currentIds, personId]
      : currentIds.filter((id) => id !== personId);
  if (action === "remove" && next.length === 0) return;
  onChange({ assignedTo: encodeAssigned(partyIds, next) });
}

const GUEST_STACK_AFTER = 5;

function GuestRow({
  person,
  canRemove,
  onRemove,
}: {
  person: Traveller;
  canRemove: boolean;
  onRemove: (person: Traveller) => void;
}) {
  return (
    <li>
      <Avatar traveller={person} size="sm" hideName />
      <div className={styles.guestCopy}>
        <p>{person.name}</p>
        <p>{ROLE_LABELS[person.role]}</p>
      </div>
      {canRemove ? (
        <IconButton
          label={`Remove ${person.name}`}
          size="xs"
          variant="ghost"
          onClick={() => onRemove(person)}
        >
          <X size={14} strokeWidth={2} />
        </IconButton>
      ) : null}
    </li>
  );
}

function GuestField({
  label,
  query,
  open,
  highlight,
  going,
  matches,
  onQuery,
  onOpen,
  onHighlight,
  onAdd,
  onRemove,
}: {
  label: string;
  query: string;
  open: boolean;
  highlight: number;
  going: Traveller[];
  matches: Traveller[];
  onQuery: (value: string) => void;
  onOpen: (open: boolean) => void;
  onHighlight: (index: number) => void;
  onAdd: (person: Traveller) => void;
  onRemove: (person: Traveller) => void;
}) {
  const listId = useId();
  const [rosterOpen, setRosterOpen] = useState(false);
  const countRef = useRef(going.length);
  const active = matches[highlight];
  const showMenu = open && (matches.length > 0 || query.trim().length > 0);
  const stacked = going.length > GUEST_STACK_AFTER;
  const showRoster = going.length > 0 && (!stacked || rosterOpen);

  useEffect(() => {
    if (countRef.current <= GUEST_STACK_AFTER && going.length > GUEST_STACK_AFTER) {
      setRosterOpen(true);
    }
    if (going.length <= GUEST_STACK_AFTER) setRosterOpen(false);
    countRef.current = going.length;
  }, [going.length]);

  function onKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      onOpen(true);
      if (matches.length > 0) onHighlight((highlight + 1) % matches.length);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      onOpen(true);
      if (matches.length > 0) {
        onHighlight((highlight - 1 + matches.length) % matches.length);
      }
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (active) onAdd(active);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      onOpen(false);
    }
  }

  return (
    <div className={styles.guests}>
      <div className={styles.search}>
        <input
          className={styles.plain}
          value={query}
          placeholder={label}
          aria-label={label}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showMenu}
          aria-controls={listId}
          aria-activedescendant={active ? `${listId}-${active.id}` : undefined}
          onChange={(event) => onQuery(event.target.value)}
          onFocus={() => onOpen(true)}
          onBlur={() => window.setTimeout(() => onOpen(false), 160)}
          onKeyDown={onKeyDown}
        />
        {showMenu ? (
          <ul className={styles.results} id={listId} role="listbox">
            {matches.length === 0 ? (
              <li className={styles.empty}>No matching people</li>
            ) : (
              matches.map((person, index) => (
                <li key={person.id} role="presentation">
                  <button
                    id={`${listId}-${person.id}`}
                    type="button"
                    role="option"
                    aria-selected={index === highlight}
                    className={cn(styles.result, index === highlight && styles.resultOn)}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => onHighlight(index)}
                    onClick={() => onAdd(person)}
                  >
                    <Avatar traveller={person} size="xs" hideName />
                    <span>
                      <strong>{person.name}</strong>
                      <em>{ROLE_LABELS[person.role]}</em>
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        ) : null}
      </div>

      {going.length > 0 ? (
        <div className={styles.guestRoster}>
          {stacked ? (
            <button
              type="button"
              className={styles.guestStack}
              aria-expanded={rosterOpen}
              aria-controls={stacked ? `${listId}-roster` : undefined}
              onClick={() => setRosterOpen((value) => !value)}
            >
              <AvatarStack travellers={going} size="sm" max={GUEST_STACK_AFTER} />
              <span className={styles.guestCopy}>
                <p>
                  {going.length} traveller{going.length === 1 ? "" : "s"}
                </p>
              </span>
              <ChevronDown
                className={cn(styles.guestChevron, rosterOpen && styles.guestChevronOpen)}
                size={16}
                strokeWidth={2}
              />
            </button>
          ) : null}

          {showRoster ? (
            <ul
              className={cn(styles.guestList, stacked && styles.guestListStacked)}
              id={stacked ? `${listId}-roster` : undefined}
            >
              {going.map((person) => (
                <GuestRow
                  key={person.id}
                  person={person}
                  canRemove={going.length > 1}
                  onRemove={onRemove}
                />
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function slots(from: number, to: number) {
  const values: number[] = [];
  for (let minutes = from; minutes <= to; minutes += SLOT) values.push(minutes);
  return values;
}
