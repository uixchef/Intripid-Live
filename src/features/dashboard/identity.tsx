"use client";

import { Bookmark, MapPin, Pencil, SlidersHorizontal, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { monthYear } from "@/lib/dashboard/format";
import { cn } from "@/lib/utils";
import type { AccountUser } from "@/lib/types";

import styles from "./identity.module.css";

/**
 * Travel identity.
 *
 * WHAT THE ORIGINAL HAD: a globe cover image, an overlapping avatar, name and
 * handle, three counts (Wishlist / Visited / Avoid), two buttons, and four
 * badge-like circles — two of them empty dashed outlines.
 *
 * WHAT IS KEPT: all of the information, and the hierarchy. This block still
 * answers "who am I in this product" before anything else on the page.
 *
 * WHAT IS REINTERPRETED, and why:
 *
 *  - THE COVER. A decorative globe on the widest block of the home screen
 *    costs about 190px of first-screen height and says nothing. The cover is
 *    now a horizon band that carries the three counts, so the same pixels do
 *    the identity work and the data work at once.
 *
 *  - THE BADGES. Two of the four in the original were empty dashed circles —
 *    locked achievements, which is a slot machine, not a travel profile. Read
 *    as product, that position wants the standing inputs to every
 *    recommendation. So it holds persona traits, and each one states what it
 *    causes Intripid to do. That is the difference between a profile that
 *    gamifies you and one that works for you.
 *
 *  - "AVOID" stays a first-class count, at the same weight as Wishlist and
 *    Visited. It is the most distinctive number in the original and the one a
 *    recommender benefits from most.
 */

export interface IdentityProps {
  user: AccountUser;
  /** True while the persona editor is open, so the CTA can reflect it. */
  editing: boolean;
  onEditPersona: () => void;
  onEditProfile: () => void;
}

export function Identity({
  user,
  editing,
  onEditPersona,
  onEditProfile,
}: IdentityProps) {
  const { stats } = user;

  return (
    <section className={styles.identity} aria-label="Your travel identity">
      {/* ------------------------------------------------------------------ */}
      {/* Cover — a horizon that carries the counts                          */}
      {/* ------------------------------------------------------------------ */}
      <div className={styles.cover}>
        <svg
          className={styles.horizon}
          viewBox="0 0 960 160"
          preserveAspectRatio="none"
          aria-hidden
        >
          {/*
           * Three contour ridges, the same drawing language as the trip
           * covers. Deliberately not a photograph and not a gradient wash:
           * this is the calmest thing that can still read as travel.
           */}
          <path d="M0 118 C 150 96, 260 128, 420 110 S 700 78, 960 104 L960 160 L0 160 Z" />
          <path d="M0 136 C 190 118, 320 146, 500 132 S 780 104, 960 126 L960 160 L0 160 Z" />
          <path d="M0 152 C 220 140, 360 160, 560 150 S 820 132, 960 146 L960 160 L0 160 Z" />
        </svg>

        <dl className={styles.stats}>
          <div className={styles.stat}>
            <dt className={styles.statLabel}>
              <Bookmark size={11} strokeWidth={2.2} aria-hidden />
              Wishlist
            </dt>
            <dd className={cn(styles.statValue, "tabular")}>
              {stats.wishlist}
            </dd>
          </div>
          <div className={styles.stat}>
            <dt className={styles.statLabel}>
              <MapPin size={11} strokeWidth={2.2} aria-hidden />
              Visited
            </dt>
            <dd className={cn(styles.statValue, "tabular")}>{stats.visited}</dd>
          </div>
          <div className={styles.stat}>
            <dt className={styles.statLabel}>
              <X size={11} strokeWidth={2.4} aria-hidden />
              Ruled out
            </dt>
            <dd className={cn(styles.statValue, "tabular")}>{stats.avoid}</dd>
          </div>
        </dl>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Person                                                             */}
      {/* ------------------------------------------------------------------ */}
      <div className={styles.body}>
        <div className={styles.person}>
          <span className={styles.avatar} aria-hidden>
            {user.initials}
          </span>

          <div className={styles.who}>
            <h1 className={styles.name}>{user.name}</h1>
            <p className={styles.meta}>
              <span className={styles.handle}>@{user.handle}</span>
              <span className={styles.dot} aria-hidden>
                ·
              </span>
              <span>
                {user.homeCity}, {user.homeCountry}
              </span>
              <span className={cn(styles.dot, styles.dotWide)} aria-hidden>
                ·
              </span>
              <span className={styles.since}>
                Since {monthYear(user.memberSinceIso)}
              </span>
            </p>
          </div>

          <div className={styles.actions}>
            <Button
              variant="secondary"
              size="sm"
              iconLeft={<Pencil size={13} strokeWidth={2.1} />}
              onClick={onEditProfile}
            >
              Edit profile
            </Button>
            <Button
              variant="primary"
              size="sm"
              iconLeft={<SlidersHorizontal size={13} strokeWidth={2.1} />}
              onClick={onEditPersona}
            >
              {editing ? "Editing persona" : "Refine persona"}
            </Button>
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Traits — where the original put badge circles                    */}
        {/* ---------------------------------------------------------------- */}
        <ul className={styles.traits} aria-label="What Intripid knows about how you travel">
          {user.persona.traits.map((trait) => (
            <li
              key={trait.id}
              className={styles.trait}
              data-channel={trait.channel}
            >
              <span className={styles.traitLabel}>{trait.label}</span>
              <span className={styles.traitEffect}>{trait.effect}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
