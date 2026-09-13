"use client";

import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";

import { cn } from "@/lib/utils";

import styles from "./controls.module.css";

/* -------------------------------------------------------------------------- */
/* Segmented control                                                         */
/* -------------------------------------------------------------------------- */

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
  /** Optional count, shown as a badge on the segment. */
  count?: number;
}

export interface SegmentedProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "md";
  /** Accessible group name. */
  label: string;
  className?: string;
}

/**
 * A mutually exclusive switch. Same language as the planner content
 * switcher: outlined pill, selected fill, hairline dividers.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = "md",
  label,
  className,
}: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(styles.segmented, styles[`seg_${size}`], className)}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          className={cn(
            styles.segment,
            option.value === value && styles.segmentActive,
          )}
          onClick={() => onChange(option.value)}
        >
          {option.icon ? (
            <span className={styles.segIcon} aria-hidden>
              {option.icon}
            </span>
          ) : null}
          {option.label}
          {option.count != null ? (
            <span className={cn(styles.segCount, "tabular")}>
              {option.count}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Field wrapper                                                             */
/* -------------------------------------------------------------------------- */

export interface FieldProps {
  label: string;
  /** Supporting text below the control. */
  hint?: string;
  /** Error replaces the hint and marks the control. */
  error?: string;
  /** Hide the visual label but keep it for assistive tech. */
  hideLabel?: boolean;
  children: (props: { id: string; invalid: boolean }) => ReactNode;
  className?: string;
}

export function Field({
  label,
  hint,
  error,
  hideLabel = false,
  children,
  className,
}: FieldProps) {
  const id = useId();
  const invalid = Boolean(error);

  return (
    <div className={cn(styles.field, className)}>
      <label
        htmlFor={id}
        className={cn(styles.fieldLabel, hideLabel && "srOnly")}
      >
        {label}
      </label>
      {children({ id, invalid })}
      {error ? (
        <p className={styles.fieldError} role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className={styles.fieldHint}>{hint}</p>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Text input                                                                */
/* -------------------------------------------------------------------------- */

/** `size` is omitted: ours is a visual scale, the native one is a character count. */
export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  invalid?: boolean;
  iconLeft?: ReactNode;
  /** Rendered inside the field on the right, e.g. a clear button. */
  slotRight?: ReactNode;
  size?: "sm" | "md";
  /** In-field caption, same outlined treatment as Select. */
  fieldLabel?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    invalid,
    iconLeft,
    slotRight,
    size = "md",
    fieldLabel,
    className,
    id,
    disabled,
    ...rest
  },
  ref,
) {
  const uid = useId();
  const inputId = id ?? uid;
  const outlined = Boolean(fieldLabel);

  return (
    <div
      className={cn(
        styles.inputWrap,
        outlined ? styles.inputOutlined : styles[`input_${size}`],
        invalid && styles.inputInvalid,
        disabled && styles.inputDisabled,
        className,
      )}
    >
      {fieldLabel ? (
        <label htmlFor={inputId} className={styles.inputFieldLabel}>
          {fieldLabel}
        </label>
      ) : null}
      {iconLeft ? (
        <span className={styles.inputIcon} aria-hidden>
          {iconLeft}
        </span>
      ) : null}
      <input
        ref={ref}
        id={inputId}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        className={styles.input}
        {...rest}
        placeholder={outlined ? " " : rest.placeholder}
      />
      {slotRight ? <span className={styles.inputSlot}>{slotRight}</span> : null}
    </div>
  );
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
>(function Textarea({ invalid, className, ...rest }, ref) {
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        styles.textarea,
        invalid && styles.inputInvalid,
        className,
      )}
      {...rest}
    />
  );
});

/* -------------------------------------------------------------------------- */
/* Option grid — the widget-driven answer to a radio list                    */
/* -------------------------------------------------------------------------- */

export interface OptionCardProps {
  selected: boolean;
  onSelect: () => void;
  title: string;
  blurb?: string;
  glyph?: ReactNode;
  /** A small trailing metric, e.g. "$120/day". */
  meta?: string;
  className?: string;
}

/**
 * A choice with room to explain itself. Discovery uses these instead of radio
 * buttons because the options carry meaning ("Backpack — keep costs to a
 * minimum") that a radio label cannot hold.
 */
export function OptionCard({
  selected,
  onSelect,
  title,
  blurb,
  glyph,
  meta,
  className,
}: OptionCardProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(styles.option, selected && styles.optionSelected, className)}
    >
      {glyph ? (
        <span className={styles.optionGlyph} aria-hidden>
          {glyph}
        </span>
      ) : null}
      <span className={styles.optionBody}>
        <span className={styles.optionTitleRow}>
          <span className={styles.optionTitle}>{title}</span>
          {meta ? (
            <span className={cn(styles.optionMeta, "tabular")}>{meta}</span>
          ) : null}
        </span>
        {blurb ? <span className={styles.optionBlurb}>{blurb}</span> : null}
      </span>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Stepper                                                                   */
/* -------------------------------------------------------------------------- */

export interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Formats the displayed value. */
  format?: (value: number) => string;
  label: string;
  /** In-field caption — matches outlined Select height. */
  fieldLabel?: string;
  className?: string;
}

export function Stepper({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  format,
  label,
  fieldLabel,
  className,
}: StepperProps) {
  const outlined = Boolean(fieldLabel);

  const controls = (
    <>
      <button
        type="button"
        className={styles.stepperButton}
        onClick={() => onChange(Math.max(min, value - step))}
        disabled={value <= min}
        aria-label={`Decrease ${label}`}
      >
        −
      </button>
      <span className={cn(styles.stepperValue, "tabular")}>
        {format ? format(value) : value}
      </span>
      <button
        type="button"
        className={styles.stepperButton}
        onClick={() => onChange(Math.min(max, value + step))}
        disabled={value >= max}
        aria-label={`Increase ${label}`}
      >
        +
      </button>
    </>
  );

  return (
    <div
      className={cn(
        outlined ? styles.stepperField : styles.stepper,
        className,
      )}
      role="group"
      aria-label={label}
    >
      {outlined ? (
        <span className={styles.stepperFieldLabel}>{fieldLabel}</span>
      ) : null}
      {outlined ? (
        <div className={styles.stepperFieldRow}>{controls}</div>
      ) : (
        controls
      )}
    </div>
  );
}
