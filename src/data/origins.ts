import type { Origin } from "@/lib/types";

/**
 * Saved departure cities shared by the profile default and Discovery.
 *
 * The Default tag is not stored here — it is derived from the account's
 * `homeCity`, so any of these can be the starting point without a second list.
 */
export const SAVED_ORIGINS: Origin[] = [
  { city: "London", country: "United Kingdom", countryCode: "GB", coords: { lng: -0.1276, lat: 51.5072 } },
  { city: "San Francisco", country: "United States", countryCode: "US", coords: { lng: -122.4194, lat: 37.7749 } },
  { city: "Chicago", country: "United States", countryCode: "US", coords: { lng: -87.6298, lat: 41.8781 } },
  { city: "Berlin", country: "Germany", countryCode: "DE", coords: { lng: 13.405, lat: 52.52 } },
  { city: "Toronto", country: "Canada", countryCode: "CA", coords: { lng: -79.3832, lat: 43.6532 } },
  { city: "Singapore", country: "Singapore", countryCode: "SG", coords: { lng: 103.8198, lat: 1.3521 } },
  { city: "Mumbai", country: "India", countryCode: "IN", coords: { lng: 72.8777, lat: 19.076 } },
  { city: "Sydney", country: "Australia", countryCode: "AU", coords: { lng: 151.2093, lat: -33.8688 } },
];

export function originByCity(city: string): Origin | undefined {
  return SAVED_ORIGINS.find((origin) => origin.city === city);
}

export function defaultOriginFromProfile(homeCity: string | null | undefined): Origin {
  return originByCity(homeCity ?? "") ?? SAVED_ORIGINS[0];
}

/** Address book for settings: saved origins, plus a custom home if it isn’t in the list. */
export function savedAddressesFor(
  homeCity: string,
  homeCountry: string,
): Origin[] {
  if (!homeCity.trim() || originByCity(homeCity)) return SAVED_ORIGINS;
  return [
    {
      city: homeCity,
      country: homeCountry,
      countryCode: "",
      coords: { lng: 0, lat: 0 },
    },
    ...SAVED_ORIGINS,
  ];
}
