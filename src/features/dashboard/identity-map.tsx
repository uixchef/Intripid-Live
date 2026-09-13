"use client";

/**
 * Identity cover globe — the travel record, not Destination Discovery.
 *
 * Shared with Discovery: Mapbox Streets globe + brand atmosphere + pin
 * chrome. Not shared: hunt, ports, recommendations, or Discovery stage.
 *
 * What plots, and why:
 * - home: account origin
 * - visited / transit: places already on the footprint
 * - wishlist: places they asked to go
 * - avoid: regions they ruled out
 */

import { useEffect, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";

import { IconButton } from "@/components/ui/button";
import {
  MapAvoidAreas,
  MapCamera,
  MapMarker,
  MapSurface,
} from "@/components/map/map-surface";
import { footprintPhotoSrc } from "@/data/place-photos";
import { hasMapboxToken } from "@/lib/env";
import { cn } from "@/lib/utils";
import type {
  AvoidPlace,
  FootprintCategory,
  LngLat,
  TravelStats,
  VisitedLocation,
  WishlistPlace,
} from "@/lib/types";

import styles from "./identity-map.module.css";

export interface IdentityMapProps {
  locations: VisitedLocation[];
  wishlist: WishlistPlace[];
  avoids: AvoidPlace[];
  stats: TravelStats;
  expanded: boolean;
  live?: boolean;
  focus?: { coords: LngLat; zoom: number; revision: number } | null;
  onToggleExpand?: () => void;
  onSelectPlace: (place: { id: string; coords: LngLat; zoom: number }) => void;
  /** Hide the expand control — used when the map is a static banner. */
  showExpand?: boolean;
  /** Extra camera padding under a docked sheet. */
  insetBottom?: number;
}

export function IdentityMap({
  locations,
  wishlist,
  avoids,
  stats,
  expanded,
  live = true,
  focus = null,
  onToggleExpand,
  onSelectPlace,
  showExpand = true,
  insetBottom = 0,
}: IdentityMapProps) {
  const [highlight, setHighlight] = useState<FootprintCategory | null>(null);
  const [layerRevision, setLayerRevision] = useState(0);

  useEffect(() => {
    if (focus) setHighlight(null);
  }, [focus?.revision]);

  function toggleLayer(layer: FootprintCategory) {
    setHighlight((current) => (current === layer ? null : layer));
    setLayerRevision((value) => value + 1);
  }

  const legend = (
    <MapLegend
      stats={stats}
      highlight={highlight}
      onToggle={toggleLayer}
    />
  );

  if (!hasMapboxToken() || !live) {
    return (
      <div className={cn(styles.root, expanded && styles.rootExpanded)}>
        <IdentityMapFallback />
        {legend}
        {showExpand ? (
          <IconButton
            label={expanded ? "Close map" : "Expand map"}
            size="sm"
            variant="secondary"
            className={styles.expand}
            onClick={onToggleExpand}
          >
            {expanded ? (
              <Minimize2 size={15} strokeWidth={2.1} />
            ) : (
              <Maximize2 size={15} strokeWidth={2.1} />
            )}
          </IconButton>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn(styles.root, expanded && styles.rootExpanded)}>
      <FootprintGlobe
        locations={locations}
        wishlist={wishlist}
        avoids={avoids}
        size={expanded ? "expanded" : "banner"}
        cooperativeGestures={!expanded}
        focus={focus}
        highlight={highlight}
        layerRevision={layerRevision}
        onSelectPlace={onSelectPlace}
        insetBottom={insetBottom}
      />

      {legend}

      {showExpand ? (
        <IconButton
          label={expanded ? "Close map" : "Expand map"}
          size="sm"
          variant="secondary"
          className={styles.expand}
          onClick={onToggleExpand}
        >
          {expanded ? (
            <Minimize2 size={15} strokeWidth={2.1} />
          ) : (
            <Maximize2 size={15} strokeWidth={2.1} />
          )}
        </IconButton>
      ) : null}
    </div>
  );
}

function MapLegend({
  stats,
  highlight,
  onToggle,
}: {
  stats: TravelStats;
  highlight: FootprintCategory | null;
  onToggle: (layer: FootprintCategory) => void;
}) {
  const items: { tone: FootprintCategory; label: string; value: number }[] = [
    { tone: "wishlist", label: "Wishlist", value: stats.wishlist },
    { tone: "visited", label: "Visited", value: stats.visited },
    { tone: "avoid", label: "Avoid", value: stats.avoid },
  ];

  return (
    <div className={styles.legend} role="group" aria-label="Travel counts">
      {items.map((item) => {
        const on = highlight === item.tone;
        return (
          <button
            key={item.tone}
            type="button"
            className={styles.legendItem}
            data-tone={item.tone}
            data-on={on ? "" : undefined}
            aria-pressed={on}
            aria-label={
              on
                ? `Hide ${item.label} on the map`
                : `Show ${item.label} on the map`
            }
            onClick={() => onToggle(item.tone)}
          >
            <span className={styles.legendLabel}>{item.label}</span>
            <span className={cn(styles.legendValue, "tabular")}>{item.value}</span>
          </button>
        );
      })}
    </div>
  );
}

function FootprintGlobe({
  locations,
  wishlist,
  avoids,
  size,
  cooperativeGestures = false,
  focus,
  highlight,
  layerRevision,
  onSelectPlace,
  insetBottom = 0,
}: {
  locations: VisitedLocation[];
  wishlist: WishlistPlace[];
  avoids: AvoidPlace[];
  size: "banner" | "expanded";
  cooperativeGestures?: boolean;
  focus?: { coords: LngLat; zoom: number; revision: number } | null;
  highlight: FootprintCategory | null;
  layerRevision: number;
  onSelectPlace: (place: { id: string; coords: LngLat; zoom: number }) => void;
  insetBottom?: number;
}) {
  const home = size === "expanded" ? 52 : 28;
  const photo = size === "expanded" ? 36 : 18;
  const halo = size === "expanded" ? 52 : 28;
  const wish = size === "expanded" ? (highlight === "wishlist" ? 22 : 16) : highlight === "wishlist" ? 14 : 10;
  const rest = { lng: 8, lat: 28 };
  const restZoom = size === "expanded" ? 1.65 : 1.5;
  const padding =
    size === "expanded" && insetBottom > 0
      ? {
          top: 88,
          right: 48,
          bottom: Math.max(64, insetBottom + 28),
          left: 36,
        }
      : size === "expanded"
        ? 72
        : 36;

  const layerFit =
    highlight === "wishlist"
      ? wishlist.map((place) => place.coords)
      : highlight === "visited"
        ? locations.map((place) => place.coords)
        : highlight === "avoid"
          ? avoids.map((place) => place.coords)
          : null;

  const dimWishlist = Boolean(highlight && highlight !== "wishlist");
  const dimVisited = Boolean(highlight && highlight !== "visited");
  const dimAvoid = Boolean(highlight && highlight !== "avoid");

  return (
    <MapSurface
      center={focus?.coords ?? rest}
      zoom={focus?.zoom ?? restZoom}
      minZoom={0}
      projection="globe"
      mapStyle="mapbox://styles/mapbox/streets-v12"
      theme="default"
      atmosphere="brand"
      interactive
      cooperativeGestures={cooperativeGestures}
      labels={{ poi: false, roads: false, places: true }}
      lightPreset="day"
    >
      <MapCamera
        center={layerFit ? undefined : (focus?.coords ?? rest)}
        zoom={layerFit ? undefined : (focus?.zoom ?? restZoom)}
        fit={layerFit && layerFit.length > 0 ? layerFit : undefined}
        padding={padding}
        maxZoom={highlight ? 3.4 : 8}
        instant={!focus && !highlight}
        arc={Boolean(focus) || Boolean(highlight)}
        revision={highlight ? layerRevision : (focus?.revision ?? layerRevision)}
      />

      <MapAvoidAreas
        places={avoids}
        muted={dimAvoid}
        onSelect={(place) =>
          onSelectPlace({
            id: place.id,
            coords: place.coords,
            zoom: zoomForAvoid(place),
          })
        }
      />

      {wishlist.map((place) => (
        <MapMarker
          key={`wish-${place.id}`}
          coords={place.coords}
          anchor="center"
          z={highlight === "wishlist" ? 30 : 6}
          label={`${place.name}, wishlist`}
          onClick={() =>
            onSelectPlace({ id: place.id, coords: place.coords, zoom: 4.5 })
          }
        >
          <span
            className={styles.wishPin}
            data-on={highlight === "wishlist" ? "" : undefined}
            data-dimmed={dimWishlist ? "" : undefined}
            title={`${place.name} · Wishlist`}
            style={{ width: wish, height: wish }}
          />
        </MapMarker>
      ))}

      {locations.map((location) => (
        <MapMarker
          key={location.id}
          coords={location.coords}
          anchor="center"
          z={
            highlight === "visited"
              ? 28
              : location.kind === "home"
                ? 40
                : location.kind === "transit"
                  ? 8
                  : 12
          }
          label={location.name}
          onClick={() =>
            onSelectPlace({
              id: location.id,
              coords: location.coords,
              zoom: location.kind === "home" ? 5 : 4.5,
            })
          }
        >
          {location.kind === "home" ? (
            <span
              className={styles.homePin}
              data-dimmed={dimVisited ? "" : undefined}
              title={location.name}
            >
              <img
                src="/discovery/pins/home.svg"
                alt=""
                width={home}
                height={home}
              />
            </span>
          ) : (
            <span
              className={cn(
                styles.placePin,
                location.kind === "transit" && styles.placePinTransit,
              )}
              data-on={highlight === "visited" ? "" : undefined}
              data-dimmed={dimVisited ? "" : undefined}
              title={location.name}
              style={{ width: halo, height: halo }}
            >
              <img
                src={footprintPhotoSrc(location)}
                alt=""
                width={photo}
                height={photo}
                className={styles.placePhoto}
                style={{ width: photo, height: photo }}
                onError={(event) => {
                  event.currentTarget.src = "/discovery/pins/place.png";
                }}
              />
            </span>
          )}
        </MapMarker>
      ))}
    </MapSurface>
  );
}

function zoomForAvoid(place: AvoidPlace): number {
  if (place.scale === "continent") return 1.7;
  if (place.scale === "country") return 3.2;
  if (place.scale === "state") return 4.2;
  return 5.2;
}

function IdentityMapFallback() {
  return (
    <div className={styles.fallback} aria-hidden>
      <div className={styles.graticule} />
    </div>
  );
}
