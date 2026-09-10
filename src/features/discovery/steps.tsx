"use client";

import { format, parseISO } from "date-fns";
import {
  ArrowLeftRight,
  Check,
  Globe2,
  Home,
  MapPin,
  Plane,
  Plus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, Input, Segmented } from "@/components/ui/controls";
import {
  ACTIVITY_GROUPS,
  BUDGET_META,
  EXPERIENCE_ORDER,
  INCOME_META,
  INTEREST_META,
  STYLE_META,
  WEEKEND_META,
} from "@/lib/categories";
import { resolvedDates } from "@/lib/discovery/scoring";
import { cn } from "@/lib/utils";
import {
  BUDGET_TIERS,
  INTERESTS,
  type BudgetTier,
  type DateMode,
  type DiscoveryPreferences,
  type IncomeBand,
  type Interest,
  type Origin,
  type TripScope,
  type TripStyle,
  type WeekendShape,
} from "@/lib/types";
import { ORIGIN_OPTIONS, type DiscoverySubStep } from "@/stores/discovery-store";

import styles from "./steps.module.css";

/**
 * The six discovery questions.
 *
 * Every one states what we will do with the answer — the original product's
 * habit, and worth keeping: a traveller answers a question about money far
 * more willingly when the screen has already said it will be used to filter
 * rather than to upsell. The voice is first person plural throughout, and the
 * questions are ordinally chained so six reads as one conversation.
 *
 * Each question also declares whether it NARROWS the field or ORDERS it. That
 * filter/rank distinction is the core of the algorithm and the traveller
 * deserves to see it.
 */

export interface StepShellProps {
  ordinal: string;
  title: string;
  why: string;
  kind: "filter" | "rank";
  optional?: boolean;
  children: React.ReactNode;
}

