"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ChevronRight,
  FileText,
  Home,
  ImagePlus,
  UserRound,
  Utensils,
  Wallet,
  X,
} from "lucide-react";

import { countryByName } from "@/data/countries";
import { Chip, Tag } from "@/components/ui/chip";
import { CountryField } from "@/components/ui/country-field";
import { CountryFlag } from "@/components/ui/country-flag";
import { IconButton } from "@/components/ui/button";
import { Input } from "@/components/ui/controls";
import { OutlineField } from "@/components/ui/outline-field";
import { DateRangeField } from "@/features/landing/date-range-field";
import { Select } from "@/components/ui/select";
import { MobileBack } from "@/components/nav/mobile-back";
import { useBackTarget } from "@/components/nav/back-link";
import { INCOME_META } from "@/lib/categories";
import { useIsCompact } from "@/lib/use-media-query";
import { useHideOnScroll } from "@/lib/use-hide-on-scroll";
import { cn } from "@/lib/utils";
import type {
  AccountUser,
  IncomeBand,
  LanguageId,
  LanguageLevel,
  LanguageSkill,
  SavedAddress,
  TravelDocuments,
} from "@/lib/types";
import {
  initialsFromName,
  normaliseHandle,
  useSessionApi,
} from "@/stores/session-store";

import { ConfirmDeleteModal, type ConfirmKind } from "../planner/confirm-delete";
import { AccountMark } from "./account-mark";
import planner from "../planner/planner-settings.module.css";
import styles from "./account-settings.module.css";

export type AccountSettingsTab =
  | "account"
  | "food"
  | "home"
  | "documents"
  | "income";

export interface AccountSettingsDraft {
  name: string;
  handle: string;
  photoUrl?: string;
  homeCity: string;
  homeCountry: string;
  homeAddress: string;
  addresses: SavedAddress[];
  defaultAddressId: string;
  diets: string[];
  foodRestrictions: string[];
  languages: LanguageSkill[];
  incomeBand: IncomeBand | null;
  documents: TravelDocuments;
}

const TAB_TITLE: Record<AccountSettingsTab, string> = {
  account: "Account",
  food: "Food preferences",
  home: "Home address",
  documents: "Official travel information",
  income: "Income band",
};

interface FoodTag {
  value: string;
  label: string;
}

const DIETS: FoodTag[] = [
  { value: "omnivore", label: "Omnivore" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "pescatarian", label: "Pescatarian" },
  { value: "halal", label: "Halal" },
  { value: "kosher", label: "Kosher" },
];

const RESTRICTIONS: FoodTag[] = [
  { value: "gluten", label: "Gluten" },
  { value: "dairy", label: "Dairy" },
  { value: "nuts", label: "Tree nuts" },
  { value: "peanuts", label: "Peanuts" },
  { value: "shellfish", label: "Shellfish" },
  { value: "egg", label: "Egg" },
  { value: "soy", label: "Soy" },
  { value: "sesame", label: "Sesame" },
];

/** Less common, still on the row — after the defaults. */
const EXTRA_DIETS: FoodTag[] = [
  { value: "keto", label: "Keto" },
  { value: "paleo", label: "Paleo" },
  { value: "low-fodmap", label: "Low FODMAP" },
  { value: "jain", label: "Jain" },
  { value: "hindu-vegetarian", label: "Hindu vegetarian" },
  { value: "mediterranean", label: "Mediterranean" },
];

const EXTRA_RESTRICTIONS: FoodTag[] = [
  { value: "fish", label: "Fish" },
  { value: "mustard", label: "Mustard" },
  { value: "celery", label: "Celery" },
  { value: "lupin", label: "Lupin" },
  { value: "sulphites", label: "Sulphites" },
  { value: "corn", label: "Corn" },
  { value: "garlic", label: "Garlic" },
  { value: "onion", label: "Onion" },
];

