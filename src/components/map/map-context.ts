"use client";

import { createContext, useContext } from "react";
import type { Map as MapboxMap } from "mapbox-gl";

interface MapContextValue {
  map: MapboxMap;
  /** True once the style has loaded and layers may be added. */
  ready: boolean;
}

export const MapContext = createContext<MapContextValue | null>(null);

/**
 * Access the live Mapbox instance. Only valid inside <MapCanvas>, which does
 * not render children until the map exists.
 */
export function useMap(): MapContextValue {
  const value = useContext(MapContext);
  if (!value) {
    throw new Error("Map children must be rendered inside <MapCanvas>");
  }
  return value;
}
