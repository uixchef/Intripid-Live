import Image from "next/image";

import { getDestination } from "@/data/destinations";
import { coverPhotoSrc } from "@/data/place-photos";
import { cn } from "@/lib/utils";

import styles from "./destination-cover.module.css";

/**
 * Hue by continent rather than per destination.
 *
 * Per-destination colour would need nine hues and would put four unrelated
 * colours on one screen — the same rainbow the calendar's category system was
 * rebuilt to avoid. Continent is a real grouping, it keeps the palette to
 * four brand channels, and it means two European trips read as related.
 */
const CONTINENT_CHANNEL: Record<string, string> = {
  Europe: "purple",
  Asia: "pink",
  "North America": "teal",
  "South America": "teal",
  Africa: "orange",
  Oceania: "teal",
};

/** FNV-1a, 32-bit. Small, stable, and no dependency. */
function hash(input: string): number {
  let value = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    value ^= input.charCodeAt(index);
    value = Math.imul(value, 0x01000193);
  }
  return value >>> 0;
}

/** A deterministic 0..1 stream from one seed. */
function stream(seed: number) {
  let state = seed || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 0xffffffff;
  };
}

/**
 * Four nested contour lines across a 320x72 box.
 *
 * Each is a cubic through three control points whose heights drift downward,
 * so the set reads as one landform seen from above rather than four unrelated
 * squiggles. Used when there is no photograph, and as the planner's
 * "destination drawing" cover option.
 */
function contours(seed: number): string[] {
  const next = stream(seed);
  const paths: string[] = [];
  const baseline = 18 + next() * 12;

  for (let line = 0; line < 4; line += 1) {
    const drift = line * 13;
    const a = baseline + drift + next() * 8;
    const b = baseline + drift - 10 + next() * 16;
    const c = baseline + drift + next() * 10;
    paths.push(
      `M-8 ${a.toFixed(1)} C 70 ${(a - 12 + next() * 8).toFixed(1)}, 120 ${b.toFixed(1)}, 190 ${b.toFixed(1)} S 280 ${c.toFixed(1)}, 328 ${(c - 4).toFixed(1)}`,
    );
  }
  return paths;
}

export interface DestinationCoverProps {
  destinationId: string;
  /** Completed trips read back a step, so what is ahead of you leads. */
  muted?: boolean;
  /** Drawing only — for tiny pickers. */
  hideLabel?: boolean;
  /** Taller crop for the seasonal feature. */
  featured?: boolean;
  /** Square crop for list rows. */
  thumb?: boolean;
  className?: string;
}

export function DestinationCover({
  destinationId,
  muted = false,
  hideLabel = false,
  featured = false,
  thumb = false,
  className,
}: DestinationCoverProps) {
  const destination = getDestination(destinationId);
  if (!destination) return null;

  const channel = CONTINENT_CHANNEL[destination.continent] ?? "purple";
  const photo =
    !hideLabel || thumb ? (coverPhotoSrc(destination.id) ?? undefined) : undefined;
  const paths = contours(hash(destination.id));

  return (
    <div
      className={cn(styles.cover, muted && styles.muted, className)}
      data-channel={channel}
      data-photo={photo ? "" : undefined}
      data-featured={featured ? "" : undefined}
      data-thumb={thumb ? "" : undefined}
    >
      {photo ? (
        <>
          <Image
            src={photo}
            alt=""
            fill
            priority={featured}
            loading={featured ? "eager" : undefined}
            sizes={thumb ? "72px" : featured ? "360px" : "(max-width: 1080px) 100vw, 50vw"}
            className={styles.photo}
          />
          {!hideLabel ? <span className={styles.veil} aria-hidden /> : null}
        </>
      ) : (
        <svg
          className={styles.lines}
          viewBox="0 0 320 72"
          preserveAspectRatio="none"
          aria-hidden
        >
          {paths.map((path, index) => (
            <path
              key={path}
              d={path}
              style={{ opacity: 0.5 + index * 0.13 }}
            />
          ))}
        </svg>
      )}

      {!hideLabel && !featured ? (
        <div className={styles.label}>
          <span className={styles.flag} aria-hidden>
            {destination.flag}
          </span>
          <span className={styles.place}>{destination.name}</span>
        </div>
      ) : null}
    </div>
  );
}
