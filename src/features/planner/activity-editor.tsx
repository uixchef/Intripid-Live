"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Check, MapPin, Search, X } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Button, IconButton } from "@/components/ui/button";
import {
  Field,
  Input,
  Segmented,
  Stepper,
  Textarea,
} from "@/components/ui/controls";
import { searchNycPlaces, type NycPlace } from "@/data/nyc-places";
import { categoryMeta } from "@/lib/categories";
import { cn } from "@/lib/utils";
import { atMinutes, dayLabel, durationLabel, timeLabel } from "@/lib/trip/time";
import { ITEM_CATEGORIES, type ItemCategory, type Trip } from "@/lib/types";
import type { EditorDraft } from "@/stores/trip-store";

import styles from "./activity-editor.module.css";

/**
 * Create and edit, without leaving the plan.
 *
 * A trailing panel rather than a centred modal. The historical product opened
 * a dialog in the middle of the canvas over the very calendar it claimed to
 * keep you in context with — the principle was right and the execution
 * contradicted it. This slides in beside the day, so the thing you are
 * scheduling around stays visible the whole time.
 *
 * Location search runs against a local dataset of real New York places rather
 * than live geocoding: it is deterministic, instant, works offline, and cannot
 * fail mid-demo. Coordinates are real, so the map pin lands correctly.
 */

const CATEGORY_ORDER: ItemCategory[] = ITEM_CATEGORIES.filter(
  (category) => category !== "transit",
);

