import type { Region } from "./types";
import { US_STATES } from "./us";
import { CA_PROVINCES } from "./ca";

export { US_STATES, CA_PROVINCES };
export type { Region };

/** Countries where a state/province is required */
const REQUIRED_COUNTRIES = new Set(["US", "CA", "AU"]);

export function isRegionRequired(countryCode: string): boolean {
  return REQUIRED_COUNTRIES.has(countryCode);
}

export function getRegionsForCountry(countryCode: string): Region[] | null {
  switch (countryCode) {
    case "US":
      return US_STATES;
    case "CA":
      return CA_PROVINCES;
    default:
      return null; // AU or others -> free text
  }
}

/** Return normalized code if the country has a list; otherwise the original trimmed value */
export function normalizeRegionValue(countryCode: string, input: string): string {
  const v = (input || "").trim();
  const list = getRegionsForCountry(countryCode);
  if (!list) return v;

  const upper = v.toUpperCase();
  const byCode = list.find((r) => r.code === upper);
  if (byCode) return byCode.code;

  const byName = list.find((r) => r.name === upper);
  return byName?.code ?? v;
}
