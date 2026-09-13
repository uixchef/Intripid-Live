import type { LngLat } from "@/lib/types";

export interface Continent {
  id: string;
  name: string;
  coords: LngLat;
  iso2Group: string[];
}

/**
 * Continents as addable avoid/wishlist units. ISO lists are the countries
 * Mapbox will paint; they are representative, not a political gazetteer.
 */
export const CONTINENTS: Continent[] = [
  {
    id: "africa",
    name: "Africa",
    coords: { lng: 20, lat: 7 },
    iso2Group: [
      "DZ", "AO", "BJ", "BW", "BF", "BI", "CM", "CV", "CF", "TD", "KM", "CG",
      "CD", "CI", "DJ", "EG", "GQ", "ER", "SZ", "ET", "GA", "GM", "GH", "GN",
      "GW", "KE", "LS", "LR", "LY", "MG", "MW", "ML", "MR", "MU", "MA", "MZ",
      "NA", "NE", "NG", "RW", "ST", "SN", "SC", "SL", "SO", "ZA", "SS", "SD",
      "TZ", "TG", "TN", "UG", "ZM", "ZW", "EH",
    ],
  },
  {
    id: "antarctica",
    name: "Antarctica",
    coords: { lng: 0, lat: -80 },
    iso2Group: ["AQ"],
  },
  {
    id: "asia",
    name: "Asia",
    coords: { lng: 90, lat: 30 },
    iso2Group: [
      "AF", "AM", "AZ", "BH", "BD", "BT", "BN", "KH", "CN", "CY", "GE", "IN",
      "ID", "IR", "IQ", "IL", "JP", "JO", "KZ", "KW", "KG", "LA", "LB", "MY",
      "MV", "MN", "MM", "NP", "KP", "OM", "PK", "PS", "PH", "QA", "SA", "SG",
      "KR", "LK", "SY", "TW", "TJ", "TH", "TL", "TR", "TM", "AE", "UZ", "VN",
      "YE",
    ],
  },
  {
    id: "europe",
    name: "Europe",
    coords: { lng: 10, lat: 50 },
    iso2Group: [
      "AL", "AD", "AT", "BY", "BE", "BA", "BG", "HR", "CZ", "DK", "EE", "FI",
      "FR", "DE", "GR", "HU", "IS", "IE", "IT", "XK", "LV", "LI", "LT", "LU",
      "MT", "MD", "MC", "ME", "NL", "MK", "NO", "PL", "PT", "RO", "RU", "SM",
      "RS", "SK", "SI", "ES", "SE", "CH", "UA", "GB", "VA",
    ],
  },
  {
    id: "north-america",
    name: "North America",
    coords: { lng: -100, lat: 40 },
    iso2Group: [
      "AG", "BS", "BB", "BZ", "CA", "CR", "CU", "DM", "DO", "SV", "GD", "GT",
      "HT", "HN", "JM", "MX", "NI", "PA", "KN", "LC", "VC", "TT", "US",
    ],
  },
  {
    id: "oceania",
    name: "Oceania",
    coords: { lng: 150, lat: -25 },
    iso2Group: [
      "AU", "FJ", "KI", "MH", "FM", "NR", "NZ", "PW", "PG", "WS", "SB", "TO",
      "TV", "VU",
    ],
  },
  {
    id: "south-america",
    name: "South America",
    coords: { lng: -60, lat: -15 },
    iso2Group: [
      "AR", "BO", "BR", "CL", "CO", "EC", "GY", "PY", "PE", "SR", "UY", "VE",
    ],
  },
];
