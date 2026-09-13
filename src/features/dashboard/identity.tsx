"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Map as MapIcon, MapPin } from "lucide-react";

import { plannerHrefForPlace } from "@/data/trips";
import { prizeProgressSummary } from "@/data/prizes";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/overlay";
import { MobileBack } from "@/components/nav/mobile-back";
import { useBackTarget } from "@/components/nav/back-link";
import type {
  AccountUser,
  FootprintCategory,
  LngLat,
} from "@/lib/types";
import { useHideOnScroll } from "@/lib/use-hide-on-scroll";
import { useIsCompact } from "@/lib/use-media-query";
import { cn } from "@/lib/utils";
import { useSession, useSessionApi } from "@/stores/session-store";

import { IdentityMap } from "./identity-map";
import { FootprintEditor } from "./footprint-editor";
import { ProgressMark } from "./progress-mark";
import { SealRow } from "./seal-row";
import styles from "./identity.module.css";

export interface IdentityProps {
  user: AccountUser;
  editing: boolean;
  expanded: boolean;
  /** Drop the WebGL globe before a planner route change. */
  mapLive?: boolean;
  onToggleExpand: () => void;
  onEditPersona: () => void;
  onEditProfile: () => void;
  onOpenBoard: () => void;
  onPlanTrip: (href: string) => void;
  /** Open the expanded editor on this bucket. */
  footprintCategory?: FootprintCategory;
}

