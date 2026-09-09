"use client";

import type { ReactNode } from "react";
import { persist } from "zustand/middleware";
import { createStore } from "zustand/vanilla";

import { NYC_TRIP } from "@/data/nyc-trip";
import { buildPlan } from "@/lib/trip/assistant";
import { tripDayKeys } from "@/lib/trip/schedule";
import {
  atMinutes,
  dayKey,
  durationMinutes,
  formatWall,
  moveToDay,
  parseWall,
  toWallClock,
} from "@/lib/trip/time";
import type {
  AssistantPlan,
  Idea,
  ItemCategory,
  ItineraryItem,
  Trip,
  Traveller,
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

export type PlannerView = "calendar" | "itinerary";

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
  day: string;
  startMinutes: number;
  durationMin: number;
  notes: string;
  flexible: boolean;
  assignedTo: string[];
}

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
  assistant: { open: boolean; plan: AssistantPlan | null; applied: string[] };
  invite: { open: boolean; sent: string[] };
  /** Transient confirmations, e.g. "Moved to Thursday 2:00 PM". */
  toast: { id: number; message: string; tone: "info" | "success" | "warning" } | null;

  setActiveDay: (day: string) => void;
  setView: (view: PlannerView) => void;
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

  openCreate: (seed?: Partial<EditorDraft>) => void;
  openEdit: (id: string) => void;
  closeEditor: () => void;
  updateDraft: (patch: Partial<EditorDraft>) => void;
  commitDraft: () => void;

  requestPlan: (intent: AssistantPlan["intent"]) => void;
  dismissPlan: () => void;
  applyPlan: () => void;
  applyChange: (changeId: string) => void;

  openInvite: () => void;
  closeInvite: () => void;
  sendInvite: (email: string) => void;
  addIdea: (idea: Omit<Idea, "id">) => void;

  showToast: (message: string, tone?: "info" | "success" | "warning") => void;
  clearToast: () => void;
  resetTrip: () => void;
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
    items: trip.items.map((item) => ({
      ...item,
      start: item.start ? toWallClock(item.start) : null,
      end: item.end ? toWallClock(item.end) : null,
    })),
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
  return {
    id: item.id,
    kind: item.kind,
    category: item.category,
    title: item.title,
    subtitle: item.subtitle ?? "",
    placeId: null,
    placeName: item.place?.name ?? "",
    placeAddress: item.place?.address ?? "",
    placeCoords: item.place?.coords ?? null,
    day: dayKey(start),
    startMinutes: parseWall(start).getHours() * 60 + parseWall(start).getMinutes(),
    durationMin:
      item.start && item.end ? durationMinutes(item.start, item.end) : DEFAULT_DURATION,
    notes: item.notes ?? "",
    flexible: item.flexible,
    assignedTo: [...item.assignedTo],
  };
}

function itemFromDraft(draft: EditorDraft, createdBy: string): ItineraryItem {
  const start = atMinutes(draft.day, draft.startMinutes);
  const end = atMinutes(draft.day, draft.startMinutes + draft.durationMin);

  return {
    id: draft.id ?? newId("item"),
    kind: draft.kind,
    category: draft.category,
    title: draft.title.trim() || "Untitled",
    subtitle: draft.subtitle.trim() || undefined,
    place:
      draft.placeName && draft.placeCoords
        ? {
            name: draft.placeName,
            address: draft.placeAddress,
            coords: draft.placeCoords,
          }
        : null,
    start,
    end,
    notes: draft.notes.trim() || undefined,
    flexible: draft.flexible,
    assignedTo: draft.assignedTo,
    createdBy,
  };
}

/* -------------------------------------------------------------------------- */
/* Store                                                                     */
/* -------------------------------------------------------------------------- */

