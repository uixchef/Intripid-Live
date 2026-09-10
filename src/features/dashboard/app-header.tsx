"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, ChevronDown, Users } from "lucide-react";

import { Logo } from "@/components/brand/mark";
import { Popover } from "@/components/ui/overlay";
import { cn } from "@/lib/utils";
import type { AccountUser, AppNotification, Connection } from "@/lib/types";

import { ConnectionsPanel } from "./connections-panel";
import { NotificationsPanel } from "./notifications-panel";
import { ProfileMenu } from "./profile-menu";
import styles from "./app-header.module.css";

/**
 * The authenticated product header.
 *
 * WHAT THE ORIGINAL HAD, and what is kept: a logo, and exactly three
 * account-level affordances — Connections, Notifications, Profile. That
 * restraint is the good decision in the original screenshot and it is
 * preserved verbatim. What is not preserved is its execution: labels stacked
 * under icons in a 90px-tall band, which spends a fifth of the first screen
 * on three controls nobody presses often.
 *
 * WHY NOT A SIDEBAR. A dashboard with a left navigation rail implies there are
 * many destinations behind it. There are three surfaces in Intripid, and two
 * of them are reached from the content of this page rather than from chrome.
 * A 52px bar is the honest shape.
 *
 * Each of the three opens a real panel with real content. None of them is a
 * placeholder, which is the only reason they are allowed to be here.
 */

export interface AppHeaderProps {
  user: AccountUser;
  connections: Connection[];
  notifications: AppNotification[];
  unreadCount: number;
  onMarkAllRead: () => void;
  onMarkRead: (id: string) => void;
  onEditPersona: () => void;
  onSignOut: () => void;
}

type OpenPanel = "connections" | "notifications" | "profile" | null;

export function AppHeader({
  user,
  connections,
  notifications,
  unreadCount,
  onMarkAllRead,
  onMarkRead,
  onEditPersona,
  onSignOut,
}: AppHeaderProps) {
  /*
   * One anchor per trigger, and one "which is open" value rather than three
   * booleans: three independent flags let two panels open at once, and two
   * popovers fighting for the same corner is a state nobody designs but
   * everybody ships.
   */
  const [open, setOpen] = useState<OpenPanel>(null);
  const [connectionsAnchor, setConnectionsAnchor] =
    useState<HTMLElement | null>(null);
  const [notificationsAnchor, setNotificationsAnchor] =
    useState<HTMLElement | null>(null);
  const [profileAnchor, setProfileAnchor] = useState<HTMLElement | null>(null);

  const close = () => setOpen(null);
  const toggle = (panel: OpenPanel) =>
    setOpen((current) => (current === panel ? null : panel));

  const onTrip = connections.filter((c) => c.onCurrentTrip).length;

  return (
    <header className={styles.header}>
      <Link href="/dashboard" className={styles.brand} aria-label="Intripid">
        <Logo size={20} />
      </Link>

      <div className={styles.actions}>
        {/* ---------------------------------------------------------------- */}
        {/* Connections                                                      */}
        {/* ---------------------------------------------------------------- */}
        <button
          type="button"
          ref={setConnectionsAnchor}
          className={cn(
            styles.action,
            open === "connections" && styles.actionOn,
          )}
          onClick={() => toggle("connections")}
          aria-expanded={open === "connections"}
          aria-label={`Connections — ${connections.length} people`}
        >
          <Users size={16} strokeWidth={2} aria-hidden />
          <span className={styles.actionLabel}>Connections</span>
        </button>

        <Popover
          open={open === "connections"}
          onClose={close}
          anchor={connectionsAnchor}
          placement="bottom"
          align="end"
          width={332}
          label="Connections"
        >
          <ConnectionsPanel
            connections={connections}
            onTripCount={onTrip}
            onNavigate={close}
          />
        </Popover>

        {/* ---------------------------------------------------------------- */}
        {/* Notifications                                                    */}
        {/* ---------------------------------------------------------------- */}
        <button
          type="button"
          ref={setNotificationsAnchor}
          className={cn(
            styles.action,
            open === "notifications" && styles.actionOn,
          )}
          onClick={() => toggle("notifications")}
          aria-expanded={open === "notifications"}
          aria-label={
            unreadCount > 0
              ? `Notifications — ${unreadCount} unread`
              : "Notifications"
          }
        >
          <span className={styles.bellWrap}>
            <Bell size={16} strokeWidth={2} aria-hidden />
            {/*
             * A dot, not a count. Four is not a number anyone needs to read
             * before deciding to look, and a numeral in a badge on a home
             * screen is a small stress for no information.
             */}
            {unreadCount > 0 ? (
              <span className={styles.unread} aria-hidden />
            ) : null}
          </span>
          <span className={styles.actionLabel}>Notifications</span>
        </button>

        <Popover
          open={open === "notifications"}
          onClose={close}
          anchor={notificationsAnchor}
          placement="bottom"
          align="end"
          width={352}
          label="Notifications"
        >
          <NotificationsPanel
            notifications={notifications}
            unreadCount={unreadCount}
            onMarkAllRead={onMarkAllRead}
            onMarkRead={onMarkRead}
            onNavigate={close}
          />
        </Popover>

        {/* ---------------------------------------------------------------- */}
        {/* Profile                                                          */}
        {/* ---------------------------------------------------------------- */}
        <button
          type="button"
          ref={setProfileAnchor}
          className={cn(
            styles.action,
            styles.profileTrigger,
            open === "profile" && styles.actionOn,
          )}
          onClick={() => toggle("profile")}
          aria-expanded={open === "profile"}
          aria-label={`Account — ${user.name}`}
        >
          <span className={styles.miniAvatar} aria-hidden>
            {user.initials}
          </span>
          <ChevronDown size={13} strokeWidth={2.2} aria-hidden />
        </button>

        <Popover
          open={open === "profile"}
          onClose={close}
          anchor={profileAnchor}
          placement="bottom"
          align="end"
          width={264}
          label="Account"
        >
          <ProfileMenu
            user={user}
            onEditPersona={() => {
              close();
              onEditPersona();
            }}
            onSignOut={() => {
              close();
              onSignOut();
            }}
            onNavigate={close}
          />
        </Popover>
      </div>
    </header>
  );
}
