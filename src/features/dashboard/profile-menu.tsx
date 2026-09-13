"use client";

import Link from "next/link";
import type { Route } from "next";
import { Compass, LayoutDashboard, LogOut, Settings, SlidersHorizontal } from "lucide-react";

import { monthYear } from "@/lib/dashboard/format";
import type { AccountUser } from "@/lib/types";

import { AccountMark } from "./account-mark";
import styles from "./profile-menu.module.css";

/**
 * The account menu.
 *
 * From the planner it also carries Your trips — otherwise the only way home
 * is the back chevron, and that is easy to miss. On the dashboard the item
 * is omitted: you are already there.
 */

export interface ProfileMenuProps {
  user: AccountUser;
  onEditPersona: () => void;
  onEditProfile?: () => void;
  onSignOut: () => void;
  onNavigate: () => void;
  /** Planner chrome: a door back to the profile dashboard. */
  showDashboard?: boolean;
}

export function ProfileMenu({
  user,
  onEditPersona,
  onEditProfile,
  onSignOut,
  onNavigate,
  showDashboard = false,
}: ProfileMenuProps) {
  return (
    <div className={styles.menu}>
      <header className={styles.identity}>
        <AccountMark user={user} className={styles.avatar} />
        <span className={styles.identityText}>
          <span className={styles.name}>{user.name}</span>
          <span className={styles.handle}>@{user.handle}</span>
        </span>
      </header>

      <p className={styles.since}>
        Travelling with Intripid since {monthYear(user.memberSinceIso)}
      </p>

      <div className={styles.items}>
        {showDashboard ? (
          <Link
            href={"/dashboard" as Route}
            className={styles.item}
            onClick={onNavigate}
          >
            <LayoutDashboard size={14} strokeWidth={2} aria-hidden />
            Your trips
          </Link>
        ) : null}

        {onEditProfile ? (
          <button
            type="button"
            className={styles.item}
            onClick={() => {
              onNavigate();
              onEditProfile();
            }}
          >
            <Settings size={14} strokeWidth={2} aria-hidden />
            Account settings
          </button>
        ) : null}

        <button type="button" className={styles.item} onClick={onEditPersona}>
          <SlidersHorizontal size={14} strokeWidth={2} aria-hidden />
          Refine travel persona
        </button>

        <Link href={"/discover" as Route} className={styles.item} onClick={onNavigate}>
          <Compass size={14} strokeWidth={2} aria-hidden />
          Find where to go
        </Link>
      </div>

      <div className={styles.signOutWrap}>
        <button
          type="button"
          className={styles.signOut}
          onClick={onSignOut}
        >
          <LogOut size={14} strokeWidth={2} aria-hidden />
          Sign out
        </button>
        {/*
         * Said plainly rather than hidden. Anyone reviewing this should know
         * the session is a local mock before they click the thing that ends
         * it — and that getting back in costs one button.
         */}
        <p className={styles.mockNote}>
          Demo session, stored in this browser. Signing out returns you to the
          logged-out home.
        </p>
      </div>
    </div>
  );
}