const LANGUAGES: { value: LanguageId; label: string }[] = [
  { value: "english", label: "English" },
  { value: "hindi", label: "Hindi" },
  { value: "spanish", label: "Spanish" },
  { value: "french", label: "French" },
  { value: "portuguese", label: "Portuguese" },
  { value: "german", label: "German" },
  { value: "italian", label: "Italian" },
  { value: "japanese", label: "Japanese" },
  { value: "mandarin", label: "Mandarin" },
  { value: "arabic", label: "Arabic" },
  { value: "korean", label: "Korean" },
  { value: "dutch", label: "Dutch" },
  { value: "danish", label: "Danish" },
  { value: "swedish", label: "Swedish" },
  { value: "icelandic", label: "Icelandic" },
];

const LANGUAGE_LEVELS: { value: LanguageLevel; label: string }[] = [
  { value: "native", label: "Native" },
  { value: "fluent", label: "Fluent" },
  { value: "conversational", label: "Conversational" },
  { value: "basic", label: "Basic" },
];

const INCOME_BANDS = Object.keys(INCOME_META) as IncomeBand[];

function languageLabel(id: LanguageId) {
  return LANGUAGES.find((option) => option.value === id)?.label ?? id;
}

function tagKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function sameTag(a: string, b: string) {
  return tagKey(a) === tagKey(b);
}

function hasTag(list: string[], value: string) {
  return list.some((item) => sameTag(item, value));
}

function findFoodTag(catalog: FoodTag[], query: string) {
  const key = tagKey(query);
  if (!key) return null;
  return (
    catalog.find(
      (item) => tagKey(item.value) === key || tagKey(item.label) === key,
    ) ?? null
  );
}

function foodTagLabel(catalog: FoodTag[], value: string) {
  return (
    catalog.find((item) => sameTag(item.value, value) || sameTag(item.label, value))
      ?.label ?? value
  );
}

function foodPreferenceLabel(diets: string[], restrictions: string[]) {
  const dietCatalog = [...DIETS, ...EXTRA_DIETS];
  const restrictionCatalog = [...RESTRICTIONS, ...EXTRA_RESTRICTIONS];
  const labels = [
    ...diets.map((id) => foodTagLabel(dietCatalog, id)),
    ...restrictions.map((id) => foodTagLabel(restrictionCatalog, id)),
  ];
  return labels.length > 0 ? labels.join(" · ") : "No preference";
}

function withHome(
  addresses: SavedAddress[],
  defaultAddressId: string,
) {
  const home =
    addresses.find((place) => place.id === defaultAddressId) ??
    addresses[0] ??
    null;
  return {
    addresses,
    defaultAddressId: home?.id ?? "",
    homeCity: home?.city ?? "",
    homeCountry: home?.country ?? "",
    homeAddress: home?.street ?? "",
  };
}

function addressLine(place: SavedAddress) {
  if (place.street.trim()) {
    return [place.postal, place.city, place.country].filter(Boolean).join(" · ");
  }
  return [place.postal, place.country].filter(Boolean).join(" · ");
}

function blankAddress(): SavedAddress {
  return {
    id: "a-new",
    street: "",
    city: "",
    postal: "",
    country: "",
    countryCode: "",
  };
}

function withCountry(place: SavedAddress, patch: Partial<SavedAddress>): SavedAddress {
  const next = { ...place, ...patch };
  if (patch.country !== undefined) {
    next.countryCode = countryByName(patch.country)?.iso2 ?? "";
  }
  return next;
}

export function captureAccountSettings(
  user: AccountUser,
): AccountSettingsDraft {
  return {
    name: user.name,
    handle: user.handle,
    photoUrl: user.photoUrl,
    homeCity: user.homeCity,
    homeCountry: user.homeCountry,
    homeAddress: user.homeAddress ?? "",
    addresses: (user.addresses ?? []).map((place) => ({ ...place })),
    defaultAddressId: user.defaultAddressId,
    diets: [...(user.diets ?? [])],
    foodRestrictions: [...(user.foodRestrictions ?? [])],
    languages: [...(user.languages ?? [])],
    incomeBand: user.incomeBand ?? null,
    documents: {
      nationality: user.documents?.nationality ?? "",
      passportNumber: user.documents?.passportNumber ?? "",
      passportExpiry: user.documents?.passportExpiry ?? "",
      knownTravellerNumber: user.documents?.knownTravellerNumber ?? "",
      emergencyName: user.documents?.emergencyName ?? "",
      emergencyPhone: user.documents?.emergencyPhone ?? "",
    },
  };
}

