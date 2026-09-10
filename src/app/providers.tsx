"use client";

import type { ReactNode } from "react";
import { MotionConfig } from "motion/react";

/**
 * App-wide client providers.
 *
 * `reducedMotion="user"` makes Motion honour the OS setting itself: it drops
 * transform and layout animations and keeps only opacity.
 *
 * This matters for correctness, not just taste. Branching a component's
 * `initial` prop on `useReducedMotion()` produces different inline styles on
 * the server (where the preference is unknown) than on the client, which React
 * reports as a hydration mismatch. Letting Motion do the reduction keeps the
 * rendered markup identical either way.
 */
export function Providers({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
