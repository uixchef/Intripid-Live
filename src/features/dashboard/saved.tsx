"use client";

import Link from "next/link";
import { Bookmark } from "lucide-react";

import { getDestination } from "@/data/destinations";
import type { SavedDestination } from "@/lib/types";

import styles from "./saved.module.css";

/**
 * Saved destinations.
 *
 * THIS SLOT USED TO BE "WEEKEND GETAWAYS — COMING SOON": a full-height poster
 * with COMING SOON set across a stock mountain photograph, and the line
 * "Complete your profile and dive into this amazing feature!".
 *
 * It is not recreated, and the reasoning is worth stating because the brief
 * left the call open. A locked panel advertising a feature that does not exist
 * takes a permanent slot on the busiest screen in the product, gives nothing
 * back on any visit, and gets less interesting every time it is seen. It also
 * makes the profile a prerequisite for a reward, which is the gamified framing
 * the identity block was rebuilt to avoid.
 *
 * The same slot holding the places you have already shown interest in is
 * useful on the first visit and on the fiftieth, needs no backend, and feeds
 * the one surface that can act on it. The wishlist count in the identity block
 * is the full number; this is the top of it.
 */

export interface SavedPanelProps {
  saved: SavedDestination[];
  /** The full wishlist count from the profile, so the two agree. */
  wishlistTotal: number;
}

export function SavedPanel({ saved, wishlistTotal }: SavedPanelProps) {
  return (
    <section className={styles.panel} aria-label="Saved destinations">
      <header className={styles.head}>
        <h2 className={styles.title}>
          <Bookmark size={12} strokeWidth={2.2} aria-hidden />
          Saved for later
        </h2>
        <p className={styles.sub}>
          {saved.length} of {wishlistTotal}
        </p>
      </header>

      <ul className={styles.list}>
        {saved.map((entry) => {
          const destination = getDestination(entry.destinationId);
          if (!destination) return null;

          return (
            <li key={entry.destinationId}>
              {/*
               * Into Discovery rather than a destination page. There is no
               * destination page in this product, and the useful thing to do
               * with a saved place is check it against real dates — which is
               * exactly what Discovery does.
               */}
              <Link href="/discover" className={styles.row}>
                <span className={styles.flag} aria-hidden>
                  {destination.flag}
                </span>
                <span className={styles.body}>
                  <span className={styles.name}>{destination.name}</span>
                  <span className={styles.reason}>{entry.reason}</span>
                </span>
                <span className={styles.window}>{entry.window}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
