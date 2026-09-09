"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

import styles from "./chip.module.css";

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  icon?: ReactNode;
  /** Show a check when selected. Good for multi-select sets. */
  checkable?: boolean;
  size?: "sm" | "md";
  children: ReactNode;
}

/**
 * A selectable token. Used for interests, trip styles and filters — anywhere
 * a set of choices should read as a spread of options to graze rather than a
 * list to work through.
 */
export function Chip({
  selected = false,
  icon,
  checkable = false,
  size = "md",
  className,
  children,
  ...rest
}: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(styles.chip, styles[size], selected && styles.selected, className)}
      {...rest}
    >
      {checkable ? (
        <span className={styles.check} aria-hidden>
          <Check size={12} strokeWidth={3} />
        </span>
      ) : icon ? (
        <span className={styles.icon} aria-hidden>
          {icon}
        </span>
      ) : null}
      <span className={styles.label}>{children}</span>
    </button>
  );
}

export interface TagProps {
  tone?: "neutral" | "brand" | "accent" | "energy" | "success" | "warning" | "danger";
  size?: "sm" | "md";
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** A non-interactive label. Metadata, never a control. */
export function Tag({
  tone = "neutral",
  size = "sm",
  icon,
  className,
  children,
}: TagProps) {
  return (
    <span className={cn(styles.tag, styles[`tone_${tone}`], styles[`tag_${size}`], className)}>
      {icon ? (
        <span className={styles.icon} aria-hidden>
          {icon}
        </span>
      ) : null}
      {children}
    </span>
  );
}
