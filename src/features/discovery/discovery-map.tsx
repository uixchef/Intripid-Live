"use client";

import { useMemo } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Home } from "lucide-react";

import { MapCamera, MapMarker, MapSurface } from "@/components/map/map-surface";
import { cn } from "@/lib/utils";
import type { LngLat, RecommendationSet } from "@/lib/types";

import styles from "./discovery-map.module.css";
import type { DiscoveryStage, DiscoveryStep } from "@/stores/discovery-store";

/**
 * The discovery canvas — and the protagonist of the surface.
 *
 * The map is the answer surface, not decoration. It reframes for every
 * question, and it carries the palette's semantics: teal for the raw
 * candidate world (your data), purple for survivors (the system's call),
 * orange for the origin (you are here).
 *
 * During the search the map narrows visibly: candidates culled by each filter
 * fade out in the order the reasoning happened, which is what makes the
 * intelligence perceptible rather than asserted.
 */

/**
 * De-stack labels that would collide.
 *
 * DOM markers do not participate in Mapbox's label collision system, so two
 * cities a few hundred kilometres apart draw their pills on top of each other
 * at world zoom — Mexico City and Oaxaca did exactly that. This walks the
 * field north to south and drops each pin into the first vertical slot that
 * is not already claimed by a neighbour, which is what a cartographer does by
 * hand and costs one pass over nine items.
 *
 * The thresholds are in degrees, so at close zoom the test stops matching and
 * everything returns to its true position.
 */
const STACK_STEP = 16;

function stackOffsets(
  coords: { id: string; lng: number; lat: number }[],
): Map<string, [number, number]> {
  const offsets = new Map<string, [number, number]>();
  const placed: { lng: number; lat: number; slot: number }[] = [];

  for (const point of [...coords].sort((a, b) => b.lat - a.lat)) {
    let slot = 0;
    while (
      placed.some(
        (other) =>
          other.slot === slot &&
          Math.abs(other.lat - point.lat) < 7 &&
          Math.abs(other.lng - point.lng) < 11,
      )
    ) {
      slot += 1;
    }
    placed.push({ lng: point.lng, lat: point.lat, slot });
    if (slot > 0) offsets.set(point.id, [0, slot * STACK_STEP]);
  }

  return offsets;
}

export interface DiscoveryMapProps {
  stage: DiscoveryStage;
  step: DiscoveryStep;
  origin: LngLat | null;
  originLabel: string | null;
  originConfirmed: boolean;
  result: RecommendationSet;
  /** How many narrated filter stages have completed. */
  processingStage: number;
  activeId: string | null;
  hoveredId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  /** Console width, so the camera frames the visible part of the canvas. */
  insetRight: number;
  reduceMotion: boolean;
}

