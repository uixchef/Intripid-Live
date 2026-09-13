"use client";

import { useState } from "react";
import {
  CalendarDays,
  Mail,
  MoreHorizontal,
  Plus,
  UserMinus,
  UserPlus,
} from "lucide-react";

import { Avatar, AvatarStack } from "@/components/ui/avatar";
import { Button, IconButton } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/controls";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/overlay";
import { Tag } from "@/components/ui/chip";
import { ROLE_LABELS, ROLE_NOTES, ASSIGNABLE_ROLES } from "@/lib/collaboration";
import { cn } from "@/lib/utils";
import type { Traveller, Trip } from "@/lib/types";

import styles from "./collaborators.module.css";

/**
 * Collaboration.
 *
 * A trip is a multi-editor surface, not a document one person maintains. Two
 * things carry that here without pretending to be real multiplayer:
 *
 *  - Presence per traveller, and what they are looking at right now. Local,
 *    deterministic state — believable rather than fake infrastructure.
 *  - Roles, including "advisor": someone who helps plan without going. That
 *    distinction existed in the original product and is unusual enough to be
 *    worth keeping.
 *
 * Pending invitations stay visible in the plan. An honest incomplete state is
 * more useful than a tidy one that hides who has not replied.
 *
 * This used to live entirely inside a popover hung off four avatars in the top
 * bar, which made collaboration read as decoration. It is now a named section
 * of the context rail — permanently present, collapsed to one line until you
 * want it — and the same panel is what a phone opens in a sheet.
 */

/**
 * People the organiser has travelled with before.
 *
 * Deterministic demo data, and the reason it exists: inviting by typing an
 * email is the slow path. Most trips are planned with people you have already
 * planned a trip with, and that shortcut is the difference between a
 * collaboration feature and a collaboration form.
 */
const CONNECTIONS: { label: string; initials: string; colorIndex: number; note: string }[] = [
  { label: "Nina Okafor", initials: "NO", colorIndex: 4, note: "Lisbon, 2024" },
  { label: "Theo Lindqvist", initials: "TL", colorIndex: 5, note: "Kyoto, 2023" },
];


export interface PresenceChipProps {
  trip: Trip;
  invited: string[];
  expanded: boolean;
  onToggle: () => void;
}

/**
 * The top bar's presence read. A control that reveals the rail's travellers
 * section rather than a second, competing surface for the same information.
 */
export function PresenceChip({
  trip,
  invited,
  expanded,
  onToggle,
}: PresenceChipProps) {
  const online = trip.travellers.filter((t) => t.online);

  return (
    <button
      type="button"
      className={cn(styles.trigger, expanded && styles.triggerOn)}
      onClick={onToggle}
      aria-expanded={expanded}
      aria-label={`${trip.travellers.length} travellers, ${online.length} online${
        invited.length > 0 ? `, ${invited.length} invited` : ""
      }. Show travellers`}
    >
      <AvatarStack travellers={trip.travellers} size="sm" max={4} showPresence />
      <span className={styles.triggerMeta}>
        {online.length > 0 ? `${online.length} online` : `${trip.travellers.length}`}
      </span>
    </button>
  );
}

export interface TravellersPanelProps {
  trip: Trip;
  invited: string[];
  onInvite: () => void;
  onInviteConnection: (label: string) => void;
  onFocusItem: (itemId: string) => void;
  onShowPlan: (travellerId: string) => void;
  onChangeRole: (travellerId: string, role: Traveller["role"]) => void;
  onRemove: (travellerId: string) => void;
}

const EDITABLE_ROLES: Traveller["role"][] = ASSIGNABLE_ROLES;

/**
 * Who is on the trip, what they are looking at, and who has not replied yet.
 */
