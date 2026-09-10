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
 * tell to avoid — the semantic channel survives as flat purple, the same
 * colour that carries every other system decision in the product.
 */

export interface AssistantOffersProps {
  offers: AssistantOffer[];
  onRequest: (intent: AssistantPlan["intent"]) => void;
  /** The day the advisor is reading, so it can show its working. */
  reading?: {
    label: string;
    stops: number;
    errorCount: number;
    warningCount: number;
    freeMinutes: number;
    travelMinutes: number;
    costUsd: number;
  };
}

/**
 * What the advisor is looking at.
 *
 * Offers on their own are three buttons in a large empty panel, and they ask
 * you to trust a judgement whose basis you cannot see. These are the numbers
 * the offers were derived from — the same reading, stated plainly — which
 * both fills the panel with something useful and makes the suggestions
 * checkable rather than oracular.
 */
function DayReading({
  reading,
}: {
  reading: NonNullable<AssistantOffersProps["reading"]>;
}) {
  const rows: { label: string; value: string; tone?: "bad" | "warn" }[] = [
    { label: "Stops", value: String(reading.stops) },
    {
      label: "Clashes",
      value: String(reading.errorCount),
      tone: reading.errorCount > 0 ? "bad" : undefined,
    },
    {
      label: "Tight connections",
      value: String(reading.warningCount),
      tone: reading.warningCount > 0 ? "warn" : undefined,
    },
    { label: "Unscheduled", value: durationText(reading.freeMinutes) },
    { label: "Travel time", value: durationText(reading.travelMinutes) },
    { label: "Estimated cost", value: `$${reading.costUsd.toLocaleString()}` },
  ];

  return (
    <div className={styles.reading}>
      <p className={styles.readingLabel}>Reading {reading.label}</p>
      <dl className={styles.readingGrid}>
        {rows.map((row) => (
          <div key={row.label} className={styles.readingRow}>
            <dt>{row.label}</dt>
            <dd
              className={cn(
                "tabular",
                row.tone === "bad" && styles.readingBad,
                row.tone === "warn" && styles.readingWarn,
              )}
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function durationText(minutes: number): string {
  if (minutes <= 0) return "none";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** The affordances, shown only when there is something specific to offer. */
export function AssistantOffers({
  offers,
  onRequest,
  reading,
}: AssistantOffersProps) {
  return (
    <div className={styles.offersWrap}>
      {offers.length === 0 ? (
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
      ) : (
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
            <ArrowRight
              size={13}
              strokeWidth={2.2}
              className={styles.offerArrow}
            />
          </button>
        </li>
          ))}
        </ul>
      )}

      {reading ? <DayReading reading={reading} /> : null}
    </div>
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
      initial={{ opacity: 0, y: 12 }}
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

        <div className={styles.reasoning}>
          <p className="eyebrow">Why</p>
          <ol className={styles.rationale}>
            {plan.rationale.map((line, index) => (
              <li key={line}>
                <span className={styles.rationaleNum}>{index + 1}</span>
                <span>{line}</span>
              </li>
            ))}
          </ol>
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