export function StepShell({
  ordinal,
  title,
  why,
  kind,
  optional,
  children,
}: StepShellProps) {
  return (
    <div className={styles.step}>
      <header className={styles.stepHead}>
        <div className={styles.stepMeta}>
          <span className={styles.ordinal}>{ordinal}</span>
          <span
            className={cn(
              styles.kind,
              kind === "filter" ? styles.kindFilter : styles.kindRank,
            )}
          >
            {kind === "filter" ? "Narrows results" : "Orders results"}
          </span>
          {optional ? <span className={styles.optional}>Optional</span> : null}
        </div>
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
  { value: "specific", label: "Specific dates" },
  { value: "flexible", label: "I'm flexible" },
  { value: "weekend", label: "This weekend" },
];

const MONTHS = Array.from({ length: 12 }, (_, i) =>
  format(new Date(2026, i, 1), "MMMM"),
);

export function DatesStep({
  prefs,
  subStep,
  onModeChange,
  onDatesChange,
  onWeekendShape,
  onFlexible,
}: {
  prefs: DiscoveryPreferences;
  subStep: DiscoverySubStep;
  onModeChange: (mode: DateMode) => void;
  onDatesChange: (start: string | null, end: string | null) => void;
  onWeekendShape: (shape: WeekendShape) => void;
  onFlexible: (month: number, nights: number) => void;
}) {
  /* The clarifying sub-step: "this weekend" means different things. */
  if (subStep === "weekend-shape") {
    return (
      <StepShell
        ordinal="Just to be sure"
        title="How do you define the weekend?"
        why="It changes how many nights we plan for, and what's reachable."
        kind="filter"
      >
        <div className={styles.stack} role="radiogroup" aria-label="Weekend shape">
          {(Object.keys(WEEKEND_META) as WeekendShape[]).map((shape) => {
            const meta = WEEKEND_META[shape];
            const selected = prefs.weekendShape === shape;
            return (
              <button
                key={shape}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onWeekendShape(shape)}
                className={cn(styles.row, selected && styles.rowOn)}
              >
                <span className={styles.rowBody}>
                  <span className={styles.rowTitle}>{meta.label}</span>
                  <span className={styles.rowBlurb}>{meta.blurb}</span>
                </span>
                <span className={styles.rowCheck} aria-hidden>
                  {selected ? <Check size={13} strokeWidth={3} /> : null}
                </span>
              </button>
            );
          })}
        </div>
      </StepShell>
    );
  }

  const dates = resolvedDates(prefs);
  const nights =
    dates && prefs.dateMode === "specific"
      ? Math.round(
          (parseISO(dates.end).getTime() - parseISO(dates.start).getTime()) /
            86_400_000,
        )
      : null;
  const invalid = nights !== null && nights <= 0;

  return (
    <StepShell
      ordinal="First"
      title="When do you want to travel?"
      why="Dates help us factor in seasonal weather, special events and how long you actually have."
      kind="filter"
    >
      <Segmented
        options={DATE_MODES}
        value={prefs.dateMode}
        onChange={onModeChange}
        label="How fixed are your dates?"
      />

      {prefs.dateMode === "specific" ? (
        <>
          <div className={styles.pairRow}>
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
          {nights !== null && nights > 0 ? (
            <p className={styles.readout}>
              <strong className="tabular">{nights}</strong>{" "}
              {nights === 1 ? "night" : "nights"} away
            </p>
          ) : null}
        </>
      ) : prefs.dateMode === "flexible" ? (
        <>
          <div className={styles.pairRow}>
            <Field label="Roughly which month">
              {({ id }) => (
                <select
                  id={id}
                  className={styles.select}
                  value={prefs.flexibleMonth}
                  onChange={(event) =>
                    onFlexible(Number(event.target.value), prefs.flexibleNights)
                  }
                >
                  {MONTHS.map((month, index) => (
                    <option key={month} value={index}>
                      {month}
                    </option>
                  ))}
                </select>
              )}
            </Field>
            <Field label="How many nights">
              {({ id }) => (
                <select
                  id={id}
                  className={styles.select}
                  value={prefs.flexibleNights}
                  onChange={(event) =>
                    onFlexible(prefs.flexibleMonth, Number(event.target.value))
                  }
                >
                  {[2, 3, 4, 5, 6, 7, 10, 14].map((n) => (
                    <option key={n} value={n}>
                      {n} nights
                    </option>
                  ))}
                </select>
              )}
            </Field>
          </div>
          <p className={styles.readout}>
            We&rsquo;ll take each place&rsquo;s best week in{" "}
            {MONTHS[prefs.flexibleMonth]} rather than the monthly average.
          </p>
        </>
      ) : (
        <div className={styles.note}>
          <span className={styles.noteIcon} aria-hidden>
            <ArrowLeftRight size={14} strokeWidth={2} />
          </span>
          <div>
            <p className={styles.noteTitle}>
              {dates
                ? `${format(parseISO(dates.start), "EEE d MMM")} – ${format(
                    parseISO(dates.end),
                    "EEE d MMM",
                  )}`
                : "The next free weekend"}
            </p>
            <p className={styles.noteBody}>
              We&rsquo;ll ask what a weekend means to you next, then keep to
              places you can reach and enjoy in that time.
            </p>
          </div>
        </div>
      )}
    </StepShell>
  );
}

/* -------------------------------------------------------------------------- */
/* 2 · Scope                                                                 */
/* -------------------------------------------------------------------------- */

const SCOPES: {
  value: TripScope;
  label: string;
  blurb: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "domestic",
    label: "Stay in my home country",
    blurb: "Closer to home can be wonderful too",
    icon: <MapPin size={15} strokeWidth={2} />,
  },
  {
    value: "international",
    label: "Go abroad",
    blurb: "Foreign lands, different rhythm",
    icon: <Plane size={15} strokeWidth={2} />,
  },
  {
    value: "open",
    label: "I don't have a strong preference",
    blurb: "Show me whatever fits best",
    icon: <Globe2 size={15} strokeWidth={2} />,
  },
];

export function ScopeStep({
  prefs,
  onScopeChange,
}: {
  prefs: DiscoveryPreferences;
  onScopeChange: (scope: TripScope) => void;
}) {
  return (
    <StepShell
      ordinal="Next"
      title="Where would you like to explore?"
      why="Foreign lands can be fun, but staying closer to home can be wonderful, too."
      kind="filter"
    >
      <div className={styles.stack} role="radiogroup" aria-label="How far">
        {SCOPES.map((scope) => {
          const selected = prefs.scope === scope.value;
          return (
            <button
              key={scope.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onScopeChange(scope.value)}
              className={cn(styles.row, selected && styles.rowOn)}
            >
              <span className={styles.rowIcon} aria-hidden>
                {scope.icon}
              </span>
              <span className={styles.rowBody}>
                <span className={styles.rowTitle}>{scope.label}</span>
                <span className={styles.rowBlurb}>{scope.blurb}</span>
              </span>
              <span className={styles.rowCheck} aria-hidden>
                {selected ? <Check size={13} strokeWidth={3} /> : null}
              </span>
            </button>
          );
        })}
      </div>
    </StepShell>
  );
}

