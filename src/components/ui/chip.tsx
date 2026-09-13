"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

import styles from "./chip.module.css";

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  icon?: ReactNode;
  /** Show a check when selected. Only on the filled `solid` variant. */
  checkable?: boolean;
  size?: "sm" | "md";
  /**
   * `solid` is the filled brand pill.
   * `soft` is the quiet filter: light selected fill, no check.
   */
  variant?: "solid" | "soft";
  /**
   * `single` — radio. Pill shape, one selected.
   * `multiple` — multi-select. Rounded rectangle.
   * Both use the same quiet selected fill when combined with `soft`.
   */
  selection?: "single" | "multiple";
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
  variant = "solid",
  selection,
  className,
  children,
  ...rest
}: ChipProps) {
  const soft = variant === "soft";
  const pill = !soft || selection === "single";

  return (
    <button
      type="button"
      {...rest}
      role={selection === "single" ? "radio" : rest.role}
      aria-checked={selection === "single" ? selected : undefined}
      aria-pressed={selection === "single" ? undefined : selected}
      className={cn(
        styles.chip,
        soft ? styles.soft : styles[size],
        soft && size === "sm" && styles.sm,
        pill && styles.rounded,
        selected && styles.selected,
        className,
      )}
    >
      {!soft && checkable ? (
        <span className={styles.check} aria-hidden>
          <Check size={12} strokeWidth={3} />
        </span>
      ) : !soft && icon ? (
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
  onClick?: () => void;
  "aria-label"?: string;
}

/** Metadata chip. Pass `onClick` when it should jump somewhere. */
export function Tag({
  tone = "neutral",
  size = "sm",
  icon,
  className,
  children,
  onClick,
  "aria-label": ariaLabel,
}: TagProps) {
  const classes = cn(styles.tag, styles[`tone_${tone}`], styles[`tag_${size}`], className);
  const inner = (
    <>
      {icon ? (
        <span className={styles.icon} aria-hidden>
          {icon}
        </span>
      ) : null}
      {children}
    </>
  );

  if (onClick) {
    return (
      <button type="button" className={classes} onClick={onClick} aria-label={ariaLabel}>
        {inner}
      </button>
    );
  }

  return <span className={classes}>{inner}</span>;
}
