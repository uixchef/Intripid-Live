"use client";

import { useEffect, type RefObject } from "react";

/**
 * Detects horizontal swipes on a touch surface and fires a callback.
 *
 * Designed for the mobile planner's day navigation: a left swipe advances to
 * the next day, a right swipe goes to the previous day. The hook deliberately
 * ignores touches that start on interactive elements (event cards, buttons,
 * inputs) so it never competes with dnd-kit's TouchSensor or form interaction.
 *
 * Vertical movement is left entirely to the browser — the calendar's
 * `touch-action: pan-y` keeps scrolling working, and this hook only activates
 * when the horizontal component clearly dominates.
 */
export function useSwipe(
  ref: RefObject<HTMLElement | null>,
  onSwipeLeft: () => void,
  onSwipeRight: () => void,
  enabled: boolean,
) {
  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;

    let startX = 0;
    let startY = 0;
    let startT = 0;
    let tracking = false;
    let horizontal = false;

    const onTouchStart = (e: TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;

      // Ignore touches that start on interactive elements.
      const target = e.target as Element | null;
      if (
        target?.closest(
          "[data-event], [data-dnd-draggable], button, a, input, textarea, select, label, [data-no-swipe]",
        )
      ) {
        tracking = false;
        return;
      }

      startX = touch.clientX;
      startY = touch.clientY;
      startT = Date.now();
      tracking = true;
      horizontal = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!tracking) return;
      const touch = e.touches[0];
      if (!touch) return;

      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;

      // Once horizontal dominance is established, prevent vertical scroll
      // from fighting the gesture.
      if (!horizontal) {
        if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.3) {
          horizontal = true;
        }
      }

      if (horizontal) {
        // Prevent the browser from interpreting this as a vertical pan
        // once we've committed to a horizontal swipe.
        e.preventDefault();
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!tracking) return;
      tracking = false;

      const touch = e.changedTouches[0];
      if (!touch) return;

      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      const dt = Date.now() - startT;

      // Must be horizontal-dominant to count as a swipe.
      if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.3) return;

      // Velocity check: either a fast flick or a long drag.
      const velocity = Math.abs(dx) / Math.max(dt, 1);
      if (Math.abs(dx) < 90 && velocity < 0.4) return;

      if (dx < 0) {
        onSwipeLeft();
      } else {
        onSwipeRight();
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [ref, onSwipeLeft, onSwipeRight, enabled]);
}
