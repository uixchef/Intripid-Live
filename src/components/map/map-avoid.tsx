"use client";

import { useEffect, useId, useRef } from "react";
import type {
  FilterSpecification,
  GeoJSONSource,
  Map as MapboxMap,
  MapMouseEvent,
  Point,
} from "mapbox-gl";

import { circleRing } from "@/lib/geo";
import type { AvoidPlace } from "@/lib/types";

import { isMapAlive, setMapCursor } from "./map-safe";
import { useMap } from "./map-context";

const FILL = "#b40e10";
const LINE = "#7a0a0b";

interface AreaFeature {
  type: "Feature";
  properties: { id: string; name: string; scale: AvoidPlace["scale"] };
  geometry: { type: "Polygon"; coordinates: [number, number][][] };
}

interface PointFeature {
  type: "Feature";
  properties: { id: string; name: string; scale: AvoidPlace["scale"] };
  geometry: { type: "Point"; coordinates: [number, number] };
}

/**
 * Ruled-out places as red regions — the unit the traveller meant, not a pin.
 *
 * Countries and continents come from Mapbox country polygons so the border
 * is the real one. States and cities are painted as areas (an outline where
 * we have one, a halo otherwise) plus a low-zoom blob so they still read on
 * the identity globe.
 */
export function MapAvoidAreas({
  places,
  muted = false,
  onSelect,
}: {
  places: AvoidPlace[];
  muted?: boolean;
  onSelect?: (place: AvoidPlace) => void;
}) {
  const { map, ready } = useMap();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const countrySource = `avoidCountries${uid}`;
  const countryFill = `avoidCountryFill${uid}`;
  const countryLine = `avoidCountryLine${uid}`;
  const areaSource = `avoidAreas${uid}`;
  const areaFill = `avoidAreaFill${uid}`;
  const areaLine = `avoidAreaLine${uid}`;
  const haloSource = `avoidHalos${uid}`;
  const haloLayer = `avoidHalo${uid}`;
  const onSelectRef = useRef(onSelect);
  const placesRef = useRef(places);
  onSelectRef.current = onSelect;
  placesRef.current = places;
  const canSelect = Boolean(onSelect);

  useEffect(() => {
    if (!ready || places.length === 0 || !isMapAlive(map)) return;

    const isoCodes = [
      ...new Set(
        places.flatMap((place) => [
          place.iso2,
          ...(place.iso2Group ?? []),
        ].filter(Boolean)),
      ),
    ] as string[];

    const areaData = {
      type: "FeatureCollection" as const,
      features: places
        .filter((place) => place.scale !== "continent")
        .map((place): AreaFeature => ({
          type: "Feature",
          properties: {
            id: place.id,
            name: place.name,
            scale: place.scale,
          },
          geometry: {
            type: "Polygon",
            coordinates: [
              place.polygon ?? circleRing(place.coords, Math.max(place.radiusKm, 24)),
            ],
          },
        })),
    };

    const haloData = {
      type: "FeatureCollection" as const,
      features: places
        .filter((place) => place.scale !== "continent")
        .map((place): PointFeature => ({
          type: "Feature",
          properties: {
            id: place.id,
            name: place.name,
            scale: place.scale,
          },
          geometry: {
            type: "Point",
            coordinates: [place.coords.lng, place.coords.lat],
          },
        })),
    };

    const before = firstSymbolLayer(map);

    try {

    if (isoCodes.length > 0 && !map.getSource(countrySource)) {
      map.addSource(countrySource, {
        type: "vector",
        url: "mapbox://mapbox.country-boundaries-v1",
      });

      const countryFilter: FilterSpecification = [
        "all",
        [
          "any",
          ["==", ["get", "worldview"], "all"],
          ["in", "US", ["get", "worldview"]],
        ],
        ["in", ["get", "iso_3166_1"], ["literal", isoCodes]],
      ];

      map.addLayer(
        {
          id: countryFill,
          type: "fill",
          source: countrySource,
          "source-layer": "country_boundaries",
          filter: countryFilter,
          paint: {
            "fill-color": FILL,
            "fill-opacity": 0.34,
          },
        },
        before,
      );

      map.addLayer(
        {
          id: countryLine,
          type: "line",
          source: countrySource,
          "source-layer": "country_boundaries",
          filter: countryFilter,
          paint: {
            "line-color": LINE,
            "line-width": 0.8,
            "line-opacity": 0.7,
          },
        },
        before,
      );
    }

    if (!map.getSource(areaSource)) {
      map.addSource(areaSource, { type: "geojson", data: areaData });
      map.addLayer(
        {
          id: areaFill,
          type: "fill",
          source: areaSource,
          paint: {
            "fill-color": FILL,
            "fill-opacity": [
              "interpolate",
              ["linear"],
              ["zoom"],
              1.2,
              0.12,
              3,
              0.32,
              5,
              0.38,
            ],
          },
        },
        before,
      );
      map.addLayer(
        {
          id: areaLine,
          type: "line",
          source: areaSource,
          paint: {
            "line-color": LINE,
            "line-width": 0.9,
            "line-opacity": 0.65,
          },
        },
        before,
      );
    } else {
      (map.getSource(areaSource) as GeoJSONSource).setData(areaData);
    }

    if (!map.getSource(haloSource)) {
      map.addSource(haloSource, { type: "geojson", data: haloData });
      map.addLayer(
        {
          id: haloLayer,
          type: "circle",
          source: haloSource,
          paint: {
            "circle-color": FILL,
            "circle-opacity": [
              "interpolate",
              ["linear"],
              ["zoom"],
              0,
              0.42,
              2.4,
              0.28,
              4,
              0,
            ],
            "circle-radius": [
              "interpolate",
              ["linear"],
              ["zoom"],
              0,
              ["match", ["get", "scale"], "state", 16, "country", 12, 8],
              2,
              ["match", ["get", "scale"], "state", 22, "country", 16, 11],
              4,
              ["match", ["get", "scale"], "state", 28, "country", 18, 14],
            ],
            "circle-stroke-color": LINE,
            "circle-stroke-width": 0.6,
            "circle-stroke-opacity": [
              "interpolate",
              ["linear"],
              ["zoom"],
              0,
              0.7,
              4,
              0,
            ],
          },
        },
        before,
      );
    } else {
      (map.getSource(haloSource) as GeoJSONSource).setData(haloData);
    }
    } catch {
      return;
    }

    return () => {
      if (!isMapAlive(map)) return;
      try {
        for (const layer of [haloLayer, areaLine, areaFill, countryLine, countryFill]) {
          if (map.getLayer(layer)) map.removeLayer(layer);
        }
        for (const source of [haloSource, areaSource, countrySource]) {
          if (map.getSource(source)) map.removeSource(source);
        }
      } catch {
        /* style already gone with the map */
      }
    };
  }, [
    map,
    ready,
    places,
    countrySource,
    countryFill,
    countryLine,
    areaSource,
    areaFill,
    areaLine,
    haloSource,
    haloLayer,
  ]);

  useEffect(() => {
    if (!ready || !isMapAlive(map)) return;
    const fill = muted ? 0.1 : 1;
    const line = muted ? 0.2 : 1;
    try {
    if (map.getLayer(countryFill)) {
      map.setPaintProperty(countryFill, "fill-opacity", 0.34 * fill);
      map.setPaintProperty(countryLine, "line-opacity", 0.7 * line);
    }
    if (map.getLayer(areaFill)) {
      map.setPaintProperty(areaFill, "fill-opacity", [
        "interpolate",
        ["linear"],
        ["zoom"],
        1.2,
        0.12 * fill,
        3,
        0.32 * fill,
        5,
        0.38 * fill,
      ]);
    }
    if (map.getLayer(areaLine)) {
      map.setPaintProperty(areaLine, "line-opacity", line);
    }
    if (map.getLayer(haloLayer)) {
      map.setPaintProperty(haloLayer, "circle-opacity", fill);
    }
    } catch {
      /* map unmounted mid-paint */
    }
  }, [
    map,
    ready,
    muted,
    countryFill,
    countryLine,
    areaFill,
    areaLine,
    haloLayer,
  ]);

  useEffect(() => {
    if (!ready || !canSelect || !isMapAlive(map)) return;

    const layers = [countryFill, areaFill, haloLayer].filter((id) => {
      try {
        return Boolean(map.getLayer(id));
      } catch {
        return false;
      }
    });
    if (layers.length === 0) return;

    const resolve = (point: Point) => {
      if (!isMapAlive(map)) return null;
      const hits = map.queryRenderedFeatures(point, { layers });
      if (hits.length === 0) return null;
      const props = (hits[0] as unknown as { properties?: Record<string, unknown> }).properties ?? {};
      const iso = String(props.iso_3166_1 ?? "");
      const id = String(props.id ?? "");
      const list = placesRef.current;
      return (
        list.find((place) => place.id === id) ??
        list.find((place) => place.iso2 === iso) ??
        list.find((place) => place.iso2Group?.includes(iso)) ??
        null
      );
    };

    const onClick = (event: MapMouseEvent) => {
      const place = resolve(event.point);
      if (!place) return;
      event.originalEvent.preventDefault();
      onSelectRef.current?.(place);
    };

    const onMove = (event: MapMouseEvent) => {
      setMapCursor(map, resolve(event.point) ? "pointer" : "");
    };

    const onLeave = () => {
      setMapCursor(map, "");
    };

    map.on("click", onClick);
    map.on("mousemove", onMove);
    map.on("mouseleave", onLeave);
    return () => {
      try {
        map.off("click", onClick);
        map.off("mousemove", onMove);
        map.off("mouseleave", onLeave);
      } catch {
        /* map already removed */
      }
      setMapCursor(map, "");
    };
  }, [map, ready, canSelect, countryFill, areaFill, haloLayer]);

  return null;
}

function firstSymbolLayer(map: MapboxMap): string | undefined {
  try {
    return map.getStyle()?.layers?.find((layer) => layer.type === "symbol")?.id;
  } catch {
    return undefined;
  }
}
