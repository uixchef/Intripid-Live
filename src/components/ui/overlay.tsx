"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { useIsCompact } from "@/lib/use-media-query";
import { cn } from "@/lib/utils";

import styles from "./overlay.module.css";

/* -------------------------------------------------------------------------- */
/* Shared behaviour                                                          */
/* -------------------------------------------------------------------------- */

/** Topmost overlay wins Escape, so a time menu closes before the editor. */
let dismissLayer = 0;
const dismissStack: number[] = [];

function useDismiss(open: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    const id = (dismissLayer += 1);
    dismissStack.push(id);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (dismissStack[dismissStack.length - 1] !== id) return;
      event.stopPropagation();
      event.preventDefault();
      onCloseRef.current();
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      const index = dismissStack.lastIndexOf(id);
      if (index >= 0) dismissStack.splice(index, 1);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open]);
}

/**
 * The portal target, available only in the browser.
 *
 * `useSyncExternalStore` with a never-firing subscription is the idiomatic way
 * to read a client-only value: it returns null during SSR and document.body on
 * the client without mirroring anything into state, so there is no extra
 * render on mount and nothing to tear.
 */
const NEVER_CHANGES = () => () => {};

function usePortalTarget(): HTMLElement | null {
  return useSyncExternalStore(
    NEVER_CHANGES,
    () => document.body,
    () => null,
  );
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
  /** Clicks on these nodes do not dismiss — used when another event card takes over the same peek. */
  ignoreOutsideClick?: (node: Node) => boolean;
  /**
   * Let the traveller pull the surface off its anchor, the way a calendar
   * event card can be moved to uncover the grid underneath.
   */
  draggable?: boolean;
  /** Identity of the thing being shown. Changing it re-anchors after a drag. */
  dragKey?: string;
  /** Allow a tail or overflow to paint outside the card. */
  overflowVisible?: boolean;
  tone?: "default" | "dark";
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
  overflowVisible = false,
  tone = "default",
  label,
  ignoreOutsideClick,
  draggable = false,
  dragKey,
}: PopoverProps) {
  const target = usePortalTarget();
  const cardRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const pinnedRef = useRef(false);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    origTop: number;
    origLeft: number;
    moved: boolean;
  } | null>(null);
  const reduceMotion = useReducedMotion();

  useDismiss(open, onClose);

  const clampToViewport = useCallback((top: number, left: number) => {
    const card = cardRef.current;
    const margin = 10;
    const width = card?.offsetWidth ?? 360;
    const height = card?.offsetHeight ?? 200;
    return {
      top: Math.max(margin, Math.min(top, window.innerHeight - height - margin)),
      left: Math.max(margin, Math.min(left, window.innerWidth - width - margin)),
    };
  }, []);

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

    const clamped = clampToViewport(top, left);
    left = clamped.left;
    top = clamped.top;

    setPosition((prev) =>
      prev && prev.top === top && prev.left === left ? prev : { top, left },
    );
  }, [anchor, placement, offset, align, clampToViewport]);

  /*
   * Measure-then-position. The popover's own size is only knowable after it
   * renders, so this is the one place where writing state from a layout effect
   * is correct — the alternative is a visible frame at the wrong coordinates.
   */
  useLayoutEffect(() => {
    pinnedRef.current = false;
    setDragging(false);
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPosition(null);
    }
  }, [open, dragKey]);

  useLayoutEffect(() => {
    if (!open) return;
    if (pinnedRef.current) return;
    reposition();
  }, [open, dragKey, reposition]);

  useEffect(() => {
    if (!open) return;
    const handle = () => {
      if (pinnedRef.current) {
        setPosition((prev) => {
          if (!prev) return prev;
          const next = clampToViewport(prev.top, prev.left);
          return next.top === prev.top && next.left === prev.left ? prev : next;
        });
        return;
      }
      reposition();
    };
    window.addEventListener("resize", handle);
    window.addEventListener("scroll", handle, true);
    return () => {
      window.removeEventListener("resize", handle);
      window.removeEventListener("scroll", handle, true);
    };
  }, [open, reposition, clampToViewport]);

  useEffect(() => {
    if (!open) return;
    const card = cardRef.current;
    if (!card || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      if (pinnedRef.current) {
        setPosition((prev) => {
          if (!prev) return prev;
          const next = clampToViewport(prev.top, prev.left);
          return next.top === prev.top && next.left === prev.left ? prev : next;
        });
        return;
      }
      reposition();
    });
    observer.observe(card);
    return () => observer.disconnect();
  }, [open, reposition, clampToViewport]);

  // Outside click closes, but clicks inside — and on the anchor — do not.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const node = event.target as Node;
      if (cardRef.current?.contains(node)) return;
      if (anchor?.contains(node)) return;
      if (ignoreOutsideClick?.(node)) return;
      onClose();
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [open, anchor, onClose, ignoreOutsideClick]);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!draggable || event.button !== 0 || !position) return;
    const node = event.target as HTMLElement;
    if (node.closest("button, a, input, textarea, label, [data-no-drag]")) return;

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origTop: position.top,
      origLeft: position.left,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || event.pointerId !== drag.pointerId) return;

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < 4) return;

    drag.moved = true;
    pinnedRef.current = true;
    setDragging(true);
    setPosition(clampToViewport(drag.origTop + dy, drag.origLeft + dx));
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || event.pointerId !== drag.pointerId) return;
    dragRef.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  if (!target) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          ref={cardRef}
          role="dialog"
          aria-modal={false}
          aria-label={label}
          aria-grabbed={draggable ? dragging : undefined}
          className={cn(
            styles.popover,
            overflowVisible && styles.popoverOverflowVisible,
            tone === "dark" && styles.popoverDark,
            draggable && styles.popoverDraggable,
            dragging && styles.popoverDragging,
            className,
          )}
          style={{
            top: position?.top ?? -9999,
            left: position?.left ?? -9999,
            width,
            // Hidden until measured, so it never flashes in the wrong place.
            visibility: position ? "visible" : "hidden",
          }}
          initial={{ opacity: 0, scale: 0.97, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: -3 }}
          transition={{ duration: reduceMotion ? 0.12 : 0.17, ease: [0.2, 0.8, 0.2, 1] }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
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
  /** Fraction of viewport height, 0..1. Used when snapPoints is not set. */
  height?: number;
  label: string;
  /** Show the grab handle and allow drag-to-dismiss. */
  draggable?: boolean;
  className?: string;
  /** Applied to the body under the grabber. */
  bodyClassName?: string;
  /**
   * Drag snap points as fractions of viewport height, e.g. [0.3, 0.6, 0.92].
   * The sheet drags between these heights and snaps to the nearest on
   * release. Content scrolls only at the tallest snap. When omitted, the
   * sheet uses the fixed `height` with simple drag-to-dismiss.
   */
  snapPoints?: number[];
  /** Which snap point to start at when the sheet opens (0 = smallest). */
  initialSnapIndex?: number;
  /**
   * `sheet` — bottom card over the current view (details, notifications).
   * `page` — GCal create/edit: full-screen surface that slides up and
   * replaces the calendar. No scrim, no rounded top, no grabber.
   */
  presentation?: "sheet" | "page";
  /** Sit above other sheets (confirmations, invites). */
  layer?: "sheet" | "modal";
  /** Dim the page behind the sheet. Off for map-overlaid sheets. */
  scrim?: boolean;
  /** Fires when the sheet settles on a snap (or the fixed height). */
  onSnapChange?: (index: number, heightFraction: number) => void;
  /** Live pixel height while dragging — used to keep a map inset in sync. */
  onHeightChange?: (px: number) => void;
  /** Size to the children instead of a viewport fraction. */
  fit?: boolean;
}

