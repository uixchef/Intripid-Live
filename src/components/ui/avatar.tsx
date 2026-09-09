"use client";

import { cn } from "@/lib/utils";
import { travellerColor } from "@/lib/categories";
import type { Traveller } from "@/lib/types";

import styles from "./avatar.module.css";

export interface AvatarProps {
  traveller: Traveller;
  size?: "xs" | "sm" | "md" | "lg";
  /** Render the live presence dot. */
  showPresence?: boolean;
  className?: string;
}

/**
 * A traveller's identity. Colour comes from the identity ramp and is stable
 * per person across the whole product, so the same colour on a calendar card,
 * a map pin and an avatar always means the same human.
 */
export function Avatar({
  traveller,
  size = "sm",
  showPresence = false,
  className,
}: AvatarProps) {
  return (
    <span
      className={cn(styles.avatar, styles[size], className)}
      style={{ ["--avatar-color" as string]: travellerColor(traveller.colorIndex) }}
      title={`${traveller.name}${traveller.online ? " · online" : ""}`}
    >
      <span className={styles.initials} aria-hidden>
        {traveller.initials}
      </span>
      <span className="srOnly">{traveller.name}</span>
      {showPresence && traveller.online ? (
        <span className={styles.presence} aria-hidden />
      ) : null}
    </span>
  );
}

export interface AvatarStackProps {
  travellers: Traveller[];
  size?: "xs" | "sm" | "md";
  max?: number;
  showPresence?: boolean;
  className?: string;
}

/** Overlapping avatars with a truncation count. */
export function AvatarStack({
  travellers,
  size = "xs",
  max = 4,
  showPresence = false,
  className,
}: AvatarStackProps) {
  const shown = travellers.slice(0, max);
  const extra = travellers.length - shown.length;

  return (
    <span className={cn(styles.stack, styles[`stack_${size}`], className)}>
      {shown.map((traveller) => (
        <Avatar
          key={traveller.id}
          traveller={traveller}
          size={size}
          showPresence={showPresence}
          className={styles.stacked}
        />
      ))}
      {extra > 0 ? (
        <span
          className={cn(styles.avatar, styles[size], styles.stacked, styles.overflow)}
          title={travellers
            .slice(max)
            .map((t) => t.name)
            .join(", ")}
        >
          <span className={styles.initials}>+{extra}</span>
        </span>
      ) : null}
    </span>
  );
}
