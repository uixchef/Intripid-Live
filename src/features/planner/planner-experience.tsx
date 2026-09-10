"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
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
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  CalendarDays,
  List,
  Map as MapIcon,
  Plus,
  RotateCcw,
  Sparkles,
} from "lucide-react";

import { Mark } from "@/components/brand/mark";
import { Button, IconButton } from "@/components/ui/button";
import { Segmented } from "@/components/ui/controls";
import { Sheet, Toast } from "@/components/ui/overlay";
import { getDestination } from "@/data/destinations";
import { categoryMeta } from "@/lib/categories";
import { useIsCompact, useIsShort } from "@/lib/use-media-query";
import { cn } from "@/lib/utils";
import { offersForDay } from "@/lib/trip/assistant";
import {
  activitiesForDay,
  commutesForDay,
  gapsForDay,
  summariseDay,
  tripDayKeys,
} from "@/lib/trip/schedule";
import { dayLabel, durationLabel } from "@/lib/trip/time";
import {
  selectSelectedItem,
  useTrip,
  useTripApi,
  type PlannerView,
} from "@/stores/trip-store";

import { ActivityEditor } from "./activity-editor";
import { AssistantOffers, AssistantPlanPanel } from "./assistant";
import { Calendar, DAY_START_MIN, DayRail, SNAP_MIN } from "./calendar";
import { InviteModal, PresenceChip, TravellersPanel } from "./collaborators";
import { EventCard } from "./event-card";
import { Itinerary } from "./itinerary";
import { PlannerMap } from "./planner-map";
import {
  RailContext,
  RailEmpty,
  RailMap,
  RailPeople,
  type RailTab,
} from "./rail";
import { DetailsPanel, IdeasRail } from "./side-panel";

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

