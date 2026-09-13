"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  CalendarRange,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  MapPin,
  Plus,
  Settings as SettingsIcon,
  UserRound,
  UserRoundCog,
} from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Sheet } from "@/components/ui/overlay";
import { BackLink } from "@/components/nav/back-link";
import { accountSettingsHref } from "@/lib/nav";
import { useTrip } from "@/stores/trip-store";
import { travellerColor } from "@/lib/categories";
import { ROLE_LABELS } from "@/lib/collaboration";
import { cn } from "@/lib/utils";
import { useSession, useSessionApi } from "@/stores/session-store";
import { type PlannerView } from "@/stores/trip-store";
import type { AccountUser, Traveller } from "@/lib/types";

import { RolesPanel } from "./roles-panel";
import styles from "./planner-nav.module.css";

/** Same brand fill as the desktop account chip — not traveller who-4. */
const YOU_COLOR = "var(--purple-600)";

function asNavTraveller(user: AccountUser, fromTrip?: Traveller): Traveller {
  return {
    id: user.id,
    name: user.name,
    initials: user.initials,
    photoUrl: user.photoUrl ?? fromTrip?.photoUrl,
    colorIndex: fromTrip?.colorIndex ?? user.colorIndex,
    role: fromTrip?.role ?? "owner",
    online: fromTrip?.online ?? true,
  };
}

const VIEW_ITEMS: {
  value: PlannerView;
  label: string;
  icon: typeof CalendarDays;
}[] = [
  { value: "day", label: "Day", icon: CalendarDays },
  { value: "week", label: "Week", icon: CalendarRange },
  { value: "four", label: "4 days", icon: LayoutGrid },
  { value: "trip", label: "Trip", icon: MapPin },
];

