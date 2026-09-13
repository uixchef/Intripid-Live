"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Compass, Plus } from "lucide-react";

import { Logo } from "@/components/brand/mark";
import { MobileBack } from "@/components/nav/mobile-back";
import { useBackTarget } from "@/components/nav/back-link";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/overlay";
import { EDITORIALS } from "@/data/account";
import { TRIP_SUMMARIES } from "@/data/trips";
import type { TripFilter } from "@/data/trips";
import type { Route } from "next";
import { isTripPath, readAccountSettingsReturn, writeAccountSettingsReturn } from "@/lib/nav";
import { useIsCompact } from "@/lib/use-media-query";
import { useHideOnScroll } from "@/lib/use-hide-on-scroll";
import { cn } from "@/lib/utils";
import {
  selectUnreadCount,
  useSession,
  useSessionApi,
  useSessionHydrated,
} from "@/stores/session-store";
import type { FootprintCategory, TravelPersona } from "@/lib/types";

import {
  AccountSettingsWorkspace,
  accountSettingsDirty,
  captureAccountSettings,
  type AccountSettingsDraft,
} from "./account-settings";
import { AppHeader } from "./app-header";
import { EditorialCard } from "./editorial";
import { Identity } from "./identity";
import { Leaderboard, LeaderboardFull } from "./leaderboard";
import { PersonaPanel } from "./persona";
import { PrizesPanel } from "./prizes-board";
import { QuickTrip } from "./quick-trip";
import { Travels } from "./travels";
import styles from "./dashboard.module.css";

