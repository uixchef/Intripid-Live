"use client";

import type { Prize } from "@/data/prizes";
import { cn } from "@/lib/utils";

import styles from "./seal-row.module.css";

export function SealRow({
  prizes,
  className,
}: {
  prizes: Prize[];
  className?: string;
}) {
  const ordered = [...prizes].sort(
    (a, b) => Number(b.earned) - Number(a.earned),
  );

  return (
    <ul className={cn(styles.row, className)} aria-label="Prize seals">
      {ordered.map((prize, index) => (
        <li
          key={prize.id}
          className={styles.item}
          data-earned={prize.earned ? "" : undefined}
          style={{ zIndex: ordered.length - index }}
          title={
            prize.earned
              ? `${prize.label} — ${prize.detail}`
              : `${prize.label} — ${prize.hint}`
          }
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- local seal art */}
          <img
            className={styles.face}
            src={prize.earned ? prize.seal : "/identity/seals/locked.png"}
            alt={
              prize.earned
                ? `${prize.label}, collected`
                : `${prize.label}, locked`
            }
            width={44}
            height={44}
          />
        </li>
      ))}
    </ul>
  );
}
