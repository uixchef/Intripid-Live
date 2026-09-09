"use client";

import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Check, Sparkles, X } from "lucide-react";

import { Button, IconButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AssistantOffer } from "@/lib/trip/assistant";
import type { AssistantPlan } from "@/lib/types";

import styles from "./assistant.module.css";

/**
 * The assistant's review surface.
 *
 * Product stance: AI as a capability, not a chatbot. It is never a text box
 * waiting for a prompt — it reads the day, finds a specific problem, and
 * proposes named changes with its reasoning shown as steps.
 *
 * It renders in the right column rather than a centred dialog so the calendar
 * stays visible: hovering a proposed change highlights the card it affects, so
 * you can see what is about to move before agreeing to it. Nothing is applied
 * until accepted, and changes can be taken one at a time.
 *
 * No gradient chrome. The historical gradient "AI" button is exactly the dated
 * tell to avoid — the semantic channel survives as a flat amber accent.
 */

export interface AssistantOffersProps {
  offers: AssistantOffer[];
  onRequest: (intent: AssistantPlan["intent"]) => void;
}

/** The affordances, shown only when there is something specific to offer. */
export function AssistantOffers({ offers, onRequest }: AssistantOffersProps) {
  if (offers.length === 0) {
    return (
      <div className={styles.quiet}>
        <span className={styles.quietIcon} aria-hidden>
          <Check size={13} strokeWidth={2.4} />
        </span>
        <div>
          <p className={styles.quietTitle}>This day holds up</p>
          <p className={styles.quietBody}>
            No clashes, no impossible hops, no dead afternoons. Nothing worth
            changing.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ul className={styles.offers}>
      {offers.map((offer) => (
        <li key={offer.intent}>
          <button
            type="button"
            className={cn(
              styles.offer,
              offer.severity === "attention" && styles.offerAttention,
            )}
            onClick={() => onRequest(offer.intent)}
          >
            <span className={styles.offerIcon} aria-hidden>
              <Sparkles size={12} strokeWidth={2.2} />
            </span>
            <span className={styles.offerBody}>
              <span className={styles.offerLabel}>{offer.label}</span>
              <span className={styles.offerDetail}>{offer.detail}</span>
            </span>
            <ArrowRight size={13} strokeWidth={2.2} className={styles.offerArrow} />
          </button>
        </li>
      ))}
    </ul>
  );
}

export interface AssistantPlanPanelProps {
  plan: AssistantPlan;
  applied: string[];
  onApplyAll: () => void;
  onApplyOne: (changeId: string) => void;
  onDismiss: () => void;
  onHoverChange: (itemId: string | null) => void;
}

export function AssistantPlanPanel({
  plan,
  applied,
  onApplyAll,
  onApplyOne,
  onDismiss,
  onHoverChange,
}: AssistantPlanPanelProps) {
  const reduceMotion = useReducedMotion();
  const allApplied = plan.changes.every((change) => applied.includes(change.id));

  return (
    <motion.div
      className={styles.panel}
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
      transition={{ duration: reduceMotion ? 0.12 : 0.26, ease: [0.2, 0.8, 0.2, 1] }}
    >
      <header className={styles.panelHead}>
        <div className={styles.panelHeadTop}>
          <span className={styles.panelBadge}>
            <Sparkles size={11} strokeWidth={2.4} />
            Assistant
          </span>
          <IconButton
            label="Dismiss suggestion"
            size="xs"
            variant="ghost"
            onClick={onDismiss}
          >
            <X size={14} strokeWidth={2} />
          </IconButton>
        </div>
        <h3 className={styles.panelTitle}>{plan.title}</h3>
      </header>

      <div className={styles.panelBody}>
        {/* The reasoning, as steps. Showing the working is what separates a
            suggestion you can trust from one that just happens to you. */}
        <ol className={styles.rationale}>
          {plan.rationale.map((line, index) => (
            <li key={line}>
              <span className={styles.rationaleNum}>{index + 1}</span>
              <span>{line}</span>
            </li>
          ))}
        </ol>

        <div className={styles.changes}>
          <p className="eyebrow">
            {plan.changes.length}{" "}
            {plan.changes.length === 1 ? "change" : "changes"}
          </p>
          <ul className={styles.changeList}>
            {plan.changes.map((change) => {
              const isApplied = applied.includes(change.id);
              return (
                <li
                  key={change.id}
                  className={cn(styles.change, isApplied && styles.changeApplied)}
                  onPointerEnter={() => onHoverChange(change.itemId ?? null)}
                  onPointerLeave={() => onHoverChange(null)}
                >
                  <span className={styles.changeSummary}>{change.summary}</span>
                  {isApplied ? (
                    <span className={styles.changeDone}>
                      <Check size={12} strokeWidth={2.8} />
                      Done
                    </span>
                  ) : (
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => onApplyOne(change.id)}
                    >
                      Apply
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <footer className={styles.panelFoot}>
        <Button variant="ghost" size="sm" onClick={onDismiss}>
          {allApplied ? "Close" : "Not now"}
        </Button>
        {!allApplied ? (
          <Button variant="primary" size="sm" onClick={onApplyAll}>
            Apply {plan.changes.length > 1 ? "all" : "change"}
          </Button>
        ) : null}
      </footer>
    </motion.div>
  );
}
