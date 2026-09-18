"use client";

import type { ReactNode } from "react";
import { persist } from "zustand/middleware";
import { createStore } from "zustand/vanilla";

import { ACCOUNT_USER } from "@/data/account";
import { NYC_TRIP } from "@/data/nyc-trip";
import { resolveTripCover } from "@/data/place-photos";
import { DRAFT_TRIP_ID } from "@/data/trips";
import { partyTravellers } from "@/lib/collaboration";
import { buildPlan } from "@/lib/trip/assistant";
import {
  applyPlanChanges,
  choiceSetForIntent,
  choicesFromUtterance,
  nearbyDinnerPlan,
  planFromChoice,
  planFromUtterance,
  reduceTravelPlan,
} from "@/lib/trip/ai-actions";
import {
  commentViewerId,
  commentsFromText,
  migrateItemComments,
  tripDayKeys,
} from "@/lib/trip/schedule";
import {
  atMinutes,
  dayKey,
  durationMinutes,
  formatWall,
  moveToDay,
  parseWall,
  shiftDayKey,
  toWallClock,
  type ClockFormat,
} from "@/lib/trip/time";
import {
  IDEA_WHEN_LABELS,
  type AssistantAppliedNote,
  type AssistantChoiceSet,
  type AssistantPlan,
  type CommuteMode,
  type Idea,
  type ItemCategory,
  type ItineraryItem,
  type Place,
  type Trip,
  type Traveller,
} from "@/lib/types";

import { createStoreContext } from "./create-store-context";

/**
 * Trip Planner state.
 *
 * Holds the trip and the UI's current focus. Everything derived — day buckets,
 * conflicts, gaps, routes, overlap columns — is computed by pure functions in
 * `lib/trip/*`, so the calendar, the map and the list can never disagree about
 * what the itinerary says.
 */

export type PlannerView = "day" | "week" | "trip" | "four" | "itinerary";

export function normalizePlannerView(view: string | null | undefined): PlannerView {
  if (view === "calendar") return "week";
  if (view === "schedule") return "itinerary";
  if (
    view === "day" ||
    view === "week" ||
    view === "trip" ||
    view === "four" ||
    view === "itinerary"
  ) {
    return view;
  }
  return "week";
}

/** Where a selection came from, so the other surfaces can respond correctly. */
export type SelectionSource = "calendar" | "map" | "itinerary" | "ideas" | "assistant";

export interface EditorDraft {
  id: string | null;
  kind: ItineraryItem["kind"];
  category: ItemCategory;
  title: string;
  subtitle: string;
  placeId: string | null;
  placeName: string;
  placeAddress: string;
  placeCoords: { lng: number; lat: number } | null;
  fromPlaceId: string | null;
  fromPlaceName: string;
  fromPlaceAddress: string;
  fromPlaceCoords: { lng: number; lat: number } | null;
  day: string;
  /** Check-out day for lodging; same as `day` for timed stops. */
  endDay: string;
  startMinutes: number;
  durationMin: number;
  flexible: boolean;
  assignedTo: string[];
  booking: string;
  commuteMode: CommuteMode;
  /** Opening thought when creating. Stored as the first comment. */
  comment: string;
}

export interface PlannerPrefs {
  dayStartHour: number;
  dayEndHour: number;
  timeFormat: ClockFormat;
  weekStartsOn: 0 | 1;
  defaultDurationMin: number;
  showWeekends: boolean;
  mineOnly: boolean;
  /** Explicit overlay mode. Off = the normal trip calendar. */
  sharedView: boolean;
  /** Travellers selected in shared view. Ignored when `sharedView` is off. */
  overlayIds: string[];
}

export const DEFAULT_PLANNER_PREFS: PlannerPrefs = {
  dayStartHour: 7,
  dayEndHour: 23,
  timeFormat: "12h",
  weekStartsOn: 0,
  defaultDurationMin: 90,
  showWeekends: true,
  mineOnly: false,
  sharedView: false,
  overlayIds: [],
};

/** Null when the range already sits inside the current window. */
export function hoursCoveringRange(
  startMin: number,
  endMin: number,
  prefs: PlannerPrefs,
): Pick<PlannerPrefs, "dayStartHour" | "dayEndHour"> | null {
  const dayStartHour = Math.min(
    prefs.dayStartHour,
    Math.max(0, Math.floor(startMin / 60)),
  );
  const dayEndHour = Math.max(
    prefs.dayEndHour,
    Math.min(24, Math.ceil(endMin / 60)),
  );
  if (dayStartHour === prefs.dayStartHour && dayEndHour === prefs.dayEndHour) {
    return null;
  }
  return { dayStartHour, dayEndHour };
}

/** Selected travellers in shared view. Empty when the trip calendar is showing. */
export function overlayTravellerIds(
  prefs: PlannerPrefs,
  travellers: Traveller[],
  _meId: string | null,
): string[] {
  if (!prefs.sharedView) return [];
  const allowed = new Set(travellers.map((person) => person.id));
  return prefs.overlayIds.filter((id) => allowed.has(id));
}

