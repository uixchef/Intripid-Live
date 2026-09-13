"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";

import { IconButton } from "@/components/ui/button";
import type { Connection } from "@/lib/types";
import { useSessionApi } from "@/stores/session-store";

import { PeopleConnections } from "./people-connections";
import styles from "./connections-panel.module.css";

/**
 * Connections.
 *
 * Same people as the planner travellers list — ids, names, avatars — managed
 * here instead of buried in profile settings. Connects and requests live on
 * this panel so adding someone to your circle is next to the people icon,
 * not a settings page.
 */

export interface ConnectionsPanelProps {
  connections: Connection[];
}

export function ConnectionsPanel({ connections }: ConnectionsPanelProps) {
  const session = useSessionApi();
  const [adding, setAdding] = useState(false);

  return (
    <div className={styles.panel}>
      <header className={styles.head}>
        <div className={styles.headCopy}>
          <h2 className={styles.title}>Connections</h2>
        </div>
        <IconButton
          label={adding ? "Cancel adding" : "Add connection"}
          size="sm"
          variant="ghost"
          aria-pressed={adding}
          onClick={() => setAdding((open) => !open)}
        >
          {adding ? (
            <X size={16} strokeWidth={2.2} />
          ) : (
            <Plus size={16} strokeWidth={2.2} />
          )}
        </IconButton>
      </header>
      <PeopleConnections
        connections={connections}
        adding={adding}
        onAddingChange={setAdding}
        onChange={(next) => session.getState().setConnections(next)}
      />
    </div>
  );
}
