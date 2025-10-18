// src/lib/phone.ts
import { parsePhoneNumberFromString } from 'libphonenumber-js';

export function normalizeAndSplitPhone(input: string, hintCountry?: string) {
  const p = parsePhoneNumberFromString(input, hintCountry); // e.g. 'ID'
  if (!p || !p.isValid()) return null;
  return {
    e164: p.number,                             // "+6281234567890"
    phoneCode: `+${p.countryCallingCode}`,      // "+62"
    country: p.country ?? hintCountry ?? null,  // "ID"
    national: p.nationalNumber                  // "81234567890"
  };
}

export function toE164(input: string, defaultCountry?: string): { e164: string|null, country?: string } {
  const raw = (input || '').trim();
  const p = parsePhoneNumberFromString(raw, defaultCountry); // e.g., 'ID'
  if (!p || !p.isValid()) return { e164: null };
  return { e164: p.number, country: p.country }; // e.g., +62812..., 'ID'
}

// for display only
export function prettyPhone(e164: string) {
  const p = parsePhoneNumberFromString(e164);
  return p ? p.formatInternational() : e164;
}
