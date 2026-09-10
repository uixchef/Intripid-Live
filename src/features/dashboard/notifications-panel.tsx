"use client";

import Link from "next/link";
import type { Route } from "next";
import { AlertTriangle, CalendarClock, Sparkles, Users } from "lucide-react";

import { cn } from "@/lib/utils";
import type { AppNotification } from "@/lib/types";

import styles from "./notifications-panel.module.css";

/**
 * Notifications.
 *
 * THE RULE: every row resolves to somewhere in the product, and the row itself
 * is the link. That is why there are four and not forty — an inbox on a home
 * screen is only worth its space if reading it is the same act as dealing with
 * it. Nothing here says "someone liked your trip".
 *
 * Following a notification marks it read, because the alternative is a
 * separate "mark read" affordance on every row that the user has to service
 * after already dealing with the thing.
 */

const KIND_ICON = {
  advisor: AlertTriangle,
  collaboration: Users,
  season: CalendarClock,
} as const;

export interface NotificationsPanelProps {
  notifications: AppNotification[];
  unreadCount: number;
  onMarkAllRead: () => void;
  onMarkRead: (id: string) => void;
  onNavigate: () => void;
}

export function NotificationsPanel({
  notifications,
  unreadCount,
  onMarkAllRead,
  onMarkRead,
  onNavigate,
}: NotificationsPanelProps) {
  return (
    <div className={styles.panel}>
      <header className={styles.head}>
        <div className={styles.headText}>
          <h2 className={styles.title}>Notifications</h2>
          <p className={styles.sub}>
            {unreadCount > 0 ? `${unreadCount} unread` : "Nothing unread"}
          </p>
        </div>
        {unreadCount > 0 ? (
          <button
            type="button"
            className={styles.markAll}
            onClick={onMarkAllRead}
          >
            Mark all read
          </button>
        ) : null}
      </header>

      {notifications.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>Nothing waiting</p>
          <p className={styles.emptyBody}>
            Clashes, changes your travellers make, and closing seasonal windows
            show up here.
          </p>
        </div>
      ) : (
        <ul className={styles.list}>
          {notifications.map((notification) => {
            const Icon = KIND_ICON[notification.kind];
            return (
              <li key={notification.id}>
                <Link
                  /*
                   * `typedRoutes` validates literal hrefs and requires a cast
                   * for computed ones. The model keeps `href` a plain string
                   * so the domain layer does not have to import framework
                   * types; the cast lives here, at the one boundary that
                   * cares.
                   */
                  href={notification.href as Route}
                  className={cn(
                    styles.row,
                    !notification.read && styles.rowUnread,
                  )}
                  onClick={() => {
                    onMarkRead(notification.id);
                    onNavigate();
                  }}
                >
                  <span
                    className={cn(styles.icon, styles[notification.kind])}
                    aria-hidden
                  >
                    <Icon size={12} strokeWidth={2.2} />
                  </span>
                  <span className={styles.body}>
                    <span className={styles.rowTop}>
                      <span className={styles.rowTitle}>
                        {notification.title}
                      </span>
                      <span className={styles.age}>{notification.age}</span>
                    </span>
                    <span className={styles.detail}>{notification.detail}</span>
                  </span>
                  {!notification.read ? (
                    <span className={styles.dot} aria-label="Unread" />
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <footer className={styles.foot}>
        <p className={styles.footNote}>
          <Sparkles size={10} strokeWidth={2.4} aria-hidden />
          Only things you can act on. No activity feed.
        </p>
      </footer>
    </div>
  );
}
