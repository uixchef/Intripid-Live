"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { addDays, format } from "date-fns";
import { ArrowRight, CalendarPlus, Search, X } from "lucide-react";

import { suggestPlaces, type PlaceSuggestion } from "@/lib/discovery/geocode";
import { Button, IconButton } from "@/components/ui/button";
import { Input, Segmented } from "@/components/ui/controls";
import { CountryFlag } from "@/components/ui/country-flag";
import { Modal, Popover } from "@/components/ui/overlay";
import { DateRangeField } from "@/features/landing/date-range-field";
import type {
  AvoidPlace,
  AvoidScale,
  FootprintCategory,
  LngLat,
  VisitedLocation,
  WishlistPlace,
} from "@/lib/types";

import { useIsCompact } from "@/lib/use-media-query";

import styles from "./footprint-editor.module.css";

export interface FootprintEditorProps {
  wishlist: WishlistPlace[];
  visited: VisitedLocation[];
  avoids: AvoidPlace[];
  onAddWishlist: (place: WishlistPlace) => void;
  onAddVisited: (place: VisitedLocation) => void;
  onAddAvoid: (place: AvoidPlace) => void;
  onRemove: (category: FootprintCategory, id: string) => void;
  selectedId?: string | null;
  onSelectPlace: (place: { id: string; coords: LngLat; zoom: number }) => void;
  onPlanTrip: (place: {
    id: string;
    name: string;
    coords: LngLat;
    start: string;
    end: string;
  }) => void;
  /** Open on this bucket — used when arriving from Completed. */
  initialCategory?: FootprintCategory;
  onScroll?: (event: { currentTarget: EventTarget & HTMLElement }) => void;
}

const CATEGORIES: { value: FootprintCategory; label: string }[] = [
  { value: "wishlist", label: "Wishlist" },
  { value: "visited", label: "Visited" },
  { value: "avoid", label: "Avoid" },
];

/**
 * Add or remove places on the identity globe.
 *
 * Three buckets, one search. The geocoder returns city, state or country.
 *
 * Calendar on a row is Plan: confirm dates, then open the planner for that
 * place. Avoid and Home do not plan.
 */
