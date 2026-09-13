"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronRight, Command, Eye, ImagePlus, Link2, Settings, SlidersHorizontal } from "lucide-react";

import { getDestination } from "@/data/destinations";
import { coverPhotoSrc, resolveTripCover } from "@/data/place-photos";
import { Button, IconButton } from "@/components/ui/button";
import { OutlineField } from "@/components/ui/outline-field";
import { Select } from "@/components/ui/select";
import { Popover } from "@/components/ui/overlay";
import { MobileBack } from "@/components/nav/mobile-back";
import { DestinationCover } from "@/features/dashboard/destination-cover";
import { DateRangeField } from "@/features/landing/date-range-field";
import { tripDateRange } from "@/lib/dashboard/format";
import { durationLabel } from "@/lib/trip/time";
import { cn } from "@/lib/utils";
import { useIsCompact } from "@/lib/use-media-query";
import { useHideOnScroll } from "@/lib/use-hide-on-scroll";
import { useTrip, useTripApi } from "@/stores/trip-store";

import { ConfirmDeleteModal, type ConfirmKind } from "./confirm-delete";
import { CancelTripModal } from "./cancel-trip-modal";
import styles from "./planner-settings.module.css";

const SHORTCUTS = [
  { label: "Day", key: "D" },
  { label: "Week", key: "W" },
  { label: "4 days", key: "X" },
  { label: "Trip", key: "T" },
  { label: "Itinerary", key: "I" },
] as const;

const COVERS = [
  { id: "map", src: null, label: "Destination" },
  { id: "tokyo", src: "/destinations/tokyo.jpg", label: "Hanami" },
  { id: "lisbon", src: "/destinations/lisbon.jpg", label: "Tram" },
  { id: "nyc", src: "/destinations/nyc.jpg", label: "Skyline" },
  { id: "copenhagen", src: "/destinations/copenhagen.jpg", label: "Nyhavn" },
  { id: "marrakesh", src: "/destinations/marrakesh.jpg", label: "Medina" },
  { id: "bridge", src: "/attractions/nyc/brooklyn-bridge.jpg", label: "Bridge" },
  { id: "lagoon", src: "/attractions/reykjavik/sky-lagoon.jpg", label: "Lagoon" },
  { id: "gondola", src: "/attractions/queenstown/skyline-gondola-ben-lomond-track.jpg", label: "Alpine" },
] as const;

const START_HOURS = [5, 6, 7, 8, 9] as const;
const END_HOURS = [20, 21, 22, 23, 24] as const;
const DURATIONS = [30, 45, 60, 90, 120] as const;

type SettingsTab = "general" | "view" | "shortcuts" | "trip";

const TAB_TITLE: Record<SettingsTab, string> = {
  general: "General",
  view: "View options",
  shortcuts: "Keyboard shortcuts",
  trip: "Access and sharing",
};

function hourOption(hour: number, clock: "12h" | "24h") {
  if (hour === 24) return clock === "24h" ? "24:00" : "12 AM";
  if (clock === "24h") return `${String(hour).padStart(2, "0")}:00`;
  if (hour === 0) return "12 AM";
  if (hour === 12) return "12 PM";
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

export function PlannerSettings({
  weekendsApply,
  onOpen,
}: {
  weekendsApply: boolean;
  onOpen: () => void;
}) {
  const api = useTripApi();
  const prefs = useTrip((s) => s.prefs);
  const [menuOpen, setMenuOpen] = useState(false);
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);

  return (
    <>
      <IconButton
        ref={setAnchor}
        label="Settings"
        size="sm"
        variant="ghost"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((value) => !value)}
      >
        <Settings size={18} strokeWidth={1.9} />
      </IconButton>

      <Popover
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        anchor={anchor}
        placement="bottom"
        align="end"
        offset={4}
        width={260}
        label="Settings"
        className={styles.menuPopover}
      >
        <div className={styles.menu} role="menu">
          <button
            type="button"
            role="menuitem"
            className={styles.toggle}
            onClick={() => {
              setMenuOpen(false);
              onOpen();
            }}
          >
            Settings
          </button>
          <div className={styles.rule} />
          <button
            type="button"
            role="menuitemcheckbox"
            aria-checked={prefs.showWeekends}
            aria-disabled={!weekendsApply}
            className={cn(styles.toggle, !weekendsApply && styles.toggleOff)}
            onClick={() =>
              weekendsApply &&
              api.getState().updatePrefs({ showWeekends: !prefs.showWeekends })
            }
          >
            <span className={cn(styles.check, prefs.showWeekends && styles.checkOn)}>
              {prefs.showWeekends ? <Check size={14} strokeWidth={2.6} /> : null}
            </span>
            Show weekends
          </button>
          <button
            type="button"
            role="menuitemcheckbox"
            aria-checked={prefs.mineOnly}
            className={styles.toggle}
            onClick={() => api.getState().updatePrefs({ mineOnly: !prefs.mineOnly })}
          >
            <span className={cn(styles.check, prefs.mineOnly && styles.checkOn)}>
              {prefs.mineOnly ? <Check size={14} strokeWidth={2.6} /> : null}
            </span>
            Show only my stops
          </button>
        </div>
      </Popover>

    </>
  );
}

