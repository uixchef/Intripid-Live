"use client";

import { useCallback, useEffect, useSyncExternalStore, type ReactNode } from "react";
import { persist } from "zustand/middleware";
import { createStore } from "zustand/vanilla";

import {
  ACCOUNT_USER,
  AVOID_PLACES,
  CONNECTIONS,
  NOTIFICATIONS,
  VISITED_LOCATIONS,
  WISHLIST_PLACES,
  withSeededConnectionRequests,
} from "@/data/account";
import type {
  AccountUser,
  AppNotification,
  AvoidPlace,
  Connection,
  FootprintCategory,
  Origin,
  SessionState,
  TravelPersona,
  VisitedLocation,
  WishlistPlace,
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
  wishlist: WishlistPlace[];
  visited: VisitedLocation[];
  avoids: AvoidPlace[];
  connections: Connection[];

  signIn: () => void;
  signOut: () => void;
  updatePersona: (patch: Partial<TravelPersona>) => void;
  updateAccount: (patch: AccountPatch) => void;
  setConnections: (connections: Connection[]) => void;
  setDefaultOrigin: (origin: Origin) => void;
  markAllNotificationsRead: () => void;
  markNotificationRead: (id: string) => void;
  addNotification: (notification: AppNotification) => void;
  removeNotification: (id: string) => void;
  addWishlist: (place: WishlistPlace) => void;
  addVisited: (place: VisitedLocation) => void;
  addAvoid: (place: AvoidPlace) => void;
  removePlace: (category: FootprintCategory, id: string) => void;
  toggleWishlist: (place: WishlistPlace) => void;
  toast: { id: number; message: string; tone: "info" | "success" | "warning" } | null;
  showToast: (message: string, tone?: "info" | "success" | "warning") => void;
  clearToast: () => void;
}

