"use client";

import { useState } from "react";
import { Mail, UserPlus } from "lucide-react";

import { Avatar, AvatarStack } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/controls";
import { Modal, Popover } from "@/components/ui/overlay";
import { Tag } from "@/components/ui/chip";
import { cn } from "@/lib/utils";
import type { Trip, Traveller } from "@/lib/types";

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
 */

const ROLE_LABELS: Record<Traveller["role"], string> = {
  owner: "Organiser",
  editor: "Traveller",
  advisor: "Advisor",
  viewer: "Observer",
};

const ROLE_NOTES: Record<Traveller["role"], string> = {
  owner: "Created the trip, can change anything",
  editor: "Going on the trip, can edit the plan",
  advisor: "Helping plan, not travelling",
  viewer: "Can follow along, cannot edit",
};

export interface PresenceBarProps {
  trip: Trip;
  invited: string[];
  onInvite: () => void;
  onFocusItem: (itemId: string) => void;
}

export function PresenceBar({
  trip,
  invited,
  onInvite,
  onFocusItem,
}: PresenceBarProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);

  const online = trip.travellers.filter((t) => t.online);

  return (
    <>
      <button
        type="button"
        ref={setAnchor}
        className={styles.trigger}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <AvatarStack travellers={trip.travellers} size="sm" max={4} showPresence />
        <span className={styles.triggerMeta}>
          {online.length > 0 ? `${online.length} online` : `${trip.travellers.length} people`}
        </span>
      </button>

      <Popover
        open={open}
        onClose={() => setOpen(false)}
        anchor={anchor}
        placement="bottom"
        align="end"
        width={318}
        label="Travellers"
      >
        <div className={styles.panel}>
          <header className={styles.panelHead}>
            <h4 className={styles.panelTitle}>Who&rsquo;s on this trip</h4>
            <p className={styles.panelSub}>
              {trip.travellers.length} people
              {invited.length > 0 ? ` · ${invited.length} invited` : ""}
            </p>
          </header>

          <ul className={styles.people}>
            {trip.travellers.map((traveller) => {
              const viewing = traveller.viewingItemId
                ? trip.items.find((i) => i.id === traveller.viewingItemId)
                : null;

              return (
                <li key={traveller.id} className={styles.person}>
                  <Avatar traveller={traveller} size="md" showPresence />
                  <div className={styles.personBody}>
                    <div className={styles.personTop}>
                      <span className={styles.personName}>{traveller.name}</span>
                      <Tag tone={traveller.role === "advisor" ? "accent" : "neutral"}>
                        {ROLE_LABELS[traveller.role]}
                      </Tag>
                    </div>
                    {/*
                     * "Looking at X" is the lightest possible presence signal
                     * and the one that actually changes behaviour — it stops
                     * two people editing the same dinner.
                     */}
                    {traveller.online && viewing ? (
                      <button
                        type="button"
                        className={styles.personViewing}
                        onClick={() => {
                          onFocusItem(viewing.id);
                          setOpen(false);
                        }}
                      >
                        Looking at {viewing.title}
                      </button>
                    ) : (
                      <span className={styles.personRole}>
                        {traveller.online
                          ? "Online now"
                          : ROLE_NOTES[traveller.role]}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}

            {invited.map((email) => (
              <li key={email} className={cn(styles.person, styles.personPending)}>
                <span className={styles.pendingAvatar} aria-hidden>
                  <Mail size={13} strokeWidth={2} />
                </span>
                <div className={styles.personBody}>
                  <div className={styles.personTop}>
                    <span className={styles.personName}>{email}</span>
                    <Tag tone="warning">Invited</Tag>
                  </div>
                  <span className={styles.personRole}>
                    Waiting on them to accept
                  </span>
                </div>
              </li>
            ))}
          </ul>

          <footer className={styles.panelFoot}>
            <Button
              variant="secondary"
              size="sm"
              block
              iconLeft={<UserPlus size={13} strokeWidth={2.1} />}
              onClick={() => {
                setOpen(false);
                onInvite();
              }}
            >
              Invite someone
            </Button>
          </footer>
        </div>
      </Popover>
    </>
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
