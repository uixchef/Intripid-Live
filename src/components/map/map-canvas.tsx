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
 * Map styling: planner uses Standard `faded`. Globe surfaces (identity
 * footprint, Discovery hunt) share Intripid's brand atmosphere — lilac
 * space, peach horizon — not Discovery-owned chrome. No raster overlays.
 * The canvas is the background.
 */

export interface MapCanvasProps {
  center: LngLat;
  zoom: number;
  children?: ReactNode;
  /**
   * Which basemap labels are allowed. Explicit flags rather than a single
   * level, because the useful combination differs per surface: the planner
   * wants street names for orientation, while the destination brief wants
   * neighbourhoods but no highway shields competing with its own pins.
   */
  labels?: { poi?: boolean; roads?: boolean; places?: boolean };
  /**
   * Basemap light preset. Discovery uses `day` against a lilac globe
   * atmosphere. The planner stays on `day` over paper.
   */
  lightPreset?: "dawn" | "day" | "dusk" | "night";
  /**
   * Mapbox Standard theme. Discovery uses `default` so land stays colourful
   * like the political globe. Planner uses `faded` so routes and pins lead.
   */
  theme?: "default" | "faded" | "monochrome";
  /**
   * Style URL. Discovery uses Streets so the globe reads as a political map
   * (cyan water, pastel land) rather than Standard's muted basemap.
   */
  mapStyle?: string;
  /**
   * `globe` lets the user zoom out to a true Earth. Discovery uses it.
   * The planner stays on `mercator` — a city itinerary does not need space.
   */
  projection?: "mercator" | "globe";
  /**
   * Space around the globe. `brand` is the Intripid lilac / peach / star
   * atmosphere — shared look for any globe, not Discovery-owned.
   * Omit for Mapbox defaults.
   */
  atmosphere?: "brand";
  /** Floor for scroll/pinch zoom. Globe wants 0 so the Earth can fill the view. */
  minZoom?: number;
  /** Disable all user interaction — used for decorative/preview maps. */
  interactive?: boolean;
  /**
   * Require a modifier key (or the on-map hint) before wheel-zoom. The
   * dashboard banner sits in a scrolling page; without this, scrolling the
   * page over the cover zooms the globe instead.
   */
  cooperativeGestures?: boolean;
  /** Padding used by fitBounds callers, in px. */
  className?: string;
  onReady?: (map: MapboxMap) => void;
  /** Called on background click (not on a marker), to clear selection. */
  onBackgroundClick?: () => void;
  /**
   * Keep the WebGL backbuffer readable after each frame so overlays can
   * sample luminance (discovery chrome). Off everywhere else — it costs VRAM.
   */
  preserveDrawingBuffer?: boolean;
}