export function TravellersPanel({
  trip,
  invited,
  onInvite,
  onInviteConnection,
  onFocusItem,
  onShowPlan,
  onChangeRole,
  onRemove,
}: TravellersPanelProps) {
  const unInvited = CONNECTIONS.filter((c) => !invited.includes(c.label));
  const [menuFor, setMenuFor] = useState<string | null>(null);

  return (
    <div className={styles.panel}>
      <ul className={styles.people}>
        {trip.travellers.map((traveller) => {
          const viewing = traveller.viewingItemId
            ? trip.items.find((i) => i.id === traveller.viewingItemId)
            : null;
          const canEdit = traveller.role !== "owner";
          const menuOpen = menuFor === traveller.id;

          return (
            <li key={traveller.id} className={styles.person}>
              <Avatar traveller={traveller} size="md" showPresence />
              <div className={styles.personBody}>
                <div className={styles.personTop}>
                  <span className={styles.personName}>{traveller.name}</span>
                  {canEdit ? (
                    <Select
                      size="chip"
                      label={`Role for ${traveller.name}`}
                      value={traveller.role}
                      onChange={(role) => onChangeRole(traveller.id, role)}
                      options={EDITABLE_ROLES.map((role) => ({
                        value: role,
                        label: ROLE_LABELS[role],
                      }))}
                    />
                  ) : (
                    <Tag tone="neutral">{ROLE_LABELS[traveller.role]}</Tag>
                  )}
                </div>
                {traveller.online && viewing ? (
                  <button
                    type="button"
                    className={styles.personViewing}
                    onClick={() => onFocusItem(viewing.id)}
                  >
                    Looking at {viewing.title}
                  </button>
                ) : (
                  <span className={styles.personRole}>
                    {traveller.online ? "Online now" : ROLE_NOTES[traveller.role]}
                  </span>
                )}
              </div>

              <div className={styles.personActions}>
                <IconButton
                  label={`Show ${traveller.name.split(" ")[0]}'s plan`}
                  size="xs"
                  variant="ghost"
                  onClick={() => onShowPlan(traveller.id)}
                >
                  <CalendarDays size={13} strokeWidth={2.1} />
                </IconButton>
                {canEdit ? (
                  <div className={styles.moreWrap}>
                    <IconButton
                      label={`More actions for ${traveller.name}`}
                      size="xs"
                      variant="ghost"
                      onClick={() =>
                        setMenuFor(menuOpen ? null : traveller.id)
                      }
                    >
                      <MoreHorizontal size={14} strokeWidth={2} />
                    </IconButton>
                    {menuOpen ? (
                      <div className={styles.moreMenu} role="menu">
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            onShowPlan(traveller.id);
                            setMenuFor(null);
                          }}
                        >
                          <CalendarDays size={12} strokeWidth={2.1} />
                          Show their plan
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          className={styles.moreDanger}
                          onClick={() => {
                            onRemove(traveller.id);
                            setMenuFor(null);
                          }}
                        >
                          <UserMinus size={12} strokeWidth={2.1} />
                          Remove from trip
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}

        {invited.map((label) => (
          <li key={label} className={cn(styles.person, styles.personPending)}>
            <span className={styles.pendingAvatar} aria-hidden>
              <Mail size={13} strokeWidth={2} />
            </span>
            <div className={styles.personBody}>
              <div className={styles.personTop}>
                <span className={styles.personName}>{label}</span>
                <Tag tone="warning">Invited</Tag>
              </div>
              <span className={styles.personRole}>
                Waiting on them to accept
              </span>
            </div>
          </li>
        ))}
      </ul>

      {unInvited.length > 0 ? (
        <div className={styles.connections}>
          <p className={styles.connectionsLabel}>You&rsquo;ve travelled with</p>
          <ul className={styles.connectionsList}>
            {unInvited.map((connection) => (
              <li key={connection.label}>
                <button
                  type="button"
                  className={styles.connection}
                  onClick={() => onInviteConnection(connection.label)}
                >
                  <span
                    className={styles.connectionAvatar}
                    style={{
                      ["--who" as string]: `var(--who-${connection.colorIndex % 6})`,
                    }}
                    aria-hidden
                  >
                    {connection.initials}
                  </span>
                  <span className={styles.connectionBody}>
                    <span className={styles.connectionName}>
                      {connection.label}
                    </span>
                    <span className={styles.connectionNote}>
                      {connection.note}
                    </span>
                  </span>
                  <span className={styles.connectionAdd} aria-hidden>
                    <Plus size={12} strokeWidth={2.6} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <footer className={styles.panelFoot}>
        <Button
          variant="secondary"
          size="sm"
          block
          iconLeft={<UserPlus size={13} strokeWidth={2.1} />}
          onClick={onInvite}
        >
          Invite by email
        </Button>
      </footer>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Invite                                                                    */
/* -------------------------------------------------------------------------- */

export interface InviteModalProps {
  open: boolean;
  onClose: () => void;
  onSend: (email: string) => void;
}

export function InviteModal({ open, onClose, onSend }: InviteModalProps) {
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);

  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const showError = touched && email.length > 0 && !valid;

  function submit() {
    if (!valid) {
      setTouched(true);
      return;
    }
    onSend(email.trim());
    setEmail("");
    setTouched(false);
  }

  return (
    <Modal open={open} onClose={onClose} label="Invite someone" width={430}>
      <div className={styles.invite}>
        <header className={styles.inviteHead}>
          <span className={styles.inviteIcon} aria-hidden>
            <UserPlus size={16} strokeWidth={1.9} />
          </span>
          <h3 className={styles.inviteTitle}>Invite someone to plan</h3>
          <p className={styles.inviteBody}>
            They&rsquo;ll be able to add stops, move things around and vote on
            ideas. You can change that later.
          </p>
        </header>

        <Field
          label="Email address"
          error={showError ? "That doesn't look like an email address" : undefined}
          hint={!showError ? "They'll get a link to this trip." : undefined}
        >
          {({ id, invalid }) => (
            <Input
              id={id}
              type="email"
              invalid={invalid}
              value={email}
              placeholder="name@example.com"
              onChange={(event) => setEmail(event.target.value)}
              onBlur={() => setTouched(true)}
              onKeyDown={(event) => {
                if (event.key === "Enter") submit();
              }}
            />
          )}
        </Field>

        <div className={styles.inviteActions}>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={!valid}>
            Send invitation
          </Button>
        </div>
      </div>
    </Modal>
  );
}