export interface ActivityEditorProps {
  trip: Trip;
  draft: EditorDraft;
  mode: "create" | "edit";
  days: string[];
  onChange: (patch: Partial<EditorDraft>) => void;
  onCommit: () => void;
  onCancel: () => void;
  onDelete?: () => void;
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
}: ActivityEditorProps) {
  const reduceMotion = useReducedMotion();
  const [placeQuery, setPlaceQuery] = useState("");
  const [placeOpen, setPlaceOpen] = useState(false);

  const results = useMemo(
    () => searchNycPlaces(placeQuery, 7),
    [placeQuery],
  );

  const titleMissing = draft.title.trim().length === 0;

  /*
   * A blank field on a form you just opened is not a mistake yet. The commit
   * button still gates on `titleMissing`, but the red border and the message
   * wait until the field has been visited — greeting someone with an error
   * for not having typed is the form telling them off for showing up.
   */
  const [titleTouched, setTitleTouched] = useState(false);
  const showTitleError = titleMissing && titleTouched;

  /** HH:MM for the native time input. */
  const timeValue = `${String(Math.floor(draft.startMinutes / 60)).padStart(2, "0")}:${String(
    draft.startMinutes % 60,
  ).padStart(2, "0")}`;

  const endMinutes = draft.startMinutes + draft.durationMin;
  const endsNextDay = endMinutes >= 24 * 60;

  function selectPlace(place: NycPlace) {
    onChange({
      placeId: place.id,
      placeName: place.name,
      placeAddress: place.address,
      placeCoords: place.coords,
      // A blank title takes the venue's name — the common case.
      ...(draft.title.trim().length === 0 ? { title: place.name } : {}),
      // And the venue's category, unless the user already chose one.
      ...(mode === "create" ? { category: place.category } : {}),
    });
    setPlaceQuery("");
    setPlaceOpen(false);
  }

  return (
    <motion.aside
      className={styles.root}
      aria-label={mode === "create" ? "Add an activity" : "Edit activity"}
      initial={{ opacity: 0, x: 28 }}
      animate={{ opacity: 1, x: 0 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 24 }}
      transition={{ duration: reduceMotion ? 0.12 : 0.26, ease: [0.2, 0.8, 0.2, 1] }}
    >
      <header className={styles.head}>
        <div>
          <span className="eyebrow">
            {mode === "create" ? "New activity" : "Editing"}
          </span>
          <h3 className={styles.headTitle}>
            {mode === "create" ? "Add to the plan" : draft.title || "Untitled"}
          </h3>
        </div>
        <IconButton label="Close" size="sm" variant="ghost" onClick={onCancel}>
          <X size={15} strokeWidth={2} />
        </IconButton>
      </header>

      <div className={styles.body}>
        {/* Location first: it is the fact that decides the category, the
            title and where the map flies to. */}
        <div className={styles.locationBlock}>
          <Field
            label="Location"
            hint={
              draft.placeCoords
                ? undefined
                : "Search real New York places — the map pin follows your choice."
            }
          >
            {({ id }) =>
              draft.placeCoords ? (
                <div className={styles.chosenPlace}>
                  <span className={styles.chosenIcon} aria-hidden>
                    <MapPin size={13} strokeWidth={2.1} />
                  </span>
                  <span className={styles.chosenBody}>
                    <span className={styles.chosenName}>{draft.placeName}</span>
                    <span className={styles.chosenAddress}>
                      {draft.placeAddress}
                    </span>
                  </span>
                  <IconButton
                    label="Clear location"
                    size="xs"
                    variant="ghost"
                    onClick={() =>
                      onChange({
                        placeId: null,
                        placeName: "",
                        placeAddress: "",
                        placeCoords: null,
                      })
                    }
                  >
                    <X size={13} strokeWidth={2.2} />
                  </IconButton>
                </div>
              ) : (
                <div className={styles.searchWrap}>
                  <Input
                    id={id}
                    value={placeQuery}
                    placeholder="The Met, Katz's, Prospect Park…"
                    iconLeft={<Search size={13} strokeWidth={2.1} />}
                    onChange={(event) => {
                      setPlaceQuery(event.target.value);
                      setPlaceOpen(true);
                    }}
                    onFocus={() => setPlaceOpen(true)}
                  />
                  {placeOpen ? (
                    <ul className={styles.results}>
                      {results.length === 0 ? (
                        <li className={styles.noResults}>
                          Nothing matches “{placeQuery}”. Try a neighbourhood,
                          or leave it blank and add the address later.
                        </li>
                      ) : (
                        results.map((place) => {
                          const meta = categoryMeta(place.category);
                          const Icon = meta.icon;
                          return (
                            <li key={place.id}>
                              <button
                                type="button"
                                className={styles.result}
                                onClick={() => selectPlace(place)}
                              >
                                <span
                                  className={styles.resultIcon}
                                  style={{
                                    ["--cat-color" as string]: meta.color,
                                  }}
                                  aria-hidden
                                >
                                  <Icon size={12} strokeWidth={2.1} />
                                </span>
                                <span className={styles.resultBody}>
                                  <span className={styles.resultName}>
                                    {place.name}
                                  </span>
                                  <span className={styles.resultMeta}>
                                    {place.kind}
                                    {place.neighbourhood
                                      ? ` · ${place.neighbourhood}`
                                      : ""}
                                  </span>
                                </span>
                              </button>
                            </li>
                          );
                        })
                      )}
                    </ul>
                  ) : null}
                </div>
              )
            }
          </Field>
        </div>

        <Field
          label="What is it?"
          error={
            showTitleError
              ? "Give it a name so the group knows what it is"
              : undefined
          }
        >
          {({ id, invalid }) => (
            <Input
              id={id}
              invalid={invalid}
              value={draft.title}
              placeholder="Dinner at Lilia"
              onChange={(event) => onChange({ title: event.target.value })}
              onBlur={() => setTitleTouched(true)}
            />
          )}
        </Field>

        {/* Category as a swatch grid: colour is the thing being chosen, so
            the control should show colour rather than name it in a select. */}
        <div className={styles.categoryBlock}>
          <p className={styles.blockLabel}>Category</p>
          <div className={styles.categoryGrid} role="radiogroup" aria-label="Category">
            {CATEGORY_ORDER.map((category) => {
              const meta = categoryMeta(category);
              const Icon = meta.icon;
              const selected = draft.category === category;
              return (
                <button
                  key={category}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={cn(
                    styles.categoryChip,
                    selected && styles.categoryChipOn,
                  )}
                  style={{
                    ["--cat-color" as string]: meta.color,
                    ["--cat-soft" as string]: meta.soft,
                  }}
                  onClick={() => onChange({ category })}
                >
                  <Icon size={13} strokeWidth={2.1} />
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className={styles.whenRow}>
          <Field label="Day">
            {({ id }) => (
              <select
                id={id}
                className={styles.select}
                value={draft.day}
                onChange={(event) => onChange({ day: event.target.value })}
              >
                {days.map((day, index) => (
                  <option key={day} value={day}>
                    Day {index + 1} · {dayLabel(day)}
                  </option>
                ))}
              </select>
            )}
          </Field>

          <Field label="Starts">
            {({ id }) => (
              <Input
                id={id}
                type="time"
                step={900}
                value={timeValue}
                onChange={(event) => {
                  const [h, m] = event.target.value.split(":").map(Number);
                  if (Number.isFinite(h) && Number.isFinite(m)) {
                    onChange({ startMinutes: h * 60 + m });
                  }
                }}
              />
            )}
          </Field>
        </div>

        <div className={styles.durationBlock}>
          <p className={styles.blockLabel}>How long?</p>
          <div className={styles.durationRow}>
            <Stepper
              value={draft.durationMin}
              onChange={(value) => onChange({ durationMin: value })}
              min={15}
              max={12 * 60}
              step={15}
              format={durationLabel}
              label="Duration"
            />
            <p className={cn(styles.endsAt, endsNextDay && styles.endsInvalid)}>
              {endsNextDay
                ? "Runs past midnight — shorten it or start earlier"
                : `Ends ${timeLabel(atMinutes(draft.day, endMinutes))}`}
            </p>
          </div>
        </div>

        <div className={styles.flexBlock}>
          <p className={styles.blockLabel}>Can this move?</p>
          <Segmented
            options={[
              { value: "flex", label: "Flexible" },
              { value: "fixed", label: "Fixed time" },
            ]}
            value={draft.flexible ? "flex" : "fixed"}
            onChange={(value) => onChange({ flexible: value === "flex" })}
            label="Flexibility"
            size="sm"
          />
          <p className={styles.fieldNote}>
            {draft.flexible
              ? "The assistant may shift this when it rebalances a day."
              : "Anchored. Nothing will move it automatically — use this for bookings."}
          </p>
        </div>

        <div className={styles.whoBlock}>
          <p className={styles.blockLabel}>Who&rsquo;s going</p>
          <div className={styles.whoList}>
            {trip.travellers.map((traveller) => {
              const on = draft.assignedTo.includes(traveller.id);
              return (
                <button
                  key={traveller.id}
                  type="button"
                  aria-pressed={on}
                  className={cn(styles.whoChip, on && styles.whoChipOn)}
                  onClick={() =>
                    onChange({
                      assignedTo: on
                        ? draft.assignedTo.filter((id) => id !== traveller.id)
                        : [...draft.assignedTo, traveller.id],
                    })
                  }
                >
                  <Avatar traveller={traveller} size="xs" />
                  {traveller.name.split(" ")[0]}
                  {on ? <Check size={11} strokeWidth={3} /> : null}
                </button>
              );
            })}
          </div>
          <p className={styles.fieldNote}>
            {draft.assignedTo.length === 0
              ? "Nobody selected means everyone is going."
              : `${draft.assignedTo.length} of ${trip.travellers.length} going.`}
          </p>
        </div>

        <Field label="Notes" hint="Practical things future-you will thank you for.">
          {({ id }) => (
            <Textarea
              id={id}
              value={draft.notes}
              placeholder="Ask for a table upstairs — the ground floor is loud."
              onChange={(event) => onChange({ notes: event.target.value })}
            />
          )}
        </Field>
      </div>

      <footer className={styles.foot}>
        {mode === "edit" && onDelete ? (
          <Button variant="danger" size="sm" onClick={onDelete}>
            Remove
          </Button>
        ) : null}
        <div className={styles.footEnd}>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={onCommit}
            disabled={titleMissing || endsNextDay}
          >
            {mode === "create" ? "Add to plan" : "Save changes"}
          </Button>
        </div>
      </footer>
    </motion.aside>
  );
}
