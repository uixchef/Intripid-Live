"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

import styles from "./button.module.css";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "subtle"
  | "ghost"
  | "danger"
  | "ai";
export type ButtonSize = "xs" | "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  loading?: boolean;
  /** Fill the available width. */
  block?: boolean;
}

/**
 * The product's button. Every variant carries the full state matrix — rest,
 * hover, active, focus-visible, disabled and loading — because incomplete
 * states are what make an interface feel like a mock.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "secondary",
      size = "md",
      iconLeft,
      iconRight,
      loading = false,
      block = false,
      className,
      children,
      disabled,
      type = "button",
      ...rest
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        data-loading={loading || undefined}
        className={cn(
          styles.button,
          styles[variant],
          styles[size],
          block && styles.block,
          className,
        )}
        {...rest}
      >
        {loading ? (
          <span className={styles.spinner} aria-hidden>
            <Loader2 size={size === "lg" ? 16 : 14} strokeWidth={2.2} />
          </span>
        ) : (
          iconLeft && (
            <span className={styles.icon} aria-hidden>
              {iconLeft}
            </span>
          )
        )}
        {children ? <span className={styles.label}>{children}</span> : null}
        {iconRight && !loading ? (
          <span className={styles.icon} aria-hidden>
            {iconRight}
          </span>
        ) : null}
      </button>
    );
  },
);

export interface IconButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Required: an icon-only control must still be named. */
  label: string;
  children: ReactNode;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    { variant = "ghost", size = "md", label, className, children, ...rest },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        title={label}
        className={cn(
          styles.button,
          styles[variant],
          styles[size],
          styles.iconOnly,
          className,
        )}
        {...rest}
      >
        <span className={styles.icon} aria-hidden>
          {children}
        </span>
      </button>
    );
  },
);
