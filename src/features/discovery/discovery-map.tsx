"use client";

import { useMemo, type RefObject } from "react";
import { AnimatePresence, motion } from "motion/react";
import mapboxgl from "mapbox-gl";

import {
  MapCamera,
  MapMarker,
  MapSurface,
  useMap,
  useMapViewRevision,
} from "@/components/map/map-surface";
import { clusterInPixels } from "@/lib/discovery/cluster";
import { DESTINATIONS } from "@/data/destinations";
import {
  nearestDeparture,
  destinationHunt,
  type DeparturePort,
} from "@/lib/discovery/ports";
import { briefPlacesOnMap } from "@/lib/discovery/places";
import { cn } from "@/lib/utils";
import { AirportPin, HomePin, MascotPin, PlacePin, PortClusterPin } from "@/components/map/map-pins";
import type { Attraction, Destination, LngLat, Origin, RecommendationSet, TripScope } from "@/lib/types";

import { ChromeOnMap } from "./chrome-on-map";
import styles from "./discovery-map.module.css";
import type { DiscoveryStage, DiscoveryStep } from "@/stores/discovery-store";

export interface DiscoveryMapProps {
  stage: DiscoveryStage;
  step: DiscoveryStep;
  origin: LngLat | null;
  originLabel: string | null;
  originConfirmed: boolean;
  huntKind: "departure" | "dest" | null;
  huntBeat: number | null;
  portsFound: boolean;
  destinationsFound: boolean;
  home: Origin | null;
  scope: TripScope | null;
  result: RecommendationSet;
  processingStage: number;
  activeId: string | null;
  hoveredId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  insetRight: number;
  insetTop?: number;
  insetBottom?: number;
  insetLeft?: number;
  reduceMotion: boolean;
  chromeRegionRef: RefObject<HTMLElement | null>;
  onChromeOnDark: (onDark: boolean) => void;
}

type FieldPin = {
  id: string;
  coords: LngLat;
  destination: Destination;
  rank: number;
  interactive: boolean;
  score: number;
};

/** First-question globe: Atlantic face, whole Earth, not a cropped continent. */
const OPENING_GLOBE = { lng: 12, lat: 16 };
/** Start tight on a continent, then pull back to the full globe. */
const OPENING_START_ZOOM = 3.4;

