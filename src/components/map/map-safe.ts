import type { Map as MapboxMap } from "mapbox-gl";

/**
 * Mapbox throws once `remove()` has run: the canvas is gone, `getStyle()`
 * rejects, and event cleanup that touches either one becomes a Next.js overlay
 * on every following route.
 */
export function isMapAlive(map: MapboxMap): boolean {
  try {
    return Boolean(map.getCanvas() && map.getStyle());
  } catch {
    return false;
  }
}

export function setMapCursor(map: MapboxMap, cursor: string) {
  try {
    const canvas = map.getCanvas();
    if (canvas) canvas.style.cursor = cursor;
  } catch {
    /* map already torn down */
  }
}
