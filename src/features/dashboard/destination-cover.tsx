import { getDestination } from "@/data/destinations";
import { cn } from "@/lib/utils";

import styles from "./destination-cover.module.css";

/**
 * The visual on a trip card.
 *
 * WHY THIS AND NOT A PHOTOGRAPH. There are no images in this repository —
 * `public/` is empty and nothing uses `next/image`. Every visual in Intripid
 * is drawn, which is a constraint worth keeping: stock travel photography is
 * the fastest way to make a product look like a template, and the original
 * dashboard showed the failure mode by repeating one photo of Tower Bridge on
 * three different trips.
 *
 * So the cover is a contour drawing. A map product is entitled to use map
 * marks as its decoration, and contour lines are quiet enough to sit on an
 * operational surface — no photograph, no gradient drama, no text baked into
 * an image. It carries exactly two pieces of information: which continent
 * (through the hue) and which place (through the name and flag).
 *
 * DETERMINISTIC. The line shapes come from a hash of the destination id, so a
 * trip looks the same on every render and on every machine, and two different
 * destinations never accidentally look identical.
 */

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
 * squiggles.
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
  className?: string;
}

export function DestinationCover({
  destinationId,
  muted = false,
  className,
}: DestinationCoverProps) {
  const destination = getDestination(destinationId);
  if (!destination) return null;

  const channel = CONTINENT_CHANNEL[destination.continent] ?? "purple";
  const paths = contours(hash(destination.id));

  return (
    <div
      className={cn(styles.cover, muted && styles.muted, className)}
      data-channel={channel}
    >
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
            /*
             * Inner lines sit stronger, as on a real contour map. Raised from
             * a 0.30 base: at that value the drawing was invisible against
             * its own 4% tint and the band read as an empty rectangle.
             */
            style={{ opacity: 0.5 + index * 0.13 }}
          />
        ))}
      </svg>

      <div className={styles.label}>
        <span className={styles.flag} aria-hidden>
          {destination.flag}
        </span>
        <span className={styles.place}>{destination.name}</span>
      </div>
    </div>
  );
}
