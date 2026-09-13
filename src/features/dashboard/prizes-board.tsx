"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Gift, X } from "lucide-react";

import { IconButton } from "@/components/ui/button";
import { Modal, Sheet } from "@/components/ui/overlay";
import { BOARD_REWARDS, prizeProgressSummary } from "@/data/prizes";
import { useIsCompact } from "@/lib/use-media-query";
import { cn } from "@/lib/utils";
import type {
  AccountUser,
  AvoidPlace,
  LngLat,
  TravelBadge,
  VisitedLocation,
  WishlistPlace,
} from "@/lib/types";

import { IdentityMap } from "./identity-map";
import { ProgressMark } from "./progress-mark";
import { SealRow } from "./seal-row";
import styles from "./prizes-board.module.css";

export interface PrizesPanelProps {
  user: AccountUser;
  badges: TravelBadge[];
  visited: VisitedLocation[];
  wishlist: WishlistPlace[];
  avoids: AvoidPlace[];
  /** Hide the sheet chrome when this sits in the full-screen board. */
  embedded?: boolean;
  onClose?: () => void;
  className?: string;
}

/**
 * My Progress + Rewards — the profile rail from the community board.
 *
 * Embedded: identity map as the banner, then mark / name / seals below it,
 * the same hierarchy as the dashboard profile card.
 */
export function PrizesPanel({
  user,
  badges,
  visited,
  wishlist,
  avoids,
  embedded = false,
  onClose,
  className,
}: PrizesPanelProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const { prizes, level, ringPct, next } = useMemo(
    () => prizeProgressSummary(badges, visited, wishlist, avoids),
    [badges, visited, wishlist, avoids],
  );
  const [focus, setFocus] = useState<{
    id: string;
    coords: LngLat;
    zoom: number;
    revision: number;
  } | null>(null);

  useEffect(() => {
    if (!embedded) titleRef.current?.focus();
  }, [embedded]);

  function lookAt(place: { id: string; coords: LngLat; zoom: number }) {
    setFocus((current) => ({
      ...place,
      revision: (current?.revision ?? 0) + 1,
    }));
  }

  const progress = (
    <>
      <div className={styles.person}>
        <ProgressMark user={user} level={level} progress={ringPct} />
        <div className={styles.personCopy}>
          <p className={styles.personName}>{user.name}</p>
          <p className={styles.personHandle}>@{user.handle}</p>
        </div>
      </div>

      <div className={styles.seals}>
        <SealRow prizes={prizes} />
        {next ? (
          <p className={styles.personHint}>
            +{Math.max(0, next.target - next.current)} to unlock {next.label}
          </p>
        ) : null}
      </div>
    </>
  );

  const rewards = (
    <section className={styles.rewards} aria-label="Rewards">
      <h3 className={styles.sectionTitle}>Rewards</h3>
      <ul className={styles.rewardList}>
        {BOARD_REWARDS.map((reward) => (
          <li key={reward.id} className={styles.reward}>
            <span className={styles.rewardIcon} aria-hidden>
              <Gift size={16} strokeWidth={2.1} />
            </span>
            <div className={styles.rewardCopy}>
              <p className={styles.rewardTitle}>{reward.title}</p>
              <p className={styles.rewardBody}>{reward.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );

  return (
    <div className={cn(styles.board, embedded && styles.boardEmbed, className)}>
      {embedded ? (
        <>
          <div className={styles.cover}>
            <IdentityMap
              locations={visited}
              wishlist={wishlist}
              avoids={avoids}
              stats={{
                wishlist: wishlist.length,
                visited: visited.length,
                avoid: avoids.length,
              }}
              expanded={false}
              focus={focus}
              showExpand={false}
              onSelectPlace={lookAt}
            />
          </div>
          <section className={styles.progress} data-overlap="" aria-label="My progress">
            {progress}
          </section>
          {rewards}
        </>
      ) : (
        <>
          <header className={styles.head}>
            <h2 ref={titleRef} className={styles.title} tabIndex={-1}>
              Prizes
            </h2>
            {onClose ? (
              <IconButton label="Close prizes" size="sm" variant="ghost" onClick={onClose}>
                <X size={16} strokeWidth={2.1} />
              </IconButton>
            ) : null}
          </header>
          <section className={styles.progress} aria-label="My progress">
            {progress}
          </section>
          {rewards}
        </>
      )}
    </div>
  );
}

export interface PrizesBoardProps extends Omit<PrizesPanelProps, "embedded"> {
  open: boolean;
  onClose: () => void;
}

export function PrizesBoard({
  open,
  onClose,
  ...panel
}: PrizesBoardProps) {
  const compact = useIsCompact();
  const body = <PrizesPanel {...panel} onClose={onClose} />;

  if (compact) {
    return (
      <Sheet open={open} onClose={onClose} label="Prizes" height={0.88} className={styles.sheet}>
        {body}
      </Sheet>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      label="Prizes"
      width={360}
      flush
      className={styles.panel}
    >
      {body}
    </Modal>
  );
}
