"use client";

import dynamic from "next/dynamic";
import { Compass, MapPinOff } from "lucide-react";

import { hasMapboxToken } from "@/lib/env";

import styles from "./map-surface.module.css";
import type { MapCanvasProps } from "./map-canvas";

/**
 * The boundary every other surface imports.
 *
 * `ssr: false` only works inside a Client Component, and a Server Component's
 * dynamic import of a Client Component does not code-split — so this wrapper
 * is itself a client module. That keeps mapbox-gl (~1.7MB) in its own lazy
 * chunk and off the server entirely.
 */
const MapCanvas = dynamic(
  () => import("./map-canvas").then((mod) => ({ default: mod.MapCanvas })),
  {
    ssr: false,
    loading: () => <MapSkeleton />,
  },
);

/**
 * Loading state. A drawn graticule rather than a grey box: the shape of the
 * thing that is coming, so the layout does not jump and the wait reads as
 * intentional.
 */
export function MapSkeleton() {
  return (
    <div className={styles.skeleton} aria-hidden>
      <div className={styles.graticule} />
      <div className={styles.shimmer} />
      <div className={styles.skeletonBadge}>
        <Compass size={13} strokeWidth={2} />
        <span>Finding your bearings</span>
      </div>
    </div>
  );
}

/**
 * Shown when NEXT_PUBLIC_MAPBOX_TOKEN is absent. The product must stay usable
 * without a map, so this is a designed state that explains what is missing and
 * how to fix it — never a crash or a blank panel.
 */
function MapUnavailable() {
  return (
    <div className={styles.unavailable} role="note">
      <div className={styles.graticule} aria-hidden />
      <div className={styles.unavailableInner}>
        <span className={styles.unavailableIcon} aria-hidden>
          <MapPinOff size={17} strokeWidth={1.9} />
        </span>
        <p className={styles.unavailableTitle}>Map unavailable</p>
        <p className={styles.unavailableBody}>
          Add a Mapbox token to <code>.env.local</code> as{" "}
          <code>NEXT_PUBLIC_MAPBOX_TOKEN</code> and restart the dev server.
        </p>
        <p className={styles.unavailableHint}>
          Everything else — discovery, the calendar, editing and scheduling —
          works without it.
        </p>
      </div>
    </div>
  );
}

export function MapSurface(props: MapCanvasProps) {
  if (!hasMapboxToken()) return <MapUnavailable />;
  return <MapCanvas {...props} />;
}

export { MapCamera, MapMarker, MapRoute, useMapViewRevision } from "./map-primitives";
export { MapAvoidAreas } from "./map-avoid";
export { useMap } from "./map-context";