/* -------------------------------------------------------------------------- */
/* 3 · Origin — with the map-confirm loop                                    */
/* -------------------------------------------------------------------------- */

export function OriginStep({
  prefs,
  subStep,
  onOriginChange,
  onConfirm,
  onReopen,
}: {
  prefs: DiscoveryPreferences;
  subStep: DiscoverySubStep;
  onOriginChange: (origin: Origin) => void;
  onConfirm: () => void;
  onReopen: () => void;
}) {
  /*
   * The confirm loop. Origin accuracy silently determines every
   * recommendation, so it is never trusted untyped — the camera flies there,
   * the marker drops, and the traveller says yes.
   */
  if (subStep === "confirm-origin" && prefs.origin) {
    return (
      <StepShell
        ordinal="Quick check"
        title="Did we find you?"
        why="Please verify the start point is right — everything downstream depends on it."
        kind="filter"
      >
        <div className={styles.confirmCard}>
          <span className={styles.confirmPin} aria-hidden>
            <Home size={15} strokeWidth={2.1} />
          </span>
          <div className={styles.confirmBody}>
            <p className={styles.confirmCity}>{prefs.origin.city}</p>
            <p className={styles.confirmCountry}>{prefs.origin.country}</p>
          </div>
        </div>
        <p className={styles.readout}>
          The marker on the map is where we&rsquo;ll measure every flight from.
        </p>
        <div className={styles.confirmActions}>
          <Button variant="secondary" onClick={onReopen}>
            Change
          </Button>
          <Button variant="primary" onClick={onConfirm}>
            Looks good
          </Button>
        </div>
      </StepShell>
    );
  }

  return (
    <StepShell
      ordinal="Next"
      title="From where will you be leaving?"
      why="This helps us determine the best departure options available to you."
      kind="filter"
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
              {origin.label ? (
                <span className={styles.savedTag}>{origin.label}</span>
              ) : null}
              <span className={styles.originCity}>{origin.city}</span>
              <span className={styles.originCountry}>{origin.country}</span>
            </button>
          );
        })}
        <span className={styles.addAddress}>
          <Plus size={13} strokeWidth={2.2} />
          Add a new address
        </span>
      </div>
    </StepShell>
  );
}

/* -------------------------------------------------------------------------- */
/* 4 · Budget — with the optional income normaliser                          */
/* -------------------------------------------------------------------------- */

export function BudgetStep({
  prefs,
  subStep,
  topDailyByTier,
  onBudgetChange,
  onIncomeBand,
  onSkipIncome,
}: {
  prefs: DiscoveryPreferences;
  subStep: DiscoverySubStep;
  topDailyByTier: Record<BudgetTier, number> | null;
  onBudgetChange: (budget: BudgetTier) => void;
  onIncomeBand: (band: IncomeBand) => void;
  onSkipIncome: () => void;
}) {
  /*
   * Two-layer budget: a qualitative posture, quantitatively normalised.
   * Genuinely good, and rare — but it stays optional, privacy-explained and
   * never blocks the flow.
   */
  if (subStep === "income" && prefs.budget) {
    const tier = BUDGET_META[prefs.budget].label;
    return (
      <StepShell
        ordinal="One refinement"
        title={`Help us understand what "${tier}" means to you`}
        why="Budget means different things to different people. This stays on your device and only tunes the cost ceiling."
        kind="filter"
        optional
      >
        <div className={styles.stack} role="radiogroup" aria-label="Income range">
          {(Object.keys(INCOME_META) as IncomeBand[]).map((band) => {
            const selected = prefs.incomeBand === band;
            return (
              <button
                key={band}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onIncomeBand(band)}
                className={cn(styles.row, styles.rowTight, selected && styles.rowOn)}
              >
                <span className={styles.rowBody}>
                  <span className={styles.rowTitle}>
                    {INCOME_META[band].label}
                  </span>
                </span>
                <span className={styles.rowCheck} aria-hidden>
                  {selected ? <Check size={13} strokeWidth={3} /> : null}
                </span>
              </button>
            );
          })}
        </div>
        <button type="button" className={styles.skipLink} onClick={onSkipIncome}>
          Skip — use typical local costs
        </button>
      </StepShell>
    );
  }

  return (
    <StepShell
      ordinal="Next"
      title="What's your budget for this trip?"
      why="Money makes the world go round — and it helps us filter recommendations."
      kind="filter"
    >
      <div className={styles.budgetGrid} role="radiogroup" aria-label="Budget">
        {BUDGET_TIERS.map((tier) => {
          const meta = BUDGET_META[tier];
          const selected = prefs.budget === tier;
          return (
            <button
              key={tier}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onBudgetChange(tier)}
              className={cn(styles.budgetCard, selected && styles.budgetCardOn)}
            >
              <span className={styles.budgetTop}>
                <span className={styles.budgetName}>{meta.label}</span>
                {topDailyByTier ? (
                  <span className={cn(styles.budgetRate, "tabular")}>
                    ${topDailyByTier[tier]}/day
                  </span>
                ) : null}
              </span>
              <span className={styles.budgetBlurb}>{meta.blurb}</span>
            </button>
          );
        })}
      </div>
      {topDailyByTier ? (
        <p className={styles.readout}>
          Day rates are for the current front-runner, per person, on the ground.
        </p>
      ) : null}
    </StepShell>
  );
}

