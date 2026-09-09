"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import mapboxgl, { Map as MapboxMap } from "mapbox-gl";

import { requireMapboxToken } from "@/lib/env";
import type { LngLat } from "@/lib/types";

import { MapContext } from "./map-context";

import "mapbox-gl/dist/mapbox-gl.css";
import styles from "./map-canvas.module.css";

/**
 * The leaf client module that owns the Mapbox instance and the DOM node it
 * needs. Nothing above this in the tree touches `window`.
 *
 * Map styling decision: Mapbox Standard with the `faded` theme and POI labels
 * suppressed by default. The map is a working canvas for itineraries and
 * recommendations, so the basemap deliberately recedes — overlays, routes and
 * pins are the content, and a default-styled map would fight them. This is
 * also the clearest visual break from the historical product, which used the
 * stock street style at full saturation.
 */

export interface MapCanvasProps {
  center: LngLat;
  zoom: number;
  children?: ReactNode;
  /**
   * How much the basemap is allowed to say.
   *  - "minimal": no POI or road labels — a clean canvas for discovery.
   *  - "context": streets and neighbourhoods, but no POI pins, so the
   *    product's own markers are the only points of interest. Planner default.
   *  - "full": everything the style ships with.
   */
  labels?: "minimal" | "context" | "full";
  /** Disable all user interaction — used for decorative/preview maps. */
  interactive?: boolean;
  /** Padding used by fitBounds callers, in px. */
  className?: string;
  onReady?: (map: MapboxMap) => void;
  /** Called on background click (not on a marker), to clear selection. */
  onBackgroundClick?: () => void;
}

export function MapCanvas({
  center,
  zoom,
  children,
  labels = "context",
  interactive = true,
  className,
  onReady,
  onBackgroundClick,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const [map, setMap] = useState<MapboxMap | null>(null);
  const [ready, setReady] = useState(false);

  // Keep the latest callbacks without re-creating the map.
  const onReadyRef = useRef(onReady);
  const onBackgroundClickRef = useRef(onBackgroundClick);
  useEffect(() => {
    onReadyRef.current = onReady;
    onBackgroundClickRef.current = onBackgroundClick;
  }, [onReady, onBackgroundClick]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    mapboxgl.accessToken = requireMapboxToken();

    const instance = new mapboxgl.Map({
      container,
      style: "mapbox://styles/mapbox/standard",
      // Mercator, not globe: the globe renders a dark space backdrop at low
      // zoom, which fights the paper palette and reads as sci-fi chrome.
      projection: "mercator",
      center: [center.lng, center.lat],
      zoom,
      interactive,
      attributionControl: false,
      logoPosition: "bottom-right",
      // Flat, north-up: this is a planning surface, not a flyover.
      pitch: 0,
      bearing: 0,
      dragRotate: false,
      touchPitch: false,
    });

    instance.touchZoomRotate.disableRotation();

    mapRef.current = instance;
    setMap(instance);

    const handleStyleReady = () => {
      /*
       * Mapbox Standard config. Applied one key at a time: the available keys
       * track the style version, and one unsupported key must not prevent the
       * rest from landing (which is what a single try/catch around all of them
       * would do).
       */
      const setConfig = (key: string, value: string | boolean) => {
        try {
          instance.setConfigProperty("basemap", key, value);
        } catch {
          if (process.env.NODE_ENV === "development") {
            console.warn(`[map] basemap config "${key}" not supported`);
          }
        }
      };

      // `faded` desaturates the basemap so routes, pins and overlays lead.
      setConfig("theme", "faded");
      setConfig("lightPreset", "day");
      setConfig("show3dObjects", false);
      setConfig("showPointOfInterestLabels", labels === "full");
      setConfig("showTransitLabels", false);
      setConfig("showPlaceLabels", labels !== "minimal");
      setConfig("showRoadLabels", labels !== "minimal");

      setReady(true);
      onReadyRef.current?.(instance);
    };

    if (instance.isStyleLoaded()) handleStyleReady();
    else instance.once("style.load", handleStyleReady);

    const handleClick = (event: mapboxgl.MapMouseEvent) => {
      // Markers stop propagation themselves; anything reaching here is canvas.
      if (event.originalEvent.defaultPrevented) return;
      onBackgroundClickRef.current?.();
    };
    instance.on("click", handleClick);

    return () => {
      instance.off("click", handleClick);
      instance.remove();
      mapRef.current = null;
      setMap(null);
      setReady(false);
    };
    // Intentionally mount-only: subsequent camera/label changes are applied by
    // the effects below rather than by tearing the map down and rebuilding it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // React to label-density changes without re-creating the map.
  useEffect(() => {
    if (!map || !ready) return;
    try {
      map.setConfigProperty(
        "basemap",
        "showPointOfInterestLabels",
        labels === "full",
      );
      map.setConfigProperty("basemap", "showPlaceLabels", labels !== "minimal");
      map.setConfigProperty("basemap", "showRoadLabels", labels !== "minimal");
    } catch {
      /* style without these config keys */
    }
  }, [map, ready, labels]);

  return (
    <div className={className ? `${styles.root} ${className}` : styles.root}>
      <div ref={containerRef} className={styles.canvas} />
      {map ? (
        <MapContext value={{ map, ready }}>{ready ? children : null}</MapContext>
      ) : null}
    </div>
  );
}
