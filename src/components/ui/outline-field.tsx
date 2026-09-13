"use client";

import { useId, type InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

import styles from "./outline-field.module.css";

export interface OutlineFieldProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "value" | "onChange" | "prefix"
  > {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  prefix?: string;
}

/**
 * Outlined text field with a floating label.
 *
 * Empty and idle: the label sits in the value slot as the placeholder.
 * Focus or a value: it slides up and the field is active.
 */
export function OutlineField({
  label,
  value,
  onChange,
  readOnly = false,
  type = "text",
  prefix,
  className,
  id,
  ...inputProps
}: OutlineFieldProps) {
  const uid = useId();
  const inputId = id ?? uid;
  const float = Boolean(value) || type === "date" || readOnly;

  return (
    <label
      className={cn(
        styles.field,
        float && styles.float,
        readOnly && styles.readOnly,
        prefix && styles.hasPrefix,
        className,
      )}
      htmlFor={inputId}
    >
      <span className={styles.label}>{label}</span>
      <span className={styles.control}>
        {prefix ? (
          <span className={styles.prefix} aria-hidden>
            {prefix}
          </span>
        ) : null}
        <input
          {...inputProps}
          id={inputId}
          type={type}
          value={value}
          readOnly={readOnly}
          placeholder=" "
          onChange={(event) => onChange?.(event.target.value)}
        />
      </span>
    </label>
  );
}
