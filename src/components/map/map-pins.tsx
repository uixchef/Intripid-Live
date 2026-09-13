"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";
import { publicEnv } from "@/lib/env";
import type { LngLat } from "@/lib/types";

import styles from "./map-pins.module.css";

const FALLBACK = "/discovery/pins/place.png";

/** Mapbox static crop — last-resort only. Pins should use placePhotoSrc. */
export function mapPinPhoto(coords: LngLat, zoom = 12, size = 72): string {
  const token = publicEnv.mapboxToken.trim();
  if (!token) return FALLBACK;
  const edge = Math.min(1280, Math.max(72, Math.round(size)));
  return `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/static/${coords.lng},${coords.lat},${zoom},0/${edge}x${edge}@2x?access_token=${encodeURIComponent(token)}`;
}

export function PlacePin({
  src,
  active = false,
  title,
  className,
  dimmed = false,
  onPointerEnter,
  onPointerLeave,
}: {
  src: string;
  active?: boolean;
  title?: string;
  className?: string;
  dimmed?: boolean;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
}) {
  return (
    <span
      className={cn(
        styles.placePin,
        active && styles.placePinOn,
        dimmed && styles.placePinDimmed,
        className,
      )}
      title={title}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className={styles.placePhoto}
        src={src}
        alt=""
        width={36}
        height={36}
        onError={(event) => {
          event.currentTarget.src = FALLBACK;
        }}
      />
    </span>
  );
}

export function HomePin({ title }: { title?: string }) {
  return (
    <span className={styles.homePin} title={title}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/discovery/pins/home.svg" alt="" width={52} height={52} />
    </span>
  );
}

/** Discovery field pin — the hummingbird, not a photo of the city. */
export function BirdPin({
  title,
  active = false,
  className,
  onPointerEnter,
  onPointerLeave,
}: {
  title?: string;
  active?: boolean;
  className?: string;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
}) {
  return (
    <span
      className={cn(
        styles.birdPin,
        active && styles.birdPinOn,
        className,
      )}
      title={title}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/mascots/curious.png"
        alt=""
        width={44}
        height={44}
        draggable={false}
      />
    </span>
  );
}

export function AirportPin({ title }: { title?: string }) {
  return (
    <span className={styles.airportPin} title={title}>
      <span className={styles.airportCore}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className={styles.airportGlyph}
          src="/discovery/pins/airport.svg"
          alt=""
          width={20}
          height={20}
        />
      </span>
    </span>
  );
}

/**
 * Map hover card — photo banner + place copy, the way Maps and Airbnb
 * preview a pin without opening it.
 */
export function PinPreview({
  eventId,
  photo,
  kicker,
  title,
  subtitle,
}: {
  eventId: string;
  photo: string;
  kicker?: string;
  title: string;
  subtitle?: string;
}) {
  const [ready, setReady] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{
    top: number;
    left: number;
    side: "above" | "below";
    tail: number;
  } | null>(null);

  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    let frame = 0;
    let cancelled = false;
    const width = 220;
    /* Pointer peeks ~7px past the card; keep it almost on the pin. */
    const gap = 10;

    function place() {
      if (cancelled) return;
      const host = document.querySelector<HTMLElement>(
        `[data-map-pin][data-event="${CSS.escape(eventId)}"]`,
      );
      const preview = previewRef.current;
      if (host) {
        const rect = host.getBoundingClientRect();
        const height = preview?.offsetHeight || 188;
        let side: "above" | "below" = "above";
        let top = rect.top - height - gap;
        if (top < 12) {
          side = "below";
          top = rect.bottom + gap;
        }
        const pinX = rect.left + rect.width / 2;
        const left = Math.max(
          12,
          Math.min(pinX - width / 2, window.innerWidth - width - 12),
        );
        const tailX = Math.max(16, Math.min(width - 16, pinX - left));
        setBox((current) => {
          if (
            current &&
            current.top === Math.round(top) &&
            current.left === Math.round(left) &&
            current.side === side &&
            current.tail === Math.round(tailX)
          ) {
            return current;
          }
          return {
            top: Math.round(top),
            left: Math.round(left),
            side,
            tail: Math.round(tailX),
          };
        });
      }
      frame = window.requestAnimationFrame(place);
    }

    frame = window.requestAnimationFrame(place);
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, [eventId, ready]);

  if (!ready || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={previewRef}
      className={styles.preview}
      data-pin-preview=""
      data-side={box?.side ?? "above"}
      style={{
        top: box?.top ?? -9999,
        left: box?.left ?? 0,
        visibility: box ? "visible" : "hidden",
        ["--tail-x" as string]: `${box?.tail ?? 110}px`,
      }}
      role="tooltip"
    >
      <div className={styles.previewCard}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className={styles.previewBanner}
          src={photo}
          alt=""
          onError={(event) => {
            event.currentTarget.src = FALLBACK;
          }}
        />
        <div className={styles.previewBody}>
          {kicker ? <p className={styles.previewKicker}>{kicker}</p> : null}
          <p className={styles.previewTitle}>{title}</p>
          {subtitle ? <p className={styles.previewSub}>{subtitle}</p> : null}
        </div>
      </div>
      <span className={styles.previewTail} aria-hidden />
    </div>,
    document.body,
  );
}
