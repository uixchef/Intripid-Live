"use client";

import { useMemo, useState } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/controls";
import { Select } from "@/components/ui/select";
import {
  BOARD_GUESTS,
  BOARD_PERIODS,
  BOARD_PREVIEW,
  boardPersonFromConnection,
  boardPersonFromUser,
  rankBoard,
  type BoardPeriod,
  type BoardPerson,
  type BoardRow,
} from "@/data/leaderboard";
import { prizeProgressSummary } from "@/data/prizes";
import { connectionAsTraveller, isConfirmedConnection } from "@/lib/collaboration";
import { useIsCompact } from "@/lib/use-media-query";
import type { AccountUser, Connection, Traveller } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useSession } from "@/stores/session-store";

import styles from "./leaderboard.module.css";

export interface LeaderboardProps {
  user: AccountUser;
  connections: Connection[];
  onViewAll?: () => void;
}

export function Leaderboard({ user, connections, onViewAll }: LeaderboardProps) {
  const [period, setPeriod] = useState<BoardPeriod>("30d");
  const { people, live } = useBoardPeople(user, connections);
  const rows = useMemo(
    () => rankBoard(people, period, "seals", live),
    [people, period, live],
  );
  const preview = rows.slice(0, BOARD_PREVIEW);

  return (
    <section className={styles.panel} aria-labelledby="leaderboard-title">
      <div className={styles.head}>
        <div className={styles.headCopy}>
          <h2 id="leaderboard-title" className={styles.title}>
            Leaderboard
          </h2>
          <Select
            size="chip"
            className={styles.period}
            label="Period"
            value={period}
            onChange={setPeriod}
            options={BOARD_PERIODS.map((item) => ({
              value: item.value,
              label: item.label,
            }))}
          />
        </div>
        {onViewAll ? (
          <Button
            type="button"
            size="xs"
            variant="ghost"
            className={styles.viewAll}
            onClick={onViewAll}
          >
            View all
          </Button>
        ) : null}
      </div>
      <RankList rows={preview} youId={user.id} />
    </section>
  );
}

export interface LeaderboardFullProps {
  user: AccountUser;
  connections: Connection[];
}

/**
 * Full board: 30 days as the podium, 90 days and this year as rank tables.
 */
export function LeaderboardFull({ user, connections }: LeaderboardFullProps) {
  const compact = useIsCompact();
  const { people, live } = useBoardPeople(user, connections);
  const [period, setPeriod] = useState<BoardPeriod>("30d");
  const days30 = useMemo(
    () => rankBoard(people, "30d", "seals", live),
    [people, live],
  );
  const days90 = useMemo(
    () => rankBoard(people, "90d", "seals", live),
    [people, live],
  );
  const year = useMemo(
    () => rankBoard(people, "year", "seals", live),
    [people, live],
  );
  const compactRows = period === "90d" ? days90 : period === "year" ? year : days30;

  if (compact) {
    return (
      <section className={cn(styles.full, styles.fullCompact)} aria-label="Leaderboard">
        <div className={styles.compactHead}>
          <Segmented
            size="md"
            className={styles.periodSwitch}
            label="Period"
            value={period}
            onChange={setPeriod}
            options={BOARD_PERIODS.map((item) => ({
              value: item.value,
              label: item.short,
            }))}
          />
        </div>
        <div className={styles.compactCard}>
          <Podium rows={compactRows} youId={user.id} />
        </div>
        <p className={styles.compactGroup}>Standings</p>
        <RankList rows={compactRows} youId={user.id} surface="sheet" />
      </section>
    );
  }

  return (
    <section className={styles.full} aria-label="Leaderboard">
      <div className={styles.boardBody}>
        <div className={styles.boardMain}>
          <p className={styles.windowLabel}>30 days</p>
          <Podium rows={days30} youId={user.id} />
          <RankList rows={days30} youId={user.id} />
        </div>
        <div className={styles.windows}>
          <PeriodTable label="90 days" rows={days90} youId={user.id} />
          <PeriodTable label="This year" rows={year} youId={user.id} />
        </div>
      </div>
    </section>
  );
}

function PeriodTable({
  label,
  rows,
  youId,
}: {
  label: string;
  rows: BoardRow[];
  youId: string;
}) {
  return (
    <section className={styles.window} aria-label={label}>
      <p className={styles.windowLabel}>{label}</p>
      <RankList rows={rows} youId={youId} />
    </section>
  );
}