/**
 * The authenticated home.
 *
 * COMPOSITION. Two columns: what is yours on the left (identity, how you
 * travel, your trips) and what starts something on the right (dates, rank
 * among people you already travel with, then a seasonal place). The
 * original screenshot had the same split and it is the right one — the left
 * column is a record, the right column is an action.
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
  const router = useRouter();
  const hydrated = useSessionHydrated();

  const sessionState = useSession((s) => s.state);
  const user = useSession((s) => s.user);
  const notifications = useSession((s) => s.notifications);
  const unreadCount = useSession(selectUnreadCount);
  const connections = useSession((s) => s.connections);
  const visited = useSession((s) => s.visited);
  const wishlist = useSession((s) => s.wishlist);
  const avoids = useSession((s) => s.avoids);

  const isCompact = useIsCompact();
  const boardOrigin = useBackTarget("/dashboard");
  const [newTripOpen, setNewTripOpen] = useState(false);
  const [filter, setFilter] = useState<TripFilter>("all");
  const [editingPersona, setEditingPersona] = useState(false);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [footprintCategory, setFootprintCategory] =
    useState<FootprintCategory>("wishlist");
  const [planHref, setPlanHref] = useState<string | null>(null);
  const [settingsDraft, setSettingsDraft] = useState<AccountSettingsDraft | null>(
    null,
  );
  const [settingsBaseline, setSettingsBaseline] =
    useState<AccountSettingsDraft | null>(null);
  const [boardOpen, setBoardOpen] = useState(false);

  const settingsOpen = settingsDraft !== null;
  const chrome = useHideOnScroll(
    isCompact && !settingsOpen && !mapExpanded,
  );
  const settingsHasChanges =
    settingsOpen &&
    settingsBaseline !== null &&
    accountSettingsDirty(settingsBaseline, settingsDraft);

  const openAccountSettings = useCallback(() => {
    if (!user) return;
    setMapExpanded(false);
    setBoardOpen(false);
    const snap = captureAccountSettings(user);
    setSettingsBaseline(snap);
    setSettingsDraft(snap);
  }, [user]);

  const openAccountSettingsHere = useCallback(() => {
    writeAccountSettingsReturn(null);
    openAccountSettings();
  }, [openAccountSettings]);

  const closeAccountSettings = useCallback(
    (persist = false) => {
      if (persist && settingsDraft) {
        const dirty =
          settingsBaseline !== null &&
          accountSettingsDirty(settingsBaseline, settingsDraft);
        if (dirty) {
          api.getState().updateAccount({
            name: settingsDraft.name,
            handle: settingsDraft.handle,
            photoUrl: settingsDraft.photoUrl,
            homeCity: settingsDraft.homeCity,
            homeCountry: settingsDraft.homeCountry,
            homeAddress: settingsDraft.homeAddress,
            addresses: settingsDraft.addresses,
            defaultAddressId: settingsDraft.defaultAddressId,
            diets: settingsDraft.diets,
            foodRestrictions: settingsDraft.foodRestrictions,
            languages: settingsDraft.languages,
            incomeBand: settingsDraft.incomeBand,
            documents: settingsDraft.documents,
          });
        }
      }
      setSettingsDraft(null);
      setSettingsBaseline(null);
      const fromQuery =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("from")
          : null;
      const ret =
        readAccountSettingsReturn() ??
        (fromQuery && isTripPath(fromQuery) ? fromQuery : null);
      writeAccountSettingsReturn(null);
      if (ret) router.push(ret as Route);
      else if (fromQuery || (typeof window !== "undefined" && window.location.search.includes("settings="))) {
        router.replace("/dashboard" as Route);
      }
    },
    [api, router, settingsBaseline, settingsDraft],
  );

  const saveAccountSettings = useCallback(() => {
    if (!settingsDraft) return;
    api.getState().updateAccount({
      name: settingsDraft.name,
      handle: settingsDraft.handle,
      photoUrl: settingsDraft.photoUrl,
      homeCity: settingsDraft.homeCity,
      homeCountry: settingsDraft.homeCountry,
      homeAddress: settingsDraft.homeAddress,
      addresses: settingsDraft.addresses,
      defaultAddressId: settingsDraft.defaultAddressId,
      diets: settingsDraft.diets,
      foodRestrictions: settingsDraft.foodRestrictions,
      languages: settingsDraft.languages,
      incomeBand: settingsDraft.incomeBand,
      documents: settingsDraft.documents,
    });
    setSettingsBaseline(settingsDraft);
    api.getState().showToast("Account saved", "success");
  }, [api, settingsDraft]);

  useEffect(() => {
    if (!settingsOpen || isCompact) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      closeAccountSettings();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [settingsOpen, isCompact, closeAccountSettings]);

  const openBoard = useCallback(() => {
    setMapExpanded(false);
    setBoardOpen(true);
  }, []);

  const closeBoard = useCallback(() => {
    setBoardOpen(false);
  }, []);

  useEffect(() => {
    if (!boardOpen || settingsOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      closeBoard();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [boardOpen, settingsOpen, closeBoard]);

  useEffect(() => {
    if (!hydrated || !user) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("settings") !== "account") {
      return;
    }
    writeAccountSettingsReturn(params.get("from"));
    openAccountSettings();
  }, [hydrated, user, openAccountSettings]);

  /**
   * Identity calendar → planner.
   *
   * Catalog city (Queenstown, NYC, …) opens `/trip/{id}` with the filled
   * itinerary. Anywhere else opens `/trip/p-{slug}` as a named draft.
   *
   * The globe must unmount before that route change. Client-navigating while
   * Mapbox is still in the tree is what threw on this control.
   */
  const onPlanTrip = useCallback((href: string) => {
    setMapExpanded(false);
    setPlanHref(href);
  }, []);

  useEffect(() => {
    if (!planHref) return;
    const href = planHref;
    const frame = window.requestAnimationFrame(() => {
      router.push(href as Route);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [planHref, router]);

  /**
   * Desktop: scroll to the Start a trip island.
   * Compact: the island is gone — same form opens in a sheet.
   */
  const onNewTrip = useCallback(() => {
    if (isCompact) {
      setNewTripOpen(true);
      return;
    }
    const panel = document.getElementById("start-a-trip");
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    panel?.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "center",
    });
    document.getElementById("quick-start")?.focus({ preventScroll: true });
  }, [isCompact]);

  const onLogVisit = useCallback(() => {
    setFootprintCategory("visited");
    setMapExpanded(true);
  }, []);

  const onToggleMap = useCallback(() => {
    setMapExpanded((open) => {
      if (open) setFootprintCategory("wishlist");
      return !open;
    });
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
          <Logo size={28} />
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
    <div
      className={styles.root}
      data-map-expanded={
        mapExpanded && !settingsOpen && !boardOpen ? "" : undefined
      }
      data-settings={
        settingsOpen ? (isCompact ? "compact" : "") : undefined
      }
      data-board={boardOpen && !settingsOpen ? "" : undefined}
      data-new-trip={newTripOpen ? "" : undefined}
      data-chrome-hidden={isCompact && chrome.hidden ? "" : undefined}
    >
      {isCompact && (settingsOpen || mapExpanded) ? null : settingsOpen ||
        boardOpen ||
        mapExpanded ? (
        <header className={styles.settingsBar}>
          <div className={styles.settingsBarStart}>
            {isCompact ? (
              <MobileBack
                from={
                  boardOrigin.screen === "Back"
                    ? "Dashboard"
                    : boardOrigin.screen
                }
                onClick={
                  settingsOpen
                    ? () => closeAccountSettings()
                    : boardOpen
                      ? closeBoard
                      : onToggleMap
                }
              />
            ) : (
              <button
                type="button"
                className={styles.backLink}
                aria-label="Back to dashboard"
                title="Back to dashboard"
                onClick={
                  settingsOpen
                    ? () => closeAccountSettings()
                    : boardOpen
                      ? closeBoard
                      : onToggleMap
                }
              >
                <ArrowLeft size={15} strokeWidth={2} />
              </button>
            )}
            <h1 className={styles.settingsTitle}>
              {settingsOpen
                ? "Profile settings"
                : boardOpen
                  ? "Leaderboard"
                  : "Travel history"}
            </h1>
          </div>
          {settingsOpen ? (
            <div className={styles.settingsActions}>
              <Button
                variant="ghost"
                size="sm"
                disabled={!settingsHasChanges}
                onClick={() => {
                  if (settingsBaseline) setSettingsDraft(settingsBaseline);
                }}
              >
                Discard changes
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={!settingsHasChanges}
                onClick={saveAccountSettings}
              >
                Save
              </Button>
            </div>
          ) : null}
        </header>
      ) : (
        <AppHeader
          user={user}
          connections={connections}
          notifications={notifications}
          unreadCount={unreadCount}
          onMarkAllRead={() => api.getState().markAllNotificationsRead()}
          onMarkRead={(id) => api.getState().markNotificationRead(id)}
          onEditPersona={onEditPersona}
          onEditProfile={openAccountSettingsHere}
          onSignOut={() => api.getState().signOut()}
        />
      )}

      {settingsOpen && settingsDraft ? (
        <AccountSettingsWorkspace
          draft={settingsDraft}
          onChange={setSettingsDraft}
          className={
            isCompact
              ? undefined
              : cn(styles.workspace, styles.workspaceSettings)
          }
          islandClassName={styles.settingsIsland}
          onClose={() => closeAccountSettings(isCompact)}
        />
      ) : boardOpen ? (
        <main className={cn(styles.workspace, styles.workspaceBoard)}>
          {isCompact ? null : (
            <div className={styles.boardIsland}>
              <PrizesPanel
                embedded
                user={user}
                badges={user.badges}
                visited={visited}
                wishlist={wishlist}
                avoids={avoids}
              />
            </div>
          )}
          <div
            className={cn(styles.boardIsland, styles.boardIslandMain)}
            onScroll={chrome.onScroll}
          >
            <LeaderboardFull user={user} connections={connections} />
          </div>
        </main>
      ) : (
      <main className={styles.workspace} onScroll={chrome.onScroll}>
        <div className={styles.body}>
          <div className={styles.main}>
            <div className={cn(styles.island, styles.slotIdentity)}>
              <Identity
                user={user}
                editing={editingPersona}
                expanded={mapExpanded}
                mapLive={!planHref}
                onToggleExpand={onToggleMap}
                onEditPersona={onEditPersona}
                onEditProfile={openAccountSettingsHere}
                onOpenBoard={openBoard}
                onPlanTrip={onPlanTrip}
                footprintCategory={footprintCategory}
              />
            </div>

            {mapExpanded ? null : (
              <>
                <div className={cn(styles.island, styles.slotPersona)} id="travel-persona">
                  <PersonaPanel
                    persona={user.persona}
                    editing={editingPersona}
                    onStartEdit={() => setEditingPersona(true)}
                    onCancel={() => setEditingPersona(false)}
                    onSave={onSavePersona}
                  />
                </div>

                <div className={cn(styles.island, styles.slotTravels)}>
                  <Travels
                    trips={TRIP_SUMMARIES}
                    filter={filter}
                    onFilter={setFilter}
                    onNewTrip={onNewTrip}
                    onLogVisit={onLogVisit}
                  />
                </div>
              </>
            )}
          </div>

          {mapExpanded ? null : (
            <div className={styles.support}>
              {isCompact ? null : (
                <div className={cn(styles.island, styles.slotQuickTrip)} id="start-a-trip">
                  <QuickTrip />
                </div>
              )}

              <div className={cn(styles.island, styles.slotLeaderboard)}>
                <Leaderboard
                  user={user}
                  connections={connections}
                  onViewAll={openBoard}
                />
              </div>

              <div className={cn(styles.island, styles.slotEditorial)}>
                <EditorialCard features={EDITORIALS} />
              </div>
            </div>
          )}
        </div>
      </main>
      )}

      <button
        type="button"
        className={styles.newTripFab}
        aria-label="Start a trip"
        onClick={() => setNewTripOpen(true)}
      >
        <Plus size={16} strokeWidth={2.4} aria-hidden />
        New trip
      </button>

      <Sheet
        open={newTripOpen}
        onClose={() => setNewTripOpen(false)}
        label="Start a trip"
        height={0.72}
        className={styles.newTripSheet}
      >
        <QuickTrip />
      </Sheet>
    </div>
  );
}
