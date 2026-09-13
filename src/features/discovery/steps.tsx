"use client";

import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import {
  ArrowRight,
  Check,
  Globe2,
  Home,
  Loader2,
  LocateFixed,
  MapPin,
  Plane,
  Plus,
  Star,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { CountryField } from "@/components/ui/country-field";
import { Input, Segmented, Stepper } from "@/components/ui/controls";
import { Modal } from "@/components/ui/overlay";
import { Select } from "@/components/ui/select";
import { ACCOUNT_USER } from "@/data/account";
import { SAVED_ORIGINS, defaultOriginFromProfile } from "@/data/origins";
import { DateRangeField } from "@/features/landing/date-range-field";
import {
  ACTIVITY_GROUPS,
  BUDGET_META,
  EXPERIENCE_GROUPS,
  INCOME_META,
  INTEREST_META,
  STYLE_META,
  WEEKEND_META,
} from "@/lib/categories";
import {
  forwardGeocode,
  originFromCoords,
  reverseGeocode,
} from "@/lib/discovery/geocode";
import {
  coerceFlexibleWindow,
  flexibleWindowValue,
  parseFlexibleWindow,
  resolvedDates,
  upcomingFlexibleMonths,
} from "@/lib/discovery/scoring";
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
  type PopulatedPref,
  type TripScope,
  type TripStyle,
  type WeekendShape,
} from "@/lib/types";
import {
  DISCOVERY_STEPS,
  type DiscoverySubStep,
  useDiscovery,
  useDiscoveryApi,
} from "@/stores/discovery-store";
import { useSession, useSessionHydrated } from "@/stores/session-store";

import styles from "./steps.module.css";

/**
 * The discovery questions.
 *
 * The question card: step index, conversational title, one-line why.
 */

export interface StepShellProps {
  title: string;
  why: string;
  children: React.ReactNode;
}

