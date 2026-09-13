"use client";

import { useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ChevronDown,
  MapPin,
  MessageCircle,
  Search,
  Sparkles,
  StickyNote,
  UserRoundCog,
  X,
} from "lucide-react";

import { AiMark } from "@/components/brand/ai-mark";
import { MobileBack } from "@/components/nav/mobile-back";
import { Avatar, AvatarStack } from "@/components/ui/avatar";
import { IconButton } from "@/components/ui/button";
import { Popover } from "@/components/ui/overlay";
import { cn } from "@/lib/utils";
import { travellerColor } from "@/lib/categories";
import { ROLE_LABELS, canManageRoles, dockVisibleTravellers, partyTravellers } from "@/lib/collaboration";
import type { ItineraryItem, Traveller, Trip } from "@/lib/types";

import { PersonMenu } from "./person-menu";
import styles from "./rail.module.css";

/**
 * The dock-driven side panel.
 *
 * The calendar is the default workspace. The 48px dock is always there;
 * avatars live at the top, tools at the bottom. The panel only mounts for the
 * tool you picked. Invite by email still opens the invite modal.
 */

/* -------------------------------------------------------------------------- */
/* Map section                                                               */
/* -------------------------------------------------------------------------- */

export interface RailMapProps {
  items: ItineraryItem[];
  onPickItem: (id: string) => void;
  onClose?: () => void;
  dismiss?: "close" | "back";
  backFrom?: string;
  children: ReactNode;
}

