"use client";

import { useCallback, useEffect, useSyncExternalStore, type ReactNode } from "react";
import { persist } from "zustand/middleware";
import { createStore } from "zustand/vanilla";

import { ACCOUNT_USER, NOTIFICATIONS } from "@/data/account";
import type {
  AccountUser,
  AppNotification,
  SessionState,
  TravelPersona,
} from "@/lib/types";

import { createStoreContext } from "./create-store-context";

/**
 * Who is looking, and nothing more.
 *
 * THIS IS NOT AUTHENTICATION. There is no provider, no token, no password and
 * no server. What it is: the one place the app asks "is this a returning user
 * or a stranger", so the routing and the chrome can differ without every
 * component guessing. Real auth would slot in behind exactly this interface —
 * `state`, `user`, `signIn`, `signOut` — which is the point of having it at
 * all rather than hard-coding a logged-in page.
 *
 * DEFAULT IS AUTHENTICATED, deliberately. `/dashboard` has to be directly
 * visitable for review without anyone hunting for a fake login, so a fresh
 * visitor is the seeded user. Signing out is the interesting transition and it
 * is the one that is implemented: it flips to `guest`, persists, and the
 * dashboard then shows its guest gate instead of someone else's data.
 */

export interface SessionStoreState {
  state: SessionState;
  user: AccountUser | null;
  notifications: AppNotification[];

  signIn: () => void;
  signOut: () => void;
  updatePersona: (patch: Partial<TravelPersona>) => void;
  markAllNotificationsRead: () => void;
  markNotificationRead: (id: string) => void;
}

function makeSessionStore() {
  return createStore<SessionStoreState>()(
    persist(
      (set, get) => ({
        state: "authenticated",
        user: ACCOUNT_USER,
        notifications: NOTIFICATIONS,

        signIn: () => set({ state: "authenticated", user: ACCOUNT_USER }),

        /*
         * The user is dropped along with the state. Keeping it around "in case
         * they come back" is how a signed-out screen ends up rendering the
         * previous person's name.
         */
        signOut: () => set({ state: "guest", user: null }),

        /*
         * Persona edits live for the session and are NOT persisted — see
         * `partialize`. The seed is the demo's ground truth, and a reviewer's
         * localStorage quietly overriding it is how a portfolio build starts
         * showing something nobody designed.
         */
        updatePersona: (patch) => {
          const user = get().user;
          if (!user) return;
          set({ user: { ...user, persona: { ...user.persona, ...patch } } });
        },

        markAllNotificationsRead: () =>
          set({
            notifications: get().notifications.map((notification) => ({
              ...notification,
              read: true,
            })),
          }),

        markNotificationRead: (id) =>
          set({
            notifications: get().notifications.map((notification) =>
              notification.id === id
                ? { ...notification, read: true }
                : notification,
            ),
          }),
      }),
      {
        name: "intripid-session",
        /*
         * Only the session decision is persisted. The user record and the
         * notification seed come from source on every load, so editing the
         * seed data is never fighting a stale copy in someone's localStorage.
         */
        partialize: (state) => ({ state: state.state }),
        // Rehydrate after mount so SSR markup and the first client render
        // agree — see `useSessionHydrated`.
        skipHydration: true,
      },
    ),
  );
}

const context = createStoreContext<SessionStoreState>("SessionStore");

export function SessionStoreProvider({ children }: { children: ReactNode }) {
  return (
    <context.Provider createStore={makeSessionStore}>{children}</context.Provider>
  );
}

export const useSession = context.useStoreSelector;
export const useSessionApi = context.useStoreApi;

/**
 * True once the persisted session has been read.
 *
 * The server renders the default (authenticated), so a signed-out visitor
 * would flash the dashboard for a frame. Callers that branch on session state
 * wait for this. Read as an external store rather than mirrored into local
 * state so the effect below only has to start the work.
 */
export function useSessionHydrated(): boolean {
  const api = useSessionApi();
  const persistApi = (
    api as unknown as {
      persist: {
        rehydrate: () => Promise<void> | void;
        hasHydrated: () => boolean;
        onFinishHydration: (fn: () => void) => () => void;
      };
    }
  ).persist;

  const hydrated = useSyncExternalStore(
    useCallback(
      (cb: () => void) => persistApi.onFinishHydration(cb),
      [persistApi],
    ),
    () => persistApi.hasHydrated(),
    () => false,
  );

  useEffect(() => {
    void persistApi.rehydrate();
  }, [persistApi]);

  return hydrated;
}

/** Unread count for the header's bell. */
export function selectUnreadCount(state: SessionStoreState): number {
  return state.notifications.filter((notification) => !notification.read).length;
}