function makeSessionStore() {
  let toastId = 0;

  return createStore<SessionStoreState>()(
    persist(
      (set, get) => ({
        state: "authenticated",
        user: ACCOUNT_USER,
        notifications: NOTIFICATIONS,
        wishlist: WISHLIST_PLACES,
        visited: VISITED_LOCATIONS,
        avoids: AVOID_PLACES,
        connections: CONNECTIONS,
        toast: null,

        signIn: () =>
          set({
            state: "authenticated",
            user: ACCOUNT_USER,
            wishlist: WISHLIST_PLACES,
            visited: VISITED_LOCATIONS,
            avoids: AVOID_PLACES,
            connections: CONNECTIONS,
          }),

        /*
         * The user is dropped along with the state. Keeping it around "in case
         * they come back" is how a signed-out screen ends up rendering the
         * previous person's name.
         */
        signOut: () =>
          set({
            state: "guest",
            user: null,
            wishlist: WISHLIST_PLACES,
            visited: VISITED_LOCATIONS,
            avoids: AVOID_PLACES,
            connections: CONNECTIONS,
          }),

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
          get().showToast("Travel persona saved", "success");
        },

        updateAccount: (patch) => {
          const user = get().user;
          if (!user) return;
          const name = patch.name?.trim() ?? user.name;
          const handle = normaliseHandle(patch.handle ?? user.handle);
          const photoUrl =
            "photoUrl" in patch ? patch.photoUrl || undefined : user.photoUrl;
          set({
            user: {
              ...user,
              ...patch,
              name,
              handle,
              photoUrl,
              initials: initialsFromName(name),
              documents: patch.documents
                ? { ...user.documents, ...patch.documents }
                : user.documents,
              foodRestrictions:
                patch.foodRestrictions ?? user.foodRestrictions,
              diets: patch.diets ?? user.diets,
              languages: patch.languages ?? user.languages,
              addresses: patch.addresses ?? user.addresses,
              defaultAddressId:
                patch.defaultAddressId ?? user.defaultAddressId,
            },
          });
        },

        setConnections: (connections) => set({ connections }),

        /*
         * Default departure is persisted. Discovery pre-selects it on the
         * origin step, so a reload or a new tab has to remember the choice —
         * unlike persona, which is demo-seeded on purpose.
         */
        setDefaultOrigin: (origin) => {
          const user = get().user;
          if (!user) return;
          set({
            user: {
              ...user,
              homeCity: origin.city,
              homeCountry: origin.country,
            },
          });
          get().showToast(
            `Discovery will start from ${origin.city}`,
            "success",
          );
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

        addNotification: (notification) => {
          if (get().notifications.some((item) => item.id === notification.id)) {
            return;
          }
          set({ notifications: [notification, ...get().notifications] });
        },

        removeNotification: (id) =>
          set({
            notifications: get().notifications.filter(
              (notification) => notification.id !== id,
            ),
          }),

        addWishlist: (place) => {
          const { wishlist, visited } = get();
          if (hasName(wishlist, place.name)) {
            get().showToast(`${q(place.name)} is already on your wishlist`, "info");
            return;
          }
          if (hasName(visited, place.name)) {
            get().showToast(
              `${q(place.name)} is already on Visited`,
              "info",
            );
            return;
          }
          set({
            avoids: get().avoids.filter((item) => !sameName(item.name, place.name)),
            wishlist: [place, ...wishlist],
          });
          get().showToast(`Saved ${q(place.name)} to your wishlist`, "success");
        },

        addVisited: (place) => {
          if (hasName(get().visited, place.name)) {
            get().showToast(`${q(place.name)} is already on Visited`, "info");
            return;
          }
          set({
            wishlist: get().wishlist.filter((item) => !sameName(item.name, place.name)),
            avoids: get().avoids.filter((item) => !sameName(item.name, place.name)),
            visited: [place, ...get().visited],
          });
          get().showToast(`Marked ${q(place.name)} as visited`, "success");
        },

        addAvoid: (place) => {
          if (hasName(get().avoids, place.name)) {
            get().showToast(`You’re already avoiding ${q(place.name)}`, "info");
            return;
          }
          set({
            wishlist: get().wishlist.filter((item) => !sameName(item.name, place.name)),
            visited: get().visited.filter(
              (item) => item.kind === "home" || !sameName(item.name, place.name),
            ),
            avoids: [place, ...get().avoids],
          });
          get().showToast(
            `We’ll keep ${q(place.name)} off your recommendations`,
            "success",
          );
        },

        removePlace: (category, id) => {
          if (category === "wishlist") {
            const place = get().wishlist.find((item) => item.id === id);
            set({
              wishlist: get().wishlist.filter((item) => item.id !== id),
            });
            if (place) {
              get().showToast(
                `Removed ${q(place.name)} from your wishlist`,
                "info",
              );
            }
            return;
          }
          if (category === "visited") {
            const place = get().visited.find((item) => item.id === id);
            if (!place || place.kind === "home") return;
            set({
              visited: get().visited.filter((item) => item.id !== id),
            });
            get().showToast(`Removed ${q(place.name)} from visited`, "info");
            return;
          }
          const place = get().avoids.find((item) => item.id === id);
          set({
            avoids: get().avoids.filter((item) => item.id !== id),
          });
          if (place) {
            get().showToast(`We’ll stop avoiding ${q(place.name)}`, "info");
          }
        },

        /*
         * Bookmark from editorial. Can sit on a visited city (go again);
         * still clears Avoid so the globe does not contradict itself.
         */
        toggleWishlist: (place) => {
          const onList = get().wishlist.some(
            (item) => item.id === place.id || sameName(item.name, place.name),
          );
          if (onList) {
            set({
              wishlist: get().wishlist.filter(
                (item) => item.id !== place.id && !sameName(item.name, place.name),
              ),
            });
            get().showToast(
              `Removed ${q(place.name)} from your wishlist`,
              "info",
            );
            return;
          }
          set({
            avoids: get().avoids.filter((item) => !sameName(item.name, place.name)),
            wishlist: [place, ...get().wishlist],
          });
          get().showToast(`Saved ${q(place.name)} to your wishlist`, "success");
        },

        showToast: (message, tone = "info") => {
          toastId += 1;
          set({ toast: { id: toastId, message, tone } });
        },

        clearToast: () => set({ toast: null }),
      }),
      {
        name: "intripid-session",
        /*
         * Session, departure, and the account settings the traveller edits.
         * Persona stays seeded so a reviewer's localStorage cannot rewrite it.
         */
        partialize: (state) => ({
          state: state.state,
          defaultOrigin: state.user
            ? { city: state.user.homeCity, country: state.user.homeCountry }
            : null,
          account: state.user ? persistAccount(state.user) : null,
          connections: state.connections,
        }),
        merge: (persistedState, currentState) => {
          const stored = (persistedState ?? {}) as {
            state?: SessionState;
            defaultOrigin?: { city: string; country: string } | null;
            account?: StoredAccount | null;
            connections?: Connection[];
          };
          const baseUser = currentState.user;
          const user = baseUser
            ? {
                ...baseUser,
                ...(stored.account
                  ? (({ diet: _legacyDiet, ...rest }) => rest)(stored.account)
                  : {}),
                homeCity:
                  stored.defaultOrigin?.city ??
                  stored.account?.homeCity ??
                  baseUser.homeCity,
                homeCountry:
                  stored.defaultOrigin?.country ??
                  stored.account?.homeCountry ??
                  baseUser.homeCountry,
                documents: {
                  ...baseUser.documents,
                  ...(stored.account?.documents ?? {}),
                },
                foodRestrictions:
                  stored.account?.foodRestrictions ?? baseUser.foodRestrictions,
                diets: storedDiets(stored.account) ?? baseUser.diets,
                languages: stored.account?.languages ?? baseUser.languages,
                addresses:
                  stored.account?.addresses ??
                  addressesFromHome(stored.account, baseUser),
                defaultAddressId:
                  stored.account?.defaultAddressId ??
                  stored.account?.addresses?.[0]?.id ??
                  baseUser.defaultAddressId,
                photoUrl:
                  stored.account && "photoUrl" in stored.account
                    ? stored.account.photoUrl || undefined
                    : baseUser.photoUrl,
                persona: baseUser.persona,
              }
            : currentState.user;
          return {
            ...currentState,
            state: stored.state ?? currentState.state,
            user,
            connections: withSeededRequests(
              stored.connections ?? currentState.connections,
            ),
          };
        },
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
    const frame = requestAnimationFrame(() => {
      void persistApi.rehydrate();
    });
    return () => cancelAnimationFrame(frame);
  }, [persistApi]);

  return hydrated;
}

function withSeededRequests(people: Connection[]): Connection[] {
  return withConnectionHandles(withSeededConnectionRequests(people));
}

function withConnectionHandles(people: Connection[]): Connection[] {
  const seeded = new Map(CONNECTIONS.map((person) => [person.id, person]));
  return people.map((person) => ({
    ...person,
    handle:
      person.handle ||
      seeded.get(person.id)?.handle ||
      normaliseHandle(person.name),
  }));
}

/** Unread count for the header's bell. */
export function selectUnreadCount(state: SessionStoreState): number {
  return state.notifications.filter((notification) => !notification.read).length;
}

function sameName(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function hasName(places: { name: string }[], name: string) {
  return places.some((place) => sameName(place.name, name));
}

function q(name: string) {
  return `“${name}”`;
}

export type AccountPatch = Partial<
  Pick<
    AccountUser,
    | "name"
    | "handle"
    | "photoUrl"
    | "homeCity"
    | "homeCountry"
    | "homeAddress"
    | "addresses"
    | "defaultAddressId"
    | "diets"
    | "foodRestrictions"
    | "languages"
    | "incomeBand"
    | "documents"
  >
>;

type StoredAccount = AccountPatch & { diet?: string };

function storedDiets(account?: StoredAccount | null) {
  if (!account) return undefined;
  if (account.diets) return account.diets;
  if (!account.diet || account.diet === "no-preference") return undefined;
  return [account.diet as AccountUser["diets"][number]];
}

function addressesFromHome(
  account: StoredAccount | null | undefined,
  baseUser: AccountUser,
) {
  if (!account) return baseUser.addresses;
  const city = account.homeCity ?? baseUser.homeCity;
  const country = account.homeCountry ?? baseUser.homeCountry;
  const street = account.homeAddress ?? baseUser.homeAddress;
  const seed = baseUser.addresses[0];
  if (seed && seed.city === city && seed.country === country) {
    return [{ ...seed, street }];
  }
  return [
    {
      id: "a-home",
      street,
      city,
      postal: "",
      country,
      countryCode: "",
    },
  ];
}

function persistAccount(user: AccountUser): StoredAccount {
  return {
    name: user.name,
    handle: user.handle,
    photoUrl: user.photoUrl ?? "",
    homeCity: user.homeCity,
    homeCountry: user.homeCountry,
    homeAddress: user.homeAddress,
    addresses: user.addresses,
    defaultAddressId: user.defaultAddressId,
    diets: user.diets,
    foodRestrictions: user.foodRestrictions,
    languages: user.languages,
    incomeBand: user.incomeBand,
    documents: user.documents,
  };
}

export function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function normaliseHandle(value: string) {
  return value
    .trim()
    .replace(/^@+/, "")
    .toLowerCase()
    .replace(/[^a-z0-9._]+/g, "")
    .slice(0, 24);
}
