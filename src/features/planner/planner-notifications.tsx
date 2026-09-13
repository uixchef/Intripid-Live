"use client";

import { useState } from "react";
import { Bell } from "lucide-react";

import { IconButton } from "@/components/ui/button";
import { Popover } from "@/components/ui/overlay";
import { NotificationsPanel } from "@/features/dashboard/notifications-panel";
import {
  selectUnreadCount,
  useSession,
  useSessionApi,
} from "@/stores/session-store";

import styles from "./planner-notifications.module.css";

/**
 * Same inbox as the dashboard header. The planner is where clashes and
 * traveller edits actually get acted on, so the bell belongs here too.
 */
export function PlannerNotifications() {
  const api = useSessionApi();
  const notifications = useSession((s) => s.notifications);
  const unreadCount = useSession(selectUnreadCount);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);

  return (
    <>
      <IconButton
        ref={setAnchor}
        label={
          unreadCount > 0
            ? `Notifications — ${unreadCount} unread`
            : "Notifications"
        }
        size="sm"
        variant="ghost"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className={styles.bellWrap}>
          <Bell size={18} strokeWidth={1.9} />
          {unreadCount > 0 ? <span className={styles.unread} /> : null}
        </span>
      </IconButton>

      <Popover
        open={open}
        onClose={() => setOpen(false)}
        anchor={anchor}
        placement="bottom"
        align="end"
        offset={4}
        width={352}
        label="Notifications"
      >
        <NotificationsPanel
          notifications={notifications}
          unreadCount={unreadCount}
          onMarkAllRead={() => api.getState().markAllNotificationsRead()}
          onMarkRead={(id) => api.getState().markNotificationRead(id)}
          onNavigate={() => setOpen(false)}
        />
      </Popover>
    </>
  );
}