export function FootprintEditor({
  wishlist,
  visited,
  avoids,
  onAddWishlist,
  onAddVisited,
  onAddAvoid,
  onRemove,
  selectedId,
  onSelectPlace,
  onPlanTrip,
  initialCategory = "wishlist",
  onScroll,
}: FootprintEditorProps) {
  const listId = useId();
  const searchRef = useRef<HTMLInputElement>(null);
  const isCompact = useIsCompact();
  const [category, setCategory] = useState<FootprintCategory>(initialCategory);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [draft, setDraft] = useState<{
    id: string;
    name: string;
    coords: LngLat;
    start: string;
    end: string;
  } | null>(null);

  useEffect(() => {
    if (isCompact) return;
    searchRef.current?.focus();
  }, [isCompact]);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setSearching(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setSearching(true);
      void suggestPlaces(trimmed)
        .then(setSuggestions)
        .finally(() => setSearching(false));
    }, 280);

    return () => window.clearTimeout(timer);
  }, [query]);

  const counts = {
    wishlist: wishlist.length,
    visited: visited.length,
    avoid: avoids.length,
  };

  const rows =
    category === "wishlist"
      ? wishlist.map((place) => ({
          id: place.id,
          name: place.name,
          meta: "City",
          countryCode: place.countryCode,
          coords: place.coords,
          zoom: 7.4,
          locked: false,
        }))
      : category === "visited"
        ? visited.map((place) => ({
            id: place.id,
            name: place.name,
            meta:
              place.kind === "home"
                ? "Home"
                : place.kind === "transit"
                  ? "Transit"
                  : "Visited",
            countryCode: place.countryCode,
            coords: place.coords,
            zoom: 7.4,
            locked: place.kind === "home",
          }))
        : avoids.map((place) => ({
            id: place.id,
            name: place.name,
            meta: labelForScale(place.scale),
            countryCode: place.iso2,
            coords: place.coords,
            zoom: zoomForScale(place.scale),
            locked: false,
          }));

  function addSuggestion(suggestion: PlaceSuggestion) {
    addNamed(
      suggestion.name,
      suggestion.scale,
      suggestion.coords,
      suggestion.iso2,
    );
    setQuery("");
    setSuggestions([]);
  }

  function addNamed(
    name: string,
    scale: AvoidScale,
    coords: { lng: number; lat: number },
    iso2?: string,
  ) {
    const id = slug(
      `${category}-${name}-${coords.lng.toFixed(2)}-${coords.lat.toFixed(2)}`,
    );
    if (category === "wishlist") {
      onAddWishlist({ id, name, coords, countryCode: iso2 });
    } else if (category === "visited") {
      onAddVisited({ id, name, coords, kind: "visited", countryCode: iso2 });
    } else {
      onAddAvoid({
        id,
        name,
        scale,
        coords,
        iso2,
        radiusKm: scale === "city" ? 45 : scale === "country" ? 90 : 0,
      });
    }
    onSelectPlace({
      id,
      coords,
      zoom: zoomForScale(scale),
    });
  }

  return (
    <aside className={styles.panel} aria-label="Travel history">
      <Segmented
        label="Place category"
        size="sm"
        value={category}
        onChange={setCategory}
        options={CATEGORIES.map((item) => ({
          ...item,
          count: counts[item.value],
        }))}
      />

      <div className={styles.search}>
        <Input
          ref={searchRef}
          fieldLabel="Add a place"
          placeholder="Search by place, search by country…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          iconLeft={<Search size={14} strokeWidth={2.1} />}
          autoComplete="off"
          role="combobox"
          aria-expanded={suggestions.length > 0}
          aria-controls={listId}
        />
        {suggestions.length > 0 ? (
          <ul id={listId} className={styles.suggest} role="listbox">
            {suggestions.map((suggestion) => (
              <li key={suggestion.id}>
                <button
                  type="button"
                  className={styles.suggestItem}
                  onClick={() => addSuggestion(suggestion)}
                >
                  <CountryFlag
                    code={suggestion.iso2}
                    label={suggestion.name}
                    size={28}
                  />
                  <span className={styles.suggestCopy}>
                    <span className={styles.suggestName}>{suggestion.name}</span>
                    <span className={styles.suggestMeta}>
                      {labelForScale(suggestion.scale)} · {suggestion.detail}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : query.trim().length >= 2 && !searching ? (
          <p className={styles.emptySearch}>
            No matches. Try a country or city name.
          </p>
        ) : null}
      </div>

      <ul className={styles.list} onScroll={onScroll}>
        {rows.length === 0 ? (
          <li className={styles.empty}>Nothing in this bucket yet.</li>
        ) : (
          rows.map((row) => (
            <li
              key={row.id}
              className={styles.row}
              data-active={selectedId === row.id ? "" : undefined}
            >
              <button
                type="button"
                className={styles.rowHit}
                aria-current={selectedId === row.id ? "true" : undefined}
                aria-label={`Show ${row.name} on the map`}
                onClick={() =>
                  onSelectPlace({
                    id: row.id,
                    coords: row.coords,
                    zoom: row.zoom,
                  })
                }
              >
                <CountryFlag
                  code={row.countryCode}
                  label={row.name}
                  size={36}
                />
                <div className={styles.rowCopy}>
                  <p className={styles.rowName}>{row.name}</p>
                  <span
                    className={styles.chip}
                    data-tone={category}
                    data-kind={row.meta.toLowerCase()}
                  >
                    {row.meta}
                  </span>
                </div>
              </button>
              {row.locked ? (
                <span className={styles.locked}>Home</span>
              ) : (
                <>
                  {category === "avoid" ? null : (
                    <ActionTip text="Plan a trip">
                      <IconButton
                        label={`Plan a trip to ${row.name}`}
                        title=""
                        size="sm"
                        variant="ghost"
                        className={styles.plan}
                        onClick={(event) => {
                          event.stopPropagation();
                          const range = upcomingStay();
                          setDraft({
                            id: row.id,
                            name: row.name,
                            coords: row.coords,
                            start: range.start,
                            end: range.end,
                          });
                        }}
                      >
                        <CalendarPlus size={14} strokeWidth={2.2} />
                      </IconButton>
                    </ActionTip>
                  )}
                  <ActionTip text={removeTip(category)}>
                    <IconButton
                      label={`Remove ${row.name}`}
                      title=""
                      size="sm"
                      variant="ghost"
                      className={styles.remove}
                      onClick={() => onRemove(category, row.id)}
                    >
                      <X size={14} strokeWidth={2.2} />
                    </IconButton>
                  </ActionTip>
                </>
              )}
            </li>
          ))
        )}
      </ul>

      <PlanTripModal
        draft={draft}
        onClose={() => setDraft(null)}
        onChangeDates={(start, end) =>
          setDraft((current) => (current ? { ...current, start, end } : null))
        }
        onConfirm={() => {
          if (!draft || draft.end < draft.start) return;
          onPlanTrip(draft);
          setDraft(null);
        }}
      />
    </aside>
  );
}

function ActionTip({
  text,
  children,
}: {
  text: string;
  children: ReactNode;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const delay = useRef(0);

  function show() {
    window.clearTimeout(delay.current);
    delay.current = window.setTimeout(() => setOpen(true), 280);
  }

  function hide() {
    window.clearTimeout(delay.current);
    setOpen(false);
  }

  useEffect(() => () => window.clearTimeout(delay.current), []);

  return (
    <>
      <span
        ref={setAnchor}
        className={styles.tipAnchor}
        onPointerEnter={show}
        onPointerLeave={hide}
        onFocusCapture={show}
        onBlurCapture={hide}
      >
        {children}
      </span>
      <Popover
        open={open}
        onClose={hide}
        anchor={anchor}
        placement="top"
        align="center"
        offset={6}
        label={text}
        overflowVisible
        tone="dark"
        className={styles.tip}
      >
        {text}
      </Popover>
    </>
  );
}

function removeTip(category: FootprintCategory) {
  if (category === "wishlist") return "Remove from wishlist";
  if (category === "visited") return "Remove from visited";
  return "Remove from avoid";
}

function upcomingStay() {
  const start = addDays(new Date(), 14);
  return {
    start: format(start, "yyyy-MM-dd"),
    end: format(addDays(start, 4), "yyyy-MM-dd"),
  };
}

function PlanTripModal({
  draft,
  onClose,
  onChangeDates,
  onConfirm,
}: {
  draft: {
    id: string;
    name: string;
    coords: LngLat;
    start: string;
    end: string;
  } | null;
  onClose: () => void;
  onChangeDates: (start: string, end: string) => void;
  onConfirm: () => void;
}) {
  const invalid = Boolean(draft && draft.end < draft.start);

  return (
    <Modal
      open={Boolean(draft)}
      onClose={onClose}
      label={draft ? `Plan a trip to ${draft.name}` : "Plan a trip"}
      width={480}
    >
      {draft ? (
        <div className={styles.planDialog}>
          <div className={styles.planCopy}>
            <h2 className={styles.planHeading}>Plan a trip to {draft.name}?</h2>
            <p className={styles.planLede}>
              Confirm the dates and we&apos;ll open the trip builder with this
              place already set.
            </p>
          </div>
          <DateRangeField
            start={draft.start}
            end={draft.end}
            onChange={onChangeDates}
            tone="outlined"
            invalid={invalid}
            className={styles.planDates}
          />
          {invalid ? (
            <p className={styles.planError} role="alert">
              The end date is before the start date.
            </p>
          ) : null}
          <div className={styles.planActions}>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={invalid}
              iconRight={<ArrowRight size={14} strokeWidth={2.4} />}
              onClick={onConfirm}
            >
              Open planner
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

function zoomForScale(scale: AvoidScale) {
  if (scale === "continent") return 1.85;
  if (scale === "country") return 3.6;
  if (scale === "state") return 5.4;
  return 7.4;
}

function labelForScale(scale: AvoidScale) {
  if (scale === "continent") return "Continent";
  if (scale === "country") return "Country";
  if (scale === "state") return "State";
  return "City";
}

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