export function DiscoveryMap({
  stage,
  step,
  origin,
  originLabel,
  originConfirmed: _originConfirmed,
  huntKind,
  huntBeat,
  portsFound,
  destinationsFound,
  home,
  scope,
  result,
  processingStage: _processingStage,
  activeId,
  hoveredId,
  onSelect,
  onHover,
  insetRight,
  insetTop = 80,
  insetBottom = 64,
  insetLeft = 48,
  reduceMotion,
  chromeRegionRef,
  onChromeOnDark,
}: DiscoveryMapProps) {
  const cameraPad = {
    top: insetTop,
    right: insetRight + insetLeft,
    bottom: insetBottom,
    left: insetLeft,
  };
  const active = activeId
    ? result.ranked.find((r) => r.destination.id === activeId)
    : null;

  const showCities =
    (huntKind === "dest" && huntBeat !== null && huntBeat >= 1) ||
    step === "experiences" ||
    step === "activities";

  /*
   * Dates and "how far" are not about home. Home is an origin-step output.
   * Showing the pin on question one implied we already knew where they live.
   */
  const showHome =
    Boolean(origin) &&
    (step === "origin" ||
      step === "budget" ||
      step === "experiences" ||
      step === "activities" ||
      huntKind !== null ||
      stage === "results" ||
      stage === "processing");

  const hunt = useMemo(() => {
    if (!home) return { ports: [] as DeparturePort[], destinations: [] as Destination[] };
    return destinationHunt(home, DESTINATIONS, scope);
  }, [home, scope]);

  const field = useMemo((): FieldPin[] => {
    if (!origin || active) return [];

    if (stage === "results") {
      return result.top.map((recommendation, index) => ({
        id: recommendation.destination.id,
        coords: recommendation.destination.coords,
        destination: recommendation.destination,
        rank: index + 1,
        interactive: true,
        score: recommendation.score,
      }));
    }

    if (!showCities) return [];

    return result.ranked.map((recommendation) => ({
      id: recommendation.destination.id,
      coords: recommendation.destination.coords,
      destination: recommendation.destination,
      rank: recommendation.rank,
      interactive: false,
      score: recommendation.score,
    }));
  }, [origin, active, stage, result, showCities]);

  const departurePort = useMemo(() => {
    if (!origin || active || !portsFound) return null;
    return nearestDeparture(origin);
  }, [origin, active, portsFound]);

  const destPorts = useMemo(() => {
    if (!home || active) return [];
    if (huntKind === "dest" || destinationsFound) return hunt.ports;
    return [];
  }, [home, active, huntKind, destinationsFound, hunt]);

  const airportPins = useMemo(() => {
    const pins: DeparturePort[] = [];
    if (departurePort && huntKind !== "dest") pins.push(departurePort);
    pins.push(...destPorts);
    return pins;
  }, [departurePort, destPorts, huntKind]);
  const places = useMemo(
    () => (active ? briefPlacesOnMap(active.destination.attractions) : []),
    [active],
  );

  const openingZoom = insetBottom > 180 ? 0.78 : 1.08;

  const camera = useMemo(() => {
    if (active) {
      return {
        center: active.destination.coords,
        zoom: active.destination.zoom,
        fit: null as LngLat[] | null,
      };
    }

    if (!origin || !showHome) {
      return {
        center: OPENING_GLOBE,
        zoom: openingZoom,
        fit: null as LngLat[] | null,
      };
    }

    if (stage === "results") {
      const points = result.top.map((recommendation) => recommendation.destination.coords);
      points.push(origin);
      return { center: null, zoom: undefined, fit: points };
    }

    /*
     * Destination hunt (and the questions that follow it) must keep the
     * world-scale frame. `portsFound` stays true after the departure-port
     * search, so fitting home + the nearest airport would otherwise win
     * here and collapse the globe onto a street-level origin (Singapore
     * + Changi is ~18 km, which Mapbox will take to zoom 10).
     */
    const framingDestinations =
      huntKind === "dest" || destinationsFound || showCities;

    if (framingDestinations) {
      if (huntKind === "dest" && huntBeat === 0 && destPorts.length > 0) {
        return {
          center: null,
          zoom: undefined,
          fit: [origin, ...destPorts.map((port) => port.coords)],
        };
      }
      if (showCities && field.length > 0) {
        const points = [origin, ...field.map((pin) => pin.coords)];
        if (destPorts.length > 0) {
          points.push(...destPorts.map((port) => port.coords));
        }
        return {
          center: null,
          zoom: undefined,
          fit: points,
        };
      }
      if (destPorts.length > 0) {
        return {
          center: null,
          zoom: undefined,
          fit: [origin, ...destPorts.map((port) => port.coords)],
        };
      }
      return { center: origin, zoom: 1.55, fit: null as LngLat[] | null };
    }

    if (portsFound && departurePort) {
      return {
        center: null,
        zoom: undefined,
        fit: [origin, departurePort.coords],
      };
    }

    if (stage === "questions" && step === "origin") {
      return {
        center: origin,
        zoom: 3.8,
        fit: null as LngLat[] | null,
      };
    }

    return { center: origin, zoom: 1.8, fit: null as LngLat[] | null };
  }, [
    active,
    origin,
    stage,
    step,
    result,
    huntKind,
    huntBeat,
    destPorts,
    field,
    showCities,
    showHome,
    openingZoom,
    portsFound,
    destinationsFound,
    departurePort,
  ]);

  return (
    <div className={styles.root}>
      <MapSurface
        center={OPENING_GLOBE}
        zoom={OPENING_START_ZOOM}
        minZoom={0}
        projection="globe"
        mapStyle="mapbox://styles/mapbox/streets-v12"
        theme="default"
        atmosphere="brand"
        labels={{ poi: false, roads: false, places: true }}
        lightPreset="day"
        preserveDrawingBuffer
        onBackgroundClick={() => onHover(null)}
      >
        <ChromeOnMap regionRef={chromeRegionRef} onOnDark={onChromeOnDark} />
        <MapCamera
          center={camera.center}
          zoom={camera.zoom}
          fit={camera.fit}
          settleOnMount
          maxZoom={
            active
              ? active.destination.zoom
              : huntKind === "dest" || destinationsFound || showCities
                ? 4.6
                : portsFound
                  ? 10.5
                  : 4.6
          }
          instant={reduceMotion}
          arc={Boolean(active)}
          padding={cameraPad}
        />

        {showHome && origin ? (
          <MapMarker
            coords={origin}
            z={40}
            anchor="center"
            label={originLabel ? `Home, ${originLabel}` : "Home"}
          >
            <HomePin title={originLabel ?? "Home"} />
          </MapMarker>
        ) : null}

        {airportPins.length > 0 ? (
          <PortPins
            ports={airportPins}
            padding={cameraPad}
            reduceMotion={reduceMotion}
            pulse={huntKind !== null}
          />
        ) : null}

        {active && places.length > 0 ? (
          <CityPins attractions={places} />
        ) : null}

        {!active && origin ? (
          <FieldPins
            pins={field}
            hoveredId={hoveredId}
            onSelect={onSelect}
            onHover={onHover}
            padding={cameraPad}
            reduceMotion={reduceMotion}
          />
        ) : null}
      </MapSurface>
    </div>
  );
}

