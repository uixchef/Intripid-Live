"use client";

import { UserPlus } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/chip";
import { Select } from "@/components/ui/select";
import {
  ASSIGNABLE_ROLES,
  ROLE_LABELS,
  ROLE_NOTES,
  canManageRoles,
} from "@/lib/collaboration";
import { cn } from "@/lib/utils";
import type { Traveller } from "@/lib/types";

import styles from "./roles-panel.module.css";

export function RolesPanel({
  people,
  meId,
  youColor,
  heading = true,
  onChangeRole,
  onInvite,
}: {
  people: Traveller[];
  meId: string | null;
  youColor?: string;
  heading?: boolean;
  onChangeRole: (travellerId: string, role: Traveller["role"]) => void;
  onInvite?: () => void;
}) {
  const me = people.find((person) => person.id === meId) ?? null;
  const manager = me ? canManageRoles(me.role) : false;
  const ordered = me
    ? [me, ...people.filter((person) => person.id !== me.id)]
    : people;

  return (
    <div className={cn(styles.panel, onInvite && styles.panelRail)}>
      {heading ? <h2 className={styles.title}>Roles</h2> : null}
      <ul className={styles.list}>
        {ordered.map((person) => {
          const isYou = person.id === meId;
          const canEdit = manager && person.role !== "owner" && !isYou;
          return (
            <li key={person.id} className={styles.row}>
              <Avatar
                traveller={person}
                size="md"
                color={isYou ? youColor : undefined}
                showPresence
                hideName
              />
              <div className={styles.copy}>
                <p className={styles.name}>
                  {isYou ? "You" : person.name.split(" ")[0]}
                </p>
                {canEdit ? null : (
                  <p className={styles.note}>{ROLE_NOTES[person.role]}</p>
                )}
              </div>
              {canEdit ? (
                <Select
                  size="chip"
                  label={`Role for ${person.name}`}
                  value={person.role}
                  onChange={(role) => onChangeRole(person.id, role)}
                  options={ASSIGNABLE_ROLES.map((role) => ({
                    value: role,
                    label: ROLE_LABELS[role],
                  }))}
                />
              ) : (
                <Tag tone="neutral">{ROLE_LABELS[person.role]}</Tag>
              )}
            </li>
          );
        })}
      </ul>
      {onInvite ? (
        <footer className={styles.foot}>
          <Button
            variant="secondary"
            size="sm"
            block
            iconLeft={<UserPlus size={13} strokeWidth={2.1} />}
            onClick={onInvite}
          >
            Invite someone
          </Button>
        </footer>
      ) : null}
    </div>
  );
}
