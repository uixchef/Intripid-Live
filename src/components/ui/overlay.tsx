"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";

import styles from "./overlay.module.css";

/* -------------------------------------------------------------------------- */
/* Shared behaviour                                                          */
/* -------------------------------------------------------------------------- */

/** Escape-to-close plus a focus trap entry point. */
function useDismiss(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [open, onClose]);
}

/** Portals only after mount, so SSR markup and hydration agree. */
function usePortalTarget(): HTMLElement | null {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  useEffect(() => setTarget(document.body), []);
  return target;
}

/* -------------------------------------------------------------------------- */
/* Popover                                                                   */
/* -------------------------------------------------------------------------- */

export type PopoverPlacement = "bottom" | "top" | "right" | "left";

export interface PopoverProps {
  open: boolean;
  onClose: () => void;
  /** The element to position against. */
  anchor: HTMLElement | null;
  placement?: PopoverPlacement;
  /** Distance from the anchor, px. */
  offset?: number;
  align?: "start" | "center" | "end";
  width?: number;
  children: ReactNode;
  className?: string;
  label?: string;
}

/**
 * An anchored surface that keeps the traveller in context.
 *
 * Used for quick edits and details in the planner: leaving the itinerary to
 * change a start time would break the one product principle that matters most
 * here — editing should never cost you your place.
 */
export function Popover({
  open,
  onClose,
  anchor,
  placement = "bottom",
  offset = 8,
  align = "start",
  width,
  children,
  className,
  label,
}: PopoverProps) {
  const target = usePortalTarget();
  const cardRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const reduceMotion = useReducedMotion();

  useDismiss(open, onClose);

  const reposition = useCallback(() => {
    const card = cardRef.current;
    if (!anchor || !card) return;

    const a = anchor.getBoundingClientRect();
    const c = card.getBoundingClientRect();
    const margin = 10;

    let top: number;
    let left: number;

    if (placement === "bottom" || placement === "top") {
      top = placement === "bottom" ? a.bottom + offset : a.top - c.height - offset;
      left =
        align === "center"
          ? a.left + a.width / 2 - c.width / 2
          : align === "end"
            ? a.right - c.width
            : a.left;
    } else {
      left = placement === "right" ? a.right + offset : a.left - c.width - offset;
      top =
        align === "center"
          ? a.top + a.height / 2 - c.height / 2
          : align === "end"
            ? a.bottom - c.height
            : a.top;
    }

    // Flip and clamp so the surface never leaves the viewport.
    if (placement === "bottom" && top + c.height > window.innerHeight - margin) {
      const flipped = a.top - c.height - offset;
      if (flipped > margin) top = flipped;
    }
    if (placement === "top" && top < margin) {
      const flipped = a.bottom + offset;
      if (flipped + c.height < window.innerHeight - margin) top = flipped;
    }
    if (placement === "right" && left + c.width > window.innerWidth - margin) {
      const flipped = a.left - c.width - offset;
      if (flipped > margin) left = flipped;
    }
    if (placement === "left" && left < margin) {
      const flipped = a.right + offset;
      if (flipped + c.width < window.innerWidth - margin) left = flipped;
    }

    left = Math.max(margin, Math.min(left, window.innerWidth - c.width - margin));
    top = Math.max(margin, Math.min(top, window.innerHeight - c.height - margin));

    setPosition({ top, left });
  }, [anchor, placement, offset, align]);

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
    reposition();
  }, [open, reposition]);

  useEffect(() => {
    if (!open) return;
    const handle = () => reposition();
    window.addEventListener("resize", handle);
    window.addEventListener("scroll", handle, true);
    return () => {
      window.removeEventListener("resize", handle);
      window.removeEventListener("scroll", handle, true);
    };
  }, [open, reposition]);

  // Outside click closes, but clicks inside — and on the anchor — do not.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const node = event.target as Node;
      if (cardRef.current?.contains(node)) return;
      if (anchor?.contains(node)) return;
      onClose();
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [open, anchor, onClose]);

  if (!target) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          ref={cardRef}
          role="dialog"
          aria-modal={false}
          aria-label={label}
          className={cn(styles.popover, className)}
          style={{
            top: position?.top ?? -9999,
            left: position?.left ?? -9999,
            width,
            // Hidden until measured, so it never flashes in the wrong place.
            visibility: position ? "visible" : "hidden",
          }}
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: -3 }}
          transition={{ duration: reduceMotion ? 0.12 : 0.17, ease: [0.2, 0.8, 0.2, 1] }}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>,
    target,
  );
}

