"use client";

import { useId, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

import { Popover } from "@/components/ui/overlay";
import { cn } from "@/lib/utils";

import styles from "./select.module.css";

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  /** Shown in the menu only — GCal uses this for “11:30am (1 hr)”. */
  hint?: string;
}

export interface SelectProps<T extends string = string> {
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  /** Accessible name. */
  label: string;
  /** In-field caption, Untitled-style. */
  fieldLabel?: string;
  /** Caption above a compact trigger. */
  caption?: string;
  size?: "md" | "sm" | "chip";
  id?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Custom listbox. Native `<select>` is never used — Safari/system menus
 * break the product surface. Trigger + popover match Untitled UI; the
 * option row matches the planner view menu.
 */
export function Select<T extends string>({
  value,
  onChange,
  options,
  label,
  fieldLabel,
  caption,
  size = "md",
  id,
  disabled = false,
  className,
}: SelectProps<T>) {
  const uid = useId();
  const triggerId = id ?? uid;
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const selected = options.find((option) => option.value === value);
  const menuWidth = Math.max(
    anchor?.getBoundingClientRect().width ?? 0,
    size === "chip" ? 160 : 0,
    options.some((option) => option.hint) ? 220 : 0,
  );

  function pick(next: T) {
    onChange(next);
    setOpen(false);
  }

  return (
    <div className={cn(styles.wrap, size === "chip" && styles.wrapChip, className)}>
      {caption ? (
        <span className={styles.caption} id={`${triggerId}-caption`}>
          {caption}
        </span>
      ) : null}
      <button
        ref={setAnchor}
        id={triggerId}
        type="button"
        disabled={disabled}
        className={cn(
          styles.trigger,
          styles[`size_${size}`],
          fieldLabel && styles.triggerOutlined,
          open && styles.triggerOpen,
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={
          caption ? `${triggerId}-caption` : undefined
        }
        aria-label={caption ? undefined : label}
        onClick={() => {
          if (disabled) return;
          setOpen((next) => !next);
        }}
      >
        {fieldLabel ? (
          <span className={styles.fieldLabel}>{fieldLabel}</span>
        ) : null}
        <span className={styles.value}>{selected?.label ?? "Select"}</span>
        <ChevronDown
          className={styles.chevron}
          size={size === "chip" ? 12 : 16}
          strokeWidth={2}
          aria-hidden
        />
      </button>

      <Popover
        open={open}
        onClose={() => setOpen(false)}
        anchor={anchor}
        placement="bottom"
        align="start"
        offset={4}
        width={menuWidth || undefined}
        label={label}
        className={styles.menu}
      >
        <div className={styles.list} role="listbox" aria-label={label}>
          {options.map((option) => {
            const on = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={on}
                className={cn(styles.option, on && styles.optionOn)}
                onClick={() => pick(option.value)}
              >
                <span className={styles.optionLabel}>
                  {option.label}
                  {option.hint ? (
                    <span className={styles.optionHint}>{option.hint}</span>
                  ) : null}
                </span>
                <span className={styles.check} aria-hidden>
                  {on ? <Check size={16} strokeWidth={2.4} /> : null}
                </span>
              </button>
            );
          })}
        </div>
      </Popover>
    </div>
  );
}
