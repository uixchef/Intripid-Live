"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Bell, Bookmark, CalendarClock } from "lucide-react";

import { Button, IconButton } from "@/components/ui/button";
import { getDestination } from "@/data/destinations";
import { useMediaQuery } from "@/lib/use-media-query";
import { cn } from "@/lib/utils";
import type { EditorialFeature } from "@/lib/types";
import { useSession, useSessionApi } from "@/stores/session-store";

import { DestinationCover } from "./destination-cover";
import styles from "./editorial.module.css";

const ROTATE_MS = 7000;

/**
 * Seasonal features, rotating.
 *
 * A home screen should sometimes tell you about a place, and the place
 * should be seasonal. One card goes stale; a slow carousel keeps the slot
 * as "windows that are closing" without turning the column into a feed.
 *
 * Autoplay pauses on hover, keyboard focus, and reduced motion. Dots are
 * the only control — the column is 360px and does not have room for arrows.
 */

export interface EditorialCardProps {
  features: EditorialFeature[];
}

export function EditorialCard({ features }: EditorialCardProps) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const session = useSessionApi();
  const wishlist = useSession((s) => s.wishlist);

  if (features.length === 0) return null;

  return (
    <section
      className={styles.card}
      aria-roledescription="carousel"
      aria-label="Seasonal destination features"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setPaused(false);
        }
      }}
    >
      <div className={styles.covers}>
        {features.map((feature, slide) => (
          <div
            key={feature.id}
            className={styles.coverLayer}
            data-active={slide === index ? "" : undefined}
            aria-hidden={slide === index ? undefined : true}
          >
            <DestinationCover destinationId={feature.destinationId} featured />
          </div>
        ))}

        {features.length > 1 ? (
          <div
            className={styles.dots}
            role="tablist"
            aria-label="Features"
            data-paused={paused ? "" : undefined}
          >
            {features.map((feature, slide) => {
              const place = getDestination(feature.destinationId)?.name ?? feature.headline;
              const selected = slide === index;
              return (
                <button
                  key={feature.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-label={place}
                  className={cn(styles.dot, selected && styles.dotActive)}
                  onClick={() => setIndex(slide)}
                >
                  {selected ? (
                    <span
                      key={index}
                      className={styles.dotFill}
                      style={{ animationDuration: `${ROTATE_MS}ms` }}
                      onAnimationEnd={() => {
                        if (reduceMotion) return;
                        setIndex((current) => (current + 1) % features.length);
                      }}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className={styles.bodies}>
        {features.map((feature, slide) => {
          const place = getDestination(feature.destinationId);
          const active = slide === index;
          const bookmarked = wishlist.some(
            (item) => item.id === feature.destinationId,
          );
          const reminded = saved[feature.id] ?? false;
          return (
            <div
              key={feature.id}
              className={styles.body}
              data-active={active ? "" : undefined}
              aria-hidden={active ? undefined : true}
              inert={active ? undefined : true}
            >
              <p className={styles.eyebrow}>{feature.eyebrow}</p>
              <h2 className={styles.headline}>{feature.headline}</h2>
              <p className={styles.text}>{feature.body}</p>

              <p className={styles.window}>
                <span className={styles.windowLabel}>
                  <CalendarClock size={12} strokeWidth={2.1} aria-hidden />
                  Best window
                </span>
                <span className={styles.windowValue}>{feature.window}</span>
              </p>

              <p className={styles.because}>{feature.because}.</p>

              <div className={styles.actions}>
                <Link href="/discover" className={styles.actionLink}>
                  <Button
                    variant="secondary"
                    size="md"
                    block
                    iconRight={<ArrowRight size={13} strokeWidth={2.4} />}
                  >
                    Check it against your dates
                  </Button>
                </Link>
                <IconButton
                  label={
                    bookmarked
                      ? `Remove ${place?.name ?? feature.headline} from wishlist`
                      : `Save ${place?.name ?? feature.headline} to wishlist`
                  }
                  variant="secondary"
                  size="md"
                  aria-pressed={bookmarked}
                  data-on={bookmarked ? "" : undefined}
                  className={styles.keep}
                  onClick={() => {
                    const pin = getDestination(feature.destinationId);
                    if (!place || !pin) return;
                    session.getState().toggleWishlist({
                      id: pin.id,
                      name: pin.name,
                      coords: pin.coords,
                      countryCode: pin.countryCode,
                    });
                  }}
                >
                  <Bookmark
                    size={15}
                    strokeWidth={2.1}
                    fill={bookmarked ? "currentColor" : "none"}
                  />
                </IconButton>
                <IconButton
                  label={
                    reminded
                      ? `Cancel reminder for ${place?.name ?? feature.headline} (${feature.window})`
                      : `Remind me when it's best to go to ${place?.name ?? feature.headline} — ${feature.window}`
                  }
                  variant="secondary"
                  size="md"
                  aria-pressed={reminded}
                  data-on={reminded ? "" : undefined}
                  className={styles.remind}
                  onClick={() => {
                    const reminderId = `n-remind-${feature.id}`;
                    const next = !reminded;
                    if (next) {
                      session.getState().addNotification({
                        id: reminderId,
                        kind: "season",
                        title: `We'll remind you for ${place?.name ?? feature.headline}`,
                        detail: `Best window is ${feature.window}. We'll ping you as it approaches.`,
                        age: "Just now",
                        href: "/discover",
                        read: false,
                      });
                      session.getState().showToast(
                        `We’ll remind you for ${place?.name ?? feature.headline} — ${feature.window}`,
                        "success",
                      );
                    } else {
                      session.getState().removeNotification(reminderId);
                      session.getState().showToast(
                        `Cancelled the reminder for ${place?.name ?? feature.headline}`,
                        "info",
                      );
                    }
                    setSaved((current) => ({
                      ...current,
                      [feature.id]: next,
                    }));
                  }}
                >
                  <Bell
                    size={15}
                    strokeWidth={2.1}
                    fill={reminded ? "currentColor" : "none"}
                  />
                </IconButton>
              </div>

              {place ? (
                <p className={styles.footNote}>
                  Discovery scores {place.name} on your budget, your interests
                  and the month you pick.
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
