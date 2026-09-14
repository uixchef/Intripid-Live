"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { LocateFixed } from "lucide-react";

import { AvatarStack } from "@/components/ui/avatar";
import { IconButton } from "@/components/ui/button";
import { getDestination } from "@/data/destinations";
import { photosForPlaces } from "@/data/place-photos";
import { HomePin, PinPreview, PlacePin } from "@/components/map/map-pins";
import { MapCamera, MapMarker, MapRoute, MapSurface, useMap } from "@/components/map/map-surface";
import { cn } from "@/lib/utils";
import { categoryMeta } from "@/lib/categories";
import { guestsForItem, routeForDay, stayForDay } from "@/lib/trip/schedule";
import {
  durationLabel,
  durationMinutes,
  timeRangeLabel,
  type ClockFormat,
} from "@/lib/trip/time";
import type { ItineraryItem, LngLat, Place, Trip } from "@/lib/types";
import { useTrip } from "@/stores/trip-store";

import styles from "./planner-map.module.css";

/**
 * The map half of the planner.
 *
 * The route line is the day's schedule order. Every other itinerary place
 * stays on the map (dimmed) so the field matches discovery's city shortlist.
 * Stops use the same photo pins as destination discovery; the stay uses the
 * home pin.
 */

export interface PlannerMapProps {
  trip: Trip;
  activeDay: string;
  selectedItemId: string | null;
  hoveredItemId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  onBackgroundClick: () => void;
  onOpen?: (id: string) => void;
  /**
   * Compact map: a bottom carousel of stop cards.
   * Desktop rail map stays pin + hover preview only.
   */
  deck?: boolean;
  /** Extra padding when chrome covers part of the map. */
  padding?: { top: number; right: number; bottom: number; left: number };
}