export function Identity({
  user,
  editing,
  expanded,
  mapLive = true,
  onToggleExpand,
  onEditPersona,
  onEditProfile,
  onOpenBoard,
  onPlanTrip,
  footprintCategory = "wishlist",
}: IdentityProps) {
  const cameFrom = useBackTarget("/dashboard");
  const [focus, setFocus] = useState<{
    id: string;
    coords: LngLat;
    zoom: number;
    revision: number;
  } | null>(null);
  const [historySheetPx, setHistorySheetPx] = useState(() =>
    typeof window !== "undefined" ? Math.round(window.innerHeight * 0.42) : 0,
  );
  const [cameraInsetPx, setCameraInsetPx] = useState(() =>
    typeof window !== "undefined" ? Math.round(window.innerHeight * 0.42) : 0,
  );
  const [placesOpen, setPlacesOpen] = useState(true);
  const isCompact = useIsCompact();
  const chrome = useHideOnScroll(isCompact && expanded);
  const resetChrome = chrome.reset;
  const wishlist = useSession((s) => s.wishlist);
  const visited = useSession((s) => s.visited);
  const avoids = useSession((s) => s.avoids);
  const footprint = useSessionApi();

  useEffect(() => {
    if (!expanded) return;
    if (isCompact && placesOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onToggleExpand();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded, isCompact, placesOpen, onToggleExpand]);

  const stats = {
    wishlist: wishlist.length,
    visited: visited.length,
    avoid: avoids.length,
  };

  const progress = useMemo(
    () => prizeProgressSummary(user.badges, visited, wishlist, avoids),
    [user.badges, visited, wishlist, avoids],
  );

  useEffect(() => {
    if (expanded) setPlacesOpen(true);
  }, [expanded]);

  const onHistorySnap = useCallback((_index: number, heightFraction: number) => {
    setCameraInsetPx(Math.round(heightFraction * window.innerHeight));
  }, []);

  const onHistoryHeight = useCallback((px: number) => {
    setHistorySheetPx(Math.round(px));
  }, []);

  const hidePlaces = useCallback(() => {
    setPlacesOpen(false);
    setHistorySheetPx(0);
    setCameraInsetPx(0);
    resetChrome();
  }, [resetChrome]);

  function lookAt(place: { id: string; coords: LngLat; zoom: number }) {
    setFocus((current) => ({
      ...place,
      revision: (current?.revision ?? 0) + 1,
    }));
  }

  const editor = expanded ? (
    <FootprintEditor
      wishlist={wishlist}
      visited={visited}
      avoids={avoids}
      onAddWishlist={(place) => footprint.getState().addWishlist(place)}
      onAddVisited={(place) => footprint.getState().addVisited(place)}
      onAddAvoid={(place) => footprint.getState().addAvoid(place)}
      onRemove={(category, id) =>
        footprint.getState().removePlace(category, id)
      }
      selectedId={focus?.id}
      onSelectPlace={lookAt}
      onPlanTrip={(place) => onPlanTrip(plannerHrefForPlace(place))}
      initialCategory={footprintCategory}
      onScroll={chrome.onScroll}
    />
  ) : null;

  const mapInset = placesOpen ? historySheetPx : 0;
  const cameraInset = placesOpen ? cameraInsetPx : 0;

  return (
    <section
      className={styles.identity}
      data-expanded={expanded ? "" : undefined}
      data-chrome-hidden={isCompact && expanded && chrome.hidden ? "" : undefined}
      aria-label="Your travel identity"
      style={
        expanded && isCompact
          ? {
              ["--map-inset-bottom" as string]: `${mapInset}px`,
            }
          : undefined
      }
    >
      <div className={styles.cover}>
        <IdentityMap
          locations={visited}
          wishlist={wishlist}
          avoids={avoids}
          stats={stats}
          expanded={expanded}
          live={mapLive}
          focus={focus}
          insetBottom={isCompact && expanded ? cameraInset : 0}
          showExpand={!(isCompact && expanded)}
          onToggleExpand={onToggleExpand}
          onSelectPlace={lookAt}
        />
      </div>

      {expanded && isCompact ? (
        <header className={styles.mapTopbar}>
          <MobileBack
            from={cameFrom.screen === "Back" ? "Dashboard" : cameFrom.screen}
            onClick={onToggleExpand}
            className={styles.mapBack}
          />
        </header>
      ) : null}

      {expanded && !isCompact ? editor : null}

      {expanded && isCompact ? (
        <>
          <button
            type="button"
            className={cn(styles.mapToggle, !placesOpen && styles.mapToggleRaised)}
            aria-pressed={!placesOpen}
            aria-label={placesOpen ? "Show map" : "Show places"}
            onClick={() => {
              if (placesOpen) hidePlaces();
              else setPlacesOpen(true);
            }}
          >
            {placesOpen ? (
              <>
                <MapIcon size={13} strokeWidth={2.2} />
                Map
              </>
            ) : (
              <>
                <MapPin size={13} strokeWidth={2.2} />
                Places
              </>
            )}
          </button>
          <Sheet
            open={placesOpen}
            onClose={hidePlaces}
            label="Travel history"
            snapPoints={[0.42, 0.64, 0.92]}
            initialSnapIndex={0}
            scrim={false}
            onSnapChange={onHistorySnap}
            onHeightChange={onHistoryHeight}
            className={styles.historySheet}
            bodyClassName={styles.historySheetBody}
          >
            {editor}
          </Sheet>
        </>
      ) : null}

      {expanded ? null : (
        <div className={styles.body}>
          <div className={styles.header}>
            <button
              type="button"
              className={styles.progressHit}
              aria-haspopup="dialog"
              aria-label={`Level ${progress.level}, ${progress.level} seals collected. Open leaderboard.`}
              onClick={onOpenBoard}
            >
              <ProgressMark
                user={user}
                level={progress.level}
                progress={progress.ringPct}
                size="lg"
              />
            </button>
          </div>

          <button
            type="button"
            className={styles.badgesTrigger}
            aria-haspopup="dialog"
            aria-label={`Prizes, ${progress.earned.length} collected. Open leaderboard.`}
            onClick={onOpenBoard}
          >
            <SealRow prizes={progress.prizes} />
          </button>

          <div className={styles.who}>
            <h1 className={styles.name}>{user.name}</h1>
            <p className={styles.handle}>
              @{user.handle}
              <span className={styles.whoSep} aria-hidden>
                ·
              </span>
              <span title="Level is how many prize seals you have collected">
                Level {progress.level}
              </span>
            </p>
          </div>

          <div className={styles.actions}>
            <Button variant="secondary" size="sm" onClick={onEditProfile}>
              Edit profile
            </Button>
            <Button variant="secondary" size="sm" onClick={onEditPersona}>
              {editing ? "Editing persona" : "Build your travel persona!"}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