export function accountSettingsDirty(
  a: AccountSettingsDraft,
  b: AccountSettingsDraft,
) {
  return JSON.stringify(a) !== JSON.stringify(b);
}

export function AccountSettingsWorkspace({
  draft,
  onChange,
  className,
  islandClassName,
  onClose,
}: {
  draft: AccountSettingsDraft;
  onChange: (next: AccountSettingsDraft) => void;
  className?: string;
  islandClassName?: string;
  onClose?: () => void;
}) {
  const session = useSessionApi();
  const isCompact = useIsCompact();
  const origin = useBackTarget("/dashboard");
  const chrome = useHideOnScroll(isCompact);
  const [tab, setTab] = useState<AccountSettingsTab>("account");
  const [mobilePage, setMobilePage] = useState<AccountSettingsTab | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const [editingAddressId, setEditingAddressId] = useState<string | "new" | null>(
    null,
  );
  const [newAddress, setNewAddress] = useState<SavedAddress>(() => blankAddress());
  const [pendingConfirm, setPendingConfirm] = useState<{
    kind: Extract<ConfirmKind, "delete-address" | "remove-photo">;
    id?: string;
    subject: string;
  } | null>(null);

  useEffect(() => {
    chrome.reset();
  }, [mobilePage, chrome.reset]);

  const previewUser: AccountUser = {
    id: "preview",
    name: draft.name || "Your name",
    handle: draft.handle || "handle",
    initials: initialsFromName(draft.name || "Y"),
    photoUrl: draft.photoUrl,
    colorIndex: 4,
    homeCity: draft.homeCity,
    homeCountry: draft.homeCountry,
    homeAddress: draft.homeAddress,
    addresses: draft.addresses,
    defaultAddressId: draft.defaultAddressId,
    diets: draft.diets,
    foodRestrictions: draft.foodRestrictions,
    languages: draft.languages,
    incomeBand: draft.incomeBand,
    documents: draft.documents,
    memberSinceIso: ACCOUNT_USER_FALLBACK_SINCE,
    stats: { wishlist: 0, visited: 0, avoid: 0 },
    badges: [],
    persona: {
      summary: "",
      traits: [],
      pace: "moderate",
      interests: [],
      styles: [],
      budget: "premium",
      updatedIso: "",
    },
  };

  function patch(next: Partial<AccountSettingsDraft>) {
    onChange({ ...draft, ...next });
  }

  function patchDocs(next: Partial<TravelDocuments>) {
    patch({ documents: { ...draft.documents, ...next } });
  }

  function updateAddress(next: SavedAddress) {
    patch(
      withHome(
        draft.addresses.map((place) => (place.id === next.id ? next : place)),
        draft.defaultAddressId,
      ),
    );
  }

  function addAddress() {
    const city = newAddress.city.trim();
    const country = newAddress.country.trim();
    if (!city || !country) return;
    const next: SavedAddress = {
      ...newAddress,
      id: `a-${normaliseHandle(city) || "place"}-${draft.addresses.length}`,
      street: newAddress.street.trim(),
      city,
      postal: newAddress.postal.trim(),
      country,
      countryCode: countryByName(country)?.iso2 ?? "",
    };
    const addresses = [...draft.addresses, next];
    patch(withHome(addresses, draft.addresses.length === 0 ? next.id : draft.defaultAddressId));
    setNewAddress(blankAddress());
    setEditingAddressId(next.id);
  }

  const activeTab = isCompact ? mobilePage : tab;
  const foodLabel = foodPreferenceLabel(draft.diets, draft.foodRestrictions);

  function deleteAddress(id: string) {
    const addresses = draft.addresses.filter((item) => item.id !== id);
    patch(withHome(addresses, draft.defaultAddressId));
    if (editingAddressId === id) setEditingAddressId(null);
  }
  const incomeLabel = draft.incomeBand
    ? INCOME_META[draft.incomeBand].label
    : "Not set";

  function goBack() {
    if (isCompact && mobilePage) {
      setMobilePage(null);
      return;
    }
    onClose?.();
  }

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

  const panel = (
        <div className={cn(planner.panel, isCompact && planner.mobilePanel)}>
          {activeTab === "account" ? (
            <>
              <Section title="Profile photo">
                <p className={planner.hint}>
                  Shown on the dashboard and in the planner. Initials are used
                  until you add a photo.
                </p>
                <div className={styles.photoRow}>
                  <AccountMark
                    key={draft.photoUrl ?? "none"}
                    user={previewUser}
                    className={styles.photo}
                    fallbackClassName={styles.photoFallback}
                  />
                  <div className={styles.photoActions}>
                    <button
                      type="button"
                      className={planner.textBtn}
                      onClick={() => uploadRef.current?.click()}
                    >
                      {draft.photoUrl ? "Replace photo" : "Add photo"}
                    </button>
                    {draft.photoUrl ? (
                      <button
                        type="button"
                        className={planner.textBtn}
                        onClick={() =>
                          setPendingConfirm({
                            kind: "remove-photo",
                            subject: "Profile photo",
                          })
                        }
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                  <input
                    ref={uploadRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className={planner.coverFile}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = "";
                      if (!file) return;
                      void readAvatarFile(file).then((src) => {
                        if (src) patch({ photoUrl: src });
                      });
                    }}
                  />
                </div>
                <span className={styles.uploadHint} aria-hidden>
                  <ImagePlus size={14} strokeWidth={2} /> JPEG, PNG or WebP
                </span>
              </Section>

              <Section title="Name and username">
                <div className={styles.nameRow}>
                  <OutlineField
                    className={styles.nameField}
                    label="Name"
                    value={draft.name}
                    onChange={(name) => patch({ name })}
                  />
                  <OutlineField
                    className={styles.nameField}
                    label="Username"
                    value={draft.handle}
                    prefix="@"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    onChange={(handle) =>
                      patch({ handle: normaliseHandle(handle) })
                    }
                  />
                </div>
              </Section>

              <Section title="Language skills">
                <p className={planner.hint}>
                  Spoken languages, not the app language. Used when we match
                  destinations and when someone is booking with you.
                </p>
                {draft.languages.length > 0 ? (
                  <div className={styles.skills}>
                    {draft.languages.map((skill) => {
                      const taken = draft.languages.map((item) => item.id);
                      return (
                        <div key={skill.id} className={styles.skillRow}>
                          <Select
                            fieldLabel="Language"
                            label={`${languageLabel(skill.id)} language`}
                            value={skill.id}
                            onChange={(id) =>
                              patch({
                                languages: draft.languages.map((item) =>
                                  item.id === skill.id ? { ...item, id } : item,
                                ),
                              })
                            }
                            options={LANGUAGES.filter(
                              (option) =>
                                option.value === skill.id ||
                                !taken.includes(option.value),
                            )}
                          />
                          <Select
                            fieldLabel="Proficiency"
                            label={`${languageLabel(skill.id)} proficiency`}
                            value={skill.level}
                            onChange={(level) =>
                              patch({
                                languages: draft.languages.map((item) =>
                                  item.id === skill.id
                                    ? { ...item, level }
                                    : item,
                                ),
                              })
                            }
                            options={LANGUAGE_LEVELS}
                          />
                          <IconButton
                            label={`Remove ${languageLabel(skill.id)}`}
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              patch({
                                languages: draft.languages.filter(
                                  (item) => item.id !== skill.id,
                                ),
                              })
                            }
                          >
                            <X size={14} strokeWidth={2.2} />
                          </IconButton>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
                {draft.languages.length < LANGUAGES.length ? (
                  <div className={styles.addSkill}>
                    <button
                      type="button"
                      className={planner.textBtn}
                      onClick={() => {
                        const next = LANGUAGES.find(
                          (option) =>
                            !draft.languages.some(
                              (skill) => skill.id === option.value,
                            ),
                        );
                        if (!next) return;
                        patch({
                          languages: [
                            ...draft.languages,
                            {
                              id: next.value,
                              level:
                                draft.languages.length === 0
                                  ? "native"
                                  : "conversational",
                            },
                          ],
                        });
                      }}
                    >
                      Add language
                    </button>
                  </div>
                ) : null}
              </Section>
            </>
          ) : null}

          {activeTab === "food" ? (
            <>
              <Section title="Food preferences">
                <p className={planner.hint}>
                  Used when we rank restaurants and when someone else is
                  booking a table on a shared trip. Select every one that
                  applies.
                </p>
                <FoodTagGroup
                  label="Food preferences"
                  popular={DIETS}
                  extra={EXTRA_DIETS}
                  selected={draft.diets}
                  onChange={(diets) => patch({ diets })}
                />
              </Section>

              <Section title="Restrictions">
                <p className={planner.hint}>
                  Allergens and exclusions. Select every one that applies.
                </p>
                <FoodTagGroup
                  label="Restrictions"
                  popular={RESTRICTIONS}
                  extra={EXTRA_RESTRICTIONS}
                  selected={draft.foodRestrictions}
                  onChange={(foodRestrictions) => patch({ foodRestrictions })}
                />
              </Section>
            </>
          ) : null}

          {activeTab === "home" ? (
            <Section title="Home address">
              <p className={planner.hint}>
                Discovery starts from the default. Street and postal code are
                used when we need a pickup or a return.
              </p>
              <ul className={styles.addressList} aria-label="Saved addresses">
                {draft.addresses.map((place) => {
                  const on = place.id === draft.defaultAddressId;
                  const editing =
                    editingAddressId !== "new" &&
                    (editingAddressId ?? draft.defaultAddressId) === place.id;
                  if (editing) {
                    return (
                      <li key={place.id} className={styles.addressCard}>
                        <div className={styles.addressCardHead}>
                          <CountryFlag code={place.countryCode} size={36} />
                          <span className={styles.personCopy}>
                            <span className={styles.personName}>
                              {place.street || place.city || "New address"}
                            </span>
                            <span className={styles.personMeta}>
                              {addressLine(place) || "Street, city, postal code and country"}
                            </span>
                          </span>
                          {on ? <Tag tone="brand">Default</Tag> : null}
                          <span className={styles.addressActions}>
                            {on ? null : (
                              <>
                                <button
                                  type="button"
                                  className={styles.addressHint}
                                  onClick={() =>
                                    patch(withHome(draft.addresses, place.id))
                                  }
                                >
                                  Set as default
                                </button>
                                <IconButton
                                  label={`Delete ${place.street || place.city}`}
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    setPendingConfirm({
                                      kind: "delete-address",
                                      id: place.id,
                                      subject: place.street || place.city,
                                    })
                                  }
                                >
                                  <X size={14} strokeWidth={2.2} />
                                </IconButton>
                              </>
                            )}
                          </span>
                        </div>
                        <AddressFields
                          place={place}
                          onChange={updateAddress}
                        />
                      </li>
                    );
                  }
                  const meta = addressLine(place);
                  return (
                    <li key={place.id} className={styles.person}>
                      <button
                        type="button"
                        className={styles.addressPick}
                        onClick={() => setEditingAddressId(place.id)}
                      >
                        <CountryFlag code={place.countryCode} size={36} />
                        <span className={styles.personCopy}>
                          <span className={styles.personName}>
                            {place.street || place.city}
                          </span>
                          {meta ? (
                            <span className={styles.personMeta}>{meta}</span>
                          ) : null}
                        </span>
                        {on ? <Tag tone="brand">Default</Tag> : null}
                      </button>
                      <span className={styles.addressActions}>
                        {on ? null : (
                          <>
                            <button
                              type="button"
                              className={styles.addressHint}
                              onClick={() =>
                                patch(withHome(draft.addresses, place.id))
                              }
                            >
                              Set as default
                            </button>
                            <IconButton
                              label={`Delete ${place.street || place.city}`}
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                setPendingConfirm({
                                  kind: "delete-address",
                                  id: place.id,
                                  subject: place.street || place.city,
                                })
                              }
                            >
                              <X size={14} strokeWidth={2.2} />
                            </IconButton>
                          </>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
              {editingAddressId === "new" ? (
                <div className={styles.addressCard}>
                  <AddressFields
                    place={newAddress}
                    onChange={setNewAddress}
                  />
                  <div className={styles.addressCardActions}>
                    <button
                      type="button"
                      className={planner.textBtn}
                      onClick={addAddress}
                    >
                      Save address
                    </button>
                    <button
                      type="button"
                      className={planner.textBtn}
                      onClick={() => {
                        setNewAddress(blankAddress());
                        setEditingAddressId(null);
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className={planner.textBtn}
                  onClick={() => {
                    setNewAddress(blankAddress());
                    setEditingAddressId("new");
                  }}
                >
                  Add address
                </button>
              )}
            </Section>
          ) : null}


          {activeTab === "documents" ? (
            <>
              <Section title="Passport">
                <p className={planner.hint}>
                  Kept on this device for this demo. Use it so booking and
                  border questions are not asked twice.
                </p>
                <OutlineField
                  label="Nationality"
                  value={draft.documents.nationality}
                  onChange={(nationality) => patchDocs({ nationality })}
                />
                <OutlineField
                  label="Passport number"
                  value={draft.documents.passportNumber}
                  onChange={(passportNumber) => patchDocs({ passportNumber })}
                />
                <DateRangeField
                  mode="single"
                  tone="outlined"
                  startLabel="Expiry"
                  start={draft.documents.passportExpiry || null}
                  end={draft.documents.passportExpiry || null}
                  onChange={(passportExpiry) => patchDocs({ passportExpiry })}
                />
                <OutlineField
                  label="Known traveller / redress number"
                  value={draft.documents.knownTravellerNumber}
                  onChange={(knownTravellerNumber) =>
                    patchDocs({ knownTravellerNumber })
                  }
                />
              </Section>
              <Section title="Emergency contact">
                <OutlineField
                  label="Name"
                  value={draft.documents.emergencyName}
                  onChange={(emergencyName) => patchDocs({ emergencyName })}
                />
                <OutlineField
                  label="Phone"
                  type="tel"
                  value={draft.documents.emergencyPhone}
                  onChange={(emergencyPhone) => patchDocs({ emergencyPhone })}
                />
              </Section>
            </>
          ) : null}

          {activeTab === "income" ? (
            <Section title="Income band">
              <p className={planner.hint}>
                Optional. It only normalises what “budget” or “premium” means
                for you — it never appears on a trip or to collaborators.
              </p>
              <div
                className={styles.bands}
                role="radiogroup"
                aria-label="Income band"
              >
                <label className={styles.band}>
                  <input
                    type="radio"
                    name="income-band"
                    checked={draft.incomeBand === null}
                    onChange={() => patch({ incomeBand: null })}
                  />
                  Prefer not to say
                </label>
                {INCOME_BANDS.map((band) => (
                  <label key={band} className={styles.band}>
                    <input
                      type="radio"
                      name="income-band"
                      checked={draft.incomeBand === band}
                      onChange={() => patch({ incomeBand: band })}
                    />
                    {INCOME_META[band].label}
                  </label>
                ))}
              </div>
            </Section>
          ) : null}
        </div>
  );

  const confirmDialog = (
    <ConfirmDeleteModal
      open={Boolean(pendingConfirm)}
      kind={pendingConfirm?.kind ?? "delete-address"}
      subject={pendingConfirm?.subject ?? ""}
      onCancel={() => setPendingConfirm(null)}
      onConfirm={() => {
        const next = pendingConfirm;
        setPendingConfirm(null);
        if (!next) return;
        if (next.kind === "remove-photo") {
          patch({ photoUrl: undefined });
          return;
        }
        if (next.kind === "delete-address" && next.id) {
          deleteAddress(next.id);
        }
      }}
    />
  );

  if (isCompact) {
    return (
      <div
        className={cn(planner.mobile, className)}
        data-chrome-hidden={chrome.hidden ? "" : undefined}
      >
        <header className={planner.mobileBar}>
          <MobileBack
            from={
              mobilePage
                ? "Profile settings"
                : origin.screen === "Back"
                  ? undefined
                  : origin.screen
            }
            onClick={goBack}
            className={planner.mobileBack}
          />
          <h1 className={planner.mobileTitle}>
            {mobilePage ? TAB_TITLE[mobilePage] : "Profile settings"}
          </h1>
        </header>
        {mobilePage === null ? (
          <div className={planner.mobileIndex} onScroll={chrome.onScroll}>
            <button
              type="button"
              className={planner.hero}
              onClick={() => setMobilePage("account")}
            >
              <AccountMark
                key={draft.photoUrl ?? "none"}
                user={previewUser}
                className={styles.heroMark}
                fallbackClassName={styles.photoFallback}
              />
              <span className={planner.heroCopy}>
                <span className={planner.heroName}>
                  {draft.name || "Your name"}
                </span>
                <span className={planner.heroMeta}>
                  @{draft.handle || "handle"}
                </span>
              </span>
              <ChevronRight size={18} strokeWidth={1.8} aria-hidden />
            </button>

            <p className={planner.mobileGroup}>You</p>
            <div className={planner.mobileGroupCard}>
              <IndexRow
                icon={<UserRound size={18} strokeWidth={1.8} />}
                label="Account"
                value={`${draft.name || "Name"} · @${draft.handle || "handle"}`}
                onClick={() => setMobilePage("account")}
              />
              <IndexRow
                icon={<Utensils size={18} strokeWidth={1.8} />}
                label="Food preferences"
                value={foodLabel}
                onClick={() => setMobilePage("food")}
              />
              <IndexRow
                icon={<Home size={18} strokeWidth={1.8} />}
                label="Home address"
                value={draft.homeCity || "Add a city"}
                onClick={() => setMobilePage("home")}
              />
            </div>
            <p className={planner.mobileGroup}>Planning</p>
            <div className={planner.mobileGroupCard}>
              <IndexRow
                icon={<FileText size={18} strokeWidth={1.8} />}
                label="Official travel information"
                value={draft.documents.nationality || "Add details"}
                onClick={() => setMobilePage("documents")}
              />
              <IndexRow
                icon={<Wallet size={18} strokeWidth={1.8} />}
                label="Income band"
                value={incomeLabel}
                onClick={() => setMobilePage("income")}
              />
            </div>
          </div>
        ) : (
          <div className={planner.mobilePanel} onScroll={chrome.onScroll}>
            {panel}
          </div>
        )}
        {confirmDialog}
      </div>
    );
  }

  return (
    <div className={className}>
      <nav className={planner.nav} aria-label="Account settings">
        <p className={planner.navGroup}>Account</p>
        <NavButton id="account" tab={tab} onSelect={setTab}>
          Account
        </NavButton>
        <NavButton id="food" tab={tab} onSelect={setTab}>
          Food preferences
        </NavButton>
        <NavButton id="home" tab={tab} onSelect={setTab}>
          Home address
        </NavButton>
        <NavButton id="documents" tab={tab} onSelect={setTab}>
          Official travel information
        </NavButton>
        <NavButton id="income" tab={tab} onSelect={setTab}>
          Income band
        </NavButton>
      </nav>
      <div className={islandClassName}>{panel}</div>
      {confirmDialog}
    </div>
  );
}

const ACCOUNT_USER_FALLBACK_SINCE = "2023-11-02";

function IndexRow({
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
    <button type="button" className={planner.indexRow} onClick={onClick}>
      {icon ? (
        <span className={planner.indexIcon} aria-hidden>
          {icon}
        </span>
      ) : null}
      <span className={planner.indexCopy}>
        <span className={planner.indexLabel}>{label}</span>
        {value ? <span className={planner.indexValue}>{value}</span> : null}
      </span>
      <ChevronRight size={18} strokeWidth={1.8} aria-hidden />
    </button>
  );
}

function NavButton({
  id,
  tab,
  onSelect,
  children,
}: {
  id: AccountSettingsTab;
  tab: AccountSettingsTab;
  onSelect: (id: AccountSettingsTab) => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={cn(planner.navBtn, tab === id && planner.navOn)}
      onClick={() => onSelect(id)}
    >
      {children}
    </button>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={planner.section}>
      <h2 className={planner.sectionTitle}>{title}</h2>
      <div className={planner.sectionBody}>{children}</div>
    </section>
  );
}

function AddressFields({
  place,
  onChange,
}: {
  place: SavedAddress;
  onChange: (next: SavedAddress) => void;
}) {
  return (
    <div className={styles.addressFields}>
      <Input
        fieldLabel="Street address"
        autoComplete="street-address"
        value={place.street}
        onChange={(event) =>
          onChange(withCountry(place, { street: event.target.value }))
        }
      />
      <Input
        fieldLabel="City"
        autoComplete="address-level2"
        value={place.city}
        onChange={(event) =>
          onChange(withCountry(place, { city: event.target.value }))
        }
      />
      <div className={styles.addressPair}>
        <Input
          fieldLabel="Postal code"
          autoComplete="postal-code"
          value={place.postal}
          onChange={(event) =>
            onChange(withCountry(place, { postal: event.target.value }))
          }
        />
        <CountryField
          value={place.country}
          onChange={(country) => onChange(withCountry(place, { country }))}
        />
      </div>
    </div>
  );
}

function FoodTagGroup({
  label,
  popular,
  extra,
  selected,
  onChange,
}: {
  label: string;
  popular: FoodTag[];
  extra: FoodTag[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const catalog = [...popular, ...extra];
  const custom = selected.filter(
    (value) => !catalog.some((item) => sameTag(item.value, value) || sameTag(item.label, value)),
  );
  const shown = [
    ...popular,
    ...extra,
    ...custom.map((value) => ({ value, label: foodTagLabel(catalog, value) })),
  ];

  function toggle(value: string) {
    onChange(
      hasTag(selected, value)
        ? selected.filter((item) => !sameTag(item, value))
        : [...selected, value],
    );
  }

  function addCustom() {
    const next = query.trim();
    if (!next) return;
    const known = findFoodTag(catalog, next);
    const value = known?.value ?? next;
    if (!hasTag(selected, value)) onChange([...selected, value]);
    setQuery("");
  }

  return (
    <div className={styles.foodTags}>
      <div className={styles.chips} aria-label={label}>
        {shown.map((option) => {
          const on = hasTag(selected, option.value);
          return (
            <Chip
              key={option.value}
              variant="soft"
              selection="multiple"
              selected={on}
              onClick={() => toggle(option.value)}
            >
              {option.label}
            </Chip>
          );
        })}
      </div>
      <form
        className={styles.foodAddField}
        onSubmit={(event) => {
          event.preventDefault();
          addCustom();
        }}
      >
        <OutlineField
          label="Add more"
          value={query}
          onChange={setQuery}
        />
        <button type="submit" className={planner.textBtn} disabled={!query.trim()}>
          Add
        </button>
      </form>
    </div>
  );
}

function readAvatarFile(file: File): Promise<string | null> {
  if (!file.type.startsWith("image/")) return Promise.resolve(null);
  if (file.size > 6 * 1024 * 1024) return Promise.resolve(null);

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve(null);
    reader.onload = () => {
      const raw = String(reader.result ?? "");
      const image = new Image();
      image.onload = () => {
        const max = 720;
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
        resolve(canvas.toDataURL("image/jpeg", 0.86));
      };
      image.onerror = () => resolve(raw);
      image.src = raw;
    };
    reader.readAsDataURL(file);
  });
}
