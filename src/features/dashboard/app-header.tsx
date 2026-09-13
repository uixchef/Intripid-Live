"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, Users } from "lucide-react";

import { Logo } from "@/components/brand/mark";
import { IconButton } from "@/components/ui/button";
import { Popover, Sheet } from "@/components/ui/overlay";
import { isConfirmedConnection } from "@/lib/collaboration";
import { useIsCompact } from "@/lib/use-media-query";
import { cn } from "@/lib/utils";
import type { AccountUser, AppNotification, Connection } from "@/lib/types";

import { ConnectionsPanel } from "./connections-panel";
import { NotificationsPanel } from "./notifications-panel";
import { ProfileMenu } from "./profile-menu";
import { AccountMark } from "./account-mark";
import styles from "./app-header.module.css";

/**
 * Same chrome as the planner top bar: 64px on `--planner-chrome`, lockup
 * (mascot + wordmark), ghost icon buttons on the right.
 */

export interface AppHeaderProps {
  user: AccountUser;
  connections: Connection[];
  notifications: AppNotification[];
  unreadCount: number;
  onMarkAllRead: () => void;
  onMarkRead: (id: string) => void;
  onEditPersona: () => void;
  onEditProfile?: () => void;
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
  onEditProfile,
  onSignOut,
}: AppHeaderProps) {
  const [open, setOpen] = useState<OpenPanel>(null);
  const [connectionsAnchor, setConnectionsAnchor] =
    useState<HTMLButtonElement | null>(null);
  const [notificationsAnchor, setNotificationsAnchor] =
    useState<HTMLButtonElement | null>(null);
  const [profileAnchor, setProfileAnchor] = useState<HTMLButtonElement | null>(
    null,
  );

  const close = () => setOpen(null);
  const toggle = (panel: OpenPanel) =>
    setOpen((current) => (current === panel ? null : panel));
  const isCompact = useIsCompact();
  const confirmed = connections.filter(isConfirmedConnection);

  return (
    <header className={styles.header}>
      <Link href="/dashboard" className={styles.brand}>
        <Logo size={32} />
      </Link>

      <div className={styles.actions}>
        <IconButton
          ref={setConnectionsAnchor}
          label={`Connections — ${confirmed.length} people`}
          size="sm"
          variant="ghost"
          aria-expanded={open === "connections"}
          onClick={() => toggle("connections")}
        >
          <Users size={18} strokeWidth={1.9} />
        </IconButton>

        {isCompact ? (
          <Sheet
            open={open === "connections"}
            onClose={close}
            label="Connections"
            snapPoints={[0.72, 0.94]}
            initialSnapIndex={0}
          >
            <ConnectionsPanel connections={connections} />
          </Sheet>
        ) : (
        <Popover
          open={open === "connections"}
          onClose={close}
          anchor={connectionsAnchor}
          placement="bottom"
          align="end"
          offset={4}
          width={360}
          label="Connections"
          ignoreOutsideClick={(node) => {
            const el = node instanceof Element ? node : node.parentElement;
            return Boolean(
              el?.closest('[role="dialog"]') || el?.closest('[role="menu"]'),
            );
          }}
        >
          <ConnectionsPanel connections={connections} />
        </Popover>
        )}

        <IconButton
          ref={setNotificationsAnchor}
          label={
            unreadCount > 0
              ? `Notifications — ${unreadCount} unread`
              : "Notifications"
          }
          size="sm"
          variant="ghost"
          aria-expanded={open === "notifications"}
          onClick={() => toggle("notifications")}
        >
          <span className={styles.bellWrap}>
            <Bell size={18} strokeWidth={1.9} />
            {unreadCount > 0 ? (
              <span className={styles.unread} aria-hidden />
            ) : null}
          </span>
        </IconButton>

        {isCompact ? (
          <Sheet
            open={open === "notifications"}
            onClose={close}
            label="Notifications"
            snapPoints={[0.52, 0.92]}
            initialSnapIndex={0}
          >
            <NotificationsPanel
              notifications={notifications}
              unreadCount={unreadCount}
              onMarkAllRead={onMarkAllRead}
              onMarkRead={onMarkRead}
              onNavigate={close}
            />
          </Sheet>
        ) : (
        <Popover
          open={open === "notifications"}
          onClose={close}
          anchor={notificationsAnchor}
          placement="bottom"
          align="end"
          offset={4}
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
        )}

        <button
          type="button"
          ref={setProfileAnchor}
          className={cn(styles.profile, open === "profile" && styles.profileOn)}
          onClick={() => toggle("profile")}
          aria-expanded={open === "profile"}
          aria-label={`Account — ${user.name}`}
        >
          <AccountMark user={user} className={styles.mark} />
        </button>

        {isCompact ? (
          <Sheet
            open={open === "profile"}
            onClose={close}
            label="Account"
            snapPoints={[0.46, 0.72]}
            initialSnapIndex={0}
          >
            <ProfileMenu
              user={user}
              onEditPersona={() => {
                close();
                onEditPersona();
              }}
              onEditProfile={
                onEditProfile
                  ? () => {
                      close();
                      onEditProfile();
                    }
                  : undefined
              }
              onSignOut={() => {
                close();
                onSignOut();
              }}
              onNavigate={close}
            />
          </Sheet>
        ) : (
        <Popover
          open={open === "profile"}
          onClose={close}
          anchor={profileAnchor}
          placement="bottom"
          align="end"
          offset={4}
          width={264}
          label="Account"
        >
          <ProfileMenu
            user={user}
            onEditPersona={() => {
              close();
              onEditPersona();
            }}
            onEditProfile={
              onEditProfile
                ? () => {
                    close();
                    onEditProfile();
                  }
                : undefined
            }
            onSignOut={() => {
              close();
              onSignOut();
            }}
            onNavigate={close}
          />
        </Popover>
        )}
      </div>
    </header>
  );
}