export function PlannerMap({
  trip,
  activeDay,
  selectedItemId,
  hoveredItemId,
  onSelect,
  onHover,
  onBackgroundClick,
  onOpen,
  deck = false,
  padding,
}: PlannerMapProps) {
  const reduceMotion = useReducedMotion();
  const clock = useTrip((s) => s.prefs.timeFormat);
  const [cameraRevision, setCameraRevision] = useState(0);
  const [mapPeekId, setMapPeekId] = useState<string | null>(null);

  const stops = useMemo(() => routeForDay(trip, activeDay), [trip, activeDay]);
  const stay = stayForDay(trip, activeDay);
  const restStops = useMemo(() => {
    const today = new Set(stops.map((stop) => stop.item.id));
    return trip.items.filter(
      (item) =>
        item.kind === "activity" &&
        item.place &&
        !today.has(item.id),
    );
  }, [stops, trip.items]);

  const routePoints = useMemo<LngLat[]>(
    () => stops.map((stop) => stop.place.coords),
    [stops],
  );
  const tripPoints = useMemo<LngLat[]>(() => {
    const points = [
      ...routePoints,
      ...restStops.flatMap((item) => (item.place ? [item.place.coords] : [])),
    ];
    return points;
  }, [routePoints, restStops]);

  const destination = getDestination(trip.destinationId);
  const ideaPins = useMemo(
    () => trip.ideas.filter((idea) => idea.place).slice(0, 12),
    [trip.ideas],
  );
  const ideaPoints = useMemo(
    () => ideaPins.flatMap((idea) => (idea.place ? [idea.place.coords] : [])),
    [ideaPins],
  );
  const pinPhotos = useMemo(
    () =>
      photosForPlaces(
        [
          ...stops.map((stop) => ({
            id: stop.item.id,
            name: stop.place.name,
            title: stop.item.title,
            coords: stop.place.coords,
          })),
          ...restStops.flatMap((item) =>
            item.place
              ? [
                  {
                    id: item.id,
                    name: item.place.name,
                    title: item.title,
                    coords: item.place.coords,
                  },
                ]
              : [],
          ),
          ...ideaPins.flatMap((idea) =>
            idea.place
              ? [
                  {
                    id: idea.id,
                    name: idea.place.name,
                    title: idea.title,
                    coords: idea.place.coords,
                  },
                ]
              : [],
          ),
          ...(stay?.place
            ? [
                {
                  id: stay.id,
                  name: stay.place.name,
                  title: stay.title,
                  coords: stay.place.coords,
                },
              ]
            : []),
        ],
        trip.destinationId,
      ),
    [stops, restStops, ideaPins, stay, trip.destinationId],
  );

  const selected = stops.find((stop) => stop.item.id === selectedItemId);
  const peekedStop =
    stops.find((stop) => stop.item.id === mapPeekId) ??
    restStops
      .filter((item) => item.place)
      .map((item) => ({
        item,
        place: item.place!,
        letter: "",
        index: -1,
      }))
      .find((stop) => stop.item.id === mapPeekId);
  const peekedIdea = ideaPins.find((idea) => idea.id === mapPeekId);

  /**
   * Camera: a selected stop takes the frame; otherwise the whole itinerary.
   * Discovery already showed every place in the city — the planner map
   * should not hide the rest of the week behind today's two pins.
   */
  const camera = useMemo(() => {
    if (selected) {
      return { center: selected.place.coords, zoom: 13.6, fit: null };
    }
    if (tripPoints.length > 0) {
      return { center: null, zoom: undefined, fit: tripPoints };
    }
    if (stay?.place) {
      return { center: stay.place.coords, zoom: 13, fit: null };
    }
    if (ideaPoints.length > 0) {
      return { center: null, zoom: undefined, fit: ideaPoints };
    }
    if (destination) {
      return { center: destination.coords, zoom: destination.zoom, fit: null };
    }
    return { center: { lng: 12, lat: 22 }, zoom: 1.6, fit: null };
  }, [selected, tripPoints, stay, ideaPoints, destination]);

  return (
    <div className={styles.root} data-deck={deck ? "" : undefined}>
      <MapSurface
        center={destination?.coords ?? { lng: 12, lat: 22 }}
        zoom={destination?.zoom ?? 1.6}
        /* Street names help when the day involves walking between stops. */
        labels={{ poi: false, roads: true, places: true }}
        onBackgroundClick={onBackgroundClick}
      >
        <MapCamera
          center={camera.center}
          zoom={camera.zoom}
          fit={camera.fit}
          /*
           * Tight padding, because the rail's map pane is 264px tall: at 48px
           * a side the camera had to zoom out past New Jersey to satisfy the
           * fit, which put the whole day's route in the middle third of the
           * frame.
           */
          padding={
            padding ??
            (deck
              ? { top: 56, right: 24, bottom: 196, left: 24 }
              : { top: 26, right: 24, bottom: 26, left: 24 })
          }
          maxZoom={15}
          revision={cameraRevision}
        />

        <RelocateControl
          points={
            stay?.place
              ? [...tripPoints, stay.place.coords]
              : tripPoints.length > 0
                ? tripPoints
                : ideaPoints
          }
          onRelocate={() => setCameraRevision((value) => value + 1)}
        />

        {routePoints.length >= 2 ? (
          <MapRoute points={routePoints} color="#6438d1" width={2.5} opacity={0.8} />
        ) : null}

        {/* The stay is the day's anchor point, drawn differently from stops. */}
        {stay?.place ? (
          <MapMarker
            coords={stay.place.coords}
            z={5}
            anchor="center"
            label={stay.title}
            eventId={stay.id}
            onClick={() => onSelect(stay.id)}
          >
            <HomePin title={stay.title} />
          </MapMarker>
        ) : null}

        {stops.map((stop) => {
          const isSelected = selectedItemId === stop.item.id;
          const isHovered = hoveredItemId === stop.item.id;
          const dimmed = Boolean(selectedItemId) && !isSelected;

          return (
            <MapMarker
              key={stop.item.id}
              coords={stop.place.coords}
              z={isSelected ? 60 : isHovered ? 50 : 20 - stop.index}
              anchor="center"
              label={`${stop.letter}. ${stop.item.title}`}
              eventId={stop.item.id}
              onClick={() => onSelect(stop.item.id)}
            >
              <motion.span
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  duration: reduceMotion ? 0.14 : 0.28,
                  ease: [0.34, 1.4, 0.64, 1],
                  delay: reduceMotion ? 0 : Math.min(stop.index * 0.04, 0.3),
                }}
              >
                <PlacePin
                  src={pinPhotos[stop.item.id] ?? "/discovery/pins/place.png"}
                  active={isSelected || isHovered}
                  dimmed={dimmed}
                  onPointerEnter={() => {
                    onHover(stop.item.id);
                    if (!deck) setMapPeekId(stop.item.id);
                  }}
                  onPointerLeave={() => {
                    onHover(null);
                    if (!deck) setMapPeekId(null);
                  }}
                />
              </motion.span>
            </MapMarker>
          );
        })}

        {restStops.map((item) =>
          item.place ? (
            <MapMarker
              key={item.id}
              coords={item.place.coords}
              z={hoveredItemId === item.id ? 50 : 14}
              anchor="center"
              label={item.title}
              eventId={item.id}
              onClick={() => onSelect(item.id)}
            >
              <PlacePin
                src={pinPhotos[item.id] ?? "/discovery/pins/place.png"}
                dimmed
                onPointerEnter={() => {
                  onHover(item.id);
                  if (!deck) setMapPeekId(item.id);
                }}
                onPointerLeave={() => {
                  onHover(null);
                  if (!deck) setMapPeekId(null);
                }}
              />
            </MapMarker>
          ) : null,
        )}

        {ideaPins.map((idea) =>
          idea.place ? (
            <MapMarker
              key={idea.id}
              coords={idea.place.coords}
              z={hoveredItemId === idea.id ? 50 : 12}
              anchor="center"
              label={idea.title}
              eventId={idea.id}
            >
              <PlacePin
                src={pinPhotos[idea.id] ?? "/discovery/pins/place.png"}
                active={hoveredItemId === idea.id}
                dimmed
                onPointerEnter={() => {
                  onHover(idea.id);
                  if (!deck) setMapPeekId(idea.id);
                }}
                onPointerLeave={() => {
                  onHover(null);
                  if (!deck) setMapPeekId(null);
                }}
              />
            </MapMarker>
          ) : null,
        )}
      </MapSurface>

      {!deck && peekedStop ? (
        <PinPreview
          eventId={peekedStop.item.id}
          photo={pinPhotos[peekedStop.item.id] ?? "/discovery/pins/place.png"}
          kicker={
            peekedStop.letter
              ? `${peekedStop.letter.toUpperCase()} · ${categoryMeta(peekedStop.item.category).label}`
              : categoryMeta(peekedStop.item.category).label
          }
          title={peekedStop.item.title}
          subtitle={[
            peekedStop.place.name,
            peekedStop.item.start && peekedStop.item.end
              ? timeRangeLabel(
                  peekedStop.item.start,
                  peekedStop.item.end,
                  clock,
                )
              : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        />
      ) : !deck && peekedIdea?.place ? (
        <PinPreview
          eventId={peekedIdea.id}
          photo={pinPhotos[peekedIdea.id] ?? "/discovery/pins/place.png"}
          kicker="Idea"
          title={peekedIdea.title}
          subtitle={peekedIdea.place.name}
        />
      ) : null}

      {deck ? (
        <MapDeck
          trip={trip}
          selectedItemId={selectedItemId}
          stay={stay}
          stops={stops}
          photos={pinPhotos}
          clock={clock}
          onSelect={onSelect}
          onOpen={onOpen}
        />
      ) : null}

      {stops.length === 0 && !deck ? (
        <div className={styles.emptyNote} role="note">
          <p className={styles.emptyTitle}>
            {ideaPins.length > 0
              ? `Ideas in ${destination?.name ?? "this city"}`
              : "Nothing mapped for this day"}
          </p>
          <p className={styles.emptyBody}>
            {ideaPins.length > 0
              ? "Drag a pin from the idea board onto the calendar to put it on the day."
              : "Add a stop with a location and it appears here, joined into the day's route."}
          </p>
        </div>
      ) : null}
    </div>
  );
}