/**
 * The mobile detail surface. Bottom sheets keep the map or itinerary visible
 * behind them, which preserves the sense of place that a full-screen push
 * navigation destroys.
 *
 * With `snapPoints`, the sheet becomes a Google-Maps-style draggable surface
 * with peek / half / full snap positions. Content is locked until the sheet
 * reaches its tallest snap, at which point the body scrolls naturally — this
 * is what stops a scroll gesture from swallowing a drag-to-collapse.
 */
export function Sheet({
  open,
  onClose,
  children,
  height = 0.62,
  label,
  draggable = true,
  className,
  bodyClassName,
  snapPoints,
  initialSnapIndex = 0,
  presentation = "sheet",
  layer = "sheet",
  scrim = true,
  onSnapChange,
  onHeightChange,
  fit = false,
}: SheetProps) {
  const target = usePortalTarget();
  const reduceMotion = useReducedMotion();
  useDismiss(open, onClose);

  const page = presentation === "page";
  const usingSnap = !page && !fit && Boolean(snapPoints && snapPoints.length > 1);
  const points = usingSnap ? snapPoints! : [height];

  const [snapIndex, setSnapIndex] = useState(
    Math.min(initialSnapIndex, points.length - 1),
  );
  const [vh, setVh] = useState(() =>
    typeof window !== "undefined" ? window.innerHeight : 800,
  );

  // Reset to the initial snap whenever the sheet opens.
  useEffect(() => {
    if (open) setSnapIndex(Math.min(initialSnapIndex, points.length - 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Track viewport height for pixel-accurate drag constraints.
  useEffect(() => {
    const onResize = () => setVh(window.innerHeight);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Lock background scroll while a sheet is up.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const safeIndex = Math.min(snapIndex, points.length - 1);
  const currentPoint = points[safeIndex];
  const isAtMax = safeIndex === points.length - 1;

  useEffect(() => {
    if (!open) return;
    onSnapChange?.(safeIndex, currentPoint);
  }, [open, safeIndex, currentPoint, onSnapChange]);

  const currentPx = currentPoint * vh;
  const maxPx = points[points.length - 1] * vh;
  const minPx = points[0] * vh;

  const [dragPx, setDragPx] = useState<number | null>(null);
  const dragPxRef = useRef<number | null>(null);
  const draggingRef = useRef(false);
  const startYRef = useRef(0);
  const startHRef = useRef(0);
  const lastYRef = useRef(0);
  const lastTRef = useRef(0);
  const velocityRef = useRef(0);

  const displayPx = dragPx ?? currentPx;
  const heightDrag = !page && !fit && draggable && !reduceMotion;

  useEffect(() => {
    if (!open) return;
    onHeightChange?.(displayPx);
  }, [open, displayPx, onHeightChange]);

  const commitHeight = useCallback(
    (px: number) => {
      dragPxRef.current = px;
      setDragPx(px);
    },
    [],
  );

  const endHeightDrag = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    const finalPx = dragPxRef.current ?? currentPx;
    dragPxRef.current = null;
    setDragPx(null);

    const velocityY = velocityRef.current;
    const effectivePct = finalPx / vh;
    let nearest = 0;
    let minDist = Infinity;
    points.forEach((point, index) => {
      const dist = Math.abs(point - effectivePct);
      if (dist < minDist) {
        minDist = dist;
        nearest = index;
      }
    });
    if (
      (nearest === 0 && (velocityY > 620 || currentPx - finalPx < -80)) ||
      finalPx < minPx * 0.55
    ) {
      onClose();
      return;
    }
    if (!usingSnap) {
      setSnapIndex(0);
      return;
    }
    if (velocityY < -720) {
      setSnapIndex(points.length - 1);
      return;
    }
    if (velocityY > 720) {
      setSnapIndex(Math.max(0, nearest - (nearest === safeIndex ? 1 : 0)));
      return;
    }
    setSnapIndex(nearest);
  }, [currentPx, minPx, onClose, points, safeIndex, usingSnap, vh]);

  function onHeightPointerDown(event: ReactPointerEvent<HTMLElement>) {
    if (!heightDrag) return;
    const eventTarget = event.target as HTMLElement;
    if (eventTarget.closest("button, a, input, textarea, select, [role='button']")) {
      return;
    }
    if (isAtMax && !eventTarget.closest("[data-sheet-grab]")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    draggingRef.current = true;
    startYRef.current = event.clientY;
    startHRef.current = displayPx;
    lastYRef.current = event.clientY;
    lastTRef.current = performance.now();
    velocityRef.current = 0;
    commitHeight(displayPx);
  }

  function onHeightPointerMove(event: ReactPointerEvent<HTMLElement>) {
    if (!draggingRef.current) return;
    const now = performance.now();
    const dt = Math.max(8, now - lastTRef.current);
    velocityRef.current = ((event.clientY - lastYRef.current) / dt) * 1000;
    lastYRef.current = event.clientY;
    lastTRef.current = now;
    const next = Math.min(
      maxPx,
      Math.max(minPx * 0.18, startHRef.current - (event.clientY - startYRef.current)),
    );
    commitHeight(next);
  }

  if (!target) return null;

  return createPortal(
    <AnimatePresence>
          {open ? (
        <>
          {page || !scrim ? null : (
          <motion.div
            className={cn(styles.scrim, layer === "modal" && styles.scrimModal)}
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
          )}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={label}
            className={cn(
              styles.sheet,
              page && styles.sheetPage,
              layer === "modal" && styles.sheetModal,
              !page && !fit && styles.sheetHeight,
              usingSnap && !isAtMax && styles.sheetSnap,
              fit && styles.sheetFit,
              className,
            )}
            data-dragging={dragPx !== null ? "true" : undefined}
            style={page || fit ? undefined : { height: displayPx }}
            initial={{ y: "100%" }}
            animate={reduceMotion ? { opacity: 1, y: 0 } : { y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { y: "100%" }}
            transition={
              reduceMotion
                ? { duration: 0.12 }
                : page
                  ? { duration: 0.32, ease: [0.32, 0.72, 0, 1] }
                  : { type: "spring", stiffness: 420, damping: 38, mass: 0.9 }
            }
            onPointerDown={onHeightPointerDown}
            onPointerMove={onHeightPointerMove}
            onPointerUp={endHeightDrag}
            onPointerCancel={endHeightDrag}
          >
            {draggable && !page ? (
              <div className={styles.grabber} data-sheet-grab aria-hidden>
                <span />
              </div>
            ) : null}
            <div
              className={cn(styles.sheetBody, bodyClassName)}
              style={usingSnap && !isAtMax ? { overflowY: "hidden" } : undefined}
            >
              {children}
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>,
    target,
  );
}

/* -------------------------------------------------------------------------- */
/* Drawer — mobile leading-edge nav                                          */
/* -------------------------------------------------------------------------- */

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  label: string;
  className?: string;
  /** Leave the trailing edge of the app visible, Discord-style. */
  peek?: boolean;
}

/**
 * A left-edge navigation drawer. Google Calendar's pattern: the hamburger
 * replaces back, and account / views / settings live in this panel rather
 * than competing for top-bar space.
 */
export function Drawer({
  open,
  onClose,
  children,
  label,
  className,
  peek = false,
}: DrawerProps) {
  const target = usePortalTarget();
  const reduceMotion = useReducedMotion();
  useDismiss(open, onClose);

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
            className={cn(styles.scrim, peek && styles.scrimPeek)}
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
          <motion.nav
            role="dialog"
            aria-modal="true"
            aria-label={label}
            className={cn(styles.drawer, peek && styles.drawerPeek, className)}
            initial={{ x: "-100%" }}
            animate={reduceMotion ? { opacity: 1 } : { x: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { x: "-100%" }}
            transition={
              reduceMotion
                ? { duration: 0.12 }
                : { type: "spring", stiffness: 420, damping: 38, mass: 0.9 }
            }
          >
            {children}
          </motion.nav>
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
  width?: number | "fit-content";
  /** Drop the default inset so the child owns spacing. */
  flush?: boolean;
  className?: string;
  /** Compact: size the sheet to its contents instead of ~full screen. */
  compactFit?: boolean;
}

export function Modal({
  open,
  onClose,
  children,
  label,
  width = 460,
  flush = false,
  className,
  compactFit = false,
}: ModalProps) {
  const isCompact = useIsCompact();
  const target = usePortalTarget();
  const reduceMotion = useReducedMotion();
  useDismiss(open && !isCompact, onClose);

  if (isCompact) {
    return (
      <Sheet
        open={open}
        onClose={onClose}
        label={label}
        height={compactFit ? 0.5 : 0.94}
        fit={compactFit}
        layer="modal"
        className={className}
      >
        <div className={cn(styles.modalSheetBody, flush && styles.modalFlush)}>
          {children}
        </div>
      </Sheet>
    );
  }

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
            className={cn(styles.modal, flush && styles.modalFlush, className)}
            style={
              width === "fit-content"
                ? { width: "fit-content", maxWidth: "100%" }
                : { width: `min(${width}px, 100%)` }
            }
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
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
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
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