export function DiscoveryMap({
  stage,
  step,
  origin,
  originLabel,
  originConfirmed,
  result,
  processingStage,
  activeId,
  hoveredId,
  onSelect,
  onHover,
  insetRight,
  reduceMotion,
}: DiscoveryMapProps) {
  const active = activeId
    ? result.ranked.find((r) => r.destination.id === activeId)
    : null;

  /**
   * Which pins to draw, and in what state.
   *
   * While questions are being answered the map shows the whole live field:
   * survivors in purple, everything already ruled out dimmed. During the
   * search it culls progressively, stage by stage. At results it shows only
   * the three.
   */
  const pins = useMemo(() => {
    if (stage === "results") {
      return result.top.map((r, index) => ({
        recommendation: r,
        state: index === 0 ? ("best" as const) : ("top" as const),
        rank: index + 1,
      }));
    }

    if (stage === "processing") {
      // Everything eliminated by a stage we have already narrated is gone.
      const culled = new Set<string>();
      result.stages.slice(0, processingStage).forEach((s) => {
        s.removedIds.forEach((id) => culled.add(id));
      });
      return result.ranked
        .concat(
          result.eliminated.map((e) => ({
            destination: e.destination,
            score: 0,
            confidence: 0,
            factors: [],
            matchedInterests: [],
            estimatedBudgetUsd: null,
            rank: 0,
          })),
        )
        .filter((r) => !culled.has(r.destination.id))
        .map((r) => ({
          recommendation: r,
          state: r.rank > 0 ? ("candidate" as const) : ("doomed" as const),
          rank: r.rank,
        }));
    }

    const survivors = result.ranked.map((r) => ({
      recommendation: r,
      state: ("candidate" as const),
      rank: r.rank,
    }));
    const gone = result.eliminated.map((e) => ({
      recommendation: {
        destination: e.destination,
        score: 0,
        confidence: 0,
        factors: [],
        matchedInterests: [],
        estimatedBudgetUsd: null,
        rank: 0,
      },
      state: ("culled" as const),
      rank: 0,
    }));
    return [...gone, ...survivors];
  }, [stage, result, processingStage]);

  const pinOffsets = useMemo(
    () =>
      stackOffsets(
        pins.map(({ recommendation }) => ({
          id: recommendation.destination.id,
          lng: recommendation.destination.coords.lng,
          lat: recommendation.destination.coords.lat,
        })),
      ),
    [pins],
  );

  /** Camera intent per stage — the map's half of the conversation. */
  const camera = useMemo(() => {
    if (active) {
      return {
        center: active.destination.coords,
        zoom: active.destination.zoom,
        fit: null as LngLat[] | null,
      };
    }

    if (stage === "results") {
      const points = result.top.map((r) => r.destination.coords);
      if (origin) points.push(origin);
      return { center: null, zoom: undefined, fit: points };
    }

    /*
     * Dates: the world is still open, so frame the whole field rather than a
     * fixed centre. A fixed centre ignores the console's width, which parked
     * Tokyo underneath it — the one thing the opening view must not do is
     * hide part of the world it is claiming to show.
     */
    if (stage === "questions" && step === "dates") {
      return {
        center: null,
        zoom: undefined,
        fit: result.ranked
          .concat(
            result.eliminated.map((e) => ({
              destination: e.destination,
              score: 0,
              confidence: 0,
              factors: [],
              matchedInterests: [],
              estimatedBudgetUsd: null,
              rank: 0,
            })),
          )
          .map((r) => r.destination.coords),
      };
    }

    // Origin: come down to where they're starting from.
    if (stage === "questions" && (step === "origin" || step === "scope")) {
      return origin
        ? { center: origin, zoom: originConfirmed ? 4.6 : 3.8, fit: null }
        : { center: { lng: 8, lat: 28 }, zoom: 1.5, fit: null };
    }

    // Everything after: hold the live survivors plus the origin.
    const points = result.ranked.slice(0, 6).map((r) => r.destination.coords);
    if (origin) points.push(origin);
    if (points.length >= 2) return { center: null, zoom: undefined, fit: points };

    return { center: { lng: 8, lat: 28 }, zoom: 1.8, fit: null };
  }, [active, stage, step, origin, originConfirmed, result]);

  return (
    <div className={styles.root}>
      <MapSurface
        center={{ lng: 8, lat: 28 }}
        zoom={1.5}
        labels={{ poi: false, roads: false, places: true }}
        /* Dusk: belongs to the environment, keeps its contrast. */
        lightPreset="dusk"
        onBackgroundClick={() => onHover(null)}
      >
        <MapCamera
          center={camera.center}
          zoom={camera.zoom}
          fit={camera.fit}
          maxZoom={active ? active.destination.zoom : 4.6}
          padding={{
            top: 96,
            right: insetRight + 96,
            bottom: 108,
            left: 96,
          }}
        />

        {/* Origin. Orange is the beak — the part that points and speaks. */}
        {origin ? (
          <MapMarker
            coords={origin}
            z={40}
            anchor="center"
            label={originLabel ?? "Origin"}
          >
            <span
              className={cn(
                styles.originPin,
                originConfirmed && styles.originPinConfirmed,
              )}
              title={originLabel ?? undefined}
            >
              <Home size={11} strokeWidth={2.5} />
              {originLabel ? (
                <span className={styles.originLabel}>{originLabel}</span>
              ) : null}
            </span>
          </MapMarker>
        ) : null}

        {/* Attractions of the open destination — geography for the brief. */}
        {active
          ? active.destination.attractions.map((attraction) => (
              <MapMarker
                key={attraction.name}
                coords={attraction.coords}
                z={6}
                anchor="center"
              >
                <span className={styles.attractionPin} title={attraction.name}>
                  <span className={styles.attractionDot} />
                  <span className={styles.attractionName}>
                    {attraction.name}
                  </span>
                </span>
              </MapMarker>
            ))
          : null}

        {/* The field. */}
        {!active ? (
          <AnimatePresence>
            {pins.map(({ recommendation, state, rank }) => {
              const { destination } = recommendation;
              const isHovered = hoveredId === destination.id;
              const interactive = state === "best" || state === "top";

              return (
                <MapMarker
                  key={destination.id}
                  coords={destination.coords}
                  z={
                    state === "best"
                      ? 34
                      : isHovered
                        ? 32
                        : state === "top"
                          ? 30 - rank
                          : state === "candidate"
                            ? 12
                            : 4
                  }
                  anchor="bottom"
                  offset={pinOffsets.get(destination.id)}
                  label={
                    interactive
                      ? `${destination.name}, match ${Math.round(recommendation.score)} of 100`
                      : destination.name
                  }
                  onClick={
                    interactive ? () => onSelect(destination.id) : undefined
                  }
                >
                  <motion.span
                    className={cn(
                      styles.pin,
                      state === "best" && styles.pinBest,
                      state === "top" && styles.pinTop,
                      state === "candidate" && styles.pinCandidate,
                      (state === "culled" || state === "doomed") &&
                        styles.pinCulled,
                      isHovered && interactive && styles.pinHovered,
                    )}
                    onPointerEnter={
                      interactive ? () => onHover(destination.id) : undefined
                    }
                    onPointerLeave={
                      interactive ? () => onHover(null) : undefined
                    }
                    initial={{ opacity: 0, scale: 0.55, y: 5 }}
                    animate={{
                      opacity: state === "culled" ? 0.34 : 1,
                      scale: 1,
                      y: 0,
                    }}
                    exit={{ opacity: 0, scale: 0.6, y: 3 }}
                    transition={{
                      duration: reduceMotion ? 0.12 : 0.26,
                      ease: [0.2, 0, 0, 1],
                      delay:
                        reduceMotion || stage !== "results"
                          ? 0
                          : Math.min(rank * 0.06, 0.2),
                    }}
                  >
                    {interactive ? (
                      <>
                        <span className={cn(styles.pinRank, "tabular")}>
                          {rank}
                        </span>
                        <span className={styles.pinName}>
                          {destination.name}
                        </span>
                        <span className={cn(styles.pinScore, "tabular")}>
                          {Math.round(recommendation.score)}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className={styles.pinDot} />
                        <span className={styles.pinNameQuiet}>
                          {destination.name}
                        </span>
                      </>
                    )}
                  </motion.span>
                </MapMarker>
              );
            })}
          </AnimatePresence>
        ) : null}
      </MapSurface>

      {/*
       * The basemap has to belong to the environment. Mapbox's stock ocean
       * cyan and vegetation green are far more saturated than anything else
       * in the product, so this desaturates the whole canvas and shifts it
       * toward the surrounding violet — the map stays fully legible, it just
       * stops shouting over the atmosphere it sits inside.
       */}
      <div className={styles.tint} aria-hidden />
    </div>
  );
}