export function PlannerNav({
  view,
  unreadCount,
  tripName,
  tripCover,
  travellers,
  meId,
  overlayIds,
  sharedView,
  onChangeView,
  onSharedView,
  onChangeRole,
  onInvite,
  onNotifications,
  onSettings,
  onClose,
}: {
  view: PlannerView;
  unreadCount: number;
  tripName: string;
  tripCover?: string;
  travellers: Traveller[];
  meId: string | null;
  overlayIds: string[];
  sharedView: boolean;
  onChangeView: (view: PlannerView) => void;
  onSharedView: (travellerId: string) => void;
  onChangeRole: (travellerId: string, role: Traveller["role"]) => void;
  onInvite: () => void;
  onNotifications: () => void;
  onSettings: () => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const api = useSessionApi();
  const user = useSession((s) => s.user);
  const tripId = useTrip((s) => s.trip.id);
  const [rolesOpen, setRolesOpen] = useState(false);
  const people = useMemo(() => {
    const onTrip = user
      ? travellers.find((person) => person.id === user.id)
      : undefined;
    const me = user ? asNavTraveller(user, onTrip) : null;
    const rest = travellers.filter((person) => person.id !== me?.id);
    return me ? [me, ...rest] : travellers;
  }, [travellers, user]);

  return (
    <div className={styles.shell}>
      <nav className={styles.people} aria-label="Travellers">
        <div className={styles.peopleList}>
        {people.map((person) => {
          const picked = sharedView && overlayIds.includes(person.id);
          const isYou = person.id === (user?.id ?? meId);
          return (
            <button
              key={person.id}
              type="button"
              className={cn(styles.person, picked && styles.personOn)}
              style={{
                ["--who-ring" as string]: isYou
                  ? YOU_COLOR
                  : travellerColor(person.colorIndex),
              }}
              aria-pressed={picked}
              aria-label={`${isYou ? "You, " : ""}${person.name}, ${ROLE_LABELS[person.role]}${
                picked ? ", in shared view" : ""
              }`}
              title={isYou ? `You · ${person.name}` : person.name}
              onClick={() => onSharedView(person.id)}
            >
              <span className={styles.pill} aria-hidden />
              <Avatar
                traveller={person}
                size="lg"
                color={isYou ? YOU_COLOR : undefined}
                showPresence
                hideName
                className={styles.face}
              />
            </button>
          );
        })}
        <button
          type="button"
          className={styles.invite}
          aria-label="Add someone to this trip"
          onClick={() => {
            onClose();
            onInvite();
          }}
        >
          <Plus size={16} strokeWidth={2.2} />
        </button>
        </div>
        <button
          type="button"
          className={styles.roles}
          aria-label="Change traveller roles"
          onClick={() => {
            onClose();
            setRolesOpen(true);
          }}
        >
          <UserRoundCog size={16} strokeWidth={2.2} />
        </button>
      </nav>

      <Sheet
        open={rolesOpen}
        onClose={() => setRolesOpen(false)}
        label="Roles"
        fit
        layer="modal"
      >
        <div className={styles.rolesSheet}>
          <RolesPanel
            people={people}
            meId={user?.id ?? meId}
            youColor={YOU_COLOR}
            onChangeRole={onChangeRole}
          />
        </div>
      </Sheet>

      <div className={styles.root}>
        <div className={styles.body}>
        <header className={styles.brand}>
          <BackLink fallback="/dashboard" className={styles.back}>
            <ArrowLeft size={20} strokeWidth={2} />
          </BackLink>
          {tripCover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={tripCover} alt="" className={styles.cover} />
          ) : null}
          <div className={styles.brandCopy}>
            <h1 className={styles.trip}>{tripName}</h1>
          </div>
        </header>

        <div className={styles.section} role="radiogroup" aria-label="Calendar view">
          <p className={styles.sectionLabel}>View</p>
          {VIEW_ITEMS.map((item) => {
            const Icon = item.icon;
            const on = view === item.value;
            return (
              <button
                key={item.value}
                type="button"
                role="radio"
                aria-checked={on}
                className={cn(styles.item, on && styles.itemOn)}
                onClick={() => {
                  onChangeView(item.value);
                  onClose();
                }}
              >
                <Icon size={18} strokeWidth={1.9} aria-hidden />
                {item.label}
              </button>
            );
          })}
        </div>

        <div className={styles.section}>
          <p className={styles.sectionLabel}>Trip</p>
          <button
            type="button"
            className={styles.item}
            onClick={() => {
              onClose();
              onNotifications();
            }}
          >
            <span className={styles.itemIcon}>
              <Bell size={18} strokeWidth={1.9} aria-hidden />
              {unreadCount > 0 ? <span className={styles.unread} /> : null}
            </span>
            Notifications
            {unreadCount > 0 ? (
              <span className={styles.count}>{unreadCount}</span>
            ) : null}
          </button>
          <button
            type="button"
            className={styles.item}
            onClick={() => {
              onClose();
              onSettings();
            }}
          >
            <SettingsIcon size={18} strokeWidth={1.9} aria-hidden />
            Settings
          </button>
        </div>

        {user ? (
          <div className={styles.section}>
            <p className={styles.sectionLabel}>Account</p>
            <button
              type="button"
              className={styles.item}
              onClick={() => {
                onClose();
                router.push("/dashboard" as Route);
              }}
            >
              <LayoutDashboard size={18} strokeWidth={1.9} aria-hidden />
              Your trips
            </button>
            <button
              type="button"
              className={styles.item}
              onClick={() => {
                onClose();
                router.push(accountSettingsHref(`/trip/${tripId}`));
              }}
            >
              <UserRound size={18} strokeWidth={1.9} aria-hidden />
              Account settings
            </button>
            <button
              type="button"
              className={cn(styles.item, styles.itemDanger)}
              onClick={() => {
                onClose();
                api.getState().signOut();
                router.push("/");
              }}
            >
              <LogOut size={18} strokeWidth={1.9} aria-hidden />
              Sign out
            </button>
          </div>
        ) : null}
        </div>
      </div>
    </div>
  );
}
