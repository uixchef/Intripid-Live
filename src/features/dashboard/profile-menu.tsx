"use client";

import Link from "next/link";
import { Compass, LogOut, SlidersHorizontal } from "lucide-react";

import { monthYear } from "@/lib/dashboard/format";
import type { AccountUser } from "@/lib/types";

import styles from "./profile-menu.module.css";

/**
 * The account menu.
 *
 * Four things, and every one of them does something: refine the persona (opens
 * the editor on this page), go to Discovery, and sign out. There is no
 * Settings, no Billing, no Help — this is a portfolio build and a menu full of
 * doors that open onto nothing is worse than a short menu.
 *
 * Signing out is the visible half of the session model. It is what makes the
 * guest/authenticated split real rather than asserted: it flips the session,
 * persists it, and drops you back on the logged-out door at `/`.
 */

export interface ProfileMenuProps {
  user: AccountUser;
  onEditPersona: () => void;
  onSignOut: () => void;
  onNavigate: () => void;
}

export function ProfileMenu({
  user,
  onEditPersona,
  onSignOut,
  onNavigate,
}: ProfileMenuProps) {
  return (
    <div className={styles.menu}>
      <header className={styles.identity}>
        <span className={styles.avatar} aria-hidden>
          {user.initials}
        </span>
        <span className={styles.identityText}>
          <span className={styles.name}>{user.name}</span>
          <span className={styles.handle}>@{user.handle}</span>
        </span>
      </header>

      <p className={styles.since}>
        Travelling with Intripid since {monthYear(user.memberSinceIso)}
      </p>

      <div className={styles.items}>
        <button type="button" className={styles.item} onClick={onEditPersona}>
          <SlidersHorizontal size={14} strokeWidth={2} aria-hidden />
          Refine travel persona
        </button>

        <Link href="/discover" className={styles.item} onClick={onNavigate}>
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