export function makeTripStore() {
  const trip = normaliseTrip(NYC_TRIP);
  const days = tripDayKeys(trip);
  let toastId = 0;

  return createStore<TripState>()(
    persist(
      (set, get) => ({
        trip,
        activeDay: days[0],
        view: "calendar",
        selectedItemId: null,
        selectionSource: null,
        hoveredItemId: null,
        draggingId: null,
        editor: { open: false, mode: "create", draft: null },
        assistant: { open: false, plan: null, applied: [] },
        invite: { open: false, sent: [] },
        toast: null,

        setActiveDay: (activeDay) =>
          set({ activeDay, selectedItemId: null, selectionSource: null }),

        setView: (view) => set({ view }),

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
            subtitle: idea.subtitle,
            place: idea.place,
            start: atMinutes(day, snapped),
            end: atMinutes(day, snapped + idea.durationMin),
            notes: idea.reason,
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

        toggleAssignee: (itemId, travellerId) => {
          const state = get();
          set({
            trip: {
              ...state.trip,
              items: state.trip.items.map((i) =>
                i.id === itemId
                  ? {
                      ...i,
                      assignedTo: i.assignedTo.includes(travellerId)
                        ? i.assignedTo.filter((t) => t !== travellerId)
                        : [...i.assignedTo, travellerId],
                    }
                  : i,
              ),
            },
          });
        },

        openCreate: (seed) => {
          const state = get();
          set({
            editor: {
              open: true,
              mode: "create",
              draft: {
                id: null,
                kind: "activity",
                category: "sightseeing",
                title: "",
                subtitle: "",
                placeId: null,
                placeName: "",
                placeAddress: "",
                placeCoords: null,
                day: state.activeDay,
                startMinutes: 10 * 60,
                durationMin: DEFAULT_DURATION,
                notes: "",
                flexible: true,
                assignedTo: [],
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

        commitDraft: () => {
          const state = get();
          const draft = state.editor.draft;
          if (!draft) return;

          const owner =
            state.trip.travellers.find((t) => t.role === "owner")?.id ??
            state.trip.travellers[0].id;
          const item = itemFromDraft(draft, owner);

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
          const plan = buildPlan(state.trip, state.activeDay, intent);
          if (!plan) {
            get().showToast("Nothing to change on this day", "info");
            return;
          }
          set({ assistant: { open: true, plan, applied: [] } });
        },

        dismissPlan: () =>
          set({ assistant: { open: false, plan: null, applied: [] } }),

        applyPlan: () => {
          const { assistant } = get();
          if (!assistant.plan) return;
          for (const change of assistant.plan.changes) {
            get().applyChange(change.id);
          }
          const count = assistant.plan.changes.length;
          set({ assistant: { open: false, plan: null, applied: [] } });
          get().showToast(
            `Applied ${count} ${count === 1 ? "change" : "changes"}`,
            "success",
          );
        },

        applyChange: (changeId) => {
          const state = get();
          const plan = state.assistant.plan;
          if (!plan) return;

          const change = plan.changes.find((c) => c.id === changeId);
          if (!change || state.assistant.applied.includes(changeId)) return;

          let items = state.trip.items;

          if (change.kind === "add" && change.create) {
            items = [...items, change.create];
          } else if (change.itemId && change.patch) {
            items = items.map((i) =>
              i.id === change.itemId ? { ...i, ...change.patch } : i,
            );
          } else if (change.kind === "remove" && change.itemId) {
            items = items.filter((i) => i.id !== change.itemId);
          }

          set({
            trip: { ...state.trip, items },
            assistant: {
              ...state.assistant,
              applied: [...state.assistant.applied, changeId],
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

        showToast: (message, tone = "info") => {
          toastId += 1;
          set({ toast: { id: toastId, message, tone } });
        },

        clearToast: () => set({ toast: null }),

        resetTrip: () => {
          const fresh = normaliseTrip(NYC_TRIP);
          set({
            trip: fresh,
            activeDay: tripDayKeys(fresh)[0],
            selectedItemId: null,
            selectionSource: null,
            hoveredItemId: null,
            editor: { open: false, mode: "create", draft: null },
            assistant: { open: false, plan: null, applied: [] },
          });
          get().showToast("Trip reset to the original plan", "info");
        },
      }),
      {
        name: "intripid.trip.v1",
        // Only the itinerary survives a refresh. UI focus should not.
        partialize: (state) => ({ trip: state.trip, view: state.view }),
        // Rehydrate manually after mount so SSR markup and the first client
        // render agree — otherwise persisted edits cause a hydration mismatch.
        skipHydration: true,
      },
    ),
  );
}

const context = createStoreContext<TripState>("TripStore");

export function TripStoreProvider({ children }: { children: ReactNode }) {
  return <context.Provider createStore={makeTripStore}>{children}</context.Provider>;
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
