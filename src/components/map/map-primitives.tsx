"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import mapboxgl from "mapbox-gl";

import type { LngLat } from "@/lib/types";
import { distanceKm } from "@/lib/geo";

import { useMap } from "./map-context";
import { isMapAlive } from "./map-safe";

/** Minimal GeoJSON shape for the route line — mapbox-gl ships no global namespace. */
interface LineFeature {
  type: "Feature";
  properties: Record<string, never>;
  geometry: { type: "LineString"; coordinates: [number, number][] };
}

/**
 * Declarative children for <MapCanvas>.
 *
 * Markers render real React into a Mapbox-positioned DOM node via a portal, so
 * pins are styled with CSS modules and composed from the same components as
 * the rest of the product — no imperative innerHTML, no second design language
 * for map overlays.
 */

/* -------------------------------------------------------------------------- */
/* Marker                                                                    */
/* -------------------------------------------------------------------------- */

export interface MapMarkerProps {
  coords: LngLat;
  children: ReactNode;
  /** Higher values sit above other markers. Selected pins should win. */
  z?: number;
  anchor?: mapboxgl.Anchor;
  /**
   * Pixel nudge from the anchor point, [x, y] with y positive downward. Used
   * to de-stack labels that would otherwise collide at low zoom.
   */
  offset?: [number, number];
  onClick?: () => void;
  /** Announced to screen readers; the marker is a button when interactive. */
  label?: string;
  /** Lets the planner peek find this pin the same way it finds calendar cards. */
  eventId?: string;
}

export function MapMarker({
  coords,
  children,
  z = 1,
  anchor = "bottom",
  offset,
  onClick,
  label,
  eventId,
}: MapMarkerProps) {
  const { map } = useMap();
  /*
   * The marker's host node. Created once via a state initialiser, then handed
   * to Mapbox, which owns its transform. React never renders this node's
   * attributes — only its contents, through the portal below.
   */
  const [element] = useState(() => {
    const el = document.createElement("div");
    el.style.willChange = "transform";
    return el;
  });
  const markerRef = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    if (!isMapAlive(map)) return;
    let marker: mapboxgl.Marker;
    try {
      marker = new mapboxgl.Marker({ element, anchor })
        .setLngLat([coords.lng, coords.lat])
        .addTo(map);
    } catch {
      return;
    }
    markerRef.current = marker;

    return () => {
      try {
        marker.remove();
      } catch {
        /* map already torn down */
      }
      markerRef.current = null;
    };
    // Anchor is fixed per marker instance; position updates are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, element]);

  useEffect(() => {
    markerRef.current?.setLngLat([coords.lng, coords.lat]);
  }, [coords.lng, coords.lat]);

  useEffect(() => {
    markerRef.current?.setOffset(offset ?? [0, 0]);
  }, [offset]);

  /*
   * Stacking order lives on the marker element itself, because Mapbox renders
   * markers as siblings and a selected pin has to rise above its neighbours.
   * This is a deliberate write to a library-owned DOM node, not React state —
   * the immutability rule cannot distinguish the two.
   */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    element.style.zIndex = String(z);
  }, [element, z]);

  useEffect(() => {
    if (eventId) {
      element.dataset.event = eventId;
      element.dataset.mapPin = "";
    } else {
      delete element.dataset.event;
      delete element.dataset.mapPin;
    }
  }, [element, eventId]);

  const content = onClick ? (
    <button
      type="button"
      aria-label={label}
      onClick={(event) => {
        // Prevent MapCanvas's background click from clearing the selection we
        // are about to make.
        event.stopPropagation();
        event.nativeEvent.preventDefault();
        onClick();
      }}
      style={{ display: "block" }}
    >
      {children}
    </button>
  ) : (
    children
  );

  return createPortal(content, element);
}

/* -------------------------------------------------------------------------- */
/* Route                                                                     */
/* -------------------------------------------------------------------------- */

export interface MapRouteProps {
  points: LngLat[];
  /** Dashed styling for the "suggested"/tentative case. */
  dashed?: boolean;
  color?: string;
  width?: number;
  opacity?: number;
}

/**
 * Draws the day's route as a line. The geometry comes straight from the
 * schedule order, which is what makes the map and calendar causally linked:
 * reorder the day and the line redraws.
 */
