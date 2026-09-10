"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ChevronDown,
  Expand,
  Footprints,
  MapPin,
  Shrink,
  Sparkles,
} from "lucide-react";

import { AvatarStack } from "@/components/ui/avatar";
import { IconButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { dayLabel } from "@/lib/trip/time";
import type { Trip } from "@/lib/types";

import styles from "./rail.module.css";

/**
 * The context and utility rail.
 *
 * WHY IT EXISTS. The original product put the trip's participants and
 * utilities in a permanent vertical area beside the schedule, and losing it
 * was the biggest architectural regression in the earlier pass: the map became
 * a decorative panel, the assistant became a modal, and four travellers became
 * a stack of avatars in a top bar. The rail brings back a single place where
 * "what am I looking at, who is it with, and what can I do about it" lives.
 *
 * SHAPE. Three stacked sections, in order of how often you look at them:
 *
 *   MAP        fixed, always present — geography for the day you are planning
 *   CONTEXT    flexible — the selected activity, the ideas shelf, or the
 *              advisor's proposal, whichever is live
 *   TRAVELLERS collapsed to one line until you open it
 *
 * PROGRESSIVE DISCLOSURE. The context section switches itself: selecting a
 * card shows the activity, a proposal shows the advisor. Nothing is hidden
 * behind a control the user has to discover, and nothing is shown at full
 * height when it has nothing to say. The rail never holds more than one
 * expanded section beyond the map.
 */

/* -------------------------------------------------------------------------- */
/* Map section                                                               */
/* -------------------------------------------------------------------------- */

export interface RailMapProps {
  activeDay: string;
  stopCount: number;
  walkMinutes: number;
  expanded: boolean;
  onToggleExpanded: () => void;
  children: ReactNode;
}

export function RailMap({
  activeDay,
  stopCount,
  walkMinutes,
  expanded,
  onToggleExpanded,
  children,
}: RailMapProps) {
  return (
    <section
      className={cn(styles.mapSection, expanded && styles.mapSectionTall)}
      aria-label="Map"
    >
      {/*
       * The map needs to say which day it is drawing. Without this line the
       * route silently changes under you when you switch days, which reads as
       * a bug rather than as the map following you.
       */}
      <header className={styles.mapHead}>
        <span className={styles.mapDay}>{dayLabel(activeDay)}</span>
        <span className={styles.mapStats}>
          <span className={styles.mapStat}>
            <MapPin size={10} strokeWidth={2.4} />
            <span className="tabular">{stopCount}</span>
          </span>
          {walkMinutes > 0 ? (
            <span className={styles.mapStat}>
              <Footprints size={10} strokeWidth={2.4} />
              <span className="tabular">{walkMinutes}m</span>
            </span>
          ) : null}
        </span>
        <IconButton
          label={expanded ? "Shrink map" : "Expand map"}
          size="xs"
          variant="ghost"
          onClick={onToggleExpanded}
        >
          {expanded ? (
            <Shrink size={12} strokeWidth={2.1} />
          ) : (
            <Expand size={12} strokeWidth={2.1} />
          )}
        </IconButton>
      </header>
      <div className={styles.mapBody}>{children}</div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Context section                                                           */
/* -------------------------------------------------------------------------- */

export type RailTab = "activity" | "ideas" | "advisor";

export interface RailContextProps {
  tab: RailTab;
  onTab: (tab: RailTab) => void;
  ideaCount: number;
  /** True when the advisor has something waiting — a plan or an offer. */
  advisorFlag: boolean;
  children: ReactNode;
}

const TAB_LABELS: Record<RailTab, string> = {
  activity: "Activity",
  ideas: "Ideas",
  advisor: "Advisor",
};

export function RailContext({
  tab,
  onTab,
  ideaCount,
  advisorFlag,
  children,
}: RailContextProps) {
  const tabs: RailTab[] = ["activity", "ideas", "advisor"];

  return (
    <section className={styles.context} aria-label="Context">
      {/*
       * Underlined tabs rather than a segmented pill: three labels plus a
       * count and a flag do not fit inside a 364px pill without shrinking the
       * type below what anyone should have to read.
       */}
      <div className={styles.tabs} role="tablist" aria-label="Context panel">
        {tabs.map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={tab === item}
            className={cn(styles.tab, tab === item && styles.tabOn)}
            onClick={() => onTab(item)}
          >
            {TAB_LABELS[item]}
            {item === "ideas" && ideaCount > 0 ? (
              <span className={cn(styles.tabCount, "tabular")}>
                {ideaCount}
              </span>
            ) : null}
            {item === "advisor" && advisorFlag ? (
              <span className={styles.tabFlag} aria-label="has a suggestion">
                <Sparkles size={9} strokeWidth={2.6} />
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <div className={styles.contextBody}>{children}</div>
    </section>
  );
}

/** The Activity tab with nothing selected. */
export function RailEmpty({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className={styles.empty}>
      <p className={styles.emptyTitle}>{title}</p>
      <p className={styles.emptyBody}>{body}</p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Travellers section                                                        */
/* -------------------------------------------------------------------------- */

export interface RailPeopleProps {
  trip: Trip;
  invited: string[];
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}

export function RailPeople({
  trip,
  invited,
  open,
  onToggle,
  children,
}: RailPeopleProps) {
  const online = trip.travellers.filter((t) => t.online).length;

  return (
    <section
      className={cn(styles.people, open && styles.peopleOpen)}
      aria-label="Travellers"
    >
      <button
        type="button"
        className={styles.peopleHead}
        onClick={onToggle}
        aria-expanded={open}
      >
        <AvatarStack
          travellers={trip.travellers}
          size="xs"
          max={4}
          showPresence
        />
        <span className={styles.peopleMeta}>
          <span className={styles.peopleCount}>
            {trip.travellers.length} travelling
          </span>
          <span className={styles.peopleDot} aria-hidden>
            ·
          </span>
          {online > 0 ? (
            <span className={styles.peopleOnline}>{online} online</span>
          ) : (
            <span>nobody online</span>
          )}
          {invited.length > 0 ? (
            <>
              <span className={styles.peopleDot} aria-hidden>
                ·
              </span>
              <span className={styles.peoplePending}>
                {invited.length} invited
              </span>
            </>
          ) : null}
        </span>
        <ChevronDown
          size={13}
          strokeWidth={2.2}
          className={cn(styles.peopleChevron, open && styles.peopleChevronUp)}
        />
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            className={styles.peopleBody}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
          >
            {children}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