export function PlannerSettingsWorkspace({
  weekendsApply,
  className,
  islandClassName,
  onClose,
}: {
  weekendsApply: boolean;
  className?: string;
  islandClassName?: string;
  onClose?: () => void;
}) {
  const router = useRouter();
  const api = useTripApi();
  const isCompact = useIsCompact();
  const trip = useTrip((s) => s.trip);
  const prefs = useTrip((s) => s.prefs);
  const destination = getDestination(trip.destinationId);
  const destPhoto = coverPhotoSrc(trip.destinationId);
  const resolvedCover = resolveTripCover(trip.coverImage, trip.destinationId);
  const covers = useMemo(() => {
    const drawing = COVERS[0];
    const dest = destPhoto
      ? [
          {
            id: "destination-photo",
            src: destPhoto,
            label: destination?.name ?? "Photo",
          },
        ]
      : [];
    const gallery = COVERS.slice(1).filter((cover) => cover.src !== destPhoto);
    return [drawing, ...dest, ...gallery];
  }, [destPhoto, destination?.name]);
  const [tab, setTab] = useState<SettingsTab>("general");
  const [mobilePage, setMobilePage] = useState<SettingsTab | null>(null);
  const chrome = useHideOnScroll(isCompact);
  const [pending, setPending] = useState<Extract<ConfirmKind, "reset" | "cancel-trip"> | null>(
    null,
  );
  const uploadRef = useRef<HTMLInputElement>(null);
  const customCover =
    trip.coverImage &&
    !covers.some((cover) => cover.src === resolvedCover || cover.src === trip.coverImage)
      ? trip.coverImage
      : null;

  const timezoneLabel = useMemo(
    () => trip.timezone.replace(/_/g, " "),
    [trip.timezone],
  );
  const datesLabel = tripDateRange(trip.startDate, trip.endDate);
  const viewSummary = [
    weekendsApply && prefs.showWeekends ? "Weekends" : null,
    prefs.weekStartsOn === 1 ? "Monday" : "Sunday",
    prefs.timeFormat === "12h" ? "12-hour" : "24-hour",
  ]
    .filter(Boolean)
    .join(" · ");
  const heroCover = resolvedCover || destPhoto || customCover;

  function goBack() {
    if (isCompact && mobilePage) {
      setMobilePage(null);
      return;
    }
    onClose?.();
  }

  const activeTab = isCompact ? mobilePage : tab;

  useEffect(() => {
    if (!isCompact) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      if (mobilePage) {
        setMobilePage(null);
        return;
      }
      onClose?.();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [isCompact, mobilePage, onClose]);

  useEffect(() => {
    chrome.reset();
  }, [mobilePage, chrome.reset]);

  const panel = (
        <div
          className={cn(styles.panel, isCompact && styles.mobilePanel)}
          onScroll={isCompact ? chrome.onScroll : undefined}
        >
          {activeTab === "general" ? (
            <>
              <Section title="Language and region">
                <OutlineField
                  label="Trip name"
                  value={trip.name}
                  onChange={(value) => api.getState().updateTripMeta({ name: value })}
                />
                <OutlineField
                  label="Destination"
                  value={
                    destination
                      ? `${destination.name}, ${destination.country}`
                      : "Not chosen yet"
                  }
                  readOnly
                />
                <p className={styles.hint}>
                  Names and the map stay in the destination’s language. Time
                  zone follows the city.
                </p>
              </Section>

              <Section title="Time zone">
                <OutlineField label="Primary time zone" value={timezoneLabel} readOnly />
              </Section>

              <Section title="Trip dates">
                <p className={styles.hint}>
                  The stay on the calendar follows these nights.
                </p>
                <div className={styles.dates}>
                  <DateRangeField
                    start={trip.startDate}
                    end={trip.endDate}
                    tone="outlined"
                    onChange={(start, end) =>
                      api.getState().updateTripMeta({ startDate: start, endDate: end })
                    }
                  />
                </div>
              </Section>

              <Section title="Cover">
                <p className={styles.hint}>
                  Shown on this trip. Destination keeps the map drawing.
                </p>
                <div className={styles.covers}>
                  {covers.map((cover) => {
                    const selected =
                      (cover.src === null && trip.coverImage === null) ||
                      (cover.src !== null &&
                        trip.coverImage !== null &&
                        resolvedCover === cover.src);
                    return (
                      <button
                        key={cover.id}
                        type="button"
                        className={cn(styles.cover, selected && styles.coverOn)}
                        onClick={() =>
                          api.getState().updateTripMeta({ coverImage: cover.src })
                        }
                      >
                        {cover.src ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={cover.src} alt="" />
                        ) : (
                          <DestinationCover
                            destinationId={trip.destinationId}
                            hideLabel
                            className={styles.coverMap}
                          />
                        )}
                        <span>{cover.label}</span>
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    className={cn(styles.cover, customCover && styles.coverOn)}
                    onClick={() => uploadRef.current?.click()}
                  >
                    {customCover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={customCover} alt="" />
                    ) : (
                      <span className={styles.coverUpload} aria-hidden>
                        <ImagePlus size={18} strokeWidth={2} />
                      </span>
                    )}
                    <span>{customCover ? "Yours" : "Upload"}</span>
                  </button>
                  <input
                    ref={uploadRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className={styles.coverFile}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      if (!file) return;
                      void readCoverFile(file).then((src) => {
                        if (src) api.getState().updateTripMeta({ coverImage: src });
                      });
                    }}
                  />
                </div>
              </Section>

              <Section title="Event settings">
                <div className={styles.fieldMax}>
                  <Select
                    fieldLabel="Default duration"
                    label="Default duration"
                    value={String(prefs.defaultDurationMin)}
                    onChange={(minutes) =>
                      api.getState().updatePrefs({
                        defaultDurationMin: Number(minutes),
                      })
                    }
                    options={DURATIONS.map((minutes) => ({
                      value: String(minutes),
                      label: durationLabel(minutes),
                    }))}
                  />
                </div>
                <p className={styles.hint}>
                  Used when you add a stop without drawing a range.
                </p>
              </Section>
            </>
          ) : null}

          {activeTab === "view" ? (
            <>
              <Section title="View options">
                <CheckRow
                  checked={prefs.showWeekends}
                  disabled={!weekendsApply}
                  onChange={(checked) =>
                    api.getState().updatePrefs({ showWeekends: checked })
                  }
                >
                  Show weekends
                </CheckRow>
                <CheckRow
                  checked={prefs.mineOnly}
                  onChange={(checked) =>
                    api.getState().updatePrefs({ mineOnly: checked })
                  }
                >
                  Show only my stops
                </CheckRow>
                <div className={styles.fieldMax}>
                  <Select
                    fieldLabel="Start week on"
                    label="Start week on"
                    value={String(prefs.weekStartsOn)}
                    onChange={(value) =>
                      api.getState().updatePrefs({
                        weekStartsOn: Number(value) as 0 | 1,
                      })
                    }
                    options={[
                      { value: "0", label: "Sunday" },
                      { value: "1", label: "Monday" },
                    ]}
                  />
                </div>
                <div className={styles.fieldMax}>
                  <Select
                    fieldLabel="Time format"
                    label="Time format"
                    value={prefs.timeFormat}
                    onChange={(value) =>
                      api.getState().updatePrefs({ timeFormat: value })
                    }
                    options={[
                      { value: "12h", label: "1:00pm" },
                      { value: "24h", label: "13:00" },
                    ]}
                  />
                </div>
              </Section>

              <Section title="Active hours">
                <p className={styles.hint}>
                  Set the times you usually begin and end the day. The grid
                  stays a full day — going outside this window asks before
                  widening it.
                </p>
                <div className={styles.hours}>
                  <Select
                    fieldLabel="From"
                    label="Active hours from"
                    value={String(prefs.dayStartHour)}
                    onChange={(hour) =>
                      api.getState().updatePrefs({
                        dayStartHour: Number(hour),
                      })
                    }
                    options={[...new Set([...START_HOURS, prefs.dayStartHour])]
                      .sort((a, b) => a - b)
                      .map((hour) => ({
                      value: String(hour),
                      label: hourOption(hour, prefs.timeFormat),
                    }))}
                  />
                  <Select
                    fieldLabel="To"
                    label="Active hours to"
                    value={String(prefs.dayEndHour)}
                    onChange={(hour) =>
                      api.getState().updatePrefs({
                        dayEndHour: Number(hour),
                      })
                    }
                    options={[...new Set([...END_HOURS, prefs.dayEndHour])]
                      .filter((hour) => hour > prefs.dayStartHour + 3)
                      .sort((a, b) => a - b)
                      .map((hour) => ({
                      value: String(hour),
                      label: hourOption(hour, prefs.timeFormat),
                    }))}
                  />
                </div>
              </Section>
            </>
          ) : null}

          {activeTab === "shortcuts" ? (
            <Section title="Keyboard shortcuts">
              <p className={styles.hint}>
                These work when you are not typing in a field.
              </p>
              <div className={styles.shortcutTable}>
                {SHORTCUTS.map((item) => (
                  <div key={item.key} className={styles.shortcutRow}>
                    <span>{item.label}</span>
                    <kbd>{item.key}</kbd>
                  </div>
                ))}
              </div>
            </Section>
          ) : null}

          {activeTab === "trip" ? (
            isCompact ? (
              <>
                <Section title="Access">
                  <div className={styles.settingRow}>
                    <span className={styles.settingCopy}>
                      <span className={styles.settingLabel}>Link sharing</span>
                      <span className={styles.settingValue}>
                        Anyone with the link can open this plan
                      </span>
                    </span>
                  </div>
                  <button
                    type="button"
                    className={styles.actionRow}
                    onClick={() => {
                      void navigator.clipboard.writeText(window.location.href);
                      api.getState().showToast("Trip link copied", "success");
                    }}
                  >
                    Copy trip link
                  </button>
                </Section>
                <Section title="Remove trip">
                  <button
                    type="button"
                    className={styles.choiceRow}
                    onClick={() => setPending("reset")}
                  >
                    <span className={styles.settingCopy}>
                      <span className={styles.settingLabel}>Reset to original plan</span>
                      <span className={styles.settingValue}>
                        Restores the demo itinerary
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    className={styles.actionDanger}
                    onClick={() => setPending("cancel-trip")}
                  >
                    <span className={styles.settingCopy}>
                      <span className={styles.settingLabel}>Cancel trip</span>
                      <span className={styles.settingValue}>
                        Delete for everyone, or leave and pass it on
                      </span>
                    </span>
                  </button>
                </Section>
              </>
            ) : (
            <>
              <Section title="Access permissions">
                <p className={styles.hint}>
                  Anyone with the link can open this demo plan.
                </p>
                <div className={styles.tripActions}>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      void navigator.clipboard.writeText(window.location.href);
                      api.getState().showToast("Trip link copied", "success");
                    }}
                  >
                    Copy trip link
                  </Button>
                </div>
              </Section>

              <Section title="Remove trip">
                <p className={styles.hint}>
                  Reset restores this trip&rsquo;s original plan. Cancel trip
                  asks whether to delete it for everyone or leave and hand it
                  to a new organiser.
                </p>
                <div className={styles.tripActions}>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPending("reset")}
                  >
                    Reset to original plan
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setPending("cancel-trip")}
                  >
                    Cancel trip
                  </Button>
                </div>
              </Section>
            </>
            )
          ) : null}
        </div>
  );

  return (
    <>
      {isCompact ? (
        <div
          className={cn(styles.mobile, className)}
          data-chrome-hidden={chrome.hidden ? "" : undefined}
        >
          <header className={styles.mobileBar}>
            <MobileBack
              from={mobilePage ? "Settings" : "Trip"}
              onClick={goBack}
              className={styles.mobileBack}
            />
            <h1 className={styles.mobileTitle}>
              {mobilePage ? TAB_TITLE[mobilePage] : "Settings"}
            </h1>
          </header>
          {mobilePage === null ? (
            <div className={styles.mobileIndex} onScroll={chrome.onScroll}>
              <button
                type="button"
                className={styles.hero}
                onClick={() => setMobilePage("general")}
              >
                <span className={styles.heroCover}>
                  {heroCover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={heroCover} alt="" />
                  ) : (
                    <DestinationCover
                      destinationId={trip.destinationId}
                      hideLabel
                    />
                  )}
                </span>
                <span className={styles.heroCopy}>
                  <span className={styles.heroName}>{trip.name}</span>
                  <span className={styles.heroMeta}>
                    {[destination?.name, datesLabel].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <ChevronRight size={18} strokeWidth={1.8} aria-hidden />
              </button>

              <p className={styles.mobileGroup}>Preferences</p>
              <div className={styles.mobileGroupCard}>
                <IndexRow
                  icon={<SlidersHorizontal size={18} strokeWidth={1.8} />}
                  label="General"
                  value={timezoneLabel}
                  onClick={() => setMobilePage("general")}
                />
                <IndexRow
                  icon={<Eye size={18} strokeWidth={1.8} />}
                  label="View options"
                  value={viewSummary}
                  onClick={() => setMobilePage("view")}
                />
                <IndexRow
                  icon={<Command size={18} strokeWidth={1.8} />}
                  label="Keyboard shortcuts"
                  value={`${SHORTCUTS.length} shortcuts`}
                  onClick={() => setMobilePage("shortcuts")}
                />
              </div>
              <p className={styles.mobileGroup}>This trip</p>
              <div className={styles.mobileGroupCard}>
                <IndexRow
                  icon={<Link2 size={18} strokeWidth={1.8} />}
                  label="Access and sharing"
                  value="Anyone with the link"
                  onClick={() => setMobilePage("trip")}
                />
              </div>
            </div>
          ) : (
            panel
          )}
        </div>
      ) : (
        <div className={className}>
          <nav className={styles.nav} aria-label="Settings">
            <p className={styles.navGroup}>General</p>
            <NavButton id="general" tab={tab} onSelect={setTab}>
              General
            </NavButton>
            <NavButton id="view" tab={tab} onSelect={setTab}>
              View options
            </NavButton>
            <NavButton id="shortcuts" tab={tab} onSelect={setTab}>
              Keyboard shortcuts
            </NavButton>

            <p className={styles.navGroup}>Settings for this trip</p>
            <NavButton id="trip" tab={tab} onSelect={setTab} nested>
              {trip.name}
            </NavButton>
          </nav>

          <div className={islandClassName}>{panel}</div>
        </div>
      )}
      <ConfirmDeleteModal
        open={pending === "reset"}
        kind="reset"
        subject={trip.name}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          setPending(null);
          api.getState().resetTrip();
        }}
      />
      <CancelTripModal
        open={pending === "cancel-trip"}
        travellers={trip.travellers}
        ownerId={
          trip.travellers.find((person) => person.role === "owner")?.id ??
          trip.travellers[0]?.id ??
          null
        }
        onCancel={() => setPending(null)}
        onConfirm={(intent, successorId) => {
          setPending(null);
          if (intent === "leave" && successorId) {
            api.getState().leaveTrip(successorId);
            router.push("/dashboard");
            return;
          }
          api.getState().resetTrip();
          router.push("/dashboard");
        }}
      />
    </>
  );
}