export function StepShell({ title, why, children }: StepShellProps) {
  const step = useDiscovery((s) => s.step);
  const stepIndex = Math.max(0, DISCOVERY_STEPS.indexOf(step));
  const stepCount = DISCOVERY_STEPS.length;

  return (
    <div className={styles.step}>
      <header className={styles.stepHead}>
        <div
          className={styles.meter}
          role="progressbar"
          aria-label={`Question ${stepIndex + 1} of ${stepCount}`}
          aria-valuemin={1}
          aria-valuemax={stepCount}
          aria-valuenow={stepIndex + 1}
        >
          <p className={styles.meterLabel}>
            Step {stepIndex + 1} of {stepCount}
          </p>
          <div
            className={styles.meterTrack}
            style={{ gridTemplateColumns: `repeat(${stepCount}, 1fr)` }}
            aria-hidden
          >
            {DISCOVERY_STEPS.map((item, index) => (
              <span
                key={item}
                className={cn(
                  styles.meterSeg,
                  index < stepIndex && styles.meterSegDone,
                  index === stepIndex && styles.meterSegOn,
                )}
              />
            ))}
          </div>
        </div>
        <hgroup className={styles.stepCopy}>
          <h2 className={styles.stepTitle}>{title}</h2>
          <p className={styles.stepWhy}>{why}</p>
        </hgroup>
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
  onFlexible: (month: number, nights: number, year: number) => void;
}) {
  /* The clarifying sub-step: "this weekend" means different things. */
  if (subStep === "weekend-shape") {
    return (
      <StepShell
        title="How do you define the weekend?"
        why="It changes how many nights we plan for, and what's reachable."
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
      title="First, when do you want to travel?"
      why="Dates help us factor in seasonal weather, special events, and other things!"
    >
      <Segmented
        options={DATE_MODES}
        value={prefs.dateMode}
        onChange={onModeChange}
        label="How fixed are your dates?"
      />

      {prefs.dateMode === "specific" ? (
        <>
          <DateRangeField
            start={prefs.startDate}
            end={prefs.endDate}
            onChange={(nextStart, nextEnd) => onDatesChange(nextStart, nextEnd)}
            startLabel="Leaving"
            endLabel="Coming back"
            tone="outlined"
            invalid={invalid}
          />
          {invalid ? (
            <p className={styles.fieldSupportError} role="alert">
              Must be after you leave
            </p>
          ) : nights !== null && nights > 0 ? (
            <p className={styles.readout}>
              <strong className="tabular">{nights}</strong>{" "}
              {nights === 1 ? "night" : "nights"} away
            </p>
          ) : null}
        </>
      ) : prefs.dateMode === "flexible" ? (
        <FlexibleDates
          prefs={prefs}
          onFlexible={onFlexible}
        />
      ) : (
        <DateRangeField
          start={dates?.start ?? null}
          end={dates?.end ?? null}
          onChange={() => {}}
          startLabel="Leaving"
          endLabel="Coming back"
          tone="outlined"
          readOnly
        />
      )}
    </StepShell>
  );
}

function FlexibleDates({
  prefs,
  onFlexible,
}: {
  prefs: DiscoveryPreferences;
  onFlexible: (month: number, nights: number, year: number) => void;
}) {
  const window = coerceFlexibleWindow(prefs.flexibleMonth, prefs.flexibleYear);
  const months = upcomingFlexibleMonths();
  const selected = flexibleWindowValue(window.flexibleYear, window.flexibleMonth);
  const options = months.some((month) => month.value === selected)
    ? months
    : [
        {
          year: window.flexibleYear,
          month: window.flexibleMonth,
          value: selected,
          label: format(
            new Date(window.flexibleYear, window.flexibleMonth, 1),
            "MMMM yyyy",
          ),
        },
        ...months,
      ];
  const monthLabel =
    options.find((month) => month.value === selected)?.label ??
    format(new Date(window.flexibleYear, window.flexibleMonth, 1), "MMMM yyyy");

  return (
    <>
      <div className={styles.pairRow}>
        <Select
          label="Roughly which month"
          fieldLabel="Roughly which month"
          value={selected}
          onChange={(value) => {
            const next = parseFlexibleWindow(value);
            onFlexible(next.month, prefs.flexibleNights, next.year);
          }}
          options={options.map((month) => ({
            value: month.value,
            label: month.label,
          }))}
        />
        <Stepper
          label="How many nights"
          fieldLabel="How many nights"
          value={prefs.flexibleNights}
          min={2}
          max={14}
          onChange={(nights) =>
            onFlexible(window.flexibleMonth, nights, window.flexibleYear)
          }
          format={(nights) => `${nights} ${nights === 1 ? "night" : "nights"}`}
        />
      </div>
      <p className={styles.readout}>
        We&rsquo;ll take each place&rsquo;s best week in {monthLabel} rather
        than the monthly average.
      </p>
    </>
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
    label: "No preference",
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
      title="Next, where would you like to explore?"
      why="Foreign lands can be fun, but staying closer-to-home can be wonderful, too!"
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

function locatePosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Location isn’t available in this browser."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 12_000,
      maximumAge: 60_000,
    });
  });
}

function geoErrorMessage(error: unknown): string {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? Number((error as { code: number }).code)
      : null;

  if (code === 1) {
    return "Location access was declined. Enter the address instead.";
  }
  if (code === 3) {
    return "We couldn’t get a GPS fix in time. Try again or enter it manually.";
  }
  if (error instanceof Error && error.message) return error.message;
  return "We couldn’t read your location. Enter the address instead.";
}