export function PlannerExperience() {
  const api = useTripApi();
  const isCompact = useIsCompact();
  const isShort = useIsShort();

  const trip = useTrip((s) => s.trip);
  const activeDay = useTrip((s) => s.activeDay);
  const view = useTrip((s) => s.view);
  const selectedItemId = useTrip((s) => s.selectedItemId);
  const hoveredItemId = useTrip((s) => s.hoveredItemId);
  const draggingId = useTrip((s) => s.draggingId);
  const editor = useTrip((s) => s.editor);
  const assistant = useTrip((s) => s.assistant);
  const invite = useTrip((s) => s.invite);
  const toast = useTrip((s) => s.toast);
  const selectedItem = useTrip(selectSelectedItem);

  /*
   * The pinned rail tab, remembered against the selection it was pinned for.
   * Storing the selection alongside it means a NEW selection naturally wins
   * without an effect that resets state — the override simply stops matching.
   */
  const [railOverride, setRailOverride] = useState<{
    tab: RailTab;
    forSelection: string | null;
  } | null>(null);
  const [mobileMapOpen, setMobileMapOpen] = useState(false);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [peopleSheet, setPeopleSheet] = useState(false);

  const days = useMemo(() => tripDayKeys(trip), [trip]);
  const destination = getDestination(trip.destinationId);
  const hourHeight = isShort ? HOUR_HEIGHT_SHORT : HOUR_HEIGHT;

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
    void persist.rehydrate();
  }, [persist]);

  const offers = useMemo(
    () => offersForDay(trip, activeDay),
    [trip, activeDay],
  );

  /*
   * Which rail tab is showing. A live proposal outranks everything, then a
   * tab you pinned for this selection, then the selection itself. Selecting
   * something is a strong enough signal to override whatever was last pinned.
   */
  const railTab: RailTab = assistant.plan
    ? "advisor"
    : railOverride && railOverride.forSelection === selectedItemId
      ? railOverride.tab
      : selectedItem
        ? "activity"
        : "ideas";

  /* Day facts for the map's header, so the route says which day it is. */
  const dayStats = useMemo(() => {
    const stops = activitiesForDay(trip, activeDay).length;
    const walkMinutes = commutesForDay(trip, activeDay)
      .filter((item) => item.commute?.mode === "walk")
      .reduce((total, item) => total + (item.commute?.minutes ?? 0), 0);
    return { stops, walkMinutes };
  }, [trip, activeDay]);

  /* The same reading the advisor's offers are derived from, shown alongside
     them so a suggestion can be checked rather than just trusted. */
  const dayReading = useMemo(() => {
    const summary = summariseDay(trip, activeDay);
    const freeMinutes = gapsForDay(trip, activeDay).reduce(
      (total, gap) => total + gap.minutes,
      0,
    );
    return {
      label: dayLabel(activeDay),
      stops: summary.activityCount,
      errorCount: summary.errorCount,
      warningCount: summary.warningCount,
      freeMinutes,
      travelMinutes: summary.commuteMinutes,
      costUsd: summary.costUsd,
    };
  }, [trip, activeDay]);

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
        const raw = DAY_START_MIN + offsetPx / pxPerMin;
        const snapped = Math.round(raw / SNAP_MIN) * SNAP_MIN;
        state.scheduleIdea(activeId.slice(5), targetDay, snapped);
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
      state.showToast(
        `Moved to ${dayLabel(targetDay)}, ${formatMinutes(nextMinutes)}`,
        "success",
      );
    },
    [api, hourHeight],
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

  const onInviteConnection = useCallback(
    (label: string) => api.getState().sendInvite(label),
    [api],
  );

  /* The travellers list, shared by the rail section and the mobile sheet. */
  const travellersPanel = (
    <TravellersPanel
      trip={trip}
      invited={invite.sent}
      onInvite={() => api.getState().openInvite()}
      onInviteConnection={onInviteConnection}
      onFocusItem={(id) => api.getState().selectItem(id, "calendar")}
    />
  );

  /*
   * The rail's context body. One of three things, and never more than one:
   * the advisor when it has something to say, the selected activity, or the
   * ideas shelf.
   */
  const railBody =
    railTab === "advisor" ? (
      assistant.plan ? (
        <AssistantPlanPanel
          key={assistant.plan.id}
          plan={assistant.plan}
          applied={assistant.applied}
          onApplyAll={() => api.getState().applyPlan()}
          onApplyOne={(id) => api.getState().applyChange(id)}
          onDismiss={() => api.getState().dismissPlan()}
          onHoverChange={onHover}
        />
      ) : (
        <AssistantOffers
          key="offers"
          offers={offers}
          onRequest={(intent) => api.getState().requestPlan(intent)}
          reading={dayReading}
        />
      )
    ) : railTab === "activity" ? (
      selectedItem ? (
        <DetailsPanel
          key={selectedItem.id}
          trip={trip}
          item={selectedItem}
          activeDay={activeDay}
          onEdit={() => api.getState().openEdit(selectedItem.id)}
          onDelete={() => api.getState().deleteItem(selectedItem.id)}
          onDuplicate={() => api.getState().duplicateItem(selectedItem.id)}
          onUnschedule={() => api.getState().unschedule(selectedItem.id)}
          onToggleAssignee={(who) =>
            api.getState().toggleAssignee(selectedItem.id, who)
          }
          onResolveConflict={() => {
            api.getState().setActiveDay(selectedItem.start!.slice(0, 10));
            api.getState().requestPlan("resolve-overlap");
          }}
        />
      ) : (
        <RailEmpty
          key="empty"
          title="Nothing selected"
          body="Pick an activity on the grid or a pin on the map to see its times, place, cost and who's going."
        />
      )
    ) : (
      <IdeasRail
        key="ideas"
        trip={trip}
        activeDay={activeDay}
        draggingId={draggingId}
        onSchedule={(ideaId) => {
          const idea = trip.ideas.find((i) => i.id === ideaId);
          if (!idea) return;
          // Drop it where there is room rather than on top of something.
          api.getState().scheduleIdea(ideaId, activeDay, 10 * 60);
        }}
      />
    );

  const rail = (
    <aside className={styles.rail}>
      <RailMap
        activeDay={activeDay}
        stopCount={dayStats.stops}
        walkMinutes={dayStats.walkMinutes}
        expanded={mapExpanded}
        onToggleExpanded={() => setMapExpanded((value) => !value)}
      >
        <PlannerMap
          trip={trip}
          activeDay={activeDay}
          selectedItemId={selectedItemId}
          hoveredItemId={hoveredItemId}
          onSelect={onSelectFromMap}
          onHover={onHover}
          onBackgroundClick={() => api.getState().selectItem(null)}
        />
      </RailMap>

      <RailContext
        tab={railTab}
        onTab={(tab) =>
          setRailOverride({ tab, forSelection: selectedItemId })
        }
        ideaCount={trip.ideas.length}
        advisorFlag={Boolean(assistant.plan) || offers.length > 0}
      >
        {/*
         * Deliberately NOT mode="wait". Selecting a card is the most frequent
         * action in the planner, and waiting for the outgoing panel to animate
         * away before mounting the details made it feel laggy. The incoming
         * panel mounts immediately and cross-fades in its grid cell.
         */}
        <AnimatePresence initial={false}>
          <motion.div
            key={railBody.key}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.14 }}
          >
            {railBody}
          </motion.div>
        </AnimatePresence>
      </RailContext>

      <RailPeople
        trip={trip}
        invited={invite.sent}
        open={peopleOpen}
        onToggle={() => setPeopleOpen((value) => !value)}
      >
        {travellersPanel}
      </RailPeople>
    </aside>
  );

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
      <div className={styles.root} data-planner-ready={hydrated ? "" : undefined}>
        {/* ---------------------------------------------------------------- */}
        {/* Top bar                                                          */}
        {/* ---------------------------------------------------------------- */}
        <header className={styles.topbar}>
          <div className={styles.topbarStart}>
            <Link href="/discover" className={styles.backLink} aria-label="Back to discovery">
              <ArrowLeft size={15} strokeWidth={2} />
            </Link>
            <Mark size={19} />
            <div className={styles.tripMeta}>
              <h1 className={styles.tripName}>{trip.name}</h1>
              <p className={styles.tripDates}>
                {destination ? `${destination.name} · ` : ""}
                {dayLabel(trip.startDate)} – {dayLabel(trip.endDate)}
                <span className={styles.tripDatesExtra}>
                  {" · "}
                  {days.length} days
                </span>
              </p>
            </div>
          </div>

          <div className={styles.topbarEnd}>
            {!isCompact ? (
              <Segmented
                options={[
                  {
                    value: "calendar",
                    label: "Plan",
                    icon: <CalendarDays size={13} strokeWidth={2} />,
                  },
                  {
                    value: "itinerary",
                    label: "Itinerary",
                    icon: <List size={13} strokeWidth={2} />,
                  },
                ]}
                value={view}
                onChange={(value) => api.getState().setView(value as PlannerView)}
                label="Planner view"
                size="sm"
              />
            ) : null}

            <PresenceChip
              trip={trip}
              invited={invite.sent}
              expanded={isCompact ? peopleSheet : peopleOpen}
              onToggle={() =>
                isCompact
                  ? setPeopleSheet((value) => !value)
                  : setPeopleOpen((value) => !value)
              }
            />

            <IconButton
              label="Reset trip to the original plan"
              size="sm"
              variant="ghost"
              className={styles.topbarReset}
              onClick={() => api.getState().resetTrip()}
            >
              <RotateCcw size={14} strokeWidth={2} />
            </IconButton>

            <Button
              variant="primary"
              size="sm"
              className={styles.topbarAdd}
              iconLeft={<Plus size={14} strokeWidth={2.4} />}
              onClick={() => api.getState().openCreate()}
            >
              Add
            </Button>
          </div>
        </header>

        {/* ---------------------------------------------------------------- */}
        {/* Day rail                                                         */}
        {/* ---------------------------------------------------------------- */}
        <div
          className={styles.dayRailWrap}
          style={{ ["--day-count" as string]: days.length }}
        >
          <DayRail
            trip={trip}
            days={days}
            activeDay={activeDay}
            onSelectDay={(day) => api.getState().setActiveDay(day)}
            compact={isCompact}
          />
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Body                                                             */}
        {/* ---------------------------------------------------------------- */}
        <div className={styles.body}>
          {/* Mobile: a map strip that keeps the coupling alive on phones. */}
          {isCompact ? (
            <div
              className={cn(
                styles.mobileMap,
                mobileMapOpen && styles.mobileMapOpen,
              )}
            >
              <PlannerMap
                trip={trip}
                activeDay={activeDay}
                selectedItemId={selectedItemId}
                hoveredItemId={hoveredItemId}
                onSelect={onSelectFromMap}
                onHover={onHover}
                onBackgroundClick={() => api.getState().selectItem(null)}
                /*
                 * The phone strip is short and wide, so vertical padding is
                 * what forces the camera out. At 26/30 a downtown day framed
                 * as far out as New Jersey.
                 */
                padding={{ top: 12, right: 22, bottom: 16, left: 22 }}
              />
              <button
                type="button"
                className={styles.mobileMapToggle}
                onClick={() => setMobileMapOpen((value) => !value)}
              >
                <MapIcon size={12} strokeWidth={2.4} />
                {mobileMapOpen ? "Shrink map" : "Map"}
              </button>
            </div>
          ) : null}

          <main className={styles.schedule}>
            {view === "calendar" && !isCompact ? (
              <Calendar
                trip={trip}
                days={days}
                activeDay={activeDay}
                selectedItemId={selectedItemId}
                hoveredItemId={hoveredItemId}
                draggingId={draggingId}
                hourHeight={hourHeight}
                onSelect={onSelect}
                onOpen={onOpen}
                onHover={onHover}
                onDayFocus={(day) => {
                  if (day !== activeDay) api.getState().setActiveDay(day);
                }}
                onCreate={onCreate}
                onFillGap={onFillGap}
              />
            ) : view === "calendar" && isCompact ? (
              <Calendar
                trip={trip}
                days={days}
                activeDay={activeDay}
                selectedItemId={selectedItemId}
                hoveredItemId={hoveredItemId}
                draggingId={draggingId}
                hourHeight={hourHeight}
                onSelect={onSelect}
                onOpen={onOpen}
                onHover={onHover}
                onDayFocus={(day) => api.getState().setActiveDay(day)}
                onCreate={onCreate}
                onFillGap={onFillGap}
                singleDay
              />
            ) : (
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
            )}
          </main>

          {/* The persistent context and utility rail. */}
          {!isCompact ? rail : null}

          {/* The editor slides in beside the day — never over it. */}
          <AnimatePresence>
            {editor.open && editor.draft && !isCompact ? (
              <div className={styles.editorLayer}>
                <ActivityEditor
                  trip={trip}
                  draft={editor.draft}
                  mode={editor.mode}
                  days={days}
                  onChange={(patch) => api.getState().updateDraft(patch)}
                  onCommit={() => api.getState().commitDraft()}
                  onCancel={() => api.getState().closeEditor()}
                  onDelete={
                    editor.mode === "edit" && editor.draft.id
                      ? () => api.getState().deleteItem(editor.draft!.id!)
                      : undefined
                  }
                />
              </div>
            ) : null}
          </AnimatePresence>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Mobile view switch                                               */}
        {/* ---------------------------------------------------------------- */}
        {isCompact ? (
          <div className={styles.mobileBar}>
            <Segmented
              options={[
                { value: "calendar", label: "Grid" },
                { value: "itinerary", label: "Day" },
              ]}
              value={view}
              onChange={(value) => api.getState().setView(value as PlannerView)}
              label="Planner view"
              size="sm"
              className={styles.mobileSegmented}
            />
            {offers.length > 0 ? (
              <IconButton
                label="Assistant suggestions"
                size="sm"
                variant="ghost"
                onClick={() => api.getState().requestPlan(offers[0].intent)}
              >
                <Sparkles size={15} strokeWidth={2.1} />
              </IconButton>
            ) : null}
            <Button
              variant="primary"
              size="sm"
              iconLeft={<Plus size={14} strokeWidth={2.4} />}
              onClick={() => api.getState().openCreate()}
            >
              Add
            </Button>
          </div>
        ) : null}

        {/* ---------------------------------------------------------------- */}
        {/* Mobile sheets                                                    */}
        {/* ---------------------------------------------------------------- */}
        {isCompact ? (
          <>
            <Sheet
              open={Boolean(selectedItem) && !editor.open && !assistant.plan}
              onClose={() => api.getState().selectItem(null)}
              label="Activity details"
              height={0.7}
            >
              {selectedItem ? (
                <DetailsPanel
                  trip={trip}
                  item={selectedItem}
                  activeDay={activeDay}
                  onEdit={() => api.getState().openEdit(selectedItem.id)}
                  onDelete={() => api.getState().deleteItem(selectedItem.id)}
                  onDuplicate={() => api.getState().duplicateItem(selectedItem.id)}
                  onUnschedule={() => api.getState().unschedule(selectedItem.id)}
                  onToggleAssignee={(who) =>
                    api.getState().toggleAssignee(selectedItem.id, who)
                  }
                  onResolveConflict={() => {
                    api.getState().setActiveDay(selectedItem.start!.slice(0, 10));
                    api.getState().requestPlan("resolve-overlap");
                  }}
                />
              ) : null}
            </Sheet>

            <Sheet
              open={editor.open && Boolean(editor.draft)}
              onClose={() => api.getState().closeEditor()}
              label={editor.mode === "create" ? "Add an activity" : "Edit activity"}
              height={0.92}
              draggable={false}
            >
              {editor.draft ? (
                <ActivityEditor
                  trip={trip}
                  draft={editor.draft}
                  mode={editor.mode}
                  days={days}
                  onChange={(patch) => api.getState().updateDraft(patch)}
                  onCommit={() => api.getState().commitDraft()}
                  onCancel={() => api.getState().closeEditor()}
                  onDelete={
                    editor.mode === "edit" && editor.draft.id
                      ? () => api.getState().deleteItem(editor.draft!.id!)
                      : undefined
                  }
                />
              ) : null}
            </Sheet>

            <Sheet
              open={peopleSheet}
              onClose={() => setPeopleSheet(false)}
              label="Travellers"
              height={0.66}
            >
              {travellersPanel}
            </Sheet>

            <Sheet
              open={Boolean(assistant.plan)}
              onClose={() => api.getState().dismissPlan()}
              label="Assistant suggestion"
              height={0.72}
            >
              {assistant.plan ? (
                <AssistantPlanPanel
                  plan={assistant.plan}
                  applied={assistant.applied}
                  onApplyAll={() => api.getState().applyPlan()}
                  onApplyOne={(id) => api.getState().applyChange(id)}
                  onDismiss={() => api.getState().dismissPlan()}
                  onHoverChange={onHover}
                />
              ) : null}
            </Sheet>
          </>
        ) : null}

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