export interface TripMetaPatch {
  name?: string;
  startDate?: string;
  endDate?: string;
  coverImage?: string | null;
}

export type ChatShare = {
  kind: "idea";
  ideaId: string;
  title: string;
  place: string | null;
  reason: string;
};

export interface TripState {
  trip: Trip;
  activeDay: string;
  view: PlannerView;
  selectedItemId: string | null;
  selectionSource: SelectionSource | null;
  hoveredItemId: string | null;
  /** Idea currently being dragged, for cross-surface drag feedback. */
  draggingId: string | null;
  editor: { open: boolean; mode: "create" | "edit"; draft: EditorDraft | null };
  assistant: {
    open: boolean;
    plan: AssistantPlan | null;
    choices: AssistantChoiceSet | null;
    lastChoices: AssistantChoiceSet | null;
    applied: string[];
    undoTrip: Trip | null;
    focusItemId: string | null;
    appliedNote: AssistantAppliedNote | null;
  };
  invite: { open: boolean; sent: string[] };
  /** Transient confirmations, e.g. "Moved to Thursday 2:00 PM". */
  toast: { id: number; message: string; tone: "info" | "success" | "warning" } | null;
  prefs: PlannerPrefs;
  /** How many comments on a stop the current viewer has opened. */
  commentSeen: Record<string, number>;
  pendingChatShare: ChatShare | null;

  setActiveDay: (day: string) => void;
  setView: (view: PlannerView) => void;
  /** Date-rail click: that day only, Google Calendar's Day view. */
  openDayView: (day: string) => void;
  selectItem: (id: string | null, source?: SelectionSource) => void;
  hoverItem: (id: string | null) => void;
  setDragging: (id: string | null) => void;

  moveItem: (id: string, day: string, startMinutes: number) => void;
  resizeItem: (id: string, durationMin: number) => void;
  deleteItem: (id: string) => void;
  unschedule: (id: string) => void;
  scheduleIdea: (ideaId: string, day: string, startMinutes: number) => void;
  duplicateItem: (id: string) => void;
  toggleAssignee: (itemId: string, travellerId: string) => void;
  addItemComment: (itemId: string, text: string, fromId: string) => void;
  markItemCommentsSeen: (itemId: string) => void;
  setTravellerRole: (
    travellerId: string,
    role: Traveller["role"],
  ) => void;
  removeTraveller: (travellerId: string) => void;

  openCreate: (seed?: Partial<EditorDraft>) => void;
  openEdit: (id: string) => void;
  closeEditor: () => void;
  updateDraft: (patch: Partial<EditorDraft>) => void;
  commitDraft: (draft?: EditorDraft | null) => void;

  requestPlan: (intent: AssistantPlan["intent"]) => void;
  requestFromText: (text: string) => "plan" | "choices" | false;
  chooseAssistantIdea: (ideaId: string) => boolean;
  dismissPlan: () => void;
  applyPlan: () => void;
  applyChange: (changeId: string) => void;
  undoPlan: () => void;

  openInvite: () => void;
  closeInvite: () => void;
  sendInvite: (email: string) => void;
  addIdea: (idea: Omit<Idea, "id">) => void;
  queueChatShare: (share: ChatShare) => void;
  clearChatShare: () => void;

  showToast: (message: string, tone?: "info" | "success" | "warning") => void;
  clearToast: () => void;
  resetTrip: () => void;
  leaveTrip: (successorId: string) => void;
  updatePrefs: (patch: Partial<PlannerPrefs>) => void;
  updateTripMeta: (patch: TripMetaPatch) => void;
}

/* -------------------------------------------------------------------------- */
/* Seed normalisation                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Seed data is authored with a real UTC offset for readability; the planner
 * works in destination wall-clock time. Normalise once on load so no other
 * code has to think about it.
 */
function normaliseTrip(trip: Trip): Trip {
  return {
    ...trip,
    startDate: toWallClock(trip.startDate),
    endDate: toWallClock(trip.endDate),
    coverImage:
      trip.coverImage === null
        ? null
        : resolveTripCover(trip.coverImage, trip.destinationId),
    items: trip.items.map((item) =>
      migrateItemComments({
        ...item,
        start: item.start ? toWallClock(item.start) : null,
        end: item.end ? toWallClock(item.end) : null,
      }),
    ),
  };
}

