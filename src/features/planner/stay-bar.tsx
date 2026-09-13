"use client";

import { cn } from "@/lib/utils";
import type { ItineraryItem } from "@/lib/types";

import styles from "./stay-bar.module.css";

export function StayBar({
  stay,
  selected,
  onSelect,
  onOpen,
}: {
  stay: ItineraryItem;
  selected?: boolean;
  onSelect: () => void;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      data-event={stay.id}
      className={cn(styles.bar, selected && styles.selected)}
      onClick={onSelect}
      onDoubleClick={onOpen}
    >
      <span className={styles.name}>{stay.title}</span>
      {stay.place && stay.place.name !== stay.title ? (
        <span className={styles.place}>{stay.place.name}</span>
      ) : stay.place ? (
        <span className={styles.place}>{stay.place.address}</span>
      ) : null}
      {stay.booking ? (
        <span className={styles.booking}>{stay.booking}</span>
      ) : null}
    </button>
  );
}