function NavButton({
  id,
  tab,
  onSelect,
  nested = false,
  children,
}: {
  id: SettingsTab;
  tab: SettingsTab;
  onSelect: (id: SettingsTab) => void;
  nested?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={cn(styles.navBtn, nested && styles.navNested, tab === id && styles.navOn)}
      onClick={() => onSelect(id)}
    >
      {children}
    </button>
  );
}

export function IndexRow({
  icon,
  label,
  value,
  onClick,
}: {
  icon?: ReactNode;
  label: string;
  value?: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className={styles.indexRow} onClick={onClick}>
      {icon ? (
        <span className={styles.indexIcon} aria-hidden>
          {icon}
        </span>
      ) : null}
      <span className={styles.indexCopy}>
        <span className={styles.indexLabel}>{label}</span>
        {value ? <span className={styles.indexValue}>{value}</span> : null}
      </span>
      <ChevronRight size={18} strokeWidth={1.8} aria-hidden />
    </button>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      <div className={styles.sectionBody}>{children}</div>
    </section>
  );
}

function CheckRow({
  checked,
  onChange,
  disabled = false,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <label className={cn(styles.checkRow, disabled && styles.checkDisabled)}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className={styles.checkLabel}>{children}</span>
    </label>
  );
}

function readCoverFile(file: File): Promise<string | null> {
  if (!file.type.startsWith("image/")) return Promise.resolve(null);
  if (file.size > 8 * 1024 * 1024) return Promise.resolve(null);

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve(null);
    reader.onload = () => {
      const raw = String(reader.result ?? "");
      const image = new Image();
      image.onload = () => {
        const max = 1600;
        const scale = Math.min(1, max / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext("2d");
        if (!context) {
          resolve(raw);
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.84));
      };
      image.onerror = () => resolve(raw);
      image.src = raw;
    };
    reader.readAsDataURL(file);
  });
}
