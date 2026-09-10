"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Tag } from "@/components/ui/chip";
import { NYC_TRIP_ID } from "@/data/nyc-trip";
import { connectionAsTraveller } from "@/lib/collaboration";
import { cn } from "@/lib/utils";
import type { Connection } from "@/lib/types";

import styles from "./connections-panel.module.css";

/**
 * Connections.
 *
 * The original header had this and the current planner has travellers, roles
 * and presence — this is the join between them. Same people, same ids, same
 * avatar colours; what the dashboard adds is the history that explains why
 * someone is in the list at all.
 *
 * IT IS NOT A SOCIAL NETWORK. There is no following, no profile page, no feed
 * and no request state. A connection is someone you can put on a trip, so the
 * list is sorted by whether they are already on one and the only outbound
 * action is into the trip you share.
 */

export interface ConnectionsPanelProps {
  connections: Connection[];
  /** How many are on a live trip, for the summary line. */
  onTripCount: number;
  /** Close the popover when a link is followed. */
  onNavigate: () => void;
}

export function ConnectionsPanel({
  connections,
  onTripCount,
  onNavigate,
}: ConnectionsPanelProps) {
  const current = connections.filter((c) => c.onCurrentTrip);
  const past = connections.filter((c) => !c.onCurrentTrip);

  return (
    <div className={styles.panel}>
      <header className={styles.head}>
        <h2 className={styles.title}>Connections</h2>
        <p className={styles.sub}>
          {connections.length} people · {onTripCount} on a trip with you now
        </p>
      </header>

      <div className={styles.groups}>
        <section className={styles.group} aria-label="Travelling with you">
          <p className={styles.groupLabel}>Travelling with you</p>
          <ul className={styles.list}>
            {current.map((connection) => (
              <li key={connection.id}>
                {/*
                 * The row is a link because there is exactly one useful thing
                 * to do with a person you are travelling with: go and look at
                 * the trip you share. A row that only opened a profile would
                 * be a dead end.
                 */}
                <Link
                  href={`/trip/${NYC_TRIP_ID}`}
                  className={styles.row}
                  onClick={onNavigate}
                >
                  <Avatar
                    traveller={connectionAsTraveller(connection)}
                    size="md"
                  />
                  <span className={styles.body}>
                    <span className={styles.name}>{connection.name}</span>
                    <span className={styles.history}>
                      {connection.history.join(" · ")}
                    </span>
                  </span>
                  <span className={styles.go} aria-hidden>
                    <ArrowUpRight size={13} strokeWidth={2.2} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {past.length > 0 ? (
          <section className={styles.group} aria-label="Travelled with before">
            <p className={styles.groupLabel}>Travelled with before</p>
            <ul className={styles.list}>
              {past.map((connection) => (
                <li key={connection.id} className={cn(styles.rowStatic)}>
                  <Avatar
                    traveller={connectionAsTraveller(connection)}
                    size="md"
                  />
                  <span className={styles.body}>
                    <span className={styles.name}>{connection.name}</span>
                    <span className={styles.history}>
                      {connection.history.join(" · ")}
                    </span>
                  </span>
                  {/*
                   * Stated, not offered. Inviting someone happens inside a
                   * trip, where there is a trip to invite them to — a bare
                   * "Invite" here would have to ask "to what?" first.
                   */}
                  <Tag tone="neutral">Past</Tag>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      <footer className={styles.foot}>
        <p className={styles.footNote}>
          Add people to a trip from the planner&rsquo;s travellers panel.
        </p>
      </footer>
    </div>
  );
}
