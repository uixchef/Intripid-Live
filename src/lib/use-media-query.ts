"use client";

import { useEffect, useState } from "react";

/**
 * Matches a media query in the browser.
 *
 * Starts `false` on the server and on the first client render, then settles
 * after mount — so the markup React hydrates always matches what the server
 * produced. Layout that depends on this must therefore be correct at the
 * "false" value too, which is why the desktop composition is the default and
 * mobile is the override.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const list = window.matchMedia(query);
    setMatches(list.matches);

    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    list.addEventListener("change", onChange);
    return () => list.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

/** True below the tablet breakpoint, where the planner switches composition. */
export function useIsCompact(): boolean {
  return useMediaQuery("(max-width: 900px)");
}

/** Short viewports get a tighter hour row so a day still fits. */
export function useIsShort(): boolean {
  return useMediaQuery("(max-height: 780px)");
}