function useBoardPeople(user: AccountUser, connections: Connection[]) {
  const visited = useSession((s) => s.visited);
  const wishlist = useSession((s) => s.wishlist);
  const avoids = useSession((s) => s.avoids);

  const people = useMemo<BoardPerson[]>(
    () => {
      const confirmed = connections.filter(isConfirmedConnection);
      const known = new Set([user.id, ...confirmed.map((person) => person.id)]);
      return [
        boardPersonFromUser(user),
        ...confirmed.map(boardPersonFromConnection),
        ...BOARD_GUESTS.filter((guest) => !known.has(guest.id)).map(
          boardPersonFromConnection,
        ),
      ];
    },
    [user, connections],
  );

  const live = useMemo(() => {
    const seals = prizeProgressSummary(
      user.badges,
      visited,
      wishlist,
      avoids,
    ).level;
    return {
      id: user.id,
      seals,
      visited: visited.length,
      wishlist: wishlist.length,
    };
  }, [user, visited, wishlist, avoids]);

  return { people, live };
}

function asTraveller(row: BoardPersonLike): Traveller {
  return connectionAsTraveller({
    id: row.id,
    name: row.name,
    handle: row.id,
    initials: row.initials,
    photoUrl: row.photoUrl,
    colorIndex: row.colorIndex,
    history: [],
    onCurrentTrip: false,
  });
}

type BoardPersonLike = Pick<
  BoardRow,
  "id" | "name" | "initials" | "photoUrl" | "colorIndex"
>;

function givenName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}

function Podium({
  rows,
  youId,
}: {
  rows: BoardRow[];
  youId: string;
}) {
  const first = rows.find((row) => row.rank === 1);
  const second = rows.find((row) => row.rank === 2);
  const third = rows.find((row) => row.rank === 3);
  if (!first) return null;

  return (
    <div className={cn(styles.podiumCard, styles.podiumCardCompact)}>
      <div className={styles.podium} role="list" aria-label="Top three">
        <PodiumStand
          row={second}
          place="2nd"
          tone="silver"
          youId={youId}
        />
        <PodiumStand
          row={first}
          place="1st"
          tone="gold"
          youId={youId}
        />
        <PodiumStand
          row={third}
          place="3rd"
          tone="bronze"
          youId={youId}
        />
      </div>
    </div>
  );
}

function PodiumStand({
  row,
  place,
  tone,
  youId,
}: {
  row?: BoardRow;
  place: "1st" | "2nd" | "3rd";
  tone: "gold" | "silver" | "bronze";
  youId: string;
}) {
  if (!row) {
    return <div className={styles.stand} aria-hidden />;
  }

  const barTone =
    tone === "gold"
      ? styles.barGold
      : tone === "silver"
        ? styles.barSilver
        : styles.barBronze;

  return (
    <div
      className={styles.stand}
      role="listitem"
      aria-label={`${place}, ${row.name}, ${row.value} seals`}
    >
      <Avatar
        traveller={asTraveller(row)}
        size="md"
        hideName
        color={row.id === youId ? "var(--purple-600)" : undefined}
      />
      <p className={cn(styles.podiumName, row.id === youId && styles.podiumYou)}>
        {givenName(row.name)}
        {row.id === youId ? <span className={styles.youChip}>You</span> : null}
      </p>
      <div className={cn(styles.bar, barTone)}>
        <span className={styles.barPlace}>{place}</span>
        <span className={styles.barScore}>
          {row.value} {row.value === 1 ? "seal" : "seals"}
        </span>
      </div>
    </div>
  );
}

function RankList({
  rows,
  youId,
  surface = "table",
}: {
  rows: BoardRow[];
  youId: string;
  surface?: "table" | "sheet";
}) {
  const sheet = surface === "sheet";

  return (
    <div className={sheet ? styles.sheet : styles.table}>
      {sheet ? null : (
        <div className={styles.cols} aria-hidden>
          <span className={styles.colRank}>Rank</span>
          <span className={styles.colName}>User</span>
          <span className={styles.colScore}>Seals</span>
        </div>
      )}
      <ol className={styles.list}>
        {rows.map((row) => (
          <li
            key={row.id}
            className={cn(styles.row, sheet && styles.sheetRow, row.id === youId && styles.you)}
          >
            <RankMark rank={row.rank} />
            <span className={styles.person}>
              <Avatar
                traveller={asTraveller(row)}
                size="sm"
                hideName
                color={row.id === youId ? "var(--purple-600)" : undefined}
              />
              <span className={styles.name}>{row.name}</span>
              {row.id === youId ? <span className={styles.youChip}>You</span> : null}
            </span>
            <span className={styles.score}>{row.value}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function RankMark({ rank }: { rank: number }) {
  if (rank === 1) {
    return <span className={cn(styles.medal, styles.gold)}>1</span>;
  }
  if (rank === 2) {
    return <span className={cn(styles.medal, styles.silver)}>2</span>;
  }
  if (rank === 3) {
    return <span className={cn(styles.medal, styles.bronze)}>3</span>;
  }
  return <span className={styles.number}>{rank}</span>;
}
