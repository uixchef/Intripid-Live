"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { ArrowRight, Compass } from "lucide-react";

import { Logo } from "@/components/brand/mark";
import { Button } from "@/components/ui/button";
import { CONNECTIONS, EDITORIAL, SAVED_DESTINATIONS } from "@/data/account";
import { TRIP_SUMMARIES } from "@/data/trips";
import type { TripFilter } from "@/data/trips";
import {
  selectUnreadCount,
  useSession,
  useSessionApi,
  useSessionHydrated,
} from "@/stores/session-store";
import type { TravelPersona } from "@/lib/types";

import { AppHeader } from "./app-header";
import { EditorialCard } from "./editorial";
import { Identity } from "./identity";
import { PersonaPanel } from "./persona";
import { QuickTrip } from "./quick-trip";
import { SavedPanel } from "./saved";
import { Travels } from "./travels";
import styles from "./dashboard.module.css";

/**
 * The authenticated home.
 *
 * COMPOSITION. Two columns: what is yours on the left (identity, how you
 * travel, your trips) and what starts something on the right (dates, a
 * seasonal place, saved places). The original screenshot had the same split
 * and it is the right one — the left column is a record, the right column is
 * an action.
 *
 * NOT A SHELL. There is no sidebar and no page frame. Three surfaces exist in
 * this product and two of them are reached from the content of this page, so
 * chrome beyond a 52px bar would be furniture for its own sake.
 *
 * CALM ON PURPOSE. Destination Discovery is the expressive surface — a dark
 * atmosphere, a dominant map, display type asking the questions. This is where
 * someone lands every time they open the product, so it uses the APP surface
 * family: near-white, hairline borders, one tinted band in the identity block
 * and nothing else that could be called atmosphere.
 *
 * MOBILE IS REORDERED, NOT COLLAPSED. The two columns become one and the
 * sections are re-sequenced by what a phone user came for: who I am, start
 * something, my trips, then everything else. The desktop order would put a
 * seasonal feature above the trip you are flying to on Tuesday.
 */

export function Dashboard() {
  const api = useSessionApi();
  const hydrated = useSessionHydrated();

  const sessionState = useSession((s) => s.state);
  const user = useSession((s) => s.user);
  const notifications = useSession((s) => s.notifications);
  const unreadCount = useSession(selectUnreadCount);

  const [filter, setFilter] = useState<TripFilter>("all");
  const [editingPersona, setEditingPersona] = useState(false);

  /**
   * "New trip" sends you to where trips are actually started.
   *
   * Not a modal offering the same two doors the panel already shows, and not a
   * fabricated draft trip in a list that cannot persist it. It moves you to
   * the real control and puts the caret in it — which also answers "where do I
   * do this next time" without a tooltip.
   */
  const onNewTrip = useCallback(() => {
    const panel = document.getElementById("start-a-trip");
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    panel?.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "center",
    });
    /* preventScroll: the scrollIntoView above already owns the movement. */
    document.getElementById("quick-start")?.focus({ preventScroll: true });
  }, []);

  const onSavePersona = useCallback(
    (patch: Partial<TravelPersona>) => {
      api.getState().updatePersona(patch);
      setEditingPersona(false);
    },
    [api],
  );

  const onEditPersona = useCallback(() => {
    setEditingPersona(true);
    const panel = document.getElementById("travel-persona");
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    panel?.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "start",
    });
  }, []);

  /* ---------------------------------------------------------------------- */
  /* Guest                                                                  */
  /* ---------------------------------------------------------------------- */

  /*
   * Until the persisted session has been read, render nothing rather than
   * guess. The server renders the default (authenticated), so branching before
   * hydration would flash a stranger's dashboard at a signed-out visitor.
   */
  if (!hydrated) {
    return <div className={styles.booting} aria-hidden />;
  }

  if (sessionState === "guest" || !user) {
    return (
      <main className={styles.gate}>
        <div className={styles.gateCard}>
          <Logo size={22} />
          <h1 className={styles.gateTitle}>You&rsquo;re signed out</h1>
          <p className={styles.gateBody}>
            The dashboard is the returning-traveller view: your trips, your
            travel persona and the people you plan with. Discovery works
            without an account.
          </p>

          <div className={styles.gateActions}>
            <Button
              variant="primary"
              size="md"
              iconRight={<ArrowRight size={14} strokeWidth={2.4} />}
              onClick={() => api.getState().signIn()}
            >
              Continue as Sarthak Goyal
            </Button>
            <Link href="/discover" className={styles.gateLink}>
              <Compass size={13} strokeWidth={2.1} aria-hidden />
              Find where to go instead
            </Link>
          </div>

          <p className={styles.gateNote}>
            There is no real authentication in this build. The session is a
            local mock so the guest and signed-in states are both reachable.
          </p>
        </div>
      </main>
    );
  }

  /* ---------------------------------------------------------------------- */
  /* Authenticated                                                          */
  /* ---------------------------------------------------------------------- */

  return (
    <div className={styles.root}>
      <AppHeader
        user={user}
        connections={CONNECTIONS}
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkAllRead={() => api.getState().markAllNotificationsRead()}
        onMarkRead={(id) => api.getState().markNotificationRead(id)}
        onEditPersona={onEditPersona}
        onSignOut={() => api.getState().signOut()}
      />

      <main className={styles.page}>
        <div className={styles.body}>
          {/*
           * `.main` and `.support` become `display: contents` on narrow
           * viewports so their sections can be re-ordered as siblings. That is
           * the mechanism behind "reordered, not collapsed".
           */}
          <div className={styles.main}>
            <div className={styles.slotIdentity}>
              <Identity
                user={user}
                editing={editingPersona}
                onEditPersona={onEditPersona}
                /*
                 * Editing a profile and refining a persona are the same act in
                 * this product: there is no separate name-and-photo form,
                 * because there is no photo and the name is not the useful
                 * part.
                 */
                onEditProfile={onEditPersona}
              />
            </div>

            <div className={styles.slotPersona} id="travel-persona">
              <PersonaPanel
                persona={user.persona}
                editing={editingPersona}
                onStartEdit={() => setEditingPersona(true)}
                onCancel={() => setEditingPersona(false)}
                onSave={onSavePersona}
              />
            </div>

            <div className={styles.slotTravels}>
              <Travels
                trips={TRIP_SUMMARIES}
                filter={filter}
                onFilter={setFilter}
                onNewTrip={onNewTrip}
              />
            </div>
          </div>

          <div className={styles.support}>
            <div className={styles.slotQuickTrip} id="start-a-trip">
              <QuickTrip />
            </div>

            <div className={styles.slotEditorial}>
              <EditorialCard feature={EDITORIAL} />
            </div>

            <div className={styles.slotSaved}>
              <SavedPanel
                saved={SAVED_DESTINATIONS}
                wishlistTotal={user.stats.wishlist}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