function CityPins({ attractions }: { attractions: Attraction[] }) {
  return (
    <>
      {attractions.map((attraction) => (
        <MapMarker
          key={attraction.name}
          coords={attraction.coords}
          z={6}
          anchor="center"
          label={attraction.name}
        >
          <PlacePin
            src={
              attraction.photo ??
              "/discovery/pins/place.png"
            }
            title={attraction.name}
          />
        </MapMarker>
      ))}
    </>
  );
}

function FieldPins({
  pins,
  hoveredId,
  onSelect,
  onHover,
  padding,
  reduceMotion,
}: {
  pins: FieldPin[];
  hoveredId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  padding: { top: number; right: number; bottom: number; left: number };
  reduceMotion: boolean;
}) {
  const { map } = useMap();
  const viewRevision = useMapViewRevision();

  const nodes = useMemo(() => {
    void viewRevision;
    return clusterInPixels(
      pins,
      (lng, lat) => map.project([lng, lat]),
      56,
    );
  }, [pins, map, viewRevision]);

  return (
    <AnimatePresence>
      {nodes.map((node) => {
        if (node.kind === "group") {
          return (
            <MapMarker
              key={node.id}
              coords={node.coords}
              z={20}
              anchor="center"
              label={`${node.count} places`}
              onClick={() => {
                const bounds = new mapboxgl.LngLatBounds();
                node.items.forEach((item) =>
                  bounds.extend([item.coords.lng, item.coords.lat]),
                );
                map.fitBounds(bounds, {
                  padding,
                  maxZoom: 4.6,
                  duration: reduceMotion ? 0 : 1400,
                });
              }}
            >
              <motion.span
                className={cn(styles.cluster, styles.clusterPlaces)}
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                transition={{ duration: reduceMotion ? 0.1 : 0.38 }}
              >
                <span className={styles.clusterCore}>
                  <span className={styles.clusterCount}>{node.count}</span>
                </span>
              </motion.span>
            </MapMarker>
          );
        }

        const pin = node.item;
        const isHovered = hoveredId === pin.id;

        return (
          <MapMarker
            key={pin.id}
            coords={pin.coords}
            z={isHovered ? 32 : pin.interactive ? 30 - pin.rank : 12}
            anchor="center"
            label={pin.destination.name}
            onClick={pin.interactive ? () => onSelect(pin.id) : undefined}
          >
            <motion.span
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ duration: reduceMotion ? 0.1 : 0.4 }}
            >
              <MascotPin
                active={isHovered && pin.interactive}
                title={pin.destination.name}
                onPointerEnter={
                  pin.interactive ? () => onHover(pin.id) : undefined
                }
                onPointerLeave={
                  pin.interactive ? () => onHover(null) : undefined
                }
              />
            </motion.span>
          </MapMarker>
        );
      })}
    </AnimatePresence>
  );
}

function PortPins({
  ports,
  padding,
  reduceMotion,
  pulse = false,
}: {
  ports: DeparturePort[];
  padding: { top: number; right: number; bottom: number; left: number };
  reduceMotion: boolean;
  pulse?: boolean;
}) {
  const { map } = useMap();
  const viewRevision = useMapViewRevision();

  const nodes = useMemo(() => {
    void viewRevision;
    return clusterInPixels(
      ports,
      (lng, lat) => map.project([lng, lat]),
      56,
    );
  }, [ports, map, viewRevision]);

  return (
    <AnimatePresence>
      {nodes.map((node, index) => {
        if (node.kind === "group") {
          return (
            <MapMarker
              key={node.id}
              coords={node.coords}
              z={18}
              anchor="center"
              label={`${node.count} airports`}
              onClick={() => {
                const bounds = new mapboxgl.LngLatBounds();
                node.items.forEach((item) =>
                  bounds.extend([item.coords.lng, item.coords.lat]),
                );
                map.fitBounds(bounds, {
                  padding,
                  maxZoom: 10.5,
                  duration: reduceMotion ? 0 : 1400,
                });
              }}
            >
              <motion.span
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                transition={{ duration: reduceMotion ? 0.1 : 0.38 }}
              >
                <PortClusterPin
                  count={node.count}
                  title={`${node.count} airports`}
                />
              </motion.span>
            </MapMarker>
          );
        }

        return (
          <MapMarker
            key={node.item.id}
            coords={node.item.coords}
            z={8}
            anchor="center"
            label={`${node.item.iata} · ${node.item.name}`}
          >
            <motion.span
              className={styles.portPulse}
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{
                duration: reduceMotion ? 0.08 : 0.5,
                delay: reduceMotion ? 0 : Math.min(0.9, index * 0.012),
                ease: [0.2, 0.8, 0.2, 1],
              }}
            >
              {pulse && !reduceMotion ? (
                <>
                  <span className={styles.portRipple} />
                  <span className={cn(styles.portRipple, styles.portRippleLate)} />
                </>
              ) : null}
              <AirportPin title={`${node.item.iata} · ${node.item.name}`} />
            </motion.span>
          </MapMarker>
        );
      })}
    </AnimatePresence>
  );
}
