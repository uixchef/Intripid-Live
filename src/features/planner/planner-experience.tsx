"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { tripDayKeys } from "@/lib/trip/schedule";
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
import { InviteModal, PresenceBar } from "./collaborators";
import { EventCard } from "./event-card";
import { Itinerary } from "./itinerary";
import { PlannerMap } from "./planner-map";
import { DetailsPanel, IdeasRail } from "./side-panel";

import styles from "./planner-experience.module.css";

/**
 * The Trip Planner.
 *
 * Composition: the schedule leads, the map sits permanently beside it, and a
 * context column below the map carries whatever you are currently working
 * with — ideas, the selected stop, or the assistant's proposal. Nothing that
 * matters lives in a modal over the day.
 *
 * On mobile this becomes a single column with a collapsible map strip above
 * the day, which fixes the historical product's worst regression: on phones
 * the map was demoted behind a floating button and the map/schedule coupling
 * was lost entirely.
 */

type PanelTab = "ideas" | "details" | "assistant";

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

  const [panelOverride, setPanelOverride] = useState<PanelTab | null>(null);
  const [mobileMapOpen, setMobileMapOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const days = useMemo(() => tripDayKeys(trip), [trip]);
  const destination = getDestination(trip.destinationId);
  const hourHeight = isShort ? HOUR_HEIGHT_SHORT : HOUR_HEIGHT;

  /**
   * Rehydrate persisted edits after mount rather than during render, so the
   * server markup and the first client render agree. Without this, a refresh
   * after editing throws a hydration mismatch.
   */
  useEffect(() => {
    const store = api as unknown as {
      persist?: { rehydrate: () => Promise<void> | void };
    };
    const done = store.persist?.rehydrate();
    if (done && typeof (done as Promise<void>).then === "function") {
      void (done as Promise<void>).then(() => setHydrated(true));
    } else {
      setHydrated(true);
    }
  }, [api]);

  const offers = useMemo(
    () => offersForDay(trip, activeDay),
    [trip, activeDay],
  );

  // Which context panel is showing. Selecting something is a strong enough
  // signal to override whatever tab was last pinned.
  const panel: PanelTab = assistant.plan
    ? "assistant"
    : (panelOverride ?? (selectedItem ? "details" : "ideas"));

  useEffect(() => {
    if (selectedItemId) setPanelOverride(null);
  }, [selectedItemId]);

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

  const contextPanel = (
    <div className={styles.contextPanel}>
      {!assistant.plan ? (
        <div className={styles.panelTabs}>
          <Segmented
            options={[
              { value: "ideas", label: `Ideas ${trip.ideas.length}` },
              { value: "details", label: "Selected" },
            ]}
            value={panel === "details" ? "details" : "ideas"}
            onChange={(value) => {
              setPanelOverride(value as PanelTab);
              if (value === "ideas") api.getState().selectItem(null);
            }}
            label="Context panel"
            size="sm"
          />
        </div>
      ) : null}

      <div className={styles.panelContent}>
        <AnimatePresence mode="wait" initial={false}>
          {panel === "assistant" && assistant.plan ? (
            <AssistantPlanPanel
              key={assistant.plan.id}
              plan={assistant.plan}
              applied={assistant.applied}
              onApplyAll={() => api.getState().applyPlan()}
              onApplyOne={(id) => api.getState().applyChange(id)}
              onDismiss={() => api.getState().dismissPlan()}
              onHoverChange={onHover}
            />
          ) : panel === "details" && selectedItem ? (
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
            />
          ) : (
            <motion.div
              key="ideas"
              className={styles.panelScroll}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
            >
              <AssistantOffers
                offers={offers}
                onRequest={(intent) => api.getState().requestPlan(intent)}
              />
              <div className={styles.panelDivider} />
              <IdeasRail
                trip={trip}
                activeDay={activeDay}
                draggingId={draggingId}
                onSchedule={(ideaId) => {
                  const idea = trip.ideas.find((i) => i.id === ideaId);
                  if (!idea) return;
                  // Drop it where there is room rather than on top of
                  // something: the first gap, else late morning.
                  api.getState().scheduleIdea(ideaId, activeDay, 10 * 60);
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
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

            <PresenceBar
              trip={trip}
              invited={invite.sent}
              onInvite={() => api.getState().openInvite()}
              onFocusItem={(id) => api.getState().selectItem(id, "calendar")}
            />

            <IconButton
              label="Reset trip to the original plan"
              size="sm"
              variant="ghost"
              onClick={() => api.getState().resetTrip()}
            >
              <RotateCcw size={14} strokeWidth={2} />
            </IconButton>

            <Button
              variant="primary"
              size="sm"
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
                padding={{ top: 32, right: 28, bottom: 32, left: 28 }}
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

          {/* Desktop right column: map on top, context below. */}
          {!isCompact ? (
            <aside className={styles.rightColumn}>
              <div className={styles.mapPane}>
                <PlannerMap
                  trip={trip}
                  activeDay={activeDay}
                  selectedItemId={selectedItemId}
                  hoveredItemId={hoveredItemId}
                  onSelect={onSelectFromMap}
                  onHover={onHover}
                  onBackgroundClick={() => api.getState().selectItem(null)}
                />
              </div>
              {contextPanel}
            </aside>
          ) : null}

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