/* -------------------------------------------------------------------------- */
/* 5 · Must-have experiences — the filter                                    */
/* -------------------------------------------------------------------------- */

export function ExperiencesStep({
  prefs,
  removedCount,
  onToggleStyle,
}: {
  prefs: DiscoveryPreferences;
  removedCount: number;
  onToggleStyle: (style: TripStyle) => void;
}) {
  return (
    <StepShell
      ordinal="Next"
      title="Are there any experiences you must have?"
      why="We'll filter out any cities that can't support them."
      kind="filter"
      optional
    >
      <div className={styles.experienceGrid}>
        {EXPERIENCE_ORDER.map((style) => {
          const meta = STYLE_META[style];
          const selected = prefs.styles.includes(style);
          return (
            <button
              key={style}
              type="button"
              aria-pressed={selected}
              onClick={() => onToggleStyle(style)}
              className={cn(styles.expCard, selected && styles.expCardOn)}
            >
              <span className={styles.expCheck} aria-hidden>
                {selected ? <Check size={12} strokeWidth={3.2} /> : null}
              </span>
              <span className={styles.expBody}>
                <span className={styles.expTitle}>{meta.label}</span>
                <span className={styles.expBlurb}>{meta.blurb}</span>
              </span>
            </button>
          );
        })}
      </div>
      {prefs.styles.length > 0 ? (
        <p className={styles.readout}>
          {removedCount > 0
            ? `${removedCount} ${removedCount === 1 ? "place" : "places"} ruled out so far.`
            : "Every place we know can still deliver these."}
        </p>
      ) : (
        <p className={styles.readout}>
          Nothing selected — we won&rsquo;t rule anywhere out.
        </p>
      )}
    </StepShell>
  );
}

/* -------------------------------------------------------------------------- */
/* 6 · Activities — the ranker                                               */
/* -------------------------------------------------------------------------- */

export function ActivitiesStep({
  prefs,
  onToggleInterest,
}: {
  prefs: DiscoveryPreferences;
  onToggleInterest: (interest: Interest) => void;
}) {
  return (
    <StepShell
      ordinal="Last one"
      title="Anything specific you'd like to do?"
      why="We'll use these to rank the final recommendations — they won't rule anywhere out."
      kind="rank"
      optional
    >
      <div className={styles.activityGroups}>
        {ACTIVITY_GROUPS.map((group) => {
          const inGroup = INTERESTS.filter(
            (interest) => INTEREST_META[interest].group === group,
          );
          if (inGroup.length === 0) return null;
          return (
            <div key={group} className={styles.activityGroup}>
              <p className={styles.groupLabel}>{group}</p>
              <div className={styles.chipWrap}>
                {inGroup.map((interest) => {
                  const selected = prefs.interests.includes(interest);
                  return (
                    <button
                      key={interest}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => onToggleInterest(interest)}
                      className={cn(
                        styles.activityChip,
                        selected && styles.activityChipOn,
                      )}
                    >
                      {selected ? (
                        <Check size={11} strokeWidth={3.2} aria-hidden />
                      ) : null}
                      {INTEREST_META[interest].label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </StepShell>
  );
}