export function RailMap({
  items,
  onPickItem,
  onClose,
  dismiss = "close",
  backFrom,
  children,
}: RailMapProps) {
  const [query, setQuery] = useState("");
  const hits = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 1) return [];
    return items
      .filter(
        (item) =>
          item.kind !== "commute" &&
          (item.title.toLowerCase().includes(q) ||
            item.place?.name.toLowerCase().includes(q) ||
            item.place?.address.toLowerCase().includes(q)),
      )
      .slice(0, 5);
  }, [items, query]);

  const back = dismiss === "back";

  return (
    <section
      className={cn(
        styles.mapSection,
        styles.mapSectionFill,
        back && styles.mapSectionFlush,
      )}
      aria-label="Map"
    >
      {!back ? (
        <header className={styles.mapHead}>
          <div className={styles.mapHeadCopy}>
            <span className={styles.mapDay}>Map</span>
          </div>
          {onClose ? (
            <IconButton label="Close map" size="xs" variant="ghost" onClick={onClose}>
              <X size={14} strokeWidth={2} />
            </IconButton>
          ) : null}
        </header>
      ) : null}
      <div className={styles.mapBody}>
        <div className={styles.mapSearchRow}>
          {back && onClose ? (
            <MobileBack
              from={backFrom}
              onClick={onClose}
              className={styles.mapSearchBack}
            />
          ) : null}
          <div className={styles.mapSearch}>
          <Search size={15} strokeWidth={2} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search places on this trip"
            aria-label="Search places on this trip"
            onKeyDown={(event) => {
              if (event.key === "Enter" && hits[0]) {
                onPickItem(hits[0].id);
                setQuery("");
              }
              if (event.key === "Escape") setQuery("");
            }}
          />
          {query ? (
            <button
              type="button"
              className={styles.mapSearchClear}
              onClick={() => setQuery("")}
              aria-label="Clear search"
            >
              <X size={12} strokeWidth={2.2} />
            </button>
          ) : null}
          {hits.length > 0 ? (
            <ul className={styles.mapHits} role="listbox">
              {hits.map((hit) => (
                <li key={hit.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onPickItem(hit.id);
                      setQuery("");
                    }}
                  >
                    {hit.title}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        </div>
        {children}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Generic tool panel                                                        */
/* -------------------------------------------------------------------------- */

export function RailPanel({
  title,
  subtitle,
  count,
  onClose,
  dismiss = "close",
  backFrom,
  fill = false,
  tone = "default",
  children,
}: {
  title: string;
  subtitle?: string;
  /** Numeric badge beside the heading. */
  count?: number;
  onClose: () => void;
  dismiss?: "close" | "back";
  /** Compact back: the screen this panel returns to. */
  backFrom?: string;
  fill?: boolean;
  tone?: "default" | "ai";
  children: ReactNode;
}) {
  const ai = tone === "ai";
  const back = dismiss === "back";
  const heading = (
    <>
      <span className={ai ? styles.panelAiName : styles.mapDay}>{title}</span>
      {count != null ? (
        <span
          className={cn(styles.headCount, "tabular")}
          aria-label={`${count} on this trip`}
        >
          {count}
        </span>
      ) : null}
    </>
  );
  return (
    <section
      className={cn(styles.panel, ai && styles.panelAi)}
      aria-label={title}
    >
      <header className={cn(styles.mapHead, ai && styles.panelAiHead, back && styles.mapHeadBack)}>
        {back ? (
          <MobileBack
            from={backFrom}
            onClick={onClose}
            className={styles.backBtn}
          />
        ) : null}
        {ai ? (
          <div className={styles.panelAiTitle}>
            <AiMark size={20} />
            <div className={styles.mapHeadCopy}>
              <div className={styles.mapHeadTitle}>{heading}</div>
              {subtitle ? <span className={styles.mapSub}>{subtitle}</span> : null}
            </div>
          </div>
        ) : (
          <div className={styles.mapHeadCopy}>
            <div className={styles.mapHeadTitle}>{heading}</div>
            {subtitle ? <span className={styles.mapSub}>{subtitle}</span> : null}
          </div>
        )}
        {back ? null : (
          <IconButton label="Close panel" size="xs" variant="ghost" onClick={onClose}>
            <X size={14} strokeWidth={2} />
          </IconButton>
        )}
      </header>
      <div className={cn(styles.panelBody, fill && styles.panelBodyFill)}>{children}</div>
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
  activity: "Details",
  ideas: "Saved",
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
  const partyCount = partyTravellers(trip.travellers).length;
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
            {partyCount} travelling
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

/* -------------------------------------------------------------------------- */
/* Side actions — Google Calendar's trailing icon dock                       */
/* -------------------------------------------------------------------------- */

export type RailDockAction =
  | "advisor"
  | "ideas"
  | "people"
  | "map"
  | "chat"
  | "roles";

export function RailDock({
  travellers,
  meId,
  sharedView,
  overlayIds,
  active,
  onAction,
  onMyCalendar,
  onSharedView,
  onChangeRole,
  onRemove,
}: {
  travellers: Traveller[];
  meId: string | null;
  sharedView: boolean;
  overlayIds: string[];
  active: RailDockAction | null;
  onAction: (action: RailDockAction) => void;
  onMyCalendar: () => void;
  onSharedView: (travellerId: string) => void;
  onChangeRole: (travellerId: string, role: Traveller["role"]) => void;
  onRemove: (travellerId: string) => void;
}) {
  const me = meId ? travellers.find((person) => person.id === meId) ?? null : null;
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [moreAnchor, setMoreAnchor] = useState<HTMLElement | null>(null);
  const openPerson = travellers.find((person) => person.id === menuFor) ?? null;
  const pinIds = [
    ...(sharedView ? overlayIds : []),
    ...(menuFor ? [menuFor] : []),
  ];
  const { shown, hidden } = dockVisibleTravellers(travellers, pinIds, 4, meId);

  function toggleMenu(id: string, node: HTMLElement) {
    setMoreOpen(false);
    if (menuFor === id) {
      setMenuFor(null);
      setAnchor(null);
      return;
    }
    setMenuFor(id);
    setAnchor(node);
  }

  return (
    <nav className={styles.dock} aria-label="Planner tools">
      <div className={styles.dockPeople}>
        {shown.map((person) => {
          const picked = sharedView && overlayIds.includes(person.id);
          const isYou = person.id === meId;
          return (
          <button
            key={person.id}
            type="button"
            className={cn(
              styles.dockAvatar,
              picked && styles.dockAvatarPicked,
            )}
            style={{ ["--who-ring" as string]: travellerColor(person.colorIndex) }}
            aria-pressed={picked}
            aria-label={`${isYou ? "You, " : ""}${person.name}, ${ROLE_LABELS[person.role]}${
              person.role === "advisor" && person.online ? ", online" : ""
            }${picked ? ", in shared view" : ""}`}
            title={
              isYou
                ? `You · ${person.name}`
                : person.role === "advisor"
                  ? `${person.name} · travel advisor${person.online ? " · online" : ""}`
                  : person.name
            }
            onClick={() => {
              setMoreOpen(false);
              onSharedView(person.id);
            }}
            onContextMenu={(event) => {
              event.preventDefault();
              toggleMenu(person.id, event.currentTarget);
            }}
          >
            <span className={styles.dockPill} aria-hidden />
            <Avatar traveller={person} size="md" showPresence className={styles.dockFace} />
          </button>
          );
        })}
        {hidden.length > 0 ? (
          <button
            type="button"
            className={cn(styles.dockMore, moreOpen && styles.dockMoreOn)}
            aria-label={`${hidden.length} more people on this trip`}
            aria-haspopup="menu"
            aria-expanded={moreOpen}
            title={`${hidden.length} more`}
            onClick={(event) => {
              setMenuFor(null);
              setAnchor(null);
              setMoreAnchor(event.currentTarget);
              setMoreOpen((open) => !open);
            }}
          >
            +{hidden.length}
          </button>
        ) : null}
        <button
          type="button"
          className={cn(styles.dockRoles, active === "roles" && styles.dockRolesOn)}
          aria-label="Manage roles"
          aria-pressed={active === "roles"}
          title="Roles"
          onClick={() => {
            setMenuFor(null);
            setAnchor(null);
            setMoreOpen(false);
            onAction("roles");
          }}
        >
          <UserRoundCog size={16} strokeWidth={2.2} />
        </button>
      </div>

      <Popover
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        anchor={moreAnchor}
        placement="left"
        align="start"
        offset={10}
        width={240}
        label="People on this trip"
        className={styles.dockMorePopover}
      >
        <div className={styles.dockMoreList} role="menu">
          {hidden.map((person) => {
            const picked = sharedView && overlayIds.includes(person.id);
            const isYou = person.id === meId;
            return (
              <button
                key={person.id}
                type="button"
                role="menuitem"
                className={cn(styles.dockMoreItem, picked && styles.dockMoreItemPicked)}
                onClick={() => {
                  setMoreOpen(false);
                  onSharedView(person.id);
                }}
                onContextMenu={(event) => {
                  event.preventDefault();
                  setMoreOpen(false);
                  toggleMenu(person.id, moreAnchor ?? event.currentTarget);
                }}
              >
                <Avatar
                  traveller={person}
                  size="md"
                  hideName
                  showPresence
                  className={styles.dockFace}
                />
                <span className={styles.dockMoreCopy}>
                  <span className={styles.dockMoreName}>
                    {isYou ? `You · ${person.name.split(" ")[0]}` : person.name.split(" ")[0]}
                  </span>
                  <span className={styles.dockMoreRole}>{ROLE_LABELS[person.role]}</span>
                </span>
              </button>
            );
          })}
        </div>
      </Popover>

      {openPerson ? (
        <PersonMenu
          person={openPerson}
          me={me}
          manager={me ? canManageRoles(me.role) : true}
          open
          anchor={anchor}
          sharedView={sharedView}
          onCalendar={overlayIds.includes(openPerson.id)}
          onClose={() => {
            setMenuFor(null);
            setAnchor(null);
          }}
          onSharedView={() => onSharedView(openPerson.id)}
          onMyCalendar={onMyCalendar}
          onChangeRole={(role) => onChangeRole(openPerson.id, role)}
          onRemove={() => onRemove(openPerson.id)}
        />
      ) : null}

      <div className={styles.dockTools}>
        <button
          type="button"
          className={cn(
            styles.dockBtn,
            styles.dockAi,
            active === "advisor" && styles.dockBtnOn,
          )}
          aria-pressed={active === "advisor"}
          aria-label="Ask AI"
          onClick={() => onAction("advisor")}
        >
          <AiMark size={18} />
        </button>
        <button
          type="button"
          className={cn(styles.dockBtn, active === "map" && styles.dockBtnOn)}
          aria-pressed={active === "map"}
          aria-label="Map"
          onClick={() => onAction("map")}
        >
          <MapPin size={18} strokeWidth={1.9} />
        </button>
        <button
          type="button"
          className={cn(styles.dockBtn, active === "chat" && styles.dockBtnOn)}
          aria-pressed={active === "chat"}
          aria-label="Trip chat"
          onClick={() => onAction("chat")}
        >
          <MessageCircle size={18} strokeWidth={1.9} />
        </button>
        <button
          type="button"
          className={cn(styles.dockBtn, active === "ideas" && styles.dockBtnOn)}
          aria-pressed={active === "ideas"}
          aria-label="Idea board"
          onClick={() => onAction("ideas")}
        >
          <StickyNote size={18} strokeWidth={1.9} />
        </button>
      </div>
    </nav>
  );
}
