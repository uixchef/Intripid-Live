"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Compass, X } from "lucide-react";
import Link from "next/link";

import { Button, IconButton } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Segmented, Textarea } from "@/components/ui/controls";
import { BUDGET_META, INTEREST_META, STYLE_META } from "@/lib/categories";
import { shortDate } from "@/lib/dashboard/format";
import { BUDGET_TIERS, INTERESTS } from "@/lib/types";
import type {
  BudgetTier,
  Interest,
  TravelPersona,
  TripStyle,
} from "@/lib/types";

import styles from "./persona.module.css";

/**
 * About, rebuilt as the travel persona.
 *
 * The original dashboard's About block was a social-media biography: three
 * sentences of prose that no part of the product could read. This keeps the
 * prose — a person describing how they travel is genuinely the most readable
 * summary of it — and puts the machine-usable version next to it, so the panel
 * is visibly the input to Discovery rather than a paragraph about a stranger.
 *
 * Hence the footer line. Everything in here is a standing answer to a question
 * Discovery would otherwise ask on every run, and saying so is what turns
 * "edit your bio" into "improve your recommendations".
 *
 * THE EDITOR IS SMALL ON PURPOSE. Prose, pace, budget, interests. Not a
 * settings page — four fields that change what the recommender does, and
 * nothing that merely describes you.
 */

const PACE_OPTIONS: { value: TravelPersona["pace"]; label: string }[] = [
  { value: "loose", label: "Loose" },
  { value: "moderate", label: "Moderate" },
  { value: "packed", label: "Packed" },
];

const PACE_NOTE: Record<TravelPersona["pace"], string> = {
  loose: "One or two fixed things a day, the rest left open",
  moderate: "A spine for each day, with room to wander",
  packed: "Most of the day scheduled, back to back",
};

export interface PersonaPanelProps {
  persona: TravelPersona;
  editing: boolean;
  onStartEdit: () => void;
  onCancel: () => void;
  onSave: (patch: Partial<TravelPersona>) => void;
}