/* -------------------------------------------------------------------------- */
/* Sheet — mobile bottom surface                                             */
/* -------------------------------------------------------------------------- */

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Fraction of viewport height, 0..1. */
  height?: number;
  label: string;
  /** Show the grab handle and allow drag-to-dismiss. */
  draggable?: boolean;
  className?: string;
}

/**
 * The mobile detail surface. Bottom sheets keep the map or itinerary visible
 * behind them, which preserves the sense of place that a full-screen push
 * navigation destroys.
 */
export function Sheet({
  open,
  onClose,
  children,
  height = 0.62,
  label,
  draggable = true,
  className,
}: SheetProps) {
  const target = usePortalTarget();
  const reduceMotion = useReducedMotion();
  useDismiss(open, onClose);

  // Lock background scroll while a sheet is up.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!target) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            className={styles.scrim}
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={label}
            className={cn(styles.sheet, className)}
            style={{ maxHeight: `${Math.round(height * 100)}dvh` }}
            initial={reduceMotion ? { opacity: 0 } : { y: "100%" }}
            animate={reduceMotion ? { opacity: 1 } : { y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { y: "100%" }}
            transition={
              reduceMotion
                ? { duration: 0.12 }
                : { type: "spring", stiffness: 420, damping: 38, mass: 0.9 }
            }
            drag={draggable && !reduceMotion ? "y" : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 620) onClose();
            }}
          >
            {draggable ? (
              <div className={styles.grabber} aria-hidden>
                <span />
              </div>
            ) : null}
            <div className={styles.sheetBody}>{children}</div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    target,
  );
}

/* -------------------------------------------------------------------------- */
/* Modal                                                                     */
/* -------------------------------------------------------------------------- */

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  label: string;
  width?: number;
  className?: string;
}

export function Modal({
  open,
  onClose,
  children,
  label,
  width = 460,
  className,
}: ModalProps) {
  const target = usePortalTarget();
  const reduceMotion = useReducedMotion();
  useDismiss(open, onClose);

  if (!target) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className={styles.modalRoot}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <div className={styles.scrimStatic} onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={label}
            className={cn(styles.modal, className)}
            style={{ width }}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 6 }}
            transition={{ duration: reduceMotion ? 0.12 : 0.22, ease: [0.2, 0.8, 0.2, 1] }}
          >
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    target,
  );
}

/* -------------------------------------------------------------------------- */
/* Toast                                                                     */
/* -------------------------------------------------------------------------- */

export interface ToastProps {
  message: string | null;
  tone?: "info" | "success" | "warning";
  onDismiss: () => void;
  /** Auto-dismiss delay, ms. */
  duration?: number;
  /** Changes whenever a new toast is raised, so repeats re-trigger. */
  toastKey?: number;
}

/** Transient confirmation. Announces to assistive tech, then gets out of the way. */
export function Toast({
  message,
  tone = "info",
  onDismiss,
  duration = 2600,
  toastKey,
}: ToastProps) {
  const target = usePortalTarget();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(onDismiss, duration);
    return () => window.clearTimeout(timer);
  }, [message, toastKey, duration, onDismiss]);

  if (!target) return null;

  return createPortal(
    <div className={styles.toastRegion} role="status" aria-live="polite">
      <AnimatePresence mode="wait">
        {message ? (
          <motion.div
            key={toastKey ?? message}
            className={cn(styles.toast, styles[`toast_${tone}`])}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: reduceMotion ? 0.12 : 0.24, ease: [0.2, 0.8, 0.2, 1] }}
          >
            {message}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>,
    target,
  );
}
