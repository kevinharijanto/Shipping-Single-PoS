import { parsePhoneNumberFromString } from 'libphonenumber-js';

/**
 * Format a phone number for display.
 * With E.164 storage, phoneCode is no longer needed (kept for backwards compat).
 */
export function displayPhone(phone?: string, _phoneCode?: string): string {
  const p = (phone ?? "").trim();
  if (!p) return "";

  // Try to format nicely using libphonenumber
  try {
    const parsed = parsePhoneNumberFromString(p);
    if (parsed && parsed.isValid()) {
      return parsed.formatInternational(); // e.g. "+44 7944 975 541"
    }
  } catch { /* ignore */ }

  // Fallback: return as-is (already E.164 or raw)
  return p;
}