type DayStop = ReturnType<typeof routeForDay>[number];

function MapDeck({
  trip,
  selectedItemId,
  stay,
  stops,
  photos,
  clock,
  onSelect,
  onOpen,
}: {
  trip: Trip;
  selectedItemId: string | null;
  stay: ItineraryItem | null;
  stops: DayStop[];
  photos: Record<string, string>;
  clock: ClockFormat;
  onSelect: (id: string) => void;
  onOpen?: (id: string) => void;
}) {
  const cardsRef = useRef<HTMLDivElement>(null);
  const skipScroll = useRef(true);

  useLayoutEffect(() => {
    const scroller = cardsRef.current;
    if (!scroller || !selectedItemId) return;
    if (skipScroll.current) {
      skipScroll.current = false;
      scroller.scrollLeft = 0;
      return;
    }
    const card = scroller.querySelector(
      `[data-map-card="${CSS.escape(selectedItemId)}"]`,
    );
    if (card instanceof HTMLElement) {
      card.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
    }
  }, [selectedItemId]);

  const stayOnDay = Boolean(stay?.place);

  return (
    <div className={styles.deck} data-no-swipe="">
      <div ref={cardsRef} className={styles.cards} aria-label="Stops this day">
        {stayOnDay && stay?.place ? (
          <MapStopCard
            id={stay.id}
            letter="Stay"
            categoryLabel=""
            title={stay.title}
            place={stay.place}
            item={stay}
            trip={trip}
            photo={photos[stay.id] ?? "/discovery/pins/home.svg"}
            selected={selectedItemId === stay.id}
            clock={clock}
            onSelect={onSelect}
            onOpen={onOpen}
          />
        ) : null}
        {stops.map((stop) => (
          <MapStopCard
            key={stop.item.id}
            id={stop.item.id}
            letter={stop.letter.toUpperCase()}
            categoryLabel={categoryMeta(stop.item.category).label}
            title={stop.item.title}
            place={stop.place}
            item={stop.item}
            trip={trip}
            photo={photos[stop.item.id] ?? "/discovery/pins/place.png"}
            selected={selectedItemId === stop.item.id}
            clock={clock}
            onSelect={onSelect}
            onOpen={onOpen}
          />
        ))}
        {!stayOnDay && stops.length === 0 ? (
          <div className={styles.emptyCard} role="note">
            <p className={styles.emptyCardTitle}>Nothing mapped this day</p>
            <p className={styles.emptyCardBody}>
              Add a stop with a location and it shows up here on the route.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function MapStopCard({
  id,
  letter,
  categoryLabel,
  title,
  place,
  item,
  trip,
  photo,
  selected,
  clock,
  onSelect,
  onOpen,
}: {
  id: string;
  letter: string;
  categoryLabel: string;
  title: string;
  place: Place;
  item: ItineraryItem;
  trip: Trip;
  photo: string;
  selected: boolean;
  clock: ClockFormat;
  onSelect: (id: string) => void;
  onOpen?: (id: string) => void;
}) {
  const guests = guestsForItem(item, trip);
  const time =
    item.start && item.end ? timeRangeLabel(item.start, item.end, clock) : null;
  const length =
    item.start && item.end
      ? durationLabel(durationMinutes(item.start, item.end))
      : null;
  const meta = categoryMeta(item.category);

  return (
    <button
      type="button"
      data-map-card={id}
      data-event={id}
      data-event-card=""
      className={cn(styles.card, selected && styles.cardOn)}
      style={{ ["--cat-color" as string]: meta.color }}
      aria-current={selected ? "true" : undefined}
      aria-label={`${letter}. ${title}${time ? `, ${time}` : ""}`}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={() => {
        if (selected && onOpen) onOpen(id);
        else onSelect(id);
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className={styles.cardPhoto}
        src={photo}
        alt=""
        width={92}
        height={112}
        onError={(event) => {
          event.currentTarget.src = "/discovery/pins/place.png";
        }}
      />
      <span className={styles.cardBody}>
        <span className={styles.cardKicker}>
          {categoryLabel ? `${letter} · ${categoryLabel}` : letter}
        </span>
        <span className={styles.cardTitle}>{title}</span>
        {time ? (
          <span className={cn(styles.cardTime, "tabular")}>
            {time}
            {length ? ` · ${length}` : ""}
          </span>
        ) : null}
        <span className={styles.cardPlace}>{place.name}</span>
        {place.address ? (
          <span className={styles.cardAddress}>{place.address}</span>
        ) : null}
        {item.subtitle ? (
          <span className={styles.cardNote}>{item.subtitle}</span>
        ) : null}
        {guests.length > 0 ? (
          <span className={styles.cardWho}>
            <AvatarStack travellers={guests} size="xs" max={4} />
          </span>
        ) : null}
      </span>
    </button>
  );
}

/**
 * Shown after a pan or zoom leaves the day's stops off-screen. Clicking it
 * re-runs the same camera the map uses on load / selection — fit the route,
 * or the selected stop if one is framed.
 */
function RelocateControl({
  points,
  onRelocate,
}: {
  points: LngLat[];
  onRelocate: () => void;
}) {
  const { map, ready } = useMap();
  const [lost, setLost] = useState(false);
  const pointsKey = points
    .map((point) => `${point.lng.toFixed(5)},${point.lat.toFixed(5)}`)
    .join("|");

  useEffect(() => {
    if (!ready || points.length === 0) {
      setLost(false);
      return;
    }

    const onMoveEnd = (event: { originalEvent?: Event }) => {
      if (!event.originalEvent) {
        setLost(false);
        return;
      }
      const bounds = map.getBounds();
      if (!bounds) return;
      setLost(points.some((point) => !bounds.contains([point.lng, point.lat])));
    };

    map.on("moveend", onMoveEnd);
    return () => {
      map.off("moveend", onMoveEnd);
    };
  }, [map, ready, points, pointsKey]);

  if (!lost) return null;

  return (
    <IconButton
      label="Re-centre on this day's route"
      size="md"
      variant="secondary"
      className={styles.relocate}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        setLost(false);
        onRelocate();
      }}
    >
      <LocateFixed size={16} strokeWidth={2.1} />
    </IconButton>
  );
}
