"use client";

import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { CalendarDays, Globe2, MapPin, Plane, Sparkles } from "lucide-react";

import { Chip } from "@/components/ui/chip";
import { Field, Input, OptionCard, Segmented } from "@/components/ui/controls";
import { BUDGET_META, INTEREST_META, STYLE_META } from "@/lib/categories";
import { cn } from "@/lib/utils";
import {
  BUDGET_TIERS,
  INTERESTS,
  TRIP_STYLES,
  type BudgetTier,
  type DateMode,
  type DiscoveryPreferences,
  type Interest,
  type Origin,
  type TripScope,
  type TripStyle,
} from "@/lib/types";
import { ORIGIN_OPTIONS } from "@/stores/discovery-store";

import styles from "./steps.module.css";

/**
 * The five discovery questions.
 *
 * Each one states WHY it is being asked. That was the historical product's
 * habit and it is worth keeping: a traveller answers a question about budget
 * far more willingly when the screen has already told them it will be used to
 * filter, not to upsell.
 *
 * None of these are form fields in the conventional sense. Options that carry
 * meaning get room to explain themselves, sets get chips you can graze, and
 * the map behind reacts to every answer — which is the whole argument for the
 * widget-driven approach over the generic form the team also prototyped.
 */

export interface StepShellProps {
  eyebrow: string;
  title: string;
  why: string;
  children: React.ReactNode;
}