export function MapCanvas({
  center,
  zoom,
  children,
  labels,
  lightPreset = "day",
  theme = "faded",
  mapStyle = "mapbox://styles/mapbox/standard",
  projection = "mercator",
  atmosphere,
  minZoom = 0,
  interactive = true,
  cooperativeGestures = false,
  className,
  onReady,
  onBackgroundClick,
  preserveDrawingBuffer = false,
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
    const host = containerRef.current;
    if (!host || mapRef.current) return;

    /*
     * Mapbox requires an empty node at construct time. Strict Mode remounts
     * this effect; a leftover canvas here is `console.warn` that Next.js
     * promotes to a blocking overlay on every page that hosts a map.
     * The map owns `host` itself — no inner wrapper, so the node we pass
     * is the node we empty.
     */
    host.replaceChildren();

    mapboxgl.accessToken = requireMapboxToken();

    const instance = new mapboxgl.Map({
      container: host,
      style: mapStyle,
      projection,
      center: [center.lng, center.lat],
      zoom,
      minZoom,
      interactive,
      cooperativeGestures,
      attributionControl: false,
      logoPosition: "bottom-right",
      // Flat, north-up: this is a planning surface, not a flyover.
      // Globe still allows full zoom-out; rotation stays off so the Earth
      // does not become a toy.
      pitch: 0,
      bearing: 0,
      dragRotate: false,
      touchPitch: false,
      preserveDrawingBuffer,
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

      setConfig("theme", theme);
      setConfig("lightPreset", lightPreset);
      setConfig("show3dObjects", false);
      setConfig("showPointOfInterestLabels", labels?.poi ?? false);
      setConfig("showTransitLabels", false);
      setConfig("showPlaceLabels", labels?.places ?? true);
      setConfig("showRoadLabels", labels?.roads ?? true);

      if (projection === "globe") {
        try {
          instance.setFog(
            atmosphere === "brand"
              ? {
                  color: "rgb(255, 214, 186)",
                  "high-color": "rgb(214, 149, 214)",
                  "horizon-blend": 0.18,
                  "space-color": "rgb(198, 153, 255)",
                  "star-intensity": 0.55,
                }
              : {
                  color: "rgb(186, 210, 235)",
                  "high-color": "rgb(36, 92, 223)",
                  "horizon-blend": 0.04,
                  "space-color": "rgb(11, 11, 25)",
                  "star-intensity": 0.45,
                },
          );
        } catch {
          /* style without fog */
        }
      }

      setReady(true);
      onReadyRef.current?.(instance);
    };

    if (instance.isStyleLoaded()) handleStyleReady();
    else instance.once("style.load", handleStyleReady);

    /*
     * Mapbox sizes the WebGL canvas from the container at init. A banner or
     * a pane that is still laying out reports 0×0, and without a resize the
     * map stays a blank tile. Observe the container for the rest of the life
     * of the instance — Discovery, the planner and the identity cover all share
     * this path.
     */
    const resizeObserver = new ResizeObserver(() => {
      if (!mapRef.current) return;
      try {
        instance.resize();
      } catch {
        /* map already torn down */
      }
    });
    resizeObserver.observe(host);

    const handleClick = (event: mapboxgl.MapMouseEvent) => {
      // Markers stop propagation themselves; anything reaching here is canvas.
      if (event.originalEvent.defaultPrevented) return;
      onBackgroundClickRef.current?.();
    };
    instance.on("click", handleClick);

    return () => {
      resizeObserver.disconnect();
      mapRef.current = null;
      try {
        instance.off("click", handleClick);
      } catch {
        /* already removed */
      }
      try {
        instance.stop();
      } catch {
        /* already removed */
      }
      try {
        instance.remove();
      } catch {
        /* Mapbox throws if the canvas is already gone during route changes. */
      }
      host.replaceChildren();
    };
    // Intentionally mount-only: subsequent camera/label changes are applied by
    // the effects below rather than by tearing the map down and rebuilding it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // React to label-density changes without re-creating the map.
  useEffect(() => {
    if (!map || !ready) return;
    try {
      map.setConfigProperty("basemap", "showPointOfInterestLabels", labels?.poi ?? false);
      map.setConfigProperty("basemap", "showPlaceLabels", labels?.places ?? true);
      map.setConfigProperty("basemap", "showRoadLabels", labels?.roads ?? true);
      map.setConfigProperty("basemap", "lightPreset", lightPreset);
    } catch {
      /* style without these config keys */
    }
  }, [map, ready, labels?.poi, labels?.places, labels?.roads, lightPreset]);

  useEffect(() => {
    if (!map) return;
    const handler = (map as unknown as { cooperativeGestures?: { enable(): void; disable(): void } }).cooperativeGestures;
    if (!handler) return;
    if (cooperativeGestures) handler.enable();
    else handler.disable();
  }, [map, cooperativeGestures]);

  return (
    <div className={className ? `${styles.root} ${className}` : styles.root}>
      <div ref={containerRef} className={styles.canvas} />
      {map ? (
        <MapContext value={{ map, ready }}>{ready ? children : null}</MapContext>
      ) : null}
    </div>
  );
}
