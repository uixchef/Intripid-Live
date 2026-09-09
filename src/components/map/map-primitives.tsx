"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import mapboxgl from "mapbox-gl";

import type { LngLat } from "@/lib/types";

import { useMap } from "./map-context";

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
  onClick?: () => void;
  /** Announced to screen readers; the marker is a button when interactive. */
  label?: string;
}

export function MapMarker({
  coords,
  children,
  z = 1,
  anchor = "bottom",
  onClick,
  label,
}: MapMarkerProps) {
  const { map } = useMap();
  const [element] = useState(() => {
    const el = document.createElement("div");
    el.style.willChange = "transform";
    return el;
  });
  const markerRef = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    const marker = new mapboxgl.Marker({ element, anchor })
      .setLngLat([coords.lng, coords.lat])
      .addTo(map);
    markerRef.current = marker;

    return () => {
      marker.remove();
      markerRef.current = null;
    };
    // Anchor is fixed per marker instance; position updates are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, element]);

  useEffect(() => {
    markerRef.current?.setLngLat([coords.lng, coords.lat]);
  }, [coords.lng, coords.lat]);

  useEffect(() => {
    element.style.zIndex = String(z);
  }, [element, z]);

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

let routeSeq = 0;

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
  const id = useMemo(() => {
    routeSeq += 1;
    return `route-${routeSeq}`;
  }, []);

  const casingId = `${id}-casing`;

  useEffect(() => {
    if (!ready) return;

    const data: LineFeature = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: points.map((p): [number, number] => [p.lng, p.lat]),
      },
    };

    if (!map.getSource(id)) {
      map.addSource(id, { type: "geojson", data });

      // A light casing under the line keeps it legible over parks and water.
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

    return () => {
      // The style can already be gone if the map is unmounting.
      if (!map.getStyle()) return;
      if (map.getLayer(id)) map.removeLayer(id);
      if (map.getLayer(casingId)) map.removeLayer(casingId);
      if (map.getSource(id)) map.removeSource(id);
    };
  }, [map, ready, id, casingId, points, dashed, color, width, opacity]);

  return null;
}

/* -------------------------------------------------------------------------- */
/* Camera                                                                    */
/* -------------------------------------------------------------------------- */

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
}: MapCameraProps) {
  const { map, ready } = useMap();
  const first = useRef(true);

  // Serialise so a new array identity with equal values does not re-fly.
  const fitKey = fit
    ? fit.map((p) => `${p.lng.toFixed(5)},${p.lat.toFixed(5)}`).join("|")
    : "";
  const centerKey = center ? `${center.lng.toFixed(5)},${center.lat.toFixed(5)}` : "";

  useEffect(() => {
    if (!ready) return;

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const animate = !instant && !first.current && !reduceMotion;

    if (fit && fit.length > 0) {
      if (fit.length === 1) {
        const target: [number, number] = [fit[0].lng, fit[0].lat];
        if (animate) map.easeTo({ center: target, zoom: zoom ?? 14, duration: 700 });
        else map.jumpTo({ center: target, zoom: zoom ?? 14 });
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
        map.fitBounds(
          [
            [minLng, minLat],
            [maxLng, maxLat],
          ],
          { padding, maxZoom, duration: animate ? 800 : 0 },
        );
      }
    } else if (center) {
      const target: [number, number] = [center.lng, center.lat];
      if (animate) {
        map.flyTo({ center: target, zoom: zoom ?? map.getZoom(), duration: 900, curve: 1.5 });
      } else {
        map.jumpTo({ center: target, zoom: zoom ?? map.getZoom() });
      }
    }

    first.current = false;
    // fitKey/centerKey stand in for the point arrays by value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, ready, fitKey, centerKey, zoom, instant, maxZoom]);

  return null;
}