export function PersonaPanel({
  persona,
  editing,
  onStartEdit,
  onCancel,
  onSave,
}: PersonaPanelProps) {
  /*
   * The draft is DERIVED, not reset in an effect.
   *
   * It is stored alongside the persona it was seeded from, so a persona that
   * changes underneath — because a save landed — makes the stale draft stop
   * matching and the fresh value win on its own. That is the same device the
   * planner uses for its pinned rail tab, and it exists because resetting
   * state from an effect is both a React 19 lint error here and a real source
   * of a frame of stale UI.
   */
  const [draft, setDraft] = useState<{
    from: TravelPersona;
    value: TravelPersona;
  } | null>(null);
  const [open, setOpen] = useState(false);
  const summaryRef = useRef<HTMLTextAreaElement>(null);

  const value = draft && draft.from === persona ? draft.value : persona;

  const patch = (next: Partial<TravelPersona>) =>
    setDraft({ from: persona, value: { ...value, ...next } });

  useEffect(() => {
    if (editing) {
      setOpen(true);
      summaryRef.current?.focus();
    }
  }, [editing]);

  const toggleInterest = (interest: Interest) =>
    patch({
      interests: value.interests.includes(interest)
        ? value.interests.filter((item) => item !== interest)
        : [...value.interests, interest],
    });

  /* Cancelling has to discard, or re-opening would show the abandoned edit. */
  const handleCancel = () => {
    setDraft(null);
    onCancel();
  };

  const handleSave = () => {
    setDraft(null);
    onSave({
      summary: value.summary.trim(),
      pace: value.pace,
      budget: value.budget,
      interests: value.interests,
    });
  };

  const dirty =
    value.summary !== persona.summary ||
    value.pace !== persona.pace ||
    value.budget !== persona.budget ||
    value.interests.join() !== persona.interests.join();

  return (
    <section className={styles.panel} aria-label="Travel persona">
      <header className={styles.head}>
        <div className={styles.headText}>
          <div className={styles.titleRow}>
            <h2 className={styles.title} id="persona-title">
              How you travel
            </h2>
            {editing ? null : (
              <IconButton
                size="sm"
                variant="ghost"
                className={styles.toggle}
                label={open ? "Collapse how you travel" : "Expand how you travel"}
                aria-expanded={open}
                aria-controls="persona-details"
                onClick={() => setOpen((current) => !current)}
              >
                <ChevronDown size={16} strokeWidth={2.1} />
              </IconButton>
            )}
          </div>
          {editing ? (
            <p className={styles.sub}>
              Changes apply to your next recommendations
            </p>
          ) : null}
        </div>

        {editing ? (
          <div className={styles.headActions}>
            <Button
              variant="ghost"
              size="sm"
              iconLeft={<X size={13} strokeWidth={2.2} />}
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              iconLeft={<Check size={13} strokeWidth={2.4} />}
              disabled={!dirty}
              onClick={handleSave}
            >
              Save
            </Button>
          </div>
        ) : (
          <Button variant="secondary" size="sm" onClick={onStartEdit}>
            Edit
          </Button>
        )}
      </header>

      {editing ? (
        /* ------------------------------------------------------------------ */
        /* Edit                                                               */
        /* ------------------------------------------------------------------ */
        <div className={styles.editor}>
          <div className={styles.editRow}>
            <label className={styles.editLabel} htmlFor="persona-summary">
              In your words
            </label>
            <Textarea
              id="persona-summary"
              ref={summaryRef}
              rows={4}
              value={value.summary}
              onChange={(event) => patch({ summary: event.target.value })}
            />
          </div>

          <div className={styles.editGrid}>
            <div className={styles.editRow}>
              <span className={styles.editLabel}>Pace</span>
              <Segmented
                options={PACE_OPTIONS}
                value={value.pace}
                onChange={(next) => patch({ pace: next as TravelPersona["pace"] })}
                label="Preferred pace"
                size="sm"
              />
              <p className={styles.editHint}>{PACE_NOTE[value.pace]}</p>
            </div>

            <div className={styles.editRow}>
              <span className={styles.editLabel}>Usual budget</span>
              <Segmented
                options={BUDGET_TIERS.map((tier) => ({
                  value: tier,
                  label: BUDGET_META[tier].label,
                }))}
                value={value.budget}
                onChange={(next) => patch({ budget: next as BudgetTier })}
                label="Usual budget"
                size="sm"
              />
              <p className={styles.editHint}>
                {BUDGET_META[value.budget].blurb}
              </p>
            </div>
          </div>

          <div className={styles.editRow}>
            <span className={styles.editLabel}>
              What you actually look for
              <span className={styles.editCount}>
                {value.interests.length} selected
              </span>
            </span>
            <div className={styles.chips}>
              {INTERESTS.map((interest) => (
                <Chip
                  key={interest}
                  variant="soft"
                  selection="multiple"
                  selected={value.interests.includes(interest)}
                  onClick={() => toggleInterest(interest)}
                >
                  {INTEREST_META[interest].label}
                </Chip>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* ------------------------------------------------------------------ */
        /* Read                                                               */
        /* ------------------------------------------------------------------ */
        <div className={styles.body} data-open={open ? "" : undefined}>
          <p className={styles.summary}>{persona.summary}</p>

          <div id="persona-details" hidden={!open} className={styles.details}>
            <dl className={styles.facts}>
              <div className={styles.fact}>
                <dt>Pace</dt>
                <dd>
                  <span className={styles.factValue}>
                    {PACE_OPTIONS.find((o) => o.value === persona.pace)?.label}
                  </span>
                  <span className={styles.factNote}>
                    {PACE_NOTE[persona.pace]}
                  </span>
                </dd>
              </div>
              <div className={styles.fact}>
                <dt>Usual budget</dt>
                <dd>
                  <span className={styles.factValue}>
                    {BUDGET_META[persona.budget].label}
                  </span>
                  <span className={styles.factNote}>
                    {BUDGET_META[persona.budget].blurb}
                  </span>
                </dd>
              </div>
              <div className={styles.fact}>
                <dt>Trip character</dt>
                <dd>
                  <span className={styles.factValue}>
                    {persona.styles
                      .map((style: TripStyle) => STYLE_META[style].label)
                      .join(" · ")}
                  </span>
                </dd>
              </div>
            </dl>

            <div className={styles.interests}>
              <p className={styles.interestsLabel}>What you look for</p>
              <ul className={styles.interestList}>
                {persona.interests.map((interest) => (
                  <li key={interest} className={styles.interest}>
                    {INTEREST_META[interest].label}
                  </li>
                ))}
              </ul>
            </div>

            <footer className={styles.foot}>
              <p className={styles.footNote}>
                Discovery starts from this, so every run begins with what you
                already told us rather than a blank form.
              </p>
              <Link href="/discover" className={styles.footLink}>
                <Compass size={12} strokeWidth={2.2} aria-hidden />
                Use it now
              </Link>
            </footer>
          </div>
        </div>
      )}
    </section>
  );
}
