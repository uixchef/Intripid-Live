import { CONTINENTS } from "./continents";

export interface Country {
  iso2: string;
  name: string;
  aliases: string[];
}

const ALIASES: Record<string, string[]> = {
  AE: ["UAE", "Emirates"],
  GB: ["UK", "Britain", "Great Britain", "England", "Scotland", "Wales"],
  KR: ["Korea", "South Korea", "Republic of Korea"],
  KP: ["North Korea"],
  NL: ["Holland"],
  CZ: ["Czechia", "Czech"],
  US: ["USA", "America", "United States of America"],
  RU: ["Russia"],
  TR: ["Turkey"],
  VN: ["Viet Nam"],
  CI: ["Ivory Coast", "Cote d'Ivoire"],
  CD: ["DRC", "Congo"],
  CG: ["Congo"],
  LA: ["Laos"],
  MM: ["Burma"],
  SY: ["Syria"],
  TZ: ["Tanzania"],
  BO: ["Bolivia"],
  IR: ["Iran", "Persia"],
  MD: ["Moldova"],
};

const names = new Intl.DisplayNames(["en"], { type: "region" });

const ISO2 = [
  ...new Set([
    ...CONTINENTS.flatMap((continent) => continent.iso2Group),
    "HK",
    "MO",
    "PR",
    "GU",
    "VI",
  ]),
];

export const COUNTRIES: Country[] = ISO2.map((iso2) => {
  const name = names.of(iso2) ?? iso2;
  return {
    iso2,
    name,
    aliases: ALIASES[iso2] ?? [],
  };
}).sort((a, b) => a.name.localeCompare(b.name));

export function filterCountries(query: string, limit = 8): Country[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const scored = COUNTRIES.map((country) => {
    const name = country.name.toLowerCase();
    const iso = country.iso2.toLowerCase();
    const aliasHit = country.aliases.find((alias) =>
      alias.toLowerCase().includes(q),
    );
    let rank = -1;
    if (iso === q || country.aliases.some((alias) => alias.toLowerCase() === q)) {
      rank = 0;
    } else if (name.startsWith(q) || country.aliases.some((alias) => alias.toLowerCase().startsWith(q))) {
      rank = 1;
    } else if (name.includes(q) || aliasHit) {
      rank = 2;
    }
    return { country, rank };
  }).filter((row) => row.rank >= 0);

  scored.sort((a, b) => a.rank - b.rank || a.country.name.localeCompare(b.country.name));
  return scored.slice(0, limit).map((row) => row.country);
}

export function countryByName(name: string): Country | undefined {
  const q = name.trim().toLowerCase();
  if (!q) return undefined;
  return (
    COUNTRIES.find(
      (country) =>
        country.name.toLowerCase() === q ||
        country.aliases.some((alias) => alias.toLowerCase() === q),
    ) ?? filterCountries(name, 1)[0]
  );
}
