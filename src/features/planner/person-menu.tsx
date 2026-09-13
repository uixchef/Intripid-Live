"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  Briefcase,
  Check,
  ChevronRight,
  Eye,
  LogOut,
  PencilLine,
  Trash2,
  UserRoundCog,
  Users,
} from "lucide-react";

import { Popover } from "@/components/ui/overlay";
import {
  ASSIGNABLE_ROLES,
  ROLE_LABELS,
  canManageRoles,
} from "@/lib/collaboration";
import { cn } from "@/lib/utils";
import type { Traveller } from "@/lib/types";

import styles from "./person-menu.module.css";

const ROLE_ICONS: Record<Traveller["role"], typeof Users> = {
  owner: UserRoundCog,
  "co-owner": UserRoundCog,
  editor: PencilLine,
  advisor: Briefcase,
  viewer: Eye,
};

function MenuItem({
  icon,
  label,
  selected = false,
  danger = false,
  trailing,
  onClick,
  role = "menuitem",
}: {
  icon: ReactNode;
  label: string;
  selected?: boolean;
  danger?: boolean;
  trailing?: ReactNode;
  onClick?: () => void;
  role?: "menuitem" | "menuitemradio";
}) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={role === "menuitemradio" ? selected : undefined}
      className={cn(
        styles.item,
        selected && styles.itemSelected,
        danger && styles.danger,
      )}
      onClick={onClick}
    >
      <span className={styles.icon} aria-hidden>
        {icon}
      </span>
      <span className={styles.itemLabel}>{label}</span>
      {selected ? (
        <span className={styles.check} aria-hidden>
          <Check size={16} strokeWidth={2.4} />
        </span>
      ) : (
        trailing
      )}
    </button>
  );
}

export function PersonMenu({
  person,
  me,
  open,
  anchor,
  sharedView,
  onCalendar,
  manager: managerProp,
  onClose,
  onSharedView,
  onMyCalendar,
  onChangeRole,
  onRemove,
}: {
  person: Traveller;
  me: Traveller | null;
  open: boolean;
  anchor: HTMLElement | null;
  sharedView: boolean;
  /** This person is currently overlaid on the grid. */
  onCalendar: boolean;
  /** Signed-in person can change roles — not the same as being on the trip. */
  manager?: boolean;
  onClose: () => void;
  onSharedView: () => void;
  onMyCalendar: () => void;
  onChangeRole: (role: Traveller["role"]) => void;
  onRemove: () => void;
}) {
  const [rolesOpen, setRolesOpen] = useState(false);
  const isMe = me?.id === person.id;
  const manager = managerProp ?? (me ? canManageRoles(me.role) : false);
  const selfLead = isMe && canManageRoles(person.role);
  const RoleIcon = ROLE_ICONS[person.role];

  useEffect(() => {
    if (!open) setRolesOpen(false);
  }, [open]);

  function close() {
    setRolesOpen(false);
    onClose();
  }

  return (
    <Popover
      open={open}
      onClose={close}
      anchor={anchor}
      placement="left"
      align="start"
      offset={10}
      width={rolesOpen ? 240 : 220}
      label={`${person.name} menu`}
      className={styles.popover}
    >
      {rolesOpen && manager && !isMe ? (
        <div className={styles.menu} role="menu">
          {ASSIGNABLE_ROLES.map((role) => {
            const Icon = ROLE_ICONS[role];
            return (
              <MenuItem
                key={role}
                role="menuitemradio"
                icon={<Icon size={18} strokeWidth={1.8} />}
                label={ROLE_LABELS[role]}
                selected={person.role === role}
                onClick={() => {
                  onChangeRole(role);
                  close();
                }}
              />
            );
          })}
          <MenuItem
            danger
            icon={<Trash2 size={18} strokeWidth={1.8} />}
            label="Remove"
            onClick={() => {
              onRemove();
              close();
            }}
          />
        </div>
      ) : isMe ? (
        <div className={styles.menu} role="menu">
          <MenuItem
            role="menuitemradio"
            icon={<Users size={18} strokeWidth={1.8} />}
            label="My calendar"
            selected={!sharedView}
            onClick={() => {
              onMyCalendar();
              close();
            }}
          />
          <MenuItem
            icon={<Users size={18} strokeWidth={1.8} />}
            label="Shared view"
            selected={sharedView}
            role="menuitemradio"
            onClick={() => {
              onSharedView();
              close();
            }}
          />
          {selfLead ? null : (
            <MenuItem
              danger
              icon={<LogOut size={18} strokeWidth={1.8} />}
              label="Leave"
              onClick={() => {
                onRemove();
                close();
              }}
            />
          )}
        </div>
      ) : (
        <div className={styles.menu} role="menu">
          {manager ? (
            <MenuItem
              icon={<RoleIcon size={18} strokeWidth={1.8} />}
              label={ROLE_LABELS[person.role]}
              trailing={
                <ChevronRight size={16} strokeWidth={2} className={styles.chevron} />
              }
              onClick={() => setRolesOpen(true)}
            />
          ) : (
            <div className={styles.itemStatic}>
              <span className={styles.icon} aria-hidden>
                <RoleIcon size={18} strokeWidth={1.8} />
              </span>
              <span className={styles.itemLabel}>{ROLE_LABELS[person.role]}</span>
            </div>
          )}
          <MenuItem
            icon={<Users size={18} strokeWidth={1.8} />}
            label="Shared view"
            role="menuitemradio"
            selected={sharedView && onCalendar}
            onClick={() => onSharedView()}
          />
        </div>
      )}
    </Popover>
  );
}
