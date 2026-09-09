import { cn } from "@/lib/utils";

import styles from "./mark.module.css";

/**
 * The Intripid mark.
 *
 * Redrawn from the historical hummingbird. The original was an illustrated,
 * cartoon character; this is a geometric glyph that doubles as a map pin —
 * a hovering bird whose tail tapers into a pin point. That double reading is
 * the whole idea: a travel product's identity should point at a place.
 *
 * Palette is the hummingbird's own — violet body, teal wing, amber beak — so
 * the brand DNA survives even though the execution does not.
 */
export function Mark({
  size = 24,
  className,
  mono = false,
}: {
  size?: number;
  className?: string;
  /** Single-colour rendering, for tight or inverted contexts. */
  mono?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      role="img"
      aria-label="Intripid"
      className={cn(styles.mark, className)}
    >
      {/* The place: a pin silhouette, which is what survives at 20px */}
      <path
        d="M16 2.5c5.8 0 10.5 4.7 10.5 10.5 0 6.4-6.6 12.4-10.5 18.5C12.1 25.4 5.5 19.4 5.5 13 5.5 7.2 10.2 2.5 16 2.5Z"
        fill={mono ? "currentColor" : "var(--brand-600)"}
      />
      {/* The wing: the part that reads as motion */}
      <path
        d="M8.6 16.4c1.5-4.8 5.8-7.4 11.4-6.6-3 3.6-6.9 5.8-11.4 6.6Z"
        fill={mono ? "currentColor" : "var(--accent-400)"}
        opacity={mono ? 0.5 : 1}
      />
      {/* The beak: a hummingbird's one unmistakable feature */}
      <path
        d="M24.9 10.2l6.4-2.7c.62-.26 1.05.6.46.98l-5.5 3.5-1.36-1.78Z"
        fill={mono ? "currentColor" : "var(--energy-500)"}
        opacity={mono ? 0.8 : 1}
      />
      <circle cx="19.4" cy="7.5" r="1.75" fill="var(--paper-25)" />
    </svg>
  );
}

/** The mark plus wordmark. */
export function Logo({
  size = 22,
  className,
  showWord = true,
}: {
  size?: number;
  className?: string;
  showWord?: boolean;
}) {
  return (
    <span className={cn(styles.logo, className)}>
      <Mark size={size} />
      {showWord ? <span className={styles.word}>Intripid</span> : null}
    </span>
  );
}
