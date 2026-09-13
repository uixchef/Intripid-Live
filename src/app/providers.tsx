"use client";

import type { ReactNode } from "react";
import { MotionConfig } from "motion/react";

import { Toast } from "@/components/ui/overlay";
import { SessionStoreProvider, useSession, useSessionApi } from "@/stores/session-store";
import { AppNavTracker } from "@/components/nav/app-nav-tracker";

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
 *
 * The session provider is app-wide rather than scoped to `/dashboard` because
 * "is this a returning user" is a fact about the app, not about one route.
 * Instantiating it per tree (see `create-store-context`) keeps it off the
 * module scope, which matters because Client Components render on the server
 * too. It is a local mock; there is no authentication behind it.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <SessionStoreProvider>
        <AppNavTracker />
        {children}
        <SessionToast />
      </SessionStoreProvider>
    </MotionConfig>
  );
}

function SessionToast() {
  const toast = useSession((s) => s.toast);
  const api = useSessionApi();

  return (
    <Toast
      message={toast?.message ?? null}
      tone={toast?.tone}
      toastKey={toast?.id}
      onDismiss={() => api.getState().clearToast()}
    />
  );
}
