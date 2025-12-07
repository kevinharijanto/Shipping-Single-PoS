// src/components/RecipientModal.tsx
"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Modal from "./Modal";
import { countryMap, normalizeCountryCode } from "@/lib/countryMapping";
import {
  getRegionsForCountry,
  isRegionRequired,
  normalizeRegionValue,
  type Region,
} from "@/lib/regions";
import Combobox from "@/components/Combobox";
import { getPhoneCodeForCountry } from "@/lib/countryMapping";

type Mode = "create" | "edit";

type Initial = {
  id?: string;
  buyerFullName?: string;
  buyerPhone?: string;
  buyerEmail?: string;     // NEW
  buyerAddress1?: string;
  buyerAddress2?: string;  // NEW
  buyerCity?: string;
  buyerState?: string;     // may be code or name
  buyerZip?: string;
  buyerCountry?: string;   // code or full name
};

// Column header aliases for smart paste
const COLUMN_ALIASES: Record<string, string[]> = {
  buyerFullName: ["name", "full name", "fullname", "recipient", "buyer", "buyer name"],
  buyerPhone: ["phone", "phone number", "phonenumber", "tel", "telephone", "mobile", "cell"],
  buyerEmail: ["email", "e-mail", "mail"],
  buyerAddress1: ["address", "address1", "address 1", "street", "street address"],
  buyerAddress2: ["address2", "address 2", "apt", "apartment", "suite", "unit"],
  buyerCity: ["city", "town"],
  buyerState: ["state", "province", "region", "state/province"],
  buyerZip: ["zip", "zip code", "zipcode", "postal", "postal code", "postalcode"],
  buyerCountry: ["country", "nation", "counry"], // including common typo
};

// Expected column order for single-row paste (without headers)
// Format: Full Name, Phone Number, Address 1, Address 2, Country, State, City, Zip Code, Description, Value, Email
const POSITIONAL_FIELDS = [
  "buyerFullName",   // 0: Full Name
  "buyerPhone",      // 1: Phone Number
  "buyerAddress1",   // 2: Address 1
  "buyerAddress2",   // 3: Address 2
  "buyerCountry",    // 4: Country
  "buyerState",      // 5: State
  "buyerCity",       // 6: City
  "buyerZip",        // 7: Zip Code
  null,              // 8: Description (ignored)
  null,              // 9: Value (ignored)
  "buyerEmail",      // 10: Email
];

// Parse pasted tab-separated data
function parseSmartPaste(text: string, countries: { code: string; name: string }[]): Partial<Record<string, string>> | null {
  if (!text.trim()) return null;

  const lines = text.trim().split("\n");
  const result: Record<string, string> = {};

  // Determine if first row looks like a header (contains known column names)
  const firstRowValues = lines[0].split("\t").map(v => v.trim());
  const looksLikeHeader = firstRowValues.some(v => {
    const lower = v.toLowerCase();
    return Object.values(COLUMN_ALIASES).some(aliases =>
      aliases.some(alias => lower.includes(alias) || alias.includes(lower))
    );
  });

  if (lines.length >= 2 && looksLikeHeader) {
    // Mode 1: Header + Data row(s)
    const headers = firstRowValues.map(h => h.toLowerCase());
    const values = lines[1].split("\t").map(v => v.trim());

    headers.forEach((header, idx) => {
      if (idx >= values.length) return;
      const value = values[idx];
      if (!value) return;

      // Find which form field this header matches
      for (const [fieldName, aliases] of Object.entries(COLUMN_ALIASES)) {
        if (aliases.some(alias => header.includes(alias) || alias.includes(header))) {
          result[fieldName] = value;
          break;
        }
      }
    });
  } else {
    // Mode 2: Single row without header - use positional mapping
    const values = firstRowValues;

    values.forEach((value, idx) => {
      const fieldName = POSITIONAL_FIELDS[idx];
      if (idx < POSITIONAL_FIELDS.length && fieldName && value) {
        result[fieldName] = value;
      }
    });
  }

  // Normalize country to code
  if (result.buyerCountry) {
    const countryInput = result.buyerCountry.trim().toUpperCase();
    // Try direct code match first
    if (countryMap[countryInput]) {
      result.buyerCountry = countryInput;
    } else {
      // Try name match
      const found = countries.find(c =>
        c.name.toLowerCase() === result.buyerCountry!.toLowerCase() ||
        c.code.toLowerCase() === result.buyerCountry!.toLowerCase()
      );
      result.buyerCountry = found?.code || "";
    }
  }

  return Object.keys(result).length > 0 ? result : null;
}