function AddOriginPanel({
  onProposeOrigin,
}: {
  onProposeOrigin: (origin: Origin) => void;
}) {
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [lookupFailed, setLookupFailed] = useState(false);
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [postal, setPostal] = useState("");
  const [country, setCountry] = useState("");
  const locked = locating || submitting;
  const discoveryApi = useDiscoveryApi();
  const cityInvalid = attempted && !city.trim();
  const countryInvalid = attempted && !country.trim();
  const addressInvalid = lookupFailed && !cityInvalid && !countryInvalid;

  useEffect(() => {
    discoveryApi.getState().setOriginBusy(locked);
    return () => discoveryApi.getState().setOriginBusy(false);
  }, [discoveryApi, locked]);

  async function useCurrentLocation() {
    if (locating || submitting) return;
    setLocationError(null);
    setLocating(true);
    try {
      const position = await locatePosition();
      const { longitude, latitude } = position.coords;
      const geocoded = await reverseGeocode(longitude, latitude);
      onProposeOrigin(geocoded ?? originFromCoords(longitude, latitude));
    } catch (caught) {
      setLocationError(geoErrorMessage(caught));
    } finally {
      setLocating(false);
    }
  }

  async function submitManual(event: React.FormEvent) {
    event.preventDefault();
    if (locating || submitting) return;
    const cityValue = city.trim();
    const countryValue = country.trim();
    setAttempted(true);
    setLookupFailed(false);
    if (!cityValue || !countryValue) return;

    setSubmitting(true);
    try {
      const query = [street.trim(), cityValue, postal.trim(), countryValue]
        .filter(Boolean)
        .join(", ");
      const geocoded = await forwardGeocode(query);
      if (!geocoded) {
        setLookupFailed(true);
        return;
      }
      onProposeOrigin(geocoded);
    } catch {
      setLookupFailed(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <StepShell
      title="Add a new address"
      why="We’ll still confirm the pin on the map before we use it."
    >
      <form
        id="discovery-add-origin"
        className={styles.addForm}
        noValidate
        onSubmit={submitManual}
      >
        <button
          type="button"
          className={styles.row}
          disabled={locked}
          onClick={() => void useCurrentLocation()}
        >
          <span className={styles.rowIcon} aria-hidden>
            {locating ? (
              <Loader2 size={16} strokeWidth={2.1} className={styles.spin} />
            ) : (
              <LocateFixed size={16} strokeWidth={2.1} />
            )}
          </span>
          <span className={styles.rowBody}>
            <span className={styles.rowTitle}>Use my current location</span>
            <span className={cn(styles.rowBlurb, locationError && styles.rowBlurbError)}>
              {locating
                ? "Finding you…"
                : locationError ??
                  "We’ll use GPS, then ask you to confirm the pin."}
            </span>
          </span>
        </button>

        <div className={styles.orDivider} role="separator" aria-label="or">
          <span>or</span>
        </div>

        <Input
          fieldLabel="Street address"
          autoComplete="street-address"
          value={street}
          onChange={(event) => {
            setStreet(event.target.value);
            setLookupFailed(false);
          }}
          disabled={locked}
          invalid={addressInvalid && Boolean(street.trim())}
        />
        <Input
          fieldLabel="City"
          autoComplete="address-level2"
          value={city}
          onChange={(event) => {
            setCity(event.target.value);
            setLookupFailed(false);
          }}
          disabled={locked}
          invalid={cityInvalid || addressInvalid}
        />
        <div className={styles.pairRow}>
          <Input
            fieldLabel="Postal code"
            autoComplete="postal-code"
            value={postal}
            onChange={(event) => {
              setPostal(event.target.value);
              setLookupFailed(false);
            }}
            disabled={locked}
            invalid={addressInvalid && Boolean(postal.trim())}
          />
          <CountryField
            value={country}
            onChange={(next) => {
              setCountry(next);
              setLookupFailed(false);
            }}
            disabled={locked}
            invalid={countryInvalid || addressInvalid}
          />
        </div>
      </form>
    </StepShell>
  );
}

export function OriginStep({
  prefs,
  subStep,
  onOriginChange,
  onOpenAdd,
  onProposeOrigin,
}: {
  prefs: DiscoveryPreferences;
  subStep: DiscoverySubStep;
  onOriginChange: (origin: Origin) => void;
  onOpenAdd: () => void;
  onProposeOrigin: (origin: Origin) => void;
}) {
  if (subStep === "add-origin") {
    return <AddOriginPanel onProposeOrigin={onProposeOrigin} />;
  }

  /*
   * The confirm loop. Origin accuracy silently determines every
   * recommendation, so it is never trusted untyped — the camera flies there,
   * the marker drops, and the traveller says yes.
   */
  if (subStep === "confirm-origin" && prefs.origin) {
    return (
      <StepShell
        title="Did we find you?"
        why="Please verify the start point is right — everything downstream depends on it."
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
      </StepShell>
    );
  }

  return (
    <OriginPicker
      prefs={prefs}
      onOriginChange={onOriginChange}
      onOpenAdd={onOpenAdd}
    />
  );
}

function OriginPicker({
  prefs,
  onOriginChange,
  onOpenAdd,
}: {
  prefs: DiscoveryPreferences;
  onOriginChange: (origin: Origin) => void;
  onOpenAdd: () => void;
}) {
  const homeCity = useSession((s) => s.user?.homeCity) ?? ACCOUNT_USER.homeCity;
  const hydrated = useSessionHydrated();
  const discoveryApi = useDiscoveryApi();

  useEffect(() => {
    if (!hydrated) return;
    if (prefs.origin) return;
    discoveryApi.getState().setOrigin(defaultOriginFromProfile(homeCity));
  }, [discoveryApi, homeCity, hydrated, prefs.origin]);

  return (
    <StepShell
      title="From where will you be leaving?"
      why="This helps us determine the best departure options available to you."
    >
      <div className={styles.originGrid} role="radiogroup" aria-label="Origin city">
        {SAVED_ORIGINS.map((origin) => {
          const selected = prefs.origin?.city === origin.city;
          const isDefault = origin.city === homeCity;
          return (
            <button
              key={origin.city}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={
                isDefault
                  ? `${origin.city}, ${origin.country}, default departure`
                  : `${origin.city}, ${origin.country}`
              }
              onClick={() => onOriginChange(origin)}
              className={cn(styles.originItem, selected && styles.originItemOn)}
            >
              <span className={styles.originCity}>
                <span className={styles.originCityName}>{origin.city}</span>
                {isDefault ? (
                  <Star
                    className={styles.originDefaultMark}
                    size={12}
                    strokeWidth={2.2}
                    fill="currentColor"
                    aria-hidden
                  />
                ) : null}
              </span>
              <span className={styles.originCountry}>{origin.country}</span>
            </button>
          );
        })}
        <button
          type="button"
          className={styles.addAddress}
          onClick={onOpenAdd}
        >
          <Plus size={13} strokeWidth={2.2} />
          Add a new address
        </button>
      </div>
    </StepShell>
  );
}

/* -------------------------------------------------------------------------- */
/* 4 · Budget — with the optional income normaliser                          */
/* -------------------------------------------------------------------------- */

export function BudgetStep({
  prefs,
  topDailyByTier,
  onBudgetChange,
}: {
  prefs: DiscoveryPreferences;
  topDailyByTier: Record<BudgetTier, number> | null;
  onBudgetChange: (budget: BudgetTier) => void;
}) {
  return (
    <StepShell
      title="Next, what's your budget for this trip?"
      why="Money makes the world go round – and helps us filter recommendations."
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

/**
 * Optional income normaliser. Full-page scrim, not a console step — budget
 * stays answered underneath.
 */
export function IncomePrompt({
  open,
  tierLabel,
  value,
  onPick,
  onSkip,
  onContinue,
}: {
  open: boolean;
  tierLabel: string;
  value: IncomeBand | null;
  onPick: (band: IncomeBand) => void;
  onSkip: () => void;
  onContinue: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onSkip}
      label="Income range"
      width={520}
      compactFit
    >
      <div className={styles.incomeDialog}>
        <hgroup className={styles.stepCopy}>
          <h2 className={styles.incomeTitle}>
            Help us understand what &ldquo;{tierLabel}&rdquo; means to you
          </h2>
          <p className={styles.incomeWhy}>
            Optional — this stays on your device and only tunes the cost
            ceiling. Skip it if you&rsquo;d rather use typical local costs.
          </p>
        </hgroup>
        <div className={styles.stack} role="radiogroup" aria-label="Income range">
          {(Object.keys(INCOME_META) as IncomeBand[]).map((band) => {
            const selected = value === band;
            return (
              <button
                key={band}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onPick(band)}
                className={cn(styles.row, styles.rowTight, selected && styles.rowOn)}
              >
                <span className={styles.rowBody}>
                  <span className={styles.rowTitle}>{INCOME_META[band].label}</span>
                </span>
                <span className={styles.rowCheck} aria-hidden>
                  {selected ? <Check size={13} strokeWidth={3} /> : null}
                </span>
              </button>
            );
          })}
        </div>
        <div className={styles.incomeActions}>
          <Button variant="ghost" size="md" onClick={onSkip}>
            Skip
          </Button>
          <Button
            variant="primary"
            size="md"
            iconRight={<ArrowRight size={14} strokeWidth={2.1} />}
            onClick={onContinue}
          >
            Continue
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/* 5 · Populated — rank only                                                 */
/* -------------------------------------------------------------------------- */

const POPULATED_OPTIONS: {
  value: PopulatedPref;
  label: string;
}[] = [
  { value: "open", label: "No preference" },
  { value: "popular", label: "Boost large, popular areas" },
  { value: "quiet", label: "Boost smaller, off-the-beaten-path areas" },
];

export function PopulatedStep({
  prefs,
  onPopulatedChange,
}: {
  prefs: DiscoveryPreferences;
  onPopulatedChange: (value: PopulatedPref) => void;
}) {
  return (
    <StepShell
      title="Do you have a strong preference?"
      why="We'll give areas a boost based on their popularity."
    >
      <div className={styles.stack} role="radiogroup" aria-label="Place scale">
        {POPULATED_OPTIONS.map((option) => {
          const selected = prefs.populated === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onPopulatedChange(option.value)}
              className={cn(styles.row, styles.rowTight, selected && styles.rowOn)}
            >
              <span className={styles.rowBody}>
                <span className={styles.rowTitle}>{option.label}</span>
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
/* 6 · Must-have experiences — the filter                                    */
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
      title="Are there any experiences you must have?"
      why="We'll filter out any cities that can't support them."
    >
      <div className={styles.activityGroups}>
        {EXPERIENCE_GROUPS.map((group) => (
          <div key={group.group} className={styles.activityGroup}>
            <p className={styles.groupLabel}>{group.group}</p>
            <div className={styles.chipWrap}>
              {group.styles.map((style) => (
                <Chip
                  key={style}
                  variant="soft"
                  selection="multiple"
                  selected={prefs.styles.includes(style)}
                  onClick={() => onToggleStyle(style)}
                >
                  {STYLE_META[style].label}
                </Chip>
              ))}
            </div>
          </div>
        ))}
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
/* 7 · Activities — the ranker                                               */
/* -------------------------------------------------------------------------- */

export function ActivitiesStep({
  prefs,
  removedCount,
  onToggleInterest,
}: {
  prefs: DiscoveryPreferences;
  removedCount: number;
  onToggleInterest: (interest: Interest) => void;
}) {
  return (
    <StepShell
      title="Anything specific you'd like to do?"
      why="We'll filter out any cities that can't support them."
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
                {inGroup.map((interest) => (
                  <Chip
                    key={interest}
                    variant="soft"
                    selection="multiple"
                    selected={prefs.interests.includes(interest)}
                    onClick={() => onToggleInterest(interest)}
                  >
                    {INTEREST_META[interest].label}
                  </Chip>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {prefs.interests.length > 0 ? (
        <p className={styles.readout}>
          {removedCount > 0
            ? `${removedCount} ${removedCount === 1 ? "place" : "places"} ruled out so far.`
            : "Every place we know can still support these."}
        </p>
      ) : (
        <p className={styles.readout}>
          Nothing selected — we won&rsquo;t rule anywhere out.
        </p>
      )}
    </StepShell>
  );
}
