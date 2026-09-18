"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  List,
  MapPin,
  Maximize2,
  Menu,
  MessageCircle,
  Plus,
  Search,
  X,
} from "lucide-react";

import { AiMark } from "@/components/brand/ai-mark";

import { BackLink } from "@/components/nav/back-link";
import { MobileBack } from "@/components/nav/mobile-back";
import { resolveTripCover } from "@/data/place-photos";
import { NotificationsPanel } from "@/features/dashboard/notifications-panel";
import { Button, IconButton } from "@/components/ui/button";
import { Modal, Popover, Sheet, Toast } from "@/components/ui/overlay";
import { categoryMeta } from "@/lib/categories";
import { partyTravellers } from "@/lib/collaboration";
import { useIsCompact, useIsShort } from "@/lib/use-media-query";
import { useHideOnScroll } from "@/lib/use-hide-on-scroll";
import { cn } from "@/lib/utils";
import { offersForDay } from "@/lib/trip/assistant";
import {
  previewItemIds,
  tripWithPlanPreview,
} from "@/lib/trip/ai-actions";
import {
  gapsForDay,
  guestsForItem,
  summariseDay,
  tripDayKeys,
} from "@/lib/trip/schedule";
import {
  atMinutes,
  dateFromDayKey,
  dayLabel,
  durationLabel,
  durationMinutes,
  fourDayKeys,
  shiftDayKey,
  timeLabel,
  wallNow,
  weekDayKeys,
} from "@/lib/trip/time";
import {
  hoursCoveringRange,
  normalizePlannerView,
  overlayTravellerIds,
  selectSelectedItem,
  useTrip,
  useTripApi,
  type EditorDraft,
  type PlannerPrefs,
} from "@/stores/trip-store";
import type { Trip } from "@/lib/types";
import { selectUnreadCount, useSession, useSessionApi } from "@/stores/session-store";
import { useSwipe } from "@/lib/use-swipe";
import { motion } from "motion/react";

import { ActivityEditor } from "./activity-editor";
import { AskAiPanel } from "./assistant";
import { Calendar, DayRail, DAY_END_MIN, DAY_START_MIN, SNAP_MIN } from "./calendar";
import { InviteModal, TravellersPanel } from "./collaborators";
import { RolesPanel } from "./roles-panel";
import { EventCard } from "./event-card";
import {
  EventPeek,
  findCreateGhost,
  findDayTab,
  findEventAnchor,
  isNestedOverlay,
} from "./event-peek";
import { Itinerary } from "./itinerary";
import { MonthPicker } from "./month-picker";
import { PlannerMap } from "./planner-map";
import { PlannerAccount } from "./planner-account";
import { PlannerNav } from "./planner-nav";
import { TripChat } from "./trip-chat";
import { ViewMenu } from "./view-menu";
import { PlannerNotifications } from "./planner-notifications";
import { PlannerSettings, PlannerSettingsWorkspace } from "./planner-settings";
import {
  RailDock,
  RailMap,
  RailPanel,
  type RailDockAction,
} from "./rail";
import {
  ConfirmDeleteModal,
  HoursExpandModal,
  rememberSkipDeleteConfirm,
  shouldSkipDeleteConfirm,
  type ConfirmKind,
} from "./confirm-delete";
import { IdeasRail } from "./side-panel";

import editorStyles from "./activity-editor.module.css";
import styles from "./planner-experience.module.css";

/**
 * The Trip Planner.
 *
 * Composition: the schedule leads, and a persistent rail on the trailing edge
 * carries everything about it — the map for the day, the activity you have
 * selected, the ideas shelf, the advisor, and the people you are travelling
 * with. Nothing that matters lives in a modal over the day, and nothing that
 * matters is hidden behind a top-bar avatar stack.
 *
 * On mobile this becomes a single column with a collapsible map strip above
 * the day and the rail's sections redistributed into sheets, which fixes the
 * historical product's worst regression: on phones the map was demoted behind
 * a floating button and the map/schedule coupling was lost entirely.
 */

const HOUR_HEIGHT = 56;
const HOUR_HEIGHT_SHORT = 48;
/** GCal week on a phone is dense — events collapse to title-only chips. */
const HOUR_HEIGHT_COMPACT_WEEK = 36;
/** GCal 3-day is slightly taller; we keep 4-day in that band. */
const HOUR_HEIGHT_COMPACT_FOUR = 40;

type SettingsBaseline = {
  name: string;
  startDate: string;
  endDate: string;
  coverImage: string | null;
  prefs: PlannerPrefs;
};

function captureSettings(trip: Trip, prefs: PlannerPrefs): SettingsBaseline {
  return {
    name: trip.name,
    startDate: trip.startDate,
    endDate: trip.endDate,
    coverImage: trip.coverImage ?? null,
    prefs: { ...prefs, overlayIds: [...prefs.overlayIds] },
  };
}

function settingsDirty(
  baseline: SettingsBaseline,
  trip: Trip,
  prefs: PlannerPrefs,
) {
  return (
    baseline.name !== trip.name ||
    baseline.startDate !== trip.startDate ||
    baseline.endDate !== trip.endDate ||
    baseline.coverImage !== (trip.coverImage ?? null) ||
    JSON.stringify(baseline.prefs) !==
      JSON.stringify({ ...prefs, overlayIds: [...prefs.overlayIds] })
  );
}

function clockLabel(minutes: number, clock: PlannerPrefs["timeFormat"]) {
  const capped = Math.min(24 * 60, Math.max(0, minutes));
  if (capped === 24 * 60) return clock === "24h" ? "24:00" : "12:00 AM";
  return timeLabel(atMinutes("2000-01-01", capped), clock);
}

