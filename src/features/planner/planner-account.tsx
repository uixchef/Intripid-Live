"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";

import { Popover } from "@/components/ui/overlay";
import { AccountMark } from "@/features/dashboard/account-mark";
import { ProfileMenu } from "@/features/dashboard/profile-menu";
import { cn } from "@/lib/utils";
import { accountSettingsHref } from "@/lib/nav";
import { useSession, useSessionApi } from "@/stores/session-store";
import { useTrip } from "@/stores/trip-store";

import styles from "./planner-account.module.css";

/**
 * Account holder, far right of planner chrome.
 *
 * Same mark as the dashboard header: initials on brand purple, not a
 * traveller `--who-*` colour. Opens the same account menu so sign-out and
 * persona are not trapped on one surface.
 */
export function PlannerAccount() {
  const router = useRouter();
  const api = useSessionApi();
  const user = useSession((s) => s.user);
  const tripId = useTrip((s) => s.trip.id);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  if (!user) return null;

  return (
    <>
      <button
        type="button"
        ref={setAnchor}
        className={cn(styles.trigger, open && styles.triggerOn)}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-label={`Account — ${user.name}`}
      >
        <AccountMark user={user} className={styles.mark} />
      </button>

      <Popover
        open={open}
        onClose={() => setOpen(false)}
        anchor={anchor}
        placement="bottom"
        align="end"
        width={264}
        label="Account"
      >
        <ProfileMenu
          user={user}
          showDashboard
          onEditPersona={() => {
            setOpen(false);
            router.push("/dashboard" as Route);
          }}
          onEditProfile={() => {
            setOpen(false);
            router.push(accountSettingsHref(`/trip/${tripId}`));
          }}
          onSignOut={() => {
            setOpen(false);
            api.getState().signOut();
            router.push("/");
          }}
          onNavigate={() => setOpen(false)}
        />
      </Popover>
    </>
  );
}
