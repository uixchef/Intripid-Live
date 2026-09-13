"use client";

import { ArrowLeft } from "lucide-react";

import { cn } from "@/lib/utils";

import styles from "./mobile-back.module.css";

export function MobileBack({
  from,
  onClick,
  className,
}: {
  /** Screen this control returns to. Used for the accessible name only. */
  from?: string;
  onClick: () => void;
  className?: string;
}) {
  const aria = from ? (/^back\b/i.test(from) ? from : `Back to ${from}`) : "Back";

  return (
    <button
      type="button"
      className={cn(styles.back, className)}
      aria-label={aria}
      title={aria}
      onClick={onClick}
    >
      <ArrowLeft size={15} strokeWidth={2} aria-hidden />
    </button>
  );
}
