import { Plus } from "lucide-react";

import { AiMark } from "@/components/brand/ai-mark";
import { Button } from "@/components/ui/button";
import type { DayGap } from "@/lib/trip/schedule";
import {
  atMinutes,
  durationLabel,
  timeLabel,
  type ClockFormat,
} from "@/lib/trip/time";

import styles from "./free-time-card.module.css";

export function FreeTimeCard({
  day,
  gap,
  clock,
  onFill,
  onAdd,
}: {
  day: string;
  gap: DayGap;
  clock: ClockFormat;
  onFill: () => void;
  onAdd: () => void;
}) {
  const breath = Math.min(40, Math.max(0, Math.round((gap.minutes - 75) / 6)));

  return (
    <div
      className={styles.root}
      style={{ ["--breath" as string]: `${breath}px` }}
    >
      <span className={styles.rail} aria-hidden />
      <span className={styles.node} aria-hidden />
      <div className={styles.copy}>
        <p className={styles.title}>
          You&rsquo;ve got {durationLabel(gap.minutes)} free
        </p>
        <p className={styles.body}>
          From {timeLabel(atMinutes(day, gap.startMinutes), clock)}
        </p>
      </div>
      <div className={styles.actions}>
        <Button
          variant="ghost"
          size="sm"
          iconLeft={<Plus size={13} strokeWidth={2.2} />}
          onClick={onAdd}
        >
          Add my own
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className={styles.askAi}
          iconLeft={<AiMark size={13} />}
          onClick={onFill}
        >
          Ask AI
        </Button>
      </div>
    </div>
  );
}