export function MapRoute({
  points,
  dashed = false,
  color = "#6438d1",
  width = 3,
  opacity = 0.85,
}: MapRouteProps) {
  const { map, ready } = useMap();
  // useId is unique per instance and stable across renders, which is what a
  // Mapbox source/layer id needs — no module-level counter required.
  const id = `route${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  const casingId = `${id}-casing`;

  useEffect(() => {
    if (!ready || !isMapAlive(map)) return;

    const data: LineFeature = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: points.map((p): [number, number] => [p.lng, p.lat]),
      },
    };

    try {
      if (!map.getSource(id)) {
        map.addSource(id, { type: "geojson", data });

        map.addLayer({
          id: casingId,
          type: "line",
          source: id,
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": "#ffffff",
            "line-width": width + 3.5,
            "line-opacity": 0.9,
          },
        });

        map.addLayer({
          id,
          type: "line",
          source: id,
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": color,
            "line-width": width,
            "line-opacity": opacity,
            ...(dashed ? { "line-dasharray": [1.5, 1.2] } : {}),
          },
        });
      } else {
        const source = map.getSource(id) as mapboxgl.GeoJSONSource;
        source.setData(data);
        map.setPaintProperty(id, "line-color", color);
        map.setPaintProperty(id, "line-width", width);
        map.setPaintProperty(id, "line-opacity", opacity);
        map.setPaintProperty(casingId, "line-width", width + 3.5);
      }
    } catch {
      return;
    }

    return () => {
      try {
        if (!isMapAlive(map)) return;
        if (map.getLayer(id)) map.removeLayer(id);
        if (map.getLayer(casingId)) map.removeLayer(casingId);
        if (map.getSource(id)) map.removeSource(id);
      } catch {
        /* map already torn down */
      }
    };
  }, [map, ready, id, casingId, points, dashed, color, width, opacity]);

  return null;
}

/* -------------------------------------------------------------------------- */
/* Camera                                                                    */
/* -------------------------------------------------------------------------- */

/** Slow in, slow out — no linear rush across the ocean. */
function cinematicEase(t: number) {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function hopDuration(from: LngLat, to: LngLat, padOnly: boolean) {
  if (padOnly) return 960;
  const km = distanceKm(from, to);
  return Math.round(Math.min(4200, Math.max(1600, 1300 + km * 0.24)));
}

function flyArc(
  map: mapboxgl.Map,
  dest: LngLat,
  destZoom: number,
  padding: mapboxgl.PaddingOptions,
) {
  const from = map.getCenter();
  const km = distanceKm({ lng: from.lng, lat: from.lat }, dest);

  const options: mapboxgl.EasingOptions = {
    center: [dest.lng, dest.lat],
    zoom: destZoom,
    padding,
    duration: hopDuration({ lng: from.lng, lat: from.lat }, dest, false),
    easing: cinematicEase,
    essential: true,
  };

  if (km >= 2500) {
    options.minZoom = 0.72;
  } else if (km >= 800) {
    options.minZoom = 1.15;
  } else {
    options.curve = 1.55;
  }

  map.flyTo(options);
}

export interface MapCameraProps {
  /** Fly to a point. */
  center?: LngLat | null;
  zoom?: number;
  /** Or frame a set of points. Takes precedence over `center`. */
  fit?: LngLat[] | null;
  padding?: number | { top: number; right: number; bottom: number; left: number };
  /** Skip animation — used for the first frame and for reduced motion. */
  instant?: boolean;
  maxZoom?: number;
  /** Bump to re-apply the same camera after the user has panned away. */
  revision?: number;
  /**
   * Long hops pull out to the globe, then settle on the target — the
   * Google-Earth arc. Discovery uses this between the three matches.
   */
  arc?: boolean;
}

/**
 * Declarative camera control. Movement is animated because the flight itself
 * carries meaning: it shows the traveller the spatial relationship between
 * what they just selected and where they were.
 */
export function MapCamera({
  center,
  zoom,
  fit,
  padding = 64,
  instant = false,
  maxZoom = 15.5,
  revision = 0,
  arc = false,
}: MapCameraProps) {
  const { map, ready } = useMap();
  const first = useRef(true);
  const prevKeys = useRef({ fitKey: "", centerKey: "", padKey: "" });

  // Serialise so a new array identity with equal values does not re-fly.
  const fitKey = fit
    ? fit.map((p) => `${p.lng.toFixed(5)},${p.lat.toFixed(5)}`).join("|")
    : "";
  const centerKey = center ? `${center.lng.toFixed(5)},${center.lat.toFixed(5)}` : "";
  const padKey =
    typeof padding === "number"
      ? String(padding)
      : `${padding.top},${padding.right},${padding.bottom},${padding.left}`;

  // fitKey/centerKey stand in for the point arrays by value.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!ready || !isMapAlive(map)) return;

    const box =
      typeof padding === "number"
        ? { top: padding, right: padding, bottom: padding, left: padding }
        : padding;

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const animate = !instant && !first.current && !reduceMotion;
    const padOnly =
      !first.current &&
      prevKeys.current.centerKey === centerKey &&
      prevKeys.current.fitKey === fitKey &&
      prevKeys.current.padKey !== padKey;

    try {
      if (!animate) {
        map.setPadding(box);
      } else {
        map.stop();
      }

      const here = { lng: map.getCenter().lng, lat: map.getCenter().lat };

      if (fit && fit.length > 0) {
        if (fit.length === 1) {
          const target: [number, number] = [fit[0].lng, fit[0].lat];
          if (animate) {
            const dest = { lng: fit[0].lng, lat: fit[0].lat };
            const km = distanceKm(here, dest);
            if (km >= 500) {
              flyArc(map, dest, zoom ?? 14, box);
            } else {
              map.easeTo({
                center: target,
                zoom: zoom ?? 14,
                padding: box,
                duration: hopDuration(here, dest, padOnly),
                easing: cinematicEase,
                essential: true,
              });
            }
          } else {
            map.jumpTo({ center: target, zoom: zoom ?? 14 });
          }
        } else {
          let minLng = fit[0].lng;
          let maxLng = fit[0].lng;
          let minLat = fit[0].lat;
          let maxLat = fit[0].lat;
          for (const p of fit) {
            minLng = Math.min(minLng, p.lng);
            maxLng = Math.max(maxLng, p.lng);
            minLat = Math.min(minLat, p.lat);
            maxLat = Math.max(maxLat, p.lat);
          }
          const dest = {
            lng: (minLng + maxLng) / 2,
            lat: (minLat + maxLat) / 2,
          };
          const bounds: [mapboxgl.LngLatLike, mapboxgl.LngLatLike] = [
            [minLng, minLat],
            [maxLng, maxLat],
          ];
          if (animate) {
            const camera = map.cameraForBounds(bounds, {
              padding: box,
              maxZoom,
            });
            const duration = hopDuration(here, dest, padOnly);
            if (camera && distanceKm(here, dest) >= 500) {
              map.flyTo({
                ...camera,
                duration,
                easing: cinematicEase,
                curve: 1.55,
                essential: true,
              });
            } else {
              map.fitBounds(bounds, {
                padding: box,
                maxZoom,
                duration,
                easing: cinematicEase,
                essential: true,
              });
            }
          } else {
            map.fitBounds(bounds, {
              padding: box,
              maxZoom,
              duration: 0,
            });
          }
        }
      } else if (center) {
        const target: [number, number] = [center.lng, center.lat];
        const destZoom = zoom ?? map.getZoom();
        if (animate) {
          const dest = { lng: center.lng, lat: center.lat };
          if (padOnly) {
            map.easeTo({
              center: target,
              zoom: destZoom,
              padding: box,
              duration: hopDuration(here, dest, true),
              easing: cinematicEase,
              essential: true,
            });
          } else if (arc || distanceKm(here, dest) >= 500) {
            flyArc(map, dest, destZoom, box);
          } else {
            map.easeTo({
              center: target,
              zoom: destZoom,
              padding: box,
              duration: hopDuration(here, dest, false),
              easing: cinematicEase,
              essential: true,
            });
          }
        } else {
          map.jumpTo({ center: target, zoom: destZoom });
        }
      } else if (animate && padOnly) {
        map.easeTo({
          padding: box,
          duration: 960,
          easing: cinematicEase,
          essential: true,
        });
      }
    } catch {
      return;
    }

    prevKeys.current = { fitKey, centerKey, padKey };
    first.current = false;
  }, [map, ready, fitKey, centerKey, zoom, instant, maxZoom, revision, padKey, arc]);

  return null;
}

/** Subscribe to pan/zoom so overlays can recluster without a render loop. */
export function useMapViewRevision(): number {
  const { map } = useMap();
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const bump = () => setRevision((value) => value + 1);
    map.on("zoomend", bump);
    map.on("moveend", bump);
    return () => {
      try {
        map.off("zoomend", bump);
        map.off("moveend", bump);
      } catch {
        /* map already torn down */
      }
    };
  }, [map]);

  return revision;
}
