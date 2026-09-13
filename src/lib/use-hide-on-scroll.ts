"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const HIDE_DISTANCE = 36;
const SHOW_DISTANCE = 28;
const TOP_REVEAL = 20;
const LAYOUT_JUMP = 72;
const LOCK_MS = 380;

/**
 * Hide chrome while the user scrolls content up; reveal it when they
 * scroll back down. Same pattern as iOS Safari and most mobile apps.
 *
 * Layout that resizes the scrollport (collapsing a header) can fire
 * reverse scroll events — those are ignored while locked and when the
 * delta is too large to be a finger.
 */
export function useHideOnScroll(enabled: boolean) {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  const acc = useRef(0);
  const hiddenRef = useRef(false);
  const lockUntil = useRef(0);
  hiddenRef.current = hidden;

  useEffect(() => {
    if (!enabled) {
      setHidden(false);
      acc.current = 0;
      lockUntil.current = 0;
    }
  }, [enabled]);

  const lock = useCallback(() => {
    lockUntil.current = performance.now() + LOCK_MS;
    acc.current = 0;
  }, []);

  const onScroll = useCallback(
    (event: { currentTarget: EventTarget & HTMLElement }) => {
      if (!enabled) return;
      const y = event.currentTarget.scrollTop;
      const dy = y - lastY.current;
      lastY.current = y;

      if (performance.now() < lockUntil.current) return;
      if (Math.abs(dy) >= LAYOUT_JUMP) return;

      if (y <= TOP_REVEAL) {
        acc.current = 0;
        if (hiddenRef.current) {
          setHidden(false);
          lock();
        }
        return;
      }

      if (dy === 0) return;
      if (acc.current !== 0 && Math.sign(dy) !== Math.sign(acc.current)) {
        acc.current = 0;
      }
      acc.current += dy;

      if (acc.current > HIDE_DISTANCE && !hiddenRef.current) {
        setHidden(true);
        lock();
      } else if (acc.current < -SHOW_DISTANCE && hiddenRef.current) {
        setHidden(false);
        lock();
      }
    },
    [enabled, lock],
  );

  const reset = useCallback(() => {
    lastY.current = 0;
    acc.current = 0;
    lockUntil.current = 0;
    setHidden(false);
  }, []);

  return { hidden, onScroll, reset };
}
