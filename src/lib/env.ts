/**
 * Typed access to public (browser-exposed) environment variables.
 *
 * IMPORTANT: `NEXT_PUBLIC_*` variables are statically inlined into the bundle at
 * build time, so they must be referenced as literal, non-computed property
 * accesses (`process.env.NEXT_PUBLIC_MAPBOX_TOKEN`). Dynamic lookups such as
 * `process.env[key]` are NOT replaced by the compiler and will be `undefined`
 * in the browser.
 *
 * Consequence: changing a token requires a rebuild, not just a restart.
 *
 * Never hardcode a token in source. Real values belong in `.env.local`, which
 * is gitignored. See `.env.example` for the required keys.
 */

/** Raw value, exactly as inlined at build time. May be `undefined` or `""`. */
const rawMapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export const publicEnv = {
  /**
   * Mapbox GL JS access token. Empty string when unset — callers must handle
   * the unconfigured case rather than assuming a token exists.
   */
  mapboxToken: rawMapboxToken ?? "",
} as const;

/** True when a Mapbox token was present at build time. */
export function hasMapboxToken(): boolean {
  return publicEnv.mapboxToken.trim().length > 0;
}

/**
 * Returns the Mapbox token, throwing a descriptive error when it is missing.
 * Use this at the point a map is actually initialised, so that a missing token
 * fails loudly and locally instead of surfacing as an opaque Mapbox 401.
 */
export function requireMapboxToken(): string {
  const token = publicEnv.mapboxToken.trim();

  if (!token) {
    throw new Error(
      "Missing NEXT_PUBLIC_MAPBOX_TOKEN. Add it to .env.local (see .env.example) " +
        "and restart the dev server — public env vars are inlined at build time.",
    );
  }

  return token;
}