let idCounter = 0;
function newId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter.toString(36)}-${prefix.length}`;
}

const DEFAULT_DURATION = 90;

function draftFromItem(item: ItineraryItem): EditorDraft {
  const start = item.start ?? `${dayKey(new Date())}T10:00:00`;
  const origin =
    item.commute?.fromPlace ?? (item.kind === "commute" ? item.place : null);
  const destination = item.commute?.toPlace ?? null;
  return {
    id: item.id,
    kind: item.kind,
    category: item.category,
    title: item.title,
    subtitle: item.subtitle ?? "",
    placeId: null,
    placeName: destination?.name ?? (item.kind === "commute" ? "" : item.place?.name ?? ""),
    placeAddress:
      destination?.address ?? (item.kind === "commute" ? "" : item.place?.address ?? ""),
    placeCoords:
      destination?.coords ?? (item.kind === "commute" ? null : item.place?.coords ?? null),
    fromPlaceId: null,
    fromPlaceName: origin?.name ?? "",
    fromPlaceAddress: origin?.address ?? "",
    fromPlaceCoords: origin?.coords ?? null,
    day: dayKey(start),
    endDay: item.end ? dayKey(item.end) : dayKey(start),
    startMinutes: parseWall(start).getHours() * 60 + parseWall(start).getMinutes(),
    durationMin:
      item.start && item.end ? durationMinutes(item.start, item.end) : DEFAULT_DURATION,
    flexible: item.flexible,
    assignedTo: [...item.assignedTo],
    booking: item.booking ?? "",
    commuteMode: item.commute?.mode ?? "walk",
    comment: "",
  };
}

function placeFromDraft(
  name: string,
  address: string,
  coords: { lng: number; lat: number } | null,
): Place | null {
  if (!name || !coords) return null;
  return { name, address, coords };
}

function itemFromDraft(
  draft: EditorDraft,
  createdBy: string,
  previous?: ItineraryItem,
): ItineraryItem {
  const lodging = draft.kind === "stay";
  const checkOut = draft.endDay > draft.day ? draft.endDay : shiftDayKey(draft.day, 1);
  const start = lodging
    ? atMinutes(draft.day, 15 * 60)
    : atMinutes(draft.day, draft.startMinutes);
  const end = lodging
    ? atMinutes(checkOut, 11 * 60)
    : atMinutes(draft.day, draft.startMinutes + draft.durationMin);
  const fromPlace = placeFromDraft(
    draft.fromPlaceName,
    draft.fromPlaceAddress,
    draft.fromPlaceCoords,
  );
  const toPlace = placeFromDraft(draft.placeName, draft.placeAddress, draft.placeCoords);
  const title =
    draft.title.trim() ||
    (draft.kind === "commute" && fromPlace && toPlace
      ? `${fromPlace.name} to ${toPlace.name}`
      : "Untitled");
  const thought = draft.comment.trim();
  const comments =
    previous?.comments ??
    (thought ? [{ from: createdBy, text: thought }] : undefined);

  return {
    id: draft.id ?? newId("item"),
    kind: draft.kind,
    category: draft.category,
    title,
    subtitle: draft.subtitle.trim() || undefined,
    place: draft.kind === "commute" ? toPlace ?? fromPlace : toPlace,
    start,
    end,
    comments,
    flexible: lodging ? false : draft.flexible,
    assignedTo: draft.assignedTo,
    createdBy: previous?.createdBy ?? createdBy,
    costUsd: previous?.costUsd,
    booking: draft.booking.trim() || undefined,
    commute:
      draft.kind === "commute"
        ? {
            mode: draft.commuteMode,
            minutes: Math.max(1, draft.durationMin),
            distanceKm: previous?.commute?.distanceKm ?? 0,
            fromItemId: previous?.commute?.fromItemId ?? "",
            toItemId: previous?.commute?.toItemId ?? "",
            fromPlace: fromPlace ?? undefined,
            toPlace: toPlace ?? undefined,
          }
        : undefined,
  };
}

/* -------------------------------------------------------------------------- */
/* Store                                                                     */
/* -------------------------------------------------------------------------- */

export function makeTripStore(seed: Trip = NYC_TRIP) {
  const trip = normaliseTrip(seed);
  const days = tripDayKeys(trip);
  let toastId = 0;

  return createStore<TripState>()(
    persist(
      (set, get) => ({
        trip,
        activeDay: days[0],
        view: "week",
        selectedItemId: null,
        selectionSource: null,
        hoveredItemId: null,
        draggingId: null,
        editor: { open: false, mode: "create", draft: null },
        assistant: { open: false, plan: null, choices: null, lastChoices: null, applied: [], undoTrip: null, focusItemId: null, appliedNote: null },
        invite: { open: false, sent: [] },
        toast: null,
        pendingChatShare: null,
        prefs: { ...DEFAULT_PLANNER_PREFS },
        commentSeen: {},

        setActiveDay: (activeDay) =>
          set((state) => {
            const selected = state.trip.items.find((item) => item.id === state.selectedItemId);
            const staysOnDay = selected?.start
              ? dayKey(selected.start) === activeDay
              : false;
            return {
              activeDay,
              selectedItemId: staysOnDay ? state.selectedItemId : null,
              selectionSource: staysOnDay ? state.selectionSource : null,
            };
          }),

        setView: (view) => set({ view }),

        openDayView: (day) =>
          set((state) => {
            const selected = state.trip.items.find(
              (item) => item.id === state.selectedItemId,
            );
            const staysOnDay = selected?.start
              ? dayKey(selected.start) === day
              : false;
            return {
              activeDay: day,
              view: "day" as const,
              selectedItemId: staysOnDay ? state.selectedItemId : null,
              selectionSource: staysOnDay ? state.selectionSource : null,
            };
          }),

        selectItem: (selectedItemId, selectionSource = "calendar") => {
          const state = get();
          // Selecting from the map should pull the calendar to the right day.
          const item = state.trip.items.find((i) => i.id === selectedItemId);
          const activeDay =
            item?.start && dayKey(item.start) !== state.activeDay
              ? dayKey(item.start)
              : state.activeDay;
          set({ selectedItemId, selectionSource, activeDay });
        },

        hoverItem: (hoveredItemId) => set({ hoveredItemId }),
        setDragging: (draggingId) => set({ draggingId }),

        moveItem: (id, day, startMinutes) => {
          const state = get();
          const item = state.trip.items.find((i) => i.id === id);
          if (!item?.start || !item.end) return;

          const duration = durationMinutes(item.start, item.end);
          const snapped = Math.max(0, Math.min(24 * 60 - duration, startMinutes));

          set({
            trip: {
              ...state.trip,
              items: state.trip.items.map((i) =>
                i.id === id
                  ? {
                      ...i,
                      start: atMinutes(day, snapped),
                      end: atMinutes(day, snapped + duration),
                    }
                  : i,
              ),
            },
          });
        },

        resizeItem: (id, durationMin) => {
          const state = get();
          const item = state.trip.items.find((i) => i.id === id);
          if (!item?.start) return;

          const clamped = Math.max(15, Math.min(12 * 60, durationMin));
          const startMinutes =
            parseWall(item.start).getHours() * 60 + parseWall(item.start).getMinutes();

          set({
            trip: {
              ...state.trip,
              items: state.trip.items.map((i) =>
                i.id === id
                  ? { ...i, end: atMinutes(dayKey(item.start!), startMinutes + clamped) }
                  : i,
              ),
            },
          });
        },

        deleteItem: (id) => {
          const state = get();
          const item = state.trip.items.find((i) => i.id === id);
          set({
            trip: {
              ...state.trip,
              // Drop commutes that referenced the removed item, too.
              items: state.trip.items.filter(
                (i) =>
                  i.id !== id &&
                  i.commute?.fromItemId !== id &&
                  i.commute?.toItemId !== id,
              ),
            },
            selectedItemId: null,
            editor: { open: false, mode: "create", draft: null },
          });
          get().showToast(`Removed “${item?.title ?? "item"}”`, "info");
        },

        unschedule: (id) => {
          const state = get();
          const item = state.trip.items.find((i) => i.id === id);
          if (!item) return;

          const idea: Idea = {
            id: newId("idea"),
            category: item.category,
            title: item.title,
            subtitle: item.subtitle,
            place: item.place,
            durationMin:
              item.start && item.end ? durationMinutes(item.start, item.end) : DEFAULT_DURATION,
            reason: "Moved out of the schedule — drop it back in whenever.",
            addedBy: item.createdBy,
            costUsd: item.costUsd,
          };

          set({
            trip: {
              ...state.trip,
              items: state.trip.items.filter((i) => i.id !== id),
              ideas: [idea, ...state.trip.ideas],
            },
            selectedItemId: null,
          });
          get().showToast(`“${item.title}” moved to Ideas`, "info");
        },

        scheduleIdea: (ideaId, day, startMinutes) => {
          const state = get();
          const idea = state.trip.ideas.find((i) => i.id === ideaId);
          if (!idea) return;

          const snapped = Math.max(
            0,
            Math.min(24 * 60 - idea.durationMin, startMinutes),
          );
          const created: ItineraryItem = {
            id: newId("item"),
            kind: "activity",
            category: idea.category,
            title: idea.title,
            subtitle:
              idea.subtitle ??
              (idea.when && idea.when !== "flexible"
                ? IDEA_WHEN_LABELS[idea.when]
                : undefined),
            place: idea.place,
            start: atMinutes(day, snapped),
            end: atMinutes(day, snapped + idea.durationMin),
            comments: commentsFromText(
              idea.addedBy === "assistant" ? "assistant" : idea.addedBy,
              idea.reason,
            ),
            flexible: true,
            assignedTo: [],
            createdBy: idea.addedBy === "assistant" ? "assistant" : idea.addedBy,
            costUsd: idea.costUsd,
          };

          set({
            trip: {
              ...state.trip,
              items: [...state.trip.items, created],
              ideas: state.trip.ideas.filter((i) => i.id !== ideaId),
            },
            selectedItemId: created.id,
            selectionSource: "calendar",
            activeDay: day,
            draggingId: null,
          });
          get().showToast(`Added “${idea.title}”`, "success");
        },

        duplicateItem: (id) => {
          const state = get();
          const item = state.trip.items.find((i) => i.id === id);
          if (!item?.start || !item.end) return;

          const duration = durationMinutes(item.start, item.end);
          const copy: ItineraryItem = {
            ...item,
            id: newId("item"),
            title: `${item.title} (copy)`,
            start: item.end,
            end: formatWall(
              new Date(parseWall(item.end).getTime() + duration * 60_000),
            ),
          };

          set({
            trip: { ...state.trip, items: [...state.trip.items, copy] },
            selectedItemId: copy.id,
          });
        },

        /**
         * Toggle one traveller on or off an activity.
         *
         * An empty `assignedTo` means "everyone", and every chip renders as
         * selected in that state. A naive toggle then ADDED the clicked
         * person — leaving the chip still selected and looking like the click
         * did nothing. So a click while "everyone" is implied is read as the
         * only thing it can sensibly mean: everyone EXCEPT this person.
         *
         * Removing the last remaining traveller returns the item to
         * "everyone" rather than leaving it assigned to nobody.
         */
        toggleAssignee: (itemId, travellerId) => {
          const state = get();
          const everyone = partyTravellers(state.trip.travellers).map((t) => t.id);

          set({
            trip: {
              ...state.trip,
              items: state.trip.items.map((i) => {
                if (i.id !== itemId) return i;

                const current =
                  i.assignedTo.length === 0 ? everyone : i.assignedTo;
                const next = current.includes(travellerId)
                  ? current.filter((t) => t !== travellerId)
                  : [...current, travellerId];

                return {
                  ...i,
                  // Nobody assigned, or everybody assigned, both mean "everyone".
                  assignedTo:
                    next.length === 0 || next.length === everyone.length
                      ? []
                      : next,
                };
              }),
            },
          });
        },

        addItemComment: (itemId, text, fromId) => {
          const trimmed = text.trim();
          if (!trimmed) return;
          const state = get();
          const author =
            state.trip.travellers.find((person) => person.id === fromId)?.id ??
            state.trip.travellers.find((person) => person.role === "owner")?.id ??
            state.trip.travellers[0]?.id;
          if (!author) return;

          const nextItems = state.trip.items.map((item) => {
            if (item.id !== itemId) return item;
            return {
              ...item,
              comments: [...(item.comments ?? []), { from: author, text: trimmed }],
            };
          });
          const nextCount =
            nextItems.find((item) => item.id === itemId)?.comments?.length ?? 0;

          set({
            trip: {
              ...state.trip,
              items: nextItems,
            },
            commentSeen: { ...state.commentSeen, [itemId]: nextCount },
          });
        },

        markItemCommentsSeen: (itemId) => {
          const state = get();
          const count =
            state.trip.items.find((item) => item.id === itemId)?.comments?.length ?? 0;
          if (state.commentSeen[itemId] === count) return;
          set({
            commentSeen: { ...state.commentSeen, [itemId]: count },
          });
        },

        setTravellerRole: (travellerId, role) => {
          const state = get();
          const target = state.trip.travellers.find((t) => t.id === travellerId);
          if (!target || target.role === "owner") return;
          if (role === "owner") return;

          set({
            trip: {
              ...state.trip,
              travellers: state.trip.travellers.map((t) =>
                t.id === travellerId ? { ...t, role } : t,
              ),
            },
          });
          get().showToast(`Updated ${target.name.split(" ")[0]}'s role`, "success");
        },

        removeTraveller: (travellerId) => {
          const state = get();
          const target = state.trip.travellers.find((t) => t.id === travellerId);
          if (!target || target.role === "owner") return;
          if (state.trip.travellers.length <= 1) return;

          set({
            trip: {
              ...state.trip,
              travellers: state.trip.travellers.filter((t) => t.id !== travellerId),
              items: state.trip.items.map((item) => ({
                ...item,
                assignedTo: item.assignedTo.filter((id) => id !== travellerId),
              })),
            },
          });
          get().showToast(`${target.name.split(" ")[0]} left the trip`, "info");
        },

        openCreate: (seed) => {
          const state = get();
          const day = seed?.day ?? state.activeDay;
          set({
            activeDay: day,
            editor: {
              open: true,
              mode: "create",
              draft: {
                id: null,
                kind: "activity",
                category: "nightlife",
                title: "",
                subtitle: "",
                placeId: null,
                placeName: "",
                placeAddress: "",
                placeCoords: null,
                fromPlaceId: null,
                fromPlaceName: "",
                fromPlaceAddress: "",
                fromPlaceCoords: null,
                day,
                endDay: seed?.endDay ?? day,
                startMinutes: 10 * 60,
                durationMin: state.prefs.defaultDurationMin,
                flexible: true,
                assignedTo: [],
                booking: "",
                commuteMode: "walk",
                comment: "",
                ...seed,
              },
            },
          });
        },

        openEdit: (id) => {
          const state = get();
          const item = state.trip.items.find((i) => i.id === id);
          if (!item) return;
          set({
            editor: { open: true, mode: "edit", draft: draftFromItem(item) },
            selectedItemId: id,
          });
        },

        closeEditor: () =>
          set({ editor: { open: false, mode: "create", draft: null } }),

        updateDraft: (patch) => {
          const { editor } = get();
          if (!editor.draft) return;
          set({ editor: { ...editor, draft: { ...editor.draft, ...patch } } });
        },

        commitDraft: (incoming) => {
          const state = get();
          const draft = incoming ?? state.editor.draft;
          if (!draft) return;

          const owner =
            state.trip.travellers.find((t) => t.role === "owner")?.id ??
            state.trip.travellers[0].id;
          const actor = commentViewerId(state.trip.travellers, ACCOUNT_USER.id) || owner;
          const previous = state.trip.items.find((entry) => entry.id === draft.id);
          const item = itemFromDraft(draft, previous ? (previous.createdBy ?? owner) : actor, previous);

          const exists = state.trip.items.some((i) => i.id === item.id);
          set({
            trip: {
              ...state.trip,
              items: exists
                ? state.trip.items.map((i) => (i.id === item.id ? item : i))
                : [...state.trip.items, item],
            },
            editor: { open: false, mode: "create", draft: null },
            selectedItemId: item.id,
            selectionSource: "calendar",
            activeDay: draft.day,
          });
          get().showToast(
            exists ? `Updated “${item.title}”` : `Added “${item.title}”`,
            "success",
          );
        },

        requestPlan: (intent) => {
          const state = get();
          const selected =
            state.trip.items.find((item) => item.id === state.selectedItemId) ?? null;
          const choices = choiceSetForIntent(
            state.trip,
            state.activeDay,
            intent,
            selected,
          );
          if (choices) {
            set({
              assistant: {
                ...state.assistant,
                open: true,
                plan: null,
                choices,
                applied: [],
              },
            });
            return;
          }
          const canned: Partial<Record<AssistantPlan["intent"], string>> = {
            "nearby-dinner": "add dinner near my last stop",
            "reduce-travel": "reduce travel time",
            replace: "replace this with something outdoors",
            alternatives: "give me three alternatives",
            remove: "remove one activity so the day feels easier",
            move: "move this later",
          };
          const plan =
            buildPlan(state.trip, state.activeDay, intent) ??
            (intent === "nearby-dinner"
              ? nearbyDinnerPlan(state.trip, state.activeDay)
              : intent === "reduce-travel"
                ? reduceTravelPlan(state.trip, state.activeDay)
                : planFromUtterance(
                    state.trip,
                    state.activeDay,
                    canned[intent] ?? intent,
                    state.selectedItemId,
                  ));
          if (!plan) {
            get().showToast("Nothing to change on this day", "info");
            return;
          }
          const focusItemId =
            plan.changes.find((change) => change.create)?.create?.id ??
            plan.changes.find((change) => change.itemId)?.itemId ??
            state.assistant.focusItemId;
          set({
            assistant: {
              ...state.assistant,
              open: true,
              plan,
              choices: null,
              applied: [],
              focusItemId,
            },
          });
        },

        requestFromText: (text) => {
          const state = get();
          const selectedId = state.selectedItemId ?? state.assistant.focusItemId;
          const choices = choicesFromUtterance(
            state.trip,
            state.activeDay,
            text,
            selectedId,
          );
          if (choices) {
            set({
              assistant: {
                ...state.assistant,
                open: true,
                plan: null,
                choices,
                applied: [],
              },
            });
            return "choices";
          }
          const plan = planFromUtterance(
            state.trip,
            state.activeDay,
            text,
            selectedId,
          );
          if (!plan) return false;
          const focusItemId =
            plan.changes.find((change) => change.create)?.create?.id ??
            plan.changes.find((change) => change.itemId)?.itemId ??
            state.assistant.focusItemId;
          set({
            assistant: {
              ...state.assistant,
              open: true,
              plan,
              choices: null,
              applied: [],
              focusItemId,
            },
          });
          return "plan";
        },

        chooseAssistantIdea: (ideaId) => {
          const state = get();
          const setChoices = state.assistant.choices;
          if (!setChoices) return false;
          const selected =
            state.trip.items.find((item) => item.id === state.selectedItemId) ?? null;
          const plan = planFromChoice(
            state.trip,
            state.activeDay,
            setChoices,
            ideaId,
            selected,
          );
          if (!plan) return false;
          const focusItemId =
            plan.changes.find((change) => change.create)?.create?.id ??
            plan.changes.find((change) => change.itemId)?.itemId ??
            state.assistant.focusItemId;
          set({
            assistant: {
              ...state.assistant,
              open: true,
              plan,
              choices: null,
              lastChoices: setChoices,
              applied: [],
              focusItemId,
            },
          });
          return true;
        },

        dismissPlan: () =>
          set({
            assistant: {
              ...get().assistant,
              open: true,
              plan: null,
              choices: get().assistant.lastChoices,
              applied: [],
            },
          }),

        applyPlan: () => {
          const { assistant, trip } = get();
          if (!assistant.plan) return;
          const pending = assistant.plan.changes.filter(
            (change) => !assistant.applied.includes(change.id),
          );
          const next = applyPlanChanges(trip, pending);
          const count = assistant.plan.changes.length;
          const focusItemId =
            pending.find((change) => change.create)?.create?.id ??
            pending.find((change) => change.itemId)?.itemId ??
            assistant.focusItemId;
          const appliedNote = {
            id: `applied-${Date.now()}`,
            title: "Trip updated",
            lines: assistant.plan.changes.map((change) => change.summary),
          };
          set({
            trip: next,
            selectedItemId: focusItemId,
            assistant: {
              open: true,
              plan: null,
              choices: null,
              lastChoices: null,
              applied: [],
              undoTrip: trip,
              focusItemId,
              appliedNote,
            },
          });
          get().showToast(
            `Applied ${count} ${count === 1 ? "change" : "changes"} · Undo available`,
            "success",
          );
        },

        undoPlan: () => {
          const previous = get().assistant.undoTrip;
          if (!previous) {
            get().showToast("Nothing to undo", "info");
            return;
          }
          set({
            trip: previous,
            assistant: {
              ...get().assistant,
              open: true,
              plan: null,
              choices: null,
              applied: [],
              undoTrip: null,
              focusItemId: null,
              appliedNote: {
                id: `undo-${Date.now()}`,
                title: "Restored the previous trip",
                lines: ["The last Ask AI apply was undone."],
              },
            },
          });
          get().showToast("Restored the previous trip", "success");
        },

        applyChange: (changeId) => {
          const state = get();
          const plan = state.assistant.plan;
          if (!plan) return;

          const change = plan.changes.find((c) => c.id === changeId);
          if (!change || state.assistant.applied.includes(changeId)) return;

          const undoTrip = state.assistant.undoTrip ?? state.trip;
          let items = state.trip.items;

          if (change.kind === "add" && change.create) {
            items = [...items, change.create];
          } else if (change.itemId && change.patch) {
            items = items.map((i) =>
              i.id === change.itemId ? { ...i, ...change.patch } : i,
            );
          } else if (change.kind === "remove" && change.itemId) {
            // The assistant never destroys anything: "remove" means unschedule
            // back onto the Ideas list, which stays reversible.
            const target = items.find((i) => i.id === change.itemId);
            if (target) {
              set({
                trip: {
                  ...state.trip,
                  items: items.filter((i) => i.id !== change.itemId),
                  ideas: [
                    {
                      id: newId("idea"),
                      category: target.category,
                      title: target.title,
                      subtitle: target.subtitle,
                      place: target.place,
                      durationMin:
                        target.start && target.end
                          ? durationMinutes(target.start, target.end)
                          : DEFAULT_DURATION,
                      reason:
                        "Taken off the schedule to clear a clash — drop it back in whenever there's room.",
                      addedBy: "assistant",
                      costUsd: target.costUsd,
                    },
                    ...state.trip.ideas,
                  ],
                },
                assistant: {
                  ...state.assistant,
                  applied: [...state.assistant.applied, changeId],
                  undoTrip,
                },
              });
              return;
            }
            items = items.filter((i) => i.id !== change.itemId);
          }

          set({
            trip: { ...state.trip, items },
            assistant: {
              ...state.assistant,
              applied: [...state.assistant.applied, changeId],
              undoTrip,
            },
          });
        },

        openInvite: () => set({ invite: { ...get().invite, open: true } }),
        closeInvite: () => set({ invite: { ...get().invite, open: false } }),

        sendInvite: (email) => {
          const state = get();
          const name = email
            .split("@")[0]
            .split(/[._-]/)
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(" ");

          const traveller: Traveller = {
            id: newId("who"),
            name: name || email,
            initials: (name || email).slice(0, 2).toUpperCase(),
            colorIndex: state.trip.travellers.length % 6,
            role: "editor",
            online: false,
          };

          set({
            trip: {
              ...state.trip,
              travellers: [...state.trip.travellers, traveller],
            },
            invite: { open: false, sent: [...state.invite.sent, email] },
          });
          get().showToast(`Invited ${traveller.name}`, "success");
        },

        addIdea: (idea) => {
          const state = get();
          set({
            trip: {
              ...state.trip,
              ideas: [{ ...idea, id: newId("idea") }, ...state.trip.ideas],
            },
          });
        },

        queueChatShare: (pendingChatShare) => set({ pendingChatShare }),
        clearChatShare: () => set({ pendingChatShare: null }),

        showToast: (message, tone = "info") => {
          toastId += 1;
          set({ toast: { id: toastId, message, tone } });
        },

        clearToast: () => set({ toast: null }),

        resetTrip: () => {
          const fresh = normaliseTrip(seed);
          set({
            trip: fresh,
            activeDay: tripDayKeys(fresh)[0],
            selectedItemId: null,
            selectionSource: null,
            hoveredItemId: null,
            editor: { open: false, mode: "create", draft: null },
            assistant: { open: false, plan: null, choices: null, lastChoices: null, applied: [], undoTrip: null, focusItemId: null, appliedNote: null },
            prefs: { ...DEFAULT_PLANNER_PREFS },
            commentSeen: {},
          });
          get().showToast("Trip reset to the original plan", "info");
        },

        leaveTrip: (successorId) => {
          const state = get();
          const me =
            state.trip.travellers.find((person) => person.role === "owner") ??
            state.trip.travellers[0];
          const successor = state.trip.travellers.find(
            (person) => person.id === successorId,
          );
          if (!me || !successor || successor.id === me.id) return;

          set({
            trip: {
              ...state.trip,
              travellers: state.trip.travellers
                .filter((person) => person.id !== me.id)
                .map((person) =>
                  person.id === successorId
                    ? { ...person, role: "owner" as const }
                    : person,
                ),
              items: state.trip.items.map((item) => ({
                ...item,
                assignedTo: item.assignedTo.filter((id) => id !== me.id),
              })),
            },
          });
          get().showToast(
            `${successor.name.split(" ")[0]} is now the organiser`,
            "success",
          );
        },

        updatePrefs: (patch) =>
          set((state) => {
            const prefs = { ...state.prefs, ...patch };
            if (prefs.dayEndHour <= prefs.dayStartHour + 3) {
              prefs.dayEndHour = Math.min(24, prefs.dayStartHour + 4);
            }
            if (prefs.dayStartHour >= prefs.dayEndHour) {
              prefs.dayStartHour = Math.max(5, prefs.dayEndHour - 4);
            }
            return { prefs };
          }),

        updateTripMeta: (patch) => {
          const state = get();
          const startDate = patch.startDate ?? state.trip.startDate;
          const endDate = patch.endDate ?? state.trip.endDate;
          if (startDate > endDate) return;

          const trip: Trip = {
            ...state.trip,
            ...patch,
            startDate,
            endDate,
            items: state.trip.items.map((item) => {
              if (item.kind !== "stay" || !item.start || !item.end) return item;
              return {
                ...item,
                start: `${startDate}T${item.start.slice(11)}`,
                end: `${endDate}T${item.end.slice(11)}`,
              };
            }),
          };
          const days = tripDayKeys(trip);
          const activeDay = days.includes(state.activeDay) ? state.activeDay : days[0];
          set({ trip, activeDay });
        },
      }),
      {
        name: `intripid.trip.v3.${seed.id}`,
        // Only the itinerary survives a refresh. UI focus should not.
        partialize: (state) => ({
          trip: state.trip,
          view: state.view,
          prefs: state.prefs,
          commentSeen: state.commentSeen,
        }),
        // Rehydrate manually after mount so SSR markup and the first client
        // render agree — otherwise persisted edits cause a hydration mismatch.
        skipHydration: true,
        merge: (persisted, current) => {
          try {
            const saved = (persisted ?? {}) as Partial<TripState>;
            const savedTrip = saved.trip;
            const canUseSaved = Boolean(savedTrip?.items && savedTrip.travellers);
            const thinner =
              canUseSaved &&
              seed.id !== DRAFT_TRIP_ID &&
              savedTrip &&
              (savedTrip.items.filter((item) => item.kind === "activity").length <
                seed.items.filter((item) => item.kind === "activity").length ||
                savedTrip.travellers.length < seed.travellers.length);
            const seedOwnerId =
              seed.travellers.find((person) => person.role === "owner")?.id ??
              null;
            const savedOwnerId =
              savedTrip?.travellers.find((person) => person.role === "owner")
                ?.id ?? null;
            const stale =
              savedTrip &&
              (savedTrip.id !== seed.id ||
                savedTrip.destinationId !== seed.destinationId ||
                thinner ||
                (seedOwnerId && seedOwnerId !== savedOwnerId) ||
                (seed.id === DRAFT_TRIP_ID &&
                  (savedTrip.startDate !== seed.startDate ||
                    savedTrip.endDate !== seed.endDate)));
            const usable = !canUseSaved || stale ? undefined : savedTrip;
            const seedById = new Map(
              seed.travellers.map((person) => [person.id, person] as const),
            );
            const trip = usable
              ? normaliseTrip({
                  ...usable,
                  travellers: usable.travellers.map((person) => {
                    const fromSeed = seedById.get(person.id);
                    if (!fromSeed) return person;
                    return {
                      ...person,
                      initials: fromSeed.initials,
                      photoUrl: fromSeed.photoUrl,
                      colorIndex: fromSeed.colorIndex,
                      ...(fromSeed.role === "advisor"
                        ? { online: fromSeed.online, role: fromSeed.role }
                        : {}),
                    };
                  }),
                })
              : usable;
            return {
              ...current,
              ...saved,
              trip: trip ?? current.trip,
              prefs: { ...DEFAULT_PLANNER_PREFS, ...saved.prefs },
              commentSeen: saved.commentSeen ?? current.commentSeen,
            };
          } catch {
            return current;
          }
        },
      },
    ),
  );
}

const context = createStoreContext<TripState>("TripStore");

export function TripStoreProvider({
  trip,
  children,
}: {
  trip: Trip;
  children: ReactNode;
}) {
  return (
    <context.Provider createStore={() => makeTripStore(trip)}>
      {children}
    </context.Provider>
  );
}

export const useTrip = context.useStoreSelector;
export const useTripApi = context.useStoreApi;

/** Day keys for the active trip. */
export function selectDays(state: TripState): string[] {
  return tripDayKeys(state.trip);
}

export function selectSelectedItem(state: TripState): ItineraryItem | null {
  if (!state.selectedItemId) return null;
  return state.trip.items.find((i) => i.id === state.selectedItemId) ?? null;
}

export { moveToDay };
