"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Matches a media query in the browser.
 *
 * Implemented with `useSyncExternalStore` because `matchMedia` IS an external
 * store: subscribing in an effect and mirroring the result into state would
 * cause a second render on mount and can tear during concurrent rendering.
 *
 * The server snapshot is `false`, so any layout depending on this must be
 * correct at `false` too — which is why the desktop composition is the
 * default and mobile is the override.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );

  const getSnapshot = useCallback(
    () => window.matchMedia(query).matches,
    [query],
  );

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

/** True below the tablet breakpoint, where the planner switches composition. */
export function useIsCompact(): boolean {
  return useMediaQuery("(max-width: 900px)");
}

/** Short viewports get a tighter hour row so a day still fits. */
export function useIsShort(): boolean {
  return useMediaQuery("(max-height: 780px)");
}
