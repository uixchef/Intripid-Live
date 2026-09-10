"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Bed } from "lucide-react";

import { MapCamera, MapMarker, MapRoute, MapSurface } from "@/components/map/map-surface";
import { categoryMeta } from "@/lib/categories";
import { cn } from "@/lib/utils";
import { routeForDay, stayForDay } from "@/lib/trip/schedule";
import { timeLabelCompact } from "@/lib/trip/time";
import type { LngLat, Trip } from "@/lib/types";

import styles from "./planner-map.module.css";

/**
 * The map half of the planner.
 *
 * Coupling is bidirectional and cheap: the route line IS the day's schedule
 * order, and each stop carries the same letter as its card in the itinerary.
 * Identity by letter rather than by highlight means the connection survives
 * when nothing is selected — you can read the day off the map without
 * touching anything.
 */

export interface PlannerMapProps {
  trip: Trip;
  activeDay: string;
  selectedItemId: string | null;
  hoveredItemId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  onBackgroundClick: () => void;
  /** Extra bottom padding when a sheet covers part of the map. */
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
  padding,
}: PlannerMapProps) {
  const reduceMotion = useReducedMotion();

  const stops = useMemo(() => routeForDay(trip, activeDay), [trip, activeDay]);
  const stay = stayForDay(trip, activeDay);

  const routePoints = useMemo<LngLat[]>(
    () => stops.map((stop) => stop.place.coords),
    [stops],
  );

  const selected = stops.find((stop) => stop.item.id === selectedItemId);

  /**
   * Camera: a selected stop takes the frame; otherwise hold the whole day.
   * Moving the camera on selection is the map's half of the conversation —
   * it shows where this stop sits relative to the rest of the day.
   */
  const camera = useMemo(() => {
    if (selected) {
      /*
       * Close enough to read the streets, wide enough to keep the neighbouring
       * stops and the route line in frame — the point of moving the camera is
       * to show where this stop sits in the day, not to isolate it.
       */
      return { center: selected.place.coords, zoom: 13.6, fit: null };
    }
    if (routePoints.length > 0) {
      return { center: null, zoom: undefined, fit: routePoints };
    }
    if (stay?.place) {
      return { center: stay.place.coords, zoom: 13, fit: null };
    }
    return { center: { lng: -73.9857, lat: 40.7484 }, zoom: 11.6, fit: null };
  }, [selected, routePoints, stay]);

  return (
    <div className={styles.root}>
      <MapSurface
        center={{ lng: -73.9857, lat: 40.7484 }}
        zoom={11.6}
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
          padding={padding ?? { top: 26, right: 24, bottom: 26, left: 24 }}
          maxZoom={15}
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
            onClick={() => onSelect(stay.id)}
          >
            <span
              className={cn(
                styles.stayPin,
                selectedItemId === stay.id && styles.stayPinSelected,
              )}
              title={stay.title}
            >
              <Bed size={11} strokeWidth={2.3} />
            </span>
          </MapMarker>
        ) : null}

        {stops.map((stop) => {
          const meta = categoryMeta(stop.item.category);
          const isSelected = selectedItemId === stop.item.id;
          const isHovered = hoveredItemId === stop.item.id;
          const dimmed = Boolean(selectedItemId) && !isSelected;

          return (
            <MapMarker
              key={stop.item.id}
              coords={stop.place.coords}
              z={isSelected ? 60 : isHovered ? 50 : 20 - stop.index}
              anchor="bottom"
              label={`${stop.letter}. ${stop.item.title}`}
              onClick={() => onSelect(stop.item.id)}
            >
              <motion.span
                className={cn(
                  styles.stop,
                  isSelected && styles.stopSelected,
                  isHovered && styles.stopHovered,
                  dimmed && styles.stopDimmed,
                )}
                style={{ ["--stop-color" as string]: meta.color }}
                onPointerEnter={() => onHover(stop.item.id)}
                onPointerLeave={() => onHover(null)}
                initial={{ opacity: 0, scale: 0.5, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{
                  duration: reduceMotion ? 0.14 : 0.34,
                  ease: [0.34, 1.4, 0.64, 1],
                  delay: reduceMotion ? 0 : Math.min(stop.index * 0.04, 0.3),
                }}
              >
                <span className={styles.stopLetter}>{stop.letter}</span>
                {isSelected || isHovered ? (
                  <span className={styles.stopLabel}>
                    <span className={styles.stopTitle}>{stop.item.title}</span>
                    {stop.item.start ? (
                      <span className={cn(styles.stopTime, "tabular")}>
                        {timeLabelCompact(stop.item.start)}
                      </span>
                    ) : null}
                  </span>
                ) : null}
              </motion.span>
            </MapMarker>
          );
        })}
      </MapSurface>

      {stops.length === 0 ? (
        <div className={styles.emptyNote} role="note">
          <p className={styles.emptyTitle}>Nothing mapped for this day</p>
          <p className={styles.emptyBody}>
            Add a stop with a location and it appears here, joined into the
            day&rsquo;s route.
          </p>
        </div>
      ) : null}
    </div>
  );
}