export function StepShell({ eyebrow, title, why, children }: StepShellProps) {
  return (
    <div className={styles.step}>
      <header className={styles.stepHead}>
        <span className="eyebrow">{eyebrow}</span>
        <h2 className={styles.stepTitle}>{title}</h2>
        <p className={styles.stepWhy}>{why}</p>
      </header>
      <div className={styles.stepBody}>{children}</div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 1 · Dates                                                                 */
/* -------------------------------------------------------------------------- */

const DATE_MODES: { value: DateMode; label: string }[] = [
  { value: "exact", label: "Exact" },
  { value: "flexible", label: "Flexible" },
  { value: "weekend", label: "A weekend" },
];

export function DatesStep({
  prefs,
  onModeChange,
  onDatesChange,
}: {
  prefs: DiscoveryPreferences;
  onModeChange: (mode: DateMode) => void;
  onDatesChange: (start: string | null, end: string | null) => void;
}) {
  const nights =
    prefs.startDate && prefs.endDate
      ? differenceInCalendarDays(parseISO(prefs.endDate), parseISO(prefs.startDate))
      : null;

  const invalid = nights !== null && nights <= 0;

  return (
    <StepShell
      eyebrow="Step 1 of 5"
      title="When do you want to travel?"
      why="Dates let us weigh seasonal weather and how long you actually have."
    >
      <Segmented
        options={DATE_MODES}
        value={prefs.dateMode}
        onChange={onModeChange}
        label="How fixed are your dates?"
      />

      {prefs.dateMode === "weekend" ? (
        <div className={styles.weekendNote}>
          <CalendarDays size={15} strokeWidth={1.9} />
          <div>
            <p className={styles.weekendTitle}>
              {prefs.startDate && prefs.endDate
                ? `${format(parseISO(prefs.startDate), "EEE d MMM")} – ${format(
                    parseISO(prefs.endDate),
                    "EEE d MMM",
                  )}`
                : "The next free weekend"}
            </p>
            <p className={styles.weekendBody}>
              Two nights. We&rsquo;ll favour places you can actually reach and
              enjoy in that time.
            </p>
          </div>
        </div>
      ) : (
        <div className={styles.dateRow}>
          <Field label="Leaving">
            {({ id }) => (
              <Input
                id={id}
                type="date"
                value={prefs.startDate ?? ""}
                max={prefs.endDate ?? undefined}
                onChange={(event) =>
                  onDatesChange(event.target.value || null, prefs.endDate)
                }
              />
            )}
          </Field>
          <Field
            label="Coming back"
            error={invalid ? "Must be after you leave" : undefined}
          >
            {({ id, invalid: isInvalid }) => (
              <Input
                id={id}
                type="date"
                invalid={isInvalid}
                value={prefs.endDate ?? ""}
                min={prefs.startDate ?? undefined}
                onChange={(event) =>
                  onDatesChange(prefs.startDate, event.target.value || null)
                }
              />
            )}
          </Field>
        </div>
      )}

      {nights !== null && nights > 0 ? (
        <p className={styles.readout}>
          <strong className="tabular">{nights}</strong>{" "}
          {nights === 1 ? "night" : "nights"}
          {prefs.dateMode === "flexible"
            ? " · we'll also look either side of these dates"
            : ""}
        </p>
      ) : null}
    </StepShell>
  );
}

/* -------------------------------------------------------------------------- */
/* 2 · Origin + scope                                                        */
/* -------------------------------------------------------------------------- */

const SCOPES: { value: TripScope; label: string; icon: React.ReactNode }[] = [
  { value: "domestic", label: "Stay local", icon: <MapPin size={13} /> },
  { value: "international", label: "Go abroad", icon: <Plane size={13} /> },
  { value: "open", label: "Either", icon: <Globe2 size={13} /> },
];

/**
 * Origin and scope share a step on purpose. Testing on the original product
 * showed each extra question cost completions, and these two are one thought:
 * where you're starting from, and how far you're willing to get from it.
 */
export function OriginStep({
  prefs,
  onOriginChange,
  onScopeChange,
}: {
  prefs: DiscoveryPreferences;
  onOriginChange: (origin: Origin) => void;
  onScopeChange: (scope: TripScope) => void;
}) {
  return (
    <StepShell
      eyebrow="Step 2 of 5"
      title="Where are you starting from?"
      why="Flight time is trip time — and it decides what counts as far."
    >
      <div className={styles.originGrid} role="radiogroup" aria-label="Origin city">
        {ORIGIN_OPTIONS.map((origin) => {
          const selected = prefs.origin?.city === origin.city;
          return (
            <button
              key={origin.city}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onOriginChange(origin)}
              className={cn(styles.originItem, selected && styles.originItemOn)}
            >
              <span className={styles.originCity}>{origin.city}</span>
              <span className={styles.originCountry}>{origin.country}</span>
            </button>
          );
        })}
      </div>

      <div className={styles.scopeBlock}>
        <p className={styles.subLabel}>How far do you want to get?</p>
        <Segmented
          options={SCOPES}
          value={prefs.scope ?? "open"}
          onChange={onScopeChange}
          label="Trip scope"
          size="md"
        />
        {prefs.scope === "domestic" && prefs.origin ? (
          <p className={styles.readout}>
            We&rsquo;ll keep results inside {prefs.origin.country}.
          </p>
        ) : prefs.scope === "international" && prefs.origin ? (
          <p className={styles.readout}>
            We&rsquo;ll rule out {prefs.origin.country}.
          </p>
        ) : null}
      </div>
    </StepShell>
  );
}

/* -------------------------------------------------------------------------- */
/* 3 · Budget                                                                */
/* -------------------------------------------------------------------------- */

export function BudgetStep({
  prefs,
  topDailyByTier,
  onBudgetChange,
}: {
  prefs: DiscoveryPreferences;
  /** Indicative daily spend from the current front-runner, per tier. */
  topDailyByTier: Record<BudgetTier, number> | null;
  onBudgetChange: (budget: BudgetTier) => void;
}) {
  return (
    <StepShell
      eyebrow="Step 3 of 5"
      title="What&rsquo;s the budget?"
      why="Money makes the world go round — and it changes which places are worth recommending."
    >
      <div className={styles.budgetGrid} role="radiogroup" aria-label="Budget">
        {BUDGET_TIERS.map((tier) => {
          const meta = BUDGET_META[tier];
          return (
            <OptionCard
              key={tier}
              selected={prefs.budget === tier}
              onSelect={() => onBudgetChange(tier)}
              title={meta.label}
              blurb={meta.blurb}
              glyph={meta.glyph}
              meta={
                topDailyByTier ? `$${topDailyByTier[tier]}/day` : undefined
              }
            />
          );
        })}
      </div>
      {topDailyByTier ? (
        <p className={styles.readout}>
          Day rates shown are for the current front-runner, per person, on the
          ground.
        </p>
      ) : null}
    </StepShell>
  );
}

/* -------------------------------------------------------------------------- */
/* 4 · Trip style                                                            */
/* -------------------------------------------------------------------------- */

export function StyleStep({
  prefs,
  onToggleStyle,
}: {
  prefs: DiscoveryPreferences;
  onToggleStyle: (style: TripStyle) => void;
}) {
  return (
    <StepShell
      eyebrow="Step 4 of 5"
      title="What kind of trip is this?"
      why="Pick as many as fit. This is the single biggest lever on your results."
    >
      <div className={styles.styleGrid}>
        {TRIP_STYLES.map((style) => {
          const meta = STYLE_META[style];
          const selected = prefs.styles.includes(style);
          return (
            <button
              key={style}
              type="button"
              aria-pressed={selected}
              onClick={() => onToggleStyle(style)}
              className={cn(styles.styleCard, selected && styles.styleCardOn)}
            >
              <span className={styles.styleTitle}>{meta.label}</span>
              <span className={styles.styleBlurb}>{meta.blurb}</span>
            </button>
          );
        })}
      </div>
      {prefs.styles.length === 0 ? (
        <p className={styles.readout}>
          Nothing selected — results will stay broad.
        </p>
      ) : null}
    </StepShell>
  );
}

/* -------------------------------------------------------------------------- */
/* 5 · Interests                                                             */
/* -------------------------------------------------------------------------- */

export function InterestsStep({
  prefs,
  onToggleInterest,
}: {
  prefs: DiscoveryPreferences;
  onToggleInterest: (interest: Interest) => void;
}) {
  return (
    <StepShell
      eyebrow="Last one · optional"
      title="Anything you specifically want?"
      why="Only used to break ties and to explain why a place made the list."
    >
      <div className={styles.interestWrap}>
        {INTERESTS.map((interest) => (
          <Chip
            key={interest}
            checkable
            selected={prefs.interests.includes(interest)}
            onClick={() => onToggleInterest(interest)}
          >
            {INTEREST_META[interest].label}
          </Chip>
        ))}
      </div>
      <p className={styles.readout}>
        <Sparkles size={13} strokeWidth={1.9} className={styles.readoutIcon} />
        Skip this and we&rsquo;ll still rank properly — you just get fewer
        specifics in the explanation.
      </p>
    </StepShell>
  );
}
