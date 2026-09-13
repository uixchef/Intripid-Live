"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import { travellerColor } from "@/lib/categories";
import type { Traveller } from "@/lib/types";

import styles from "./avatar.module.css";

/**
 * One badge slot for an online advisor: green presence, then the tick.
 * Online holds ~5s; the tick is a short beat so they still read as present.
 */
function useAdvisorOnlinePulse(active: boolean): boolean {
  const [onlineNow, setOnlineNow] = useState(true);

  useEffect(() => {
    if (!active) {
      setOnlineNow(true);
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setOnlineNow(true);
      return;
    }

    let timer = 0;
    let showingOnline = true;
    setOnlineNow(true);

    function schedule() {
      const wait = showingOnline
        ? 4800 + Math.random() * 800
        : 1800 + Math.random() * 500;
      timer = window.setTimeout(() => {
        showingOnline = !showingOnline;
        setOnlineNow(showingOnline);
        schedule();
      }, wait);
    }

    schedule();
    return () => window.clearTimeout(timer);
  }, [active]);

  return active && onlineNow;
}

export interface AvatarProps {
  traveller: Traveller;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  /** Override the identity ramp — used when this person is the session user. */
  color?: string;
  /** Render the live presence dot. */
  showPresence?: boolean;
  /** Skip the visually-hidden name when the parent already labels this. */
  hideName?: boolean;
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
  color,
  showPresence = false,
  hideName = false,
  className,
}: AvatarProps) {
  const advisorOnline =
    traveller.role === "advisor" && showPresence && traveller.online;
  const showAdvisorOnline = useAdvisorOnlinePulse(advisorOnline);
  const showOnlinePip = showPresence && traveller.online && !advisorOnline;
  const showAdvisorTick = traveller.role === "advisor" && !advisorOnline;
  const titleBits = [
    traveller.name,
    traveller.role === "owner"
      ? "organizer"
      : traveller.role === "advisor"
        ? "travel advisor"
        : null,
    advisorOnline
      ? showAdvisorOnline
        ? "online"
        : null
      : showOnlinePip
        ? "online"
        : null,
  ].filter(Boolean);

  return (
    <span
      className={cn(styles.avatar, styles[size], className)}
      style={{
        ["--avatar-color" as string]:
          color ?? travellerColor(traveller.colorIndex),
      }}
      title={titleBits.join(" · ")}
    >
      <span className={styles.media}>
        {traveller.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- local portrait, sized by the face
          <img
            className={styles.photo}
            src={traveller.photoUrl}
            alt=""
            width={40}
            height={40}
          />
        ) : (
          <span className={styles.initials} aria-hidden>
            {traveller.initials}
          </span>
        )}
      </span>
      {hideName ? null : (
        <span className="srOnly">{traveller.name}</span>
      )}
      {advisorOnline ? (
        <span
          className={styles.liveBadge}
          data-mode={showAdvisorOnline ? "online" : "advisor"}
          aria-hidden
        >
          <span className={styles.presence} />
          <span className={styles.advisorMark}>
            <AdvisorTick />
          </span>
        </span>
      ) : showAdvisorTick ? (
        <span className={styles.advisorMark} aria-hidden>
          <AdvisorTick />
        </span>
      ) : showOnlinePip ? (
        <span className={styles.presence} aria-hidden />
      ) : null}
    </span>
  );
}

/** Purple verification tick — same idea as a platform check, our colour. */
function AdvisorTick() {
  return (
    <svg viewBox="0 0 24 24" className={styles.advisorTick} aria-hidden>
      <path
        fill="currentColor"
        stroke="var(--bg-surface-raised)"
        strokeWidth="2"
        d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.78 4.78 4 4 0 0 1-6.74 0 4 4 0 0 1-4.78-4.78 4 4 0 0 1 0-6.74Z"
      />
      <path
        fill="none"
        stroke="var(--slate-0)"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m9 12 2 2 4-4"
      />
    </svg>
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
