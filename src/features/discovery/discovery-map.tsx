"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Home } from "lucide-react";

import { MapCamera, MapMarker, MapSurface } from "@/components/map/map-surface";
import { cn } from "@/lib/utils";
import type { LngLat, Recommendation } from "@/lib/types";

import styles from "./discovery-map.module.css";
import type { DiscoveryStage, DiscoveryStep } from "@/stores/discovery-store";

/**
 * The discovery canvas.
 *
 * The map is not a backdrop: it reframes for every question, so the traveller
 * can always see the spatial consequence of what they just said. Dates open on
 * the whole world, choosing an origin flies to it, and once preferences start
 * landing the camera pulls back to hold the candidates that are actually
 * winning. Candidate pins scale and gain colour with their score, which is how
 * "recommendations respond to preferences" becomes something you watch rather
 * than something you are told.
 */

export interface DiscoveryMapProps {
  stage: DiscoveryStage;
  step: DiscoveryStep;
  origin: LngLat | null;
  originLabel: string | null;
  recommendations: Recommendation[];
  /** How many candidates to draw. Grows as confidence grows. */
  visibleCount: number;
  activeId: string | null;
  hoveredId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  /** Left-hand console width, so the camera frames the visible half. */
  insetLeft: number;
}

export function DiscoveryMap({
  stage,
  step,
  origin,
  originLabel,
  recommendations,
  visibleCount,
  activeId,
  hoveredId,
  onSelect,
  onHover,
  insetLeft,
}: DiscoveryMapProps) {
  const reduceMotion = useReducedMotion();

  const candidates = useMemo(
    () => recommendations.slice(0, visibleCount),
    [recommendations, visibleCount],
  );

  const active = activeId
    ? recommendations.find((r) => r.destination.id === activeId)
    : null;

  /** Camera intent per stage — the map's half of the conversation. */
  const camera = useMemo(() => {
    // A chosen destination owns the frame.
    if (active) {
      return {
        center: active.destination.coords,
        zoom: active.destination.zoom,
        fit: null,
      };
    }

    // Dates: the world is still open.
    if (stage === "questions" && step === "dates") {
      return { center: { lng: 6, lat: 26 }, zoom: 1.35, fit: null };
    }

    // Origin: come down to where they're starting from.
    if (stage === "questions" && step === "origin") {
      return origin
        ? { center: origin, zoom: 3.6, fit: null }
        : { center: { lng: 6, lat: 26 }, zoom: 1.35, fit: null };
    }

    // Everything after: hold the live candidates, plus the origin for context.
    const points = candidates.map((r) => r.destination.coords);
    if (origin) points.push(origin);
    if (points.length >= 2) return { center: null, zoom: undefined, fit: points };

    return { center: { lng: 6, lat: 26 }, zoom: 1.6, fit: null };
  }, [active, stage, step, origin, candidates]);

  return (
    <div className={styles.root}>
      <MapSurface
        center={{ lng: 6, lat: 26 }}
        zoom={1.35}
        labels={active ? "context" : "minimal"}
        onBackgroundClick={() => onHover(null)}
      >
        <MapCamera
          center={camera.center}
          zoom={camera.zoom}
          fit={camera.fit}
          maxZoom={active ? active.destination.zoom : 4.4}
          /* Pins must clear the console entirely, not sit against its edge. */
          padding={{
            top: 104,
            right: 150,
            bottom: 130,
            left: insetLeft + 130,
          }}
        />

        {origin ? (
          <MapMarker coords={origin} z={2} anchor="center" label={originLabel ?? "Origin"}>
            <span className={styles.originPin} title={originLabel ?? undefined}>
              <Home size={11} strokeWidth={2.4} />
              {originLabel ? (
                <span className={styles.originLabel}>{originLabel}</span>
              ) : null}
            </span>
          </MapMarker>
        ) : null}

        {/* Attractions of the chosen destination, so the brief has geography. */}
        {active
          ? active.destination.attractions.map((attraction) => (
              <MapMarker
                key={attraction.name}
                coords={attraction.coords}
                z={3}
                anchor="center"
              >
                <span className={styles.attractionPin} title={attraction.name}>
                  <span className={styles.attractionDot} />
                  <span className={styles.attractionName}>{attraction.name}</span>
                </span>
              </MapMarker>
            ))
          : null}

        {!active
          ? candidates.map((recommendation) => {
              const { destination, rank, score } = recommendation;
              const isHovered = hoveredId === destination.id;
              const tone =
                score >= 78 ? "strong" : score >= 58 ? "fair" : "weak";

              return (
                <MapMarker
                  key={destination.id}
                  coords={destination.coords}
                  z={isHovered ? 40 : 30 - rank}
                  anchor="bottom"
                  label={`${destination.name}, match ${Math.round(score)} of 100`}
                  onClick={() => onSelect(destination.id)}
                >
                  <motion.span
                    className={cn(
                      styles.candidate,
                      styles[`candidate_${tone}`],
                      isHovered && styles.candidateHovered,
                    )}
                    onPointerEnter={() => onHover(destination.id)}
                    onPointerLeave={() => onHover(null)}
                    initial={
                      reduceMotion
                        ? { opacity: 0 }
                        : { opacity: 0, scale: 0.6, y: 6 }
                    }
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{
                      duration: reduceMotion ? 0.15 : 0.36,
                      ease: [0.34, 1.4, 0.64, 1],
                      delay: reduceMotion ? 0 : Math.min(rank * 0.045, 0.32),
                    }}
                  >
                    <span className={cn(styles.candidateRank, "tabular")}>
                      {rank}
                    </span>
                    <span className={styles.candidateName}>
                      {destination.name}
                    </span>
                    <span className={cn(styles.candidateScore, "tabular")}>
                      {Math.round(score)}
                    </span>
                  </motion.span>
                </MapMarker>
              );
            })
          : null}
      </MapSurface>

      {/*
       * At world zoom the basemap's ocean cyan and vegetation green are far
       * more saturated than anything else in the product. A warm wash pulls
       * the whole canvas onto the paper palette without hiding geography.
       */}
      <div className={styles.paperWash} aria-hidden />

      {/* Softens the console's edge against the map without hiding geography. */}
      <div
        className={styles.consoleScrim}
        style={{ width: insetLeft + 80 }}
        aria-hidden
      />
    </div>
  );
}