export default function RecipientModal({
  isOpen,
  onClose,
  onSuccess,
  mode,
  initial,
  title,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode: Mode;
  initial?: Initial;
  title?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSmartPaste, setShowSmartPaste] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteSuccess, setPasteSuccess] = useState<string | null>(null);

  // Countries list [{code, name}] sorted by name
  const countries = useMemo(
    () =>
      Object.entries(countryMap)
        .map(([code, name]) => ({ code, name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    []
  );

  function toCountryCode(v?: string) {
    if (!v) return ""; // no default now
    const code = normalizeCountryCode(v);
    if (code) return code;
    const found = countries.find((c) => c.name.toLowerCase() === v.trim().toLowerCase());
    return found?.code ?? "";
  }

  const [form, setForm] = useState({
    buyerFullName: "",
    buyerPhone: "",
    buyerEmail: "",      // NEW
    buyerAddress1: "",
    buyerAddress2: "",   // NEW
    buyerCity: "",
    buyerState: "",
    buyerZip: "",
    buyerCountry: "", // 2-letter code
  });

  // Derived region config
  const regionList: Region[] | null = getRegionsForCountry(form.buyerCountry);
  const regionRequired = isRegionRequired(form.buyerCountry);
  const usingComboboxForRegion = !!regionList; // US/CA → combobox; others (incl. AU) → input

  // Initialize when opened / initial changes
  useEffect(() => {
    if (!isOpen) return;
    setError(null);

    const country = initial?.buyerCountry ? toCountryCode(initial.buyerCountry) : "";
    const normalizedState = country
      ? normalizeRegionValue(country, initial?.buyerState ?? "")
      : (initial?.buyerState ?? "");

    setForm({
      buyerFullName: initial?.buyerFullName ?? "",
      buyerPhone: initial?.buyerPhone ?? "",
      buyerEmail: initial?.buyerEmail ?? "",         // NEW
      buyerAddress1: initial?.buyerAddress1 ?? "",
      buyerAddress2: initial?.buyerAddress2 ?? "",   // NEW
      buyerCity: initial?.buyerCity ?? "",
      buyerState: normalizedState,
      buyerZip: initial?.buyerZip ?? "",
      buyerCountry: country,
    });
  }, [isOpen, initial, countries]);

  // Plain input change handler (used by text inputs)
  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  }

  // Combobox handlers
  function onCountryChange(code: string) {
    // Reset state when switching countries to avoid stale value
    setForm((s) => ({ ...s, buyerCountry: code, buyerState: "" }));
  }
  function onRegionChange(code: string) {
    setForm((s) => ({ ...s, buyerState: code }));
  }

  // Smart paste handler
  const handleSmartPaste = useCallback(() => {
    setPasteSuccess(null);
    const parsed = parseSmartPaste(pasteText, countries);

    if (!parsed) {
      setError("Could not parse data. Make sure to include header row and at least one data row.");
      return;
    }

    // Apply parsed values to form
    setForm((prev) => {
      const updated = { ...prev };

      if (parsed.buyerFullName) updated.buyerFullName = parsed.buyerFullName;
      if (parsed.buyerPhone) updated.buyerPhone = parsed.buyerPhone;
      if (parsed.buyerEmail) updated.buyerEmail = parsed.buyerEmail;
      if (parsed.buyerAddress1) updated.buyerAddress1 = parsed.buyerAddress1;
      if (parsed.buyerAddress2) updated.buyerAddress2 = parsed.buyerAddress2;
      if (parsed.buyerCity) updated.buyerCity = parsed.buyerCity;
      if (parsed.buyerZip) updated.buyerZip = parsed.buyerZip;
      if (parsed.buyerCountry) updated.buyerCountry = parsed.buyerCountry;

      // Handle state after country is set
      if (parsed.buyerState) {
        const countryCode = parsed.buyerCountry || updated.buyerCountry;
        updated.buyerState = countryCode
          ? normalizeRegionValue(countryCode, parsed.buyerState)
          : parsed.buyerState;
      }

      return updated;
    });

    const fieldsFound = Object.keys(parsed).length;
    setPasteSuccess(`✓ Filled ${fieldsFound} field${fieldsFound > 1 ? 's' : ''} from pasted data`);
    setPasteText("");
    setShowSmartPaste(false);
    setError(null);
  }, [pasteText, countries]);

  // Static phone code helper (digits only, no "+")
  function safePhoneCode(countryCode: string): string {
    try {
      if (!countryCode) return "";
      const pc = getPhoneCodeForCountry(countryCode || "");
      return String(pc || "").replace(/\D/g, "");
    } catch {
      return "";
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const {
        buyerFullName,
        buyerPhone,
        buyerEmail,
        buyerAddress1,
        buyerAddress2,
        buyerCity,
        buyerZip,
        buyerCountry,
        buyerState,
      } = form;

      if (regionRequired && !buyerState.trim()) {
        throw new Error("State/Province is required for the selected country.");
      }

      // Store region code for US/CA; keep free text for others (incl. AU)
      const stateToStore = normalizeRegionValue(buyerCountry, buyerState);

      if (!buyerFullName || !buyerPhone || !buyerAddress1 || !buyerCity || !buyerZip || !buyerCountry) {
        throw new Error("Please fill all required fields.");
      }

      const payload = {
        buyerFullName: buyerFullName.trim(),
        buyerPhone: buyerPhone.trim(),
        buyerEmail: buyerEmail.trim(),       // NEW (optional)
        buyerAddress1: buyerAddress1.trim(),
        buyerAddress2: buyerAddress2.trim(), // NEW (optional)
        buyerCity: buyerCity.trim(),
        buyerState: stateToStore,
        buyerZip: buyerZip.trim(),
        buyerCountry: buyerCountry.trim(), // 2-letter code
      };

      const res =
        mode === "create"
          ? await fetch("/api/buyers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
          : await fetch(`/api/buyers/${initial?.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Request failed");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title ?? (mode === "create" ? "Add Recipient" : "Edit Recipient")}
      size="md"
    >
      <div className="rounded-lg bg-white dark:bg-gray-900 dark:text-gray-100">
        <form onSubmit={onSubmit} className="space-y-6 p-4 sm:p-6">
          {error && (
            <div className="px-3 py-2 rounded border bg-red-50 border-red-200 text-red-700
                            dark:bg-red-900/30 dark:border-red-700 dark:text-red-200">
              {error}
            </div>
          )}

          {/* Smart Paste Section */}
          {mode === "create" && (
            <div className="border border-dashed border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  setShowSmartPaste(!showSmartPaste);
                  setPasteSuccess(null);
                }}
                className="w-full px-4 py-3 flex items-center justify-between gap-2 
                           bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800
                           transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <span className="font-medium text-sm">Smart Paste from Spreadsheet</span>
                </div>
                <svg className={`w-4 h-4 transition-transform ${showSmartPaste ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showSmartPaste && (
                <div className="p-4 space-y-3 bg-white dark:bg-gray-900">
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Paste tab-separated data (from Excel/Sheets). Required columns marked with *:
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                    Full Name*, Phone*, Address 1*, Address 2, Country*, State* (US/CA/AU), City*, Zip*, Email
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    Country: use code (US) or name (United States). State: use code (PA) or name (Pennsylvania).
                  </p>
                  <textarea
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder={`Full Name\tPhone Number\tAddress 1\tAddress 2\tCountry\tState\tCity\tZip Code\tDescription\tValue\tEmail\nJohn Doe\t1234567890\t123 Main St\tApt 4B\tUS\tNY\tNew York\t10001\t\t\tjohn@example.com`}
                    className="w-full h-24 p-3 text-sm font-mono border rounded-lg resize-none
                               bg-gray-50 dark:bg-gray-800 dark:border-gray-700
                               focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPasteText("");
                        setShowSmartPaste(false);
                      }}
                      className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSmartPaste}
                      disabled={!pasteText.trim()}
                      className="px-4 py-1.5 text-sm bg-primary text-white rounded-md
                                 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed
                                 transition-colors"
                    >
                      Apply Data
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Success message for smart paste */}
          {pasteSuccess && (
            <div className="px-3 py-2 rounded border bg-green-50 border-green-200 text-green-700
                            dark:bg-green-900/30 dark:border-green-700 dark:text-green-200 text-sm">
              {pasteSuccess}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Full name */}
            <div className="md:col-span-2">
              <label className="block text-sm mb-1">Full Name *</label>
              <input
                name="buyerFullName"
                value={form.buyerFullName}
                onChange={onChange}
                className="input w-full dark:bg-gray-800 dark:border-gray-700 dark:placeholder-gray-400
                           focus:outline-none focus:ring-2 focus:ring-primary/40"
                required
                placeholder="Recipient full name"
                autoComplete="name"
              />
            </div>

            {/* Phone */}
            <div className="md:col-span-2">
              <label className="block text-sm mb-1">Phone Number *</label>
              <div className="flex items-center gap-2">
                <div className="px-2 py-2 text-sm rounded-md border bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
                  +{safePhoneCode(form.buyerCountry) || ""}
                </div>
                <input
                  name="buyerPhone"
                  value={form.buyerPhone}
                  onChange={onChange}
                  className="input w-full dark:bg-gray-800 dark:border-gray-700 dark:placeholder-gray-400
                             focus:outline-none focus:ring-2 focus:ring-primary/40"
                  required
                  placeholder="e.g., 81234567890"
                  autoComplete="tel"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Enter local number only; country code will be sent separately.
              </p>
            </div>

            {/* Email (optional) */}
            <div className="md:col-span-2">
              <label className="block text-sm mb-1">Email</label>
              <input
                type="email"
                name="buyerEmail"
                value={form.buyerEmail}
                onChange={onChange}
                className="input w-full dark:bg-gray-800 dark:border-gray-700 dark:placeholder-gray-400
                           focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="email@example.com"
                autoComplete="email"
              />
            </div>

            {/* Address 1 */}
            <div className="md:col-span-2">
              <label className="block text-sm mb-1">Address *</label>
              <input
                name="buyerAddress1"
                value={form.buyerAddress1}
                onChange={onChange}
                className="input w-full dark:bg-gray-800 dark:border-gray-700 dark:placeholder-gray-400
                           focus:outline-none focus:ring-2 focus:ring-primary/40"
                required
                placeholder="Street address"
                autoComplete="address-line1"
              />
            </div>

            {/* Address 2 (optional) */}
            <div className="md:col-span-2">
              <label className="block text-sm mb-1">Address 2</label>
              <input
                name="buyerAddress2"
                value={form.buyerAddress2}
                onChange={onChange}
                className="input w-full dark:bg-gray-800 dark:border-gray-700 dark:placeholder-gray-400
                           focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="Apartment, suite, unit, etc. (optional)"
                autoComplete="address-line2"
              />
            </div>

            {/* Country (Combobox) */}
            <div>
              <label className="block text-sm mb-1">Country *</label>
              <Combobox
                items={countries}
                value={form.buyerCountry} // 2-letter code
                onChange={onCountryChange}
                getKey={(c) => c.code}
                getLabel={(c) => c.name}
                placeholder="Type to search country…"
                ariaLabel="Country"
                formatSelected={(label) => label} // show name only
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Stored as country code (e.g., ID, US, GB).
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Phone code: {getPhoneCodeForCountry(form.buyerCountry) || "—"}
              </p>
            </div>

            {/* State/Province (Combobox for US/CA, input for others; required for US/CA/AU) */}
            <div>
              <label className="block text-sm mb-1">
                State/Province{regionRequired ? " *" : ""}
              </label>

              {usingComboboxForRegion ? (
                <Combobox
                  items={regionList!}
                  value={form.buyerState} // region code
                  onChange={onRegionChange}
                  getKey={(r) => r.code}
                  getLabel={(r) => r.name}
                  placeholder="Type to search state/province…"
                  ariaLabel="State/Province"
                  formatSelected={(label) => label} // show name only
                />
              ) : (
                <input
                  name="buyerState"
                  value={form.buyerState}
                  onChange={onChange}
                  className="input w-full dark:bg-gray-800 dark:border-gray-700 dark:placeholder-gray-400
                             focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder={form.buyerCountry === "AU" ? "State / Territory" : "State / Province"}
                  required={regionRequired}
                  autoComplete="address-level1"
                />
              )}
            </div>

            {/* City */}
            <div>
              <label className="block text-sm mb-1">City *</label>
              <input
                name="buyerCity"
                value={form.buyerCity}
                onChange={onChange}
                className="input w-full dark:bg-gray-800 dark:border-gray-700 dark:placeholder-gray-400
                           focus:outline-none focus:ring-2 focus:ring-primary/40"
                required
                placeholder="City"
                autoComplete="address-level2"
              />
            </div>

            {/* ZIP */}
            <div>
              <label className="block text-sm mb-1">ZIP/Postal Code *</label>
              <input
                name="buyerZip"
                value={form.buyerZip}
                onChange={onChange}
                className="input w-full dark:bg-gray-800 dark:border-gray-700 dark:placeholder-gray-400
                           focus:outline-none focus:ring-2 focus:ring-primary/40"
                required
                placeholder="ZIP / Postal code"
                autoComplete="postal-code"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-800">
            <button type="button" onClick={onClose} className="btn">Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? (mode === "create" ? "Creating…" : "Saving…") : mode === "create" ? "Create" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