export function PlannerExperience() {
  const api = useTripApi();
  const isCompact = useIsCompact();
  const isShort = useIsShort();

  const committedTrip = useTrip((s) => s.trip);
  const assistant = useTrip((s) => s.assistant);
  const trip = useMemo(
    () => tripWithPlanPreview(committedTrip, assistant.plan, assistant.applied),
    [committedTrip, assistant.plan, assistant.applied],
  );
  const proposedIds = useMemo(
    () => previewItemIds(assistant.plan, assistant.applied),
    [assistant.plan, assistant.applied],
  );
  const prefs = useTrip((s) => s.prefs);
  const activeDay = useTrip((s) => s.activeDay);
  const rawView = useTrip((s) => s.view);
  const view = normalizePlannerView(rawView);
  const selectedItemId = useTrip((s) => s.selectedItemId);
  const hoveredItemId = useTrip((s) => s.hoveredItemId);
  const draggingId = useTrip((s) => s.draggingId);
  const editor = useTrip((s) => s.editor);
  const invite = useTrip((s) => s.invite);
  const toast = useTrip((s) => s.toast);
  const selectedItem = useTrip(selectSelectedItem);
  const coverSrc = resolveTripCover(trip.coverImage, trip.destinationId);

  /*
   * Map is the dock's home: it opens with the planner. Other tools replace it;
   * Close / Escape / a second click on the open tool bring the map back.
   * A second click on Map, or Map's own close, hides the rail entirely.
   */
  const [mobileView, setMobileView] = useState<"schedule" | "map" | "list">(
    "schedule",
  );
  const [mobileTool, setMobileTool] = useState<"map" | "chat" | "advisor" | null>(
    null,
  );
  const [advisorExpanded, setAdvisorExpanded] = useState(false);
  const [notificationsSheet, setNotificationsSheet] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState(0);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [dockPanel, setDockPanel] = useState<RailDockAction | null>("map");
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const chrome = useHideOnScroll(
    isCompact && !settingsOpen && !searchOpen && !navOpen && !mobileTool,
  );
  const [settingsBaseline, setSettingsBaseline] = useState<SettingsBaseline | null>(
    null,
  );
  const settingsHasChanges =
    settingsOpen &&
    settingsBaseline !== null &&
    settingsDirty(settingsBaseline, trip, prefs);

  useEffect(() => {
    chrome.reset();
  }, [activeDay, mobileView, chrome.reset]);

  const days = useMemo(() => tripDayKeys(trip), [trip]);
  const weekDays = useMemo(
    () => weekDayKeys(activeDay, prefs.weekStartsOn),
    [activeDay, prefs.weekStartsOn],
  );
  const accountId = useSession((s) => s.user?.id ?? null);
  const sessionApi = useSessionApi();
  const notifications = useSession((s) => s.notifications);
  const unreadCount = useSession(selectUnreadCount);
  const meId =
    trip.travellers.find((person) => person.id === accountId)?.id ?? null;
  const overlayIds = useMemo(
    () => overlayTravellerIds(prefs, trip.travellers, meId),
    [prefs, trip.travellers, meId],
  );
  const gridDays = useMemo(() => {
    if (view === "day") return [activeDay];
    if (view === "trip") return days;
    if (view === "four") return fourDayKeys(activeDay);
    if (!prefs.showWeekends) {
      return weekDays.filter((key) => {
        const weekday = dateFromDayKey(key).getDay();
        return weekday !== 0 && weekday !== 6;
      });
    }
    return weekDays;
  }, [view, activeDay, days, weekDays, prefs.showWeekends]);
  /*
   * Week / 4-day / trip: header matches the grid columns.
   * Itinerary and day view keep the full week strip so other dates stay
   * reachable — desktop used to collapse day view to a single full-width tab.
   */
  const railDays =
    view === "itinerary" || view === "day" || isCompact
      ? weekDays
      : gridDays;
  const onTripCanvas =
    view === "trip"
      ? true
      : view === "itinerary" || view === "day"
        ? days.includes(activeDay)
        : gridDays.some((day) => days.includes(day));
  const hourHeight = isCompact
    ? view === "four"
      ? HOUR_HEIGHT_COMPACT_FOUR
      : view === "week" || view === "trip"
        ? HOUR_HEIGHT_COMPACT_WEEK
        : isShort
          ? HOUR_HEIGHT_SHORT
          : HOUR_HEIGHT
    : isShort
      ? HOUR_HEIGHT_SHORT
      : HOUR_HEIGHT;
  const todayKey = wallNow(trip.timezone).day;
  const searchHits = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q.length < 1) return [];
    return trip.items
      .filter(
        (item) =>
          item.kind !== "commute" && item.title.toLowerCase().includes(q),
      )
      .slice(0, isCompact ? 24 : 6);
  }, [search, trip.items, isCompact]);
  const searchSuggestions = useMemo(() => {
    const stops = trip.items.filter((item) => item.kind !== "commute");
    const upcoming = stops
      .filter((item) => item.start)
      .sort((a, b) => a.start!.localeCompare(b.start!));
    return (upcoming.length > 0 ? upcoming : stops).slice(0, 8);
  }, [trip.items]);

  /**
   * Persisted edits are rehydrated after mount, not during render, so the
   * server markup and the first client render agree — without this a refresh
   * after editing throws a hydration mismatch.
   *
   * The flag is read from zustand's persist API as an external store rather
   * than mirrored into local state, so the effect below only starts the work.
   */
  const persist = (
    api as unknown as {
      persist: {
        rehydrate: () => Promise<void> | void;
        hasHydrated: () => boolean;
        onFinishHydration: (fn: () => void) => () => void;
      };
    }
  ).persist;

  const hydrated = useSyncExternalStore(
    useCallback((cb: () => void) => persist.onFinishHydration(cb), [persist]),
    () => persist.hasHydrated(),
    () => false,
  );

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      void persist.rehydrate();
    });
    return () => cancelAnimationFrame(frame);
  }, [persist]);

  const offers = useMemo(
    () => offersForDay(trip, activeDay, selectedItem),
    [trip, activeDay, selectedItem],
  );

  useEffect(() => {
    if (!assistant.plan && !assistant.choices) return;
    setDockPanel("advisor");
    if (isCompact) {
      setMobileTool("advisor");
    }
  }, [assistant.plan, assistant.choices, isCompact]);

  const restoreSettings = useCallback(
    (baseline: SettingsBaseline) => {
      api.getState().updateTripMeta({
        name: baseline.name,
        startDate: baseline.startDate,
        endDate: baseline.endDate,
        coverImage: baseline.coverImage,
      });
      api.getState().updatePrefs(baseline.prefs);
    },
    [api],
  );

  const closeSettings = useCallback(
    (discard: boolean) => {
      if (discard && settingsBaseline) restoreSettings(settingsBaseline);
      setSettingsOpen(false);
      setSettingsBaseline(null);
      setDockPanel("map");
    },
    [restoreSettings, settingsBaseline],
  );

  useEffect(() => {
    if (!settingsOpen) return;
    setDockPanel(null);
    api.getState().closeEditor();
    api.getState().selectItem(null);
    if (isCompact) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      closeSettings(true);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [api, settingsOpen, closeSettings, isCompact]);

  useEffect(() => {
    if (settingsOpen) {
      setNavOpen(false);
      setMobileTool(null);
    }
  }, [settingsOpen]);

  useEffect(() => {
    if (!navOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      setNavOpen(false);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [navOpen]);

  useEffect(() => {
    if (!isCompact || !mobileTool) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      setMobileTool(null);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [isCompact, mobileTool]);

  useEffect(() => {
    if (!dockPanel || editor.open || searchOpen || settingsOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setDockPanel((current) => (current === "map" ? null : "map"));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dockPanel, editor.open, searchOpen, settingsOpen]);

  /* The same reading the advisor's offers are derived from, shown alongside
     them so a suggestion can be checked rather than just trusted. */
  const dayReading = useMemo(() => {
    const summary = summariseDay(trip, activeDay);
    const gaps = gapsForDay(trip, activeDay);
    const freeMinutes = gaps.reduce((total, gap) => total + gap.minutes, 0);
    const largest = gaps.reduce(
      (best, gap) => (gap.minutes > best.minutes ? gap : best),
      gaps[0] ?? { minutes: 0, startMinutes: 0, endMinutes: 0 },
    );
    const days = tripDayKeys(trip);
    const busiestDay = days.reduce((best, day) => {
      const busy = summariseDay(trip, day).busyMinutes;
      return busy > summariseDay(trip, best).busyMinutes ? day : best;
    }, days[0]);
    const last = trip.items
      .filter(
        (item) =>
          item.kind === "activity" &&
          item.start &&
          item.start.slice(0, 10) === activeDay,
      )
      .sort((a, b) => (a.start ?? "").localeCompare(b.start ?? ""))
      .at(-1);
    return {
      label: dayLabel(activeDay),
      stops: summary.activityCount,
      errorCount: summary.errorCount,
      warningCount: summary.warningCount,
      freeMinutes,
      travelMinutes: summary.commuteMinutes,
      largestGapMinutes: largest?.minutes ?? 0,
      largestGapLabel:
        largest && largest.minutes >= 90
          ? `${durationLabel(largest.minutes)} free from ${timeLabel(atMinutes(activeDay, largest.startMinutes))}.`
          : null,
      selectedTitle: selectedItem?.title ?? null,
      selectedWhen:
        selectedItem?.start && selectedItem.end
          ? `${timeLabel(selectedItem.start)}–${timeLabel(selectedItem.end)}`
          : null,
      busiest: busiestDay === activeDay && days.length > 1,
      eveningOpen: !last?.end || last.end.slice(11, 16) <= "18:00",
    };
  }, [trip, activeDay, selectedItem]);

  const [hoursPrompt, setHoursPrompt] = useState<{
    startMin: number;
    endMin: number;
    patch: { dayStartHour: number; dayEndHour: number };
    draft: EditorDraft | null;
    revert: { id: string; day: string; startMinutes: number } | null;
  } | null>(null);

  const queueHoursPrompt = useCallback(
    (
      startMin: number,
      endMin: number,
      prefs: PlannerPrefs,
      extra?: {
        draft?: EditorDraft | null;
        revert?: { id: string; day: string; startMinutes: number } | null;
      },
    ) => {
      const patch = hoursCoveringRange(startMin, endMin, prefs);
      if (!patch) return false;
      window.setTimeout(() => {
        setHoursPrompt({
          startMin,
          endMin,
          patch,
          draft: extra?.draft ?? null,
          revert: extra?.revert ?? null,
        });
      }, 0);
      return true;
    },
    [],
  );

  /* ---------------------------------------------------------------------- */
  /* Drag and drop                                                          */
  /* ---------------------------------------------------------------------- */

  const sensors = useSensors(
    // A small distance threshold keeps plain clicks working as selection.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    // A hold delay keeps vertical scrolling usable on touch.
    useSensor(TouchSensor, {
      activationConstraint: { delay: 190, tolerance: 6 },
    }),
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      api.getState().setDragging(String(event.active.id));
    },
    [api],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const state = api.getState();
      state.setDragging(null);

      const { active, over, delta } = event;
      if (!over) return;

      const overId = String(over.id);
      if (!overId.startsWith("day:")) return;
      const targetDay = overId.slice(4);

      const activeId = String(active.id);
      const pxPerMin = hourHeight / 60;

      if (activeId.startsWith("idea:")) {
        /*
         * An idea has no existing time, so its drop position is absolute:
         * measure the dragged element against the column it landed on.
         */
        const translated = active.rect.current.translated;
        if (!translated) return;
        const offsetPx = translated.top - over.rect.top;
        const raw = offsetPx / pxPerMin;
        const snapped = Math.round(raw / SNAP_MIN) * SNAP_MIN;
        const idea = state.trip.ideas.find((entry) => entry.id === activeId.slice(5));
        state.scheduleIdea(activeId.slice(5), targetDay, snapped);
        if (idea) {
          queueHoursPrompt(
            snapped,
            snapped + idea.durationMin,
            state.prefs,
          );
        }
        return;
      }

      /*
       * An existing item moves by its delta, which is robust to scrolling and
       * keeps the grab point under the cursor.
       */
      const item = state.trip.items.find((i) => i.id === activeId);
      if (!item?.start) return;

      const currentMinutes =
        Number(item.start.slice(11, 13)) * 60 + Number(item.start.slice(14, 16));
      const deltaMinutes = Math.round(delta.y / pxPerMin / SNAP_MIN) * SNAP_MIN;
      const nextMinutes = currentMinutes + deltaMinutes;

      const dayChanged = targetDay !== item.start.slice(0, 10);
      if (!dayChanged && deltaMinutes === 0) return;

      state.moveItem(activeId, targetDay, nextMinutes);
      state.selectItem(activeId, "calendar");
      const duration = item.end
        ? durationMinutes(item.start, item.end)
        : 60;
      const prompted = queueHoursPrompt(
        nextMinutes,
        nextMinutes + duration,
        state.prefs,
        {
          revert: {
            id: activeId,
            day: item.start.slice(0, 10),
            startMinutes: currentMinutes,
          },
        },
      );
      if (!prompted) {
        state.showToast(
          `Moved to ${dayLabel(targetDay)}, ${formatMinutes(nextMinutes)}`,
          "success",
        );
      }
    },
    [api, hourHeight, queueHoursPrompt],
  );

  const dragged = useMemo(() => {
    if (!draggingId) return null;
    if (draggingId.startsWith("idea:")) {
      const idea = trip.ideas.find((i) => i.id === draggingId.slice(5));
      return idea ? { kind: "idea" as const, idea } : null;
    }
    const item = trip.items.find((i) => i.id === draggingId);
    return item ? { kind: "item" as const, item } : null;
  }, [draggingId, trip]);

  /* ---------------------------------------------------------------------- */
  /* Handlers                                                               */
  /* ---------------------------------------------------------------------- */

  const onSelect = useCallback(
    (id: string) => api.getState().selectItem(id, "calendar"),
    [api],
  );
  const onSelectFromMap = useCallback(
    (id: string) => api.getState().selectItem(id, "map"),
    [api],
  );
  const onHover = useCallback(
    (id: string | null) => api.getState().hoverItem(id),
    [api],
  );
  const onOpen = useCallback((id: string) => api.getState().openEdit(id), [api]);
  const onCreate = useCallback(
    (day: string, startMinutes: number, durationMin: number) =>
      api.getState().openCreate({ day, startMinutes, durationMin }),
    [api],
  );
  const onFillGap = useCallback(
    (day: string) => {
      api.getState().setActiveDay(day);
      api.getState().requestPlan("fill-gap");
    },
    [api],
  );

  const jumpToTrip = useCallback(() => {
    const state = api.getState();
    const selected = state.trip.items.find((item) => item.id === state.selectedItemId);
    const tripDays = tripDayKeys(state.trip);
    const target = selected?.start?.slice(0, 10) ?? tripDays[0];
    if (target) state.setActiveDay(target);
  }, [api]);

  const jumpRange = useCallback(
    (direction: number) => {
      const state = api.getState();
      const current = normalizePlannerView(state.view);
      const step = current === "day" ? 1 : current === "four" ? 4 : 7;
      state.setActiveDay(shiftDayKey(state.activeDay, direction * step));
    },
    [api],
  );

  const swipeNextRange = useCallback(() => {
    setSwipeDirection(1);
    jumpRange(1);
  }, [jumpRange]);

  const swipePrevRange = useCallback(() => {
    setSwipeDirection(-1);
    jumpRange(-1);
  }, [jumpRange]);

  useSwipe(
    bodyRef,
    swipeNextRange,
    swipePrevRange,
    isCompact &&
      mobileView === "schedule" &&
      (view === "day" || view === "week" || view === "four"),
  );

  const onMobileViewChange = useCallback(
    (next: "schedule" | "map" | "list") => {
      setMobileView(next);
      if (next === "list") {
        api.getState().setView("itinerary");
        return;
      }
      if (next === "schedule" || next === "map") {
        const current = normalizePlannerView(api.getState().view);
        if (current === "itinerary") api.getState().setView("day");
      }
    },
    [api],
  );

  const onNavViewChange = useCallback(
    (next: typeof view) => {
      api.getState().setView(next);
      if (next === "itinerary") {
        setMobileView("list");
        return;
      }
      setMobileView("schedule");
    },
    [api],
  );

  const openSearchHit = useCallback(
    (id: string) => {
      const item = api.getState().trip.items.find((entry) => entry.id === id);
      if (item?.start) api.getState().setActiveDay(item.start.slice(0, 10));
      api.getState().selectItem(id, "calendar");
      setSearch("");
      setSearchOpen(false);
    },
    [api],
  );

  const closeSearch = useCallback(() => {
    setSearch("");
    setSearchOpen(false);
  }, []);

  useEffect(() => {
    if (!searchOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (isCompact) return;
      const root = searchWrapRef.current;
      if (root && !root.contains(event.target as Node)) closeSearch();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      closeSearch();
    };
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [searchOpen, closeSearch, isCompact]);

  const onMyCalendar = useCallback(() => {
    api.getState().updatePrefs({ sharedView: false, overlayIds: [], mineOnly: false });
  }, [api]);

  const onSharedView = useCallback(
    (travellerId: string) => {
      const state = api.getState();
      const people = state.trip.travellers;
      const ownerId =
        people.find((person) => person.role === "owner")?.id ?? people[0]?.id ?? null;
      const selected = overlayTravellerIds(state.prefs, people, ownerId);

      if (!state.prefs.sharedView) {
        const next = [
          ...new Set(
            (travellerId === ownerId ? [ownerId] : [ownerId, travellerId]).filter(
              (id): id is string => Boolean(id),
            ),
          ),
        ];
        state.updatePrefs({ sharedView: true, overlayIds: next, mineOnly: false });
        return;
      }

      if (selected.includes(travellerId)) {
        const next = selected.filter((id) => id !== travellerId);
        if (next.length === 0) {
          state.updatePrefs({ sharedView: false, overlayIds: [] });
          return;
        }
        state.updatePrefs({ overlayIds: next });
        return;
      }

      state.updatePrefs({ overlayIds: [...selected, travellerId] });
    },
    [api],
  );

  const onInviteConnection = useCallback(
    (label: string) => api.getState().sendInvite(label),
    [api],
  );

  const onShowTravellerPlan = useCallback(
    (travellerId: string) => {
      const state = api.getState();
      const person = state.trip.travellers.find((t) => t.id === travellerId);
      const theirs = state.trip.items
        .filter(
          (item) =>
            item.kind === "activity" &&
            item.start &&
            guestsForItem(item, state.trip).some((person) => person.id === travellerId),
        )
        .sort((a, b) => (a.start ?? "").localeCompare(b.start ?? ""));
      const first = theirs[0];
      if (!first?.start) {
        state.showToast(
          `${person?.name.split(" ")[0] ?? "They"} have nothing on the calendar yet`,
          "info",
        );
        return;
      }
      state.setActiveDay(first.start.slice(0, 10));
      state.selectItem(first.id, "calendar");
      setDockPanel("people");
    },
    [api],
  );

  const closeDockPanel = useCallback(() => setDockPanel("map"), []);
  const closeMobileTool = useCallback(() => {
    setMobileTool(null);
    setAdvisorExpanded(false);
  }, []);
  const openMobileTool = useCallback((tool: "map" | "chat" | "advisor") => {
    setAdvisorExpanded(false);
    setMobileTool(tool);
  }, []);
  const activeTool = isCompact ? mobileTool : dockPanel;
  const closeActiveTool = isCompact ? closeMobileTool : closeDockPanel;
  const [pendingConfirm, setPendingConfirm] = useState<{
    kind: ConfirmKind;
    id: string;
  } | null>(null);

  const requestCommit = useCallback(() => {
    const state = api.getState();
    const draft = state.editor.draft;
    if (!draft) return;
    if (draft.kind === "stay") {
      state.commitDraft();
      return;
    }
    const startMin = draft.startMinutes;
    const endMin = draft.startMinutes + draft.durationMin;
    if (
      queueHoursPrompt(startMin, endMin, state.prefs, {
        draft: { ...draft },
      })
    ) {
      return;
    }
    state.commitDraft();
  }, [api, queueHoursPrompt]);
  const pendingActivity = trip.items.find(
    (item) => pendingConfirm?.kind === "activity" && item.id === pendingConfirm.id,
  );
  const pendingTraveller = trip.travellers.find(
    (person) =>
      (pendingConfirm?.kind === "remove-traveller" ||
        pendingConfirm?.kind === "leave") &&
      person.id === pendingConfirm.id,
  );

  const requestDelete = useCallback(
    (id: string) => {
      if (shouldSkipDeleteConfirm()) {
        api.getState().deleteItem(id);
        return;
      }
      setPendingConfirm({ kind: "activity", id });
    },
    [api],
  );

  const requestRemoveTraveller = useCallback(
    (id: string) => {
      setPendingConfirm({
        kind: id === meId ? "leave" : "remove-traveller",
        id,
      });
    },
    [meId],
  );

  /* The travellers list, shared by the rail section and the mobile sheet. */
  const travellersPanel = (
    <TravellersPanel
      trip={trip}
      invited={invite.sent}
      onInvite={() => api.getState().openInvite()}
      onInviteConnection={onInviteConnection}
      onFocusItem={(id) => api.getState().selectItem(id, "calendar")}
      onShowPlan={onShowTravellerPlan}
      onChangeRole={(id, role) => api.getState().setTravellerRole(id, role)}
      onRemove={requestRemoveTraveller}
    />
  );

  const [peekAnchor, setPeekAnchor] = useState<HTMLElement | null>(null);
  const peekItem =
    selectedItem &&
    selectedItem.kind !== "commute" &&
    !editor.open
      ? selectedItem
      : null;

  const createGhost =
    !isCompact &&
    editor.open &&
    editor.mode === "create" &&
    editor.draft &&
    editor.draft.kind !== "stay"
      ? {
          day: editor.draft.day,
          startMinutes: editor.draft.startMinutes,
          durationMin: editor.draft.durationMin,
          title: editor.draft.title,
        }
      : null;

  const [editorAnchor, setEditorAnchor] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (!peekItem || isCompact) {
      setPeekAnchor(null);
      return;
    }

    const resolve = () => setPeekAnchor(findEventAnchor(peekItem.id));
    resolve();
    const frame = requestAnimationFrame(resolve);
    return () => cancelAnimationFrame(frame);
  }, [
    peekItem,
    isCompact,
    view,
    activeDay,
    gridDays,
    dockPanel,
    mobileView,
  ]);

  useLayoutEffect(() => {
    if (isCompact || !editor.open || !editor.draft) {
      setEditorAnchor(null);
      return;
    }

    const resolve = () => {
      if (editor.mode === "edit" && editor.draft?.id) {
        setEditorAnchor(findEventAnchor(editor.draft.id));
        return;
      }

      const ghost = findCreateGhost();
      if (ghost) {
        ghost.scrollIntoView({ block: "nearest", inline: "nearest" });
        setEditorAnchor(ghost);
        return;
      }

      setEditorAnchor(findDayTab(editor.draft!.day));
    };

    resolve();
    const frame = requestAnimationFrame(resolve);
    return () => cancelAnimationFrame(frame);
  }, [
    isCompact,
    editor.open,
    editor.mode,
    editor.draft?.id,
    editor.draft?.day,
    editor.draft?.startMinutes,
    editor.draft?.durationMin,
    editor.draft?.kind,
    view,
    activeDay,
    gridDays,
    dockPanel,
  ]);

  const advisorBody = (
    <AskAiPanel
      offers={offers}
      reading={dayReading}
      trip={trip}
      plan={assistant.plan}
      choices={assistant.choices}
      applied={assistant.applied}
      appliedNote={assistant.appliedNote}
      canUndo={Boolean(assistant.undoTrip)}
      onRequest={(intent) => api.getState().requestPlan(intent)}
      onInterpret={(text) => api.getState().requestFromText(text)}
      onChoose={(ideaId) => api.getState().chooseAssistantIdea(ideaId)}
      onApplyAll={() => api.getState().applyPlan()}
      onApplyOne={(id) => api.getState().applyChange(id)}
      onDismissPlan={() => api.getState().dismissPlan()}
      onUndo={() => api.getState().undoPlan()}
      onHoverChange={onHover}
    />
  );

  const rail =
    !isCompact && activeTool === "map" ? (
      <aside className={styles.rail}>
        <RailMap
          items={trip.items}
          dismiss="close"
          onClose={() => setDockPanel(null)}
          onPickItem={(id) => {
            const item = trip.items.find((entry) => entry.id === id);
            if (item?.start) api.getState().setActiveDay(item.start.slice(0, 10));
            api.getState().selectItem(id, "map");
          }}
        >
          <PlannerMap
            trip={trip}
            activeDay={activeDay}
            selectedItemId={selectedItemId}
            hoveredItemId={hoveredItemId}
            onSelect={onSelectFromMap}
            onHover={onHover}
            onBackgroundClick={() => api.getState().selectItem(null)}
            padding={{ top: 56, right: 24, bottom: 28, left: 24 }}
            onOpen={onOpen}
          />
        </RailMap>
      </aside>
    ) : activeTool === "advisor" ? (
      <aside className={styles.rail}>
        <RailPanel
          title="Ask AI"
          tone="ai"
          fill
          onClose={
            isCompact && advisorExpanded
              ? () => setAdvisorExpanded(false)
              : closeActiveTool
          }
          dismiss={isCompact ? "back" : "close"}
          backFrom={isCompact && advisorExpanded ? "Ask AI" : "Trip"}
        >
          {advisorBody}
        </RailPanel>
      </aside>
    ) : activeTool === "ideas" ? (
      <aside className={styles.rail}>
        <RailPanel
          title="Idea board"
          subtitle={
            trip.ideas.length > 0
              ? `${trip.ideas.length} saved`
              : "Nothing saved yet"
          }
          onClose={closeActiveTool}
          dismiss={isCompact ? "back" : "close"}
          backFrom="Trip"
          fill
        >
          <IdeasRail
            trip={trip}
            activeDay={activeDay}
            draggingId={draggingId}
            onSchedule={(ideaId) => {
              const idea = trip.ideas.find((i) => i.id === ideaId);
              if (!idea) return;
              api.getState().scheduleIdea(ideaId, activeDay, 10 * 60);
            }}
            onShare={(idea) => {
              api.getState().queueChatShare({
                kind: "idea",
                ideaId: idea.id,
                title: idea.title,
                place: idea.place?.neighbourhood ?? idea.place?.name ?? null,
                reason: idea.reason,
              });
              setDockPanel("chat");
            }}
          />
        </RailPanel>
      </aside>
    ) : activeTool === "people" ? (
      <aside className={styles.rail}>
        <RailPanel
          title="Travellers"
          subtitle={`${partyTravellers(trip.travellers).length} travelling`}
          onClose={closeActiveTool}
          dismiss={isCompact ? "back" : "close"}
          backFrom="Trip"
        >
          {travellersPanel}
        </RailPanel>
      </aside>
    ) : activeTool === "roles" ? (
      <aside className={styles.rail}>
        <RailPanel
          title="Roles"
          count={trip.travellers.length}
          onClose={closeActiveTool}
          dismiss={isCompact ? "back" : "close"}
          backFrom="Trip"
          fill
        >
          <RolesPanel
            people={trip.travellers}
            meId={meId}
            heading={false}
            onChangeRole={(id, role) => api.getState().setTravellerRole(id, role)}
            onInvite={() => api.getState().openInvite()}
          />
        </RailPanel>
      </aside>
    ) : activeTool === "chat" ? (
      <aside className={styles.rail}>
        <RailPanel
          title="Trip chat"
          onClose={closeActiveTool}
          dismiss={isCompact ? "back" : "close"}
          backFrom="Trip"
          fill
        >
          <TripChat trip={trip} />
        </RailPanel>
      </aside>
    ) : null;

  const onDockAction = useCallback((action: RailDockAction) => {
    setDockPanel((current) => {
      if (action === "map") return current === "map" ? null : "map";
      return current === action ? "map" : action;
    });
  }, []);

  if (!hydrated) {
    return <div className={styles.root} />;
  }

  return (
    <DndContext
      /*
       * A stable id makes dnd-kit's generated aria ids deterministic. Without
       * it the server and client produce different `aria-describedby` values
       * on every draggable, which React reports as a hydration mismatch.
       */
      id="intripid-planner"
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => api.getState().setDragging(null)}
    >
      <div
        className={cn(styles.frame, isCompact && navOpen && styles.frameOpen)}
      >
        {isCompact && !settingsOpen ? (
          <nav
            className={styles.sidebar}
            aria-label="Trip menu"
            aria-hidden={!navOpen}
            {...(!navOpen ? { inert: true } : {})}
          >
            <PlannerNav
              view={view}
              unreadCount={unreadCount}
              tripName={trip.name}
              tripCover={coverSrc ?? undefined}
              travellers={trip.travellers}
              meId={accountId}
              overlayIds={overlayIds}
              sharedView={prefs.sharedView}
              onChangeView={onNavViewChange}
              onSharedView={onSharedView}
              onChangeRole={(id, role) => api.getState().setTravellerRole(id, role)}
              onInvite={() => api.getState().openInvite()}
              onNotifications={() => setNotificationsSheet(true)}
              onSettings={() => {
                const state = api.getState();
                setSettingsBaseline(captureSettings(state.trip, state.prefs));
                setSettingsOpen(true);
              }}
              onClose={() => setNavOpen(false)}
            />
          </nav>
        ) : null}

        <div className={styles.canvas}>
      <div
        className={styles.root}
        data-planner-root=""
        data-planner-ready={hydrated ? "" : undefined}
        data-settings={isCompact && settingsOpen ? "compact" : undefined}
        data-chrome-hidden={isCompact && chrome.hidden ? "" : undefined}
      >
        {/* ---------------------------------------------------------------- */}
        {/* Top bar                                                          */}
        {/* ---------------------------------------------------------------- */}
        {isCompact && settingsOpen ? null : (
        <header className={styles.topbar}>
          <div className={styles.topbarStart}>
            {settingsOpen ? (
              <button
                type="button"
                className={styles.backLink}
                aria-label="Back to calendar"
                title="Back to calendar"
                onClick={() => closeSettings(true)}
              >
                <ArrowLeft size={15} strokeWidth={2} />
              </button>
            ) : isCompact ? (
              <button
                type="button"
                className={styles.backLink}
                aria-label="Open menu"
                aria-haspopup="dialog"
                aria-expanded={navOpen}
                onClick={() => setNavOpen((open) => !open)}
              >
                <Menu size={18} strokeWidth={2} />
              </button>
            ) : (
              <BackLink fallback="/dashboard" className={styles.backLink}>
                <ArrowLeft size={15} strokeWidth={2} />
              </BackLink>
            )}
            {settingsOpen ? (
              <h1 className={styles.settingsTitle}>Settings</h1>
            ) : isCompact ? (
              <MonthPicker
                compact
                activeDay={activeDay}
                todayKey={todayKey}
                tripDays={days}
                onSelect={(day) => api.getState().setActiveDay(day)}
              />
            ) : (
              <>
                <div className={styles.tripMeta}>
                  {coverSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={coverSrc} alt="" className={styles.tripCover} />
                  ) : null}
                  <h1 className={styles.tripName}>{trip.name}</h1>
                </div>

                <button
                  type="button"
                  className={cn(styles.tripHomeBtn, !onTripCanvas && styles.tripHomeBtnAway)}
                  onClick={jumpToTrip}
                  disabled={onTripCanvas}
                  aria-label={
                    onTripCanvas
                      ? "Already showing this trip"
                      : selectedItem?.start
                        ? "Show the selected stop on the calendar"
                        : "Show this trip on the calendar"
                  }
                >
                  This trip
                </button>
                <div className={styles.monthNav}>
                  <IconButton
                    label={
                      view === "day"
                        ? "Previous day"
                        : view === "four"
                          ? "Previous 4 days"
                          : "Previous week"
                    }
                    size="sm"
                    variant="ghost"
                    onClick={() => jumpRange(-1)}
                  >
                    <ChevronLeft size={18} strokeWidth={2} />
                  </IconButton>
                  <IconButton
                    label={
                      view === "day"
                        ? "Next day"
                        : view === "four"
                          ? "Next 4 days"
                          : "Next week"
                    }
                    size="sm"
                    variant="ghost"
                    onClick={() => jumpRange(1)}
                  >
                    <ChevronRight size={18} strokeWidth={2} />
                  </IconButton>
                </div>
                <MonthPicker
                  activeDay={activeDay}
                  todayKey={todayKey}
                  tripDays={days}
                  onSelect={(day) => api.getState().setActiveDay(day)}
                />
              </>
            )}
          </div>

          <div className={styles.topbarEnd}>
            {settingsOpen ? (
              <div className={styles.settingsActions}>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!settingsHasChanges}
                  onClick={() => {
                    if (!settingsBaseline) return;
                    restoreSettings(settingsBaseline);
                  }}
                >
                  Discard changes
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!settingsHasChanges}
                  onClick={() => {
                    const state = api.getState();
                    setSettingsBaseline(
                      captureSettings(state.trip, state.prefs),
                    );
                    api.getState().showToast("Settings saved", "success");
                  }}
                >
                  Save
                </Button>
              </div>
            ) : (
              <>
            <div className={styles.searchWrap} ref={searchWrapRef}>
              {searchOpen && !isCompact ? (
                <div className={styles.searchField}>
                  <Search size={15} strokeWidth={2} />
                  <input
                    autoFocus
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && searchHits[0]) {
                        openSearchHit(searchHits[0].id);
                      }
                    }}
                    placeholder="Search this trip"
                    aria-label="Search this trip"
                  />
                  <IconButton
                    label="Close search"
                    size="sm"
                    variant="ghost"
                    className={styles.searchClose}
                    onClick={closeSearch}
                  >
                    <X size={16} strokeWidth={2} />
                  </IconButton>
                  {searchHits.length > 0 ? (
                    <ul className={styles.searchHits} role="listbox">
                      {searchHits.map((hit) => (
                        <li key={hit.id}>
                          <button
                            type="button"
                            onClick={() => openSearchHit(hit.id)}
                          >
                            {hit.title}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : (
                <IconButton
                  label="Search this trip"
                  size={isCompact ? "md" : "sm"}
                  variant="ghost"
                  className={isCompact ? styles.topbarIcon : undefined}
                  onClick={() => setSearchOpen(true)}
                >
                  <Search size={isCompact ? 20 : 16} strokeWidth={2} />
                </IconButton>
              )}
            </div>

            {isCompact && !searchOpen ? (
              <IconButton
                label="Trip chat"
                size="md"
                variant="ghost"
                className={cn(
                  styles.topbarIcon,
                  mobileTool === "chat" && styles.topbarIconOn,
                )}
                aria-pressed={mobileTool === "chat"}
                onClick={() => openMobileTool("chat")}
              >
                <MessageCircle size={20} strokeWidth={2} />
              </IconButton>
            ) : null}

            {!isCompact ? <PlannerNotifications /> : null}
            {!isCompact ? (
              <PlannerSettings
                weekendsApply={view === "week"}
                onOpen={() => {
                  const state = api.getState();
                  setSettingsBaseline(captureSettings(state.trip, state.prefs));
                  setSettingsOpen(true);
                }}
              />
            ) : null}

            {!isCompact ? (
              <ViewMenu
                view={view}
                onChange={(next) => api.getState().setView(next)}
              />
            ) : null}

            {!isCompact ? <PlannerAccount /> : null}

            {isCompact && !searchOpen ? (
              <div
                className={styles.mobileSegmented}
                role="radiogroup"
                aria-label="Content"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={mobileView === "schedule"}
                  aria-label="Schedule"
                  className={cn(
                    styles.mobileSegBtn,
                    mobileView === "schedule" && styles.mobileSegOn,
                  )}
                  onClick={() => onMobileViewChange("schedule")}
                >
                  <CalendarDays size={17} strokeWidth={1.9} />
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={mobileView === "map"}
                  aria-label="Map"
                  className={cn(
                    styles.mobileSegBtn,
                    mobileView === "map" && styles.mobileSegOn,
                  )}
                  onClick={() => onMobileViewChange("map")}
                >
                  <MapPin size={17} strokeWidth={1.9} />
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={mobileView === "list"}
                  aria-label="List"
                  className={cn(
                    styles.mobileSegBtn,
                    mobileView === "list" && styles.mobileSegOn,
                  )}
                  onClick={() => onMobileViewChange("list")}
                >
                  <List size={17} strokeWidth={1.9} />
                </button>
              </div>
            ) : null}
              </>
            )}
          </div>
        </header>
        )}

        {isCompact && !settingsOpen ? (
          <div data-month-slot="" className={styles.monthSlot} />
        ) : null}

        {/* ---------------------------------------------------------------- */}
        {/* Day rail                                                         */}
        {/* ---------------------------------------------------------------- */}
        {settingsOpen ? (
          <PlannerSettingsWorkspace
            weekendsApply={view === "week"}
            className={
              isCompact
                ? undefined
                : cn(styles.workspace, styles.workspaceSettings)
            }
            islandClassName={styles.mainCard}
            onClose={() => closeSettings(isCompact ? false : true)}
          />
        ) : (
        <>
        <div
          className={cn(
            styles.workspace,
            !isCompact && rail && styles.workspaceWithRail,
          )}
        >
          <div className={styles.mainCard}>
            <div
              className={styles.dayRailWrap}
              style={{ ["--day-count" as string]: railDays.length }}
            >
              <DayRail
                trip={trip}
                days={railDays}
                activeDay={activeDay}
                onSelectDay={(day) => {
                  const state = api.getState();
                  const current = normalizePlannerView(state.view);
                  if (
                    isCompact ||
                    current === "itinerary" ||
                    current === "day"
                  ) {
                    state.setActiveDay(day);
                    return;
                  }
                  state.openDayView(day);
                }}
                compact={isCompact}
                todayKey={todayKey}
                onCreate={
                  isCompact ? undefined : () => api.getState().openCreate()
                }
              />
            </div>

            <div className={styles.body} ref={bodyRef}>
              {isCompact && mobileView === "map" ? (
                <div className={styles.mobileMapPeer}>
                  <PlannerMap
                    trip={trip}
                    activeDay={activeDay}
                    selectedItemId={selectedItemId}
                    hoveredItemId={hoveredItemId}
                    onSelect={onSelectFromMap}
                    onHover={onHover}
                    onBackgroundClick={() => api.getState().selectItem(null)}
                    padding={{ top: 12, right: 16, bottom: 140, left: 16 }}
                    deck
                    onOpen={onOpen}
                  />
                </div>
              ) : (
                <main className={styles.schedule}>
                  {isCompact ? (
                    mobileView === "list" ? (
                      <Itinerary
                        trip={trip}
                        activeDay={activeDay}
                        selectedItemId={selectedItemId}
                        hoveredItemId={hoveredItemId}
                        onSelect={onSelect}
                        onOpen={onOpen}
                        onHover={onHover}
                        onCreate={onCreate}
                        onFillGap={onFillGap}
                        onScroll={chrome.onScroll}
                      />
                    ) : (
                      <motion.div
                        key={view === "day" ? activeDay : `${view}:${activeDay}`}
                        initial={{ x: swipeDirection > 0 ? 50 : swipeDirection < 0 ? -50 : 0, opacity: 0.4 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
                        style={{ height: "100%" }}
                      >
                        <Calendar
                          trip={trip}
                          days={view === "day" ? [activeDay] : gridDays}
                          activeDay={activeDay}
                          selectedItemId={selectedItemId}
                          hoveredItemId={hoveredItemId}
                          draggingId={draggingId}
                          proposedIds={proposedIds}
                          hourHeight={hourHeight}
                          onSelect={onSelect}
                          onOpen={onOpen}
                          onHover={onHover}
                          onDayFocus={(day) => {
                            if (day !== activeDay) api.getState().setActiveDay(day);
                          }}
                          onCreate={onCreate}
                          onFillGap={onFillGap}
                          singleDay={view === "day"}
                          forTravellerIds={
                            prefs.sharedView
                              ? overlayIds.length > 0
                                ? overlayIds
                                : null
                              : prefs.mineOnly && meId
                                ? [meId]
                                : null
                          }
                          dayStartMin={DAY_START_MIN}
                          dayEndMin={DAY_END_MIN}
                          activeStartMin={prefs.dayStartHour * 60}
                          activeEndMin={prefs.dayEndHour * 60}
                          timeFormat={prefs.timeFormat}
                          defaultDurationMin={prefs.defaultDurationMin}
                          createGhost={createGhost}
                          onScroll={chrome.onScroll}
                          denseGaps={view === "week" || view === "four"}
                        />
                      </motion.div>
                    )
                  ) : (
                    view === "itinerary" ? (
                      <Itinerary
                        trip={trip}
                        activeDay={activeDay}
                        selectedItemId={selectedItemId}
                        hoveredItemId={hoveredItemId}
                        onSelect={onSelect}
                        onOpen={onOpen}
                        onHover={onHover}
                        onCreate={onCreate}
                        onFillGap={onFillGap}
                      />
                    ) : (
                      <Calendar
                        trip={trip}
                        days={gridDays}
                        activeDay={activeDay}
                        selectedItemId={selectedItemId}
                        hoveredItemId={hoveredItemId}
                        draggingId={draggingId}
                        proposedIds={proposedIds}
                        hourHeight={hourHeight}
                        onSelect={onSelect}
                        onOpen={onOpen}
                        onHover={onHover}
                        onDayFocus={(day) => {
                          if (day !== activeDay) api.getState().setActiveDay(day);
                        }}
                        onCreate={onCreate}
                        onFillGap={onFillGap}
                        singleDay={view === "day"}
                        forTravellerIds={
                          prefs.sharedView
                            ? overlayIds.length > 0
                              ? overlayIds
                              : null
                            : prefs.mineOnly && meId
                              ? [meId]
                              : null
                        }
                        dayStartMin={DAY_START_MIN}
                        dayEndMin={DAY_END_MIN}
                        activeStartMin={prefs.dayStartHour * 60}
                        activeEndMin={prefs.dayEndHour * 60}
                        timeFormat={prefs.timeFormat}
                        defaultDurationMin={prefs.defaultDurationMin}
                        createGhost={createGhost}
                      />
                    )
                  )}
                </main>
              )}
            </div>
          </div>

          {!isCompact ? rail : null}
          {!isCompact ? (
            <RailDock
              travellers={trip.travellers}
              meId={meId}
              sharedView={prefs.sharedView}
              overlayIds={overlayIds}
              active={dockPanel}
              onAction={onDockAction}
              onMyCalendar={onMyCalendar}
              onSharedView={onSharedView}
              onChangeRole={(id, role) => api.getState().setTravellerRole(id, role)}
              onRemove={requestRemoveTraveller}
            />
          ) : null}
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Mobile FABs                                                     */}
        {/* ---------------------------------------------------------------- */}
        {isCompact && !mobileTool && !searchOpen && !peekItem ? (
          <div
            className={cn(
              styles.mobileFabs,
              mobileView === "map" && styles.mobileFabsOverMap,
            )}
          >
            <button
              type="button"
              className={styles.mobileAiFab}
              aria-label="Ask AI"
              onClick={() => openMobileTool("advisor")}
            >
              <AiMark size={18} />
              <span className={styles.mobileAiFabLabel}>Ask AI</span>
            </button>
            <button
              type="button"
              className={styles.mobileAddFab}
              aria-label="Add an activity"
              onClick={() => api.getState().openCreate()}
            >
              <Plus size={24} strokeWidth={2.4} />
            </button>
          </div>
        ) : null}
        </>
        )}

        {isCompact && searchOpen && !settingsOpen ? (
          <div
            className={styles.searchOverlay}
            role="dialog"
            aria-modal="true"
            aria-label="Search this trip"
          >
            <header className={styles.searchBar}>
              <MobileBack from="Trip" onClick={closeSearch} className={styles.searchBack} />
              <input
                autoFocus
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && searchHits[0]) {
                    openSearchHit(searchHits[0].id);
                  }
                }}
                placeholder="Search"
                aria-label="Search this trip"
                className={styles.searchPageInput}
              />
            </header>
            {search.trim() && searchHits.length === 0 ? (
              <p className={styles.searchPageEmpty}>No matching stops</p>
            ) : (
              <>
                {!search.trim() && searchSuggestions.length > 0 ? (
                  <p className={styles.searchPageHint}>Suggested</p>
                ) : null}
                <ul className={styles.searchPageHits} role="listbox">
                  {(search.trim() ? searchHits : searchSuggestions).map((hit) => {
                    const when = hit.start
                      ? dateFromDayKey(hit.start.slice(0, 10)).toLocaleDateString(
                          "en-US",
                          { weekday: "short", month: "short", day: "numeric" },
                        )
                      : "Unscheduled";
                    const where = hit.place?.name ?? hit.subtitle;
                    return (
                      <li key={hit.id}>
                        <button
                          type="button"
                          className={styles.searchPageHit}
                          onClick={() => openSearchHit(hit.id)}
                        >
                          <span className={styles.searchPageHitTitle}>
                            {hit.title}
                          </span>
                          <span className={styles.searchPageHitMeta}>
                            {[when, where].filter(Boolean).join(" · ")}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>
        ) : null}

        {isCompact && mobileTool && mobileTool !== "map" && !settingsOpen && (mobileTool !== "advisor" || advisorExpanded) ? (
          <div
            className={styles.toolOverlay}
            data-tool={mobileTool}
            role="dialog"
            aria-modal="true"
            aria-label={mobileTool === "chat" ? "Trip chat" : "Ask AI"}
          >
            {rail}
          </div>
        ) : null}

        {/* ---------------------------------------------------------------- */}
        {/* Mobile sheets                                                    */}
        {/* ---------------------------------------------------------------- */}
        {isCompact && !settingsOpen ? (
          <>
            <Sheet
              open={mobileTool === "advisor" && !advisorExpanded}
              onClose={closeMobileTool}
              label="Ask AI"
              height={0.64}
              layer="modal"
              bodyClassName={styles.askAiSheetBody}
            >
              <div className={styles.askAiSheet}>
                <header className={styles.askAiSheetHead}>
                  <div className={styles.askAiSheetTitle}>
                    <AiMark size={18} />
                    <span className={styles.askAiSheetName}>Ask AI</span>
                  </div>
                  <IconButton
                    label="Expand"
                    size="sm"
                    variant="ghost"
                    onClick={() => setAdvisorExpanded(true)}
                  >
                    <Maximize2 size={18} strokeWidth={2} />
                  </IconButton>
                </header>
                <div className={styles.askAiSheetCanvas}>{advisorBody}</div>
              </div>
            </Sheet>
            <Sheet
              open={notificationsSheet}
              onClose={() => setNotificationsSheet(false)}
              label="Notifications"
              snapPoints={[0.4, 0.72, 0.92]}
              initialSnapIndex={1}
            >
              <NotificationsPanel
                notifications={notifications}
                unreadCount={unreadCount}
                onMarkAllRead={() => sessionApi.getState().markAllNotificationsRead()}
                onMarkRead={(id) => sessionApi.getState().markNotificationRead(id)}
                onNavigate={() => setNotificationsSheet(false)}
              />
            </Sheet>
          </>
        ) : null}

        {peekItem ? (
          <EventPeek
            trip={trip}
            item={peekItem}
            anchor={peekAnchor}
            onClose={() => api.getState().selectItem(null)}
            onEdit={() => api.getState().openEdit(peekItem.id)}
            onDelete={() => requestDelete(peekItem.id)}
          />
        ) : null}

        {isCompact ? (
          <Sheet
            open={editor.open && Boolean(editor.draft)}
            onClose={() => api.getState().closeEditor()}
            label={editor.mode === "create" ? "Add an activity" : "Edit activity"}
            presentation="page"
            draggable={false}
            className={editorStyles.dialogFull}
          >
            {editor.draft ? (
              <ActivityEditor
                trip={trip}
                draft={editor.draft}
                mode={editor.mode}
                days={days}
                compact
                onChange={(patch) => api.getState().updateDraft(patch)}
                onCommit={requestCommit}
                onCancel={() => api.getState().closeEditor()}
                onDelete={
                  editor.mode === "edit" && editor.draft.id
                    ? () => requestDelete(editor.draft!.id!)
                    : undefined
                }
              />
            ) : null}
          </Sheet>
        ) : (
          <Popover
            open={editor.open && Boolean(editor.draft) && Boolean(editorAnchor)}
            onClose={() => api.getState().closeEditor()}
            anchor={editorAnchor}
            placement="right"
            align="start"
            offset={8}
            width={448}
            label={editor.mode === "create" ? "Add an activity" : "Edit activity"}
            className={cn(editorStyles.dialog, editorStyles.popover)}
            ignoreOutsideClick={(node) => {
              if (hoursPrompt) return true;
              if (isNestedOverlay(node)) return true;
              if (!editor.draft?.id) return false;
              const element = node instanceof Element ? node : node.parentElement;
              return Boolean(
                element?.closest(`[data-event="${CSS.escape(editor.draft.id)}"]`),
              );
            }}
            draggable
            dragKey={`${editor.mode}-${editor.draft?.id ?? "new"}`}
          >
            {editor.draft ? (
              <ActivityEditor
                trip={trip}
                draft={editor.draft}
                mode={editor.mode}
                days={days}
                onChange={(patch) => api.getState().updateDraft(patch)}
                onCommit={requestCommit}
                onCancel={() => api.getState().closeEditor()}
                onDelete={
                  editor.mode === "edit" && editor.draft.id
                    ? () => requestDelete(editor.draft!.id!)
                    : undefined
                }
              />
            ) : null}
          </Popover>
        )}

        <ConfirmDeleteModal
          open={Boolean(pendingConfirm)}
          kind={pendingConfirm?.kind ?? "activity"}
          subject={
            pendingConfirm?.kind === "activity"
              ? (pendingActivity?.title ?? "This activity")
              : (pendingTraveller?.name ?? "This person")
          }
          onCancel={() => setPendingConfirm(null)}
          onConfirm={(skipNext) => {
            const next = pendingConfirm;
            setPendingConfirm(null);
            if (!next) return;
            if (next.kind === "activity") {
              if (skipNext) rememberSkipDeleteConfirm();
              api.getState().deleteItem(next.id);
              return;
            }
            api.getState().removeTraveller(next.id);
          }}
        />

        <HoursExpandModal
          open={Boolean(hoursPrompt)}
          currentFrom={clockLabel(prefs.dayStartHour * 60, prefs.timeFormat)}
          currentTo={clockLabel(prefs.dayEndHour * 60, prefs.timeFormat)}
          nextFrom={clockLabel(
            (hoursPrompt?.patch.dayStartHour ?? prefs.dayStartHour) * 60,
            prefs.timeFormat,
          )}
          nextTo={clockLabel(
            (hoursPrompt?.patch.dayEndHour ?? prefs.dayEndHour) * 60,
            prefs.timeFormat,
          )}
          stopFrom={clockLabel(hoursPrompt?.startMin ?? 0, prefs.timeFormat)}
          stopTo={clockLabel(hoursPrompt?.endMin ?? 0, prefs.timeFormat)}
          onCancel={() => {
            if (hoursPrompt?.revert) {
              api.getState().moveItem(
                hoursPrompt.revert.id,
                hoursPrompt.revert.day,
                hoursPrompt.revert.startMinutes,
              );
            }
            setHoursPrompt(null);
          }}
          onConfirm={() => {
            if (!hoursPrompt) return;
            api.getState().updatePrefs(hoursPrompt.patch);
            if (hoursPrompt.draft) {
              api.getState().commitDraft(hoursPrompt.draft);
            }
            setHoursPrompt(null);
          }}
        />

        <InviteModal
          open={invite.open}
          onClose={() => api.getState().closeInvite()}
          onSend={(email) => api.getState().sendInvite(email)}
        />

        <Toast
          message={toast?.message ?? null}
          tone={toast?.tone}
          toastKey={toast?.id}
          onDismiss={() => api.getState().clearToast()}
        />

      </div>
      {isCompact ? (
        <button
          type="button"
          className={styles.canvasDismiss}
          aria-label="Close menu"
          aria-hidden={!navOpen}
          tabIndex={navOpen ? 0 : -1}
          onClick={() => setNavOpen(false)}
        />
      ) : null}
        </div>
      </div>

      {/* Drag preview */}
      <DragOverlay dropAnimation={null}>
        {dragged?.kind === "item" ? (
          <div className={styles.dragPreview}>
            <EventCard
              item={dragged.item}
              travellers={trip.travellers}
              height={64}
            />
          </div>
        ) : dragged?.kind === "idea" ? (
          <div className={cn(styles.dragPreview, styles.dragPreviewIdea)}>
            <span
              className={styles.dragIdeaBar}
              style={{
                ["--cat-color" as string]: categoryMeta(dragged.idea.category)
                  .color,
              }}
              aria-hidden
            />
            <span className={styles.dragIdeaBody}>
              <span className={styles.dragIdeaTitle}>{dragged.idea.title}</span>
              <span className={styles.dragIdeaMeta}>
                {durationLabel(dragged.idea.durationMin)} · drop on a day
              </span>
            </span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

/** "2:30 PM" from minutes-since-midnight. */
function formatMinutes(minutes: number): string {
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const suffix = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}
