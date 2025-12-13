"use client";

import { useEffect, useMemo, useState } from "react";
import ComboBox from "@/components/Combobox";
import { countryMap } from "@/lib/countryMapping";
import { useAuth } from "@/contexts/AuthContext";
import AuthGuard from "@/components/AuthGuard";
import { calculateFee, formatFee } from "@/lib/feeCalculator";

/* ===== Types ===== */
type AvailableItem = {
  code: "EX" | "EP" | "ES" | "PP";
  key: "err" | "epr" | "esr" | "ppr";
  title: string;
  amount: number;
  displayAmount: string;
  maxWeight: string | null;
  additionalCharges?: Record<string, string>;
};
type QuoteResponse = {
  status: "SUCCESS" | "FAIL" | "ERROR";
  meta?: {
    currencyType?: string;
    currencySymbol?: string;
    chargeableWeight?: number;
    volumetricWeight?: number;
  };
  available?: AvailableItem[];
  raw?: any;
  errorMessage?: string;
};
type CountryItem = { country: string; shortName: string; zone: number; iossCode: string };

/* ===== Helpers ===== */
function normalizeNum(v: string) {
  return v.replace(/[^\d]/g, "");
}
function formatCurrency(n: number, currency = "IDR", locale = "id-ID") {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return n.toLocaleString(locale);
  }
}

/* ===== Page ===== */
export default function QuotePage() {
  const { isAuthenticated } = useAuth();

  // Quote inputs
  const [country, setCountry] = useState("Albania");
  const origin = "ID"; // Fixed origin
  const currency = "IDR"; // Fixed currency

  const [actualWeight, setActualWeight] = useState("100");
  const [actualLength, setActualLength] = useState("0");
  const [actualWidth, setActualWidth] = useState("0");
  const [actualHeight, setActualHeight] = useState("0");

  // Data
  const [countries, setCountries] = useState<CountryItem[]>([]);
  const [data, setData] = useState<QuoteResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  // Load countries if authenticated; calculator works without it
  useEffect(() => {
    loadCountries();
  }, [isAuthenticated]);

  // Persist non-sensitive inputs
  useEffect(() => {
    localStorage.setItem(
      "kurasi:last",
      JSON.stringify({
        country,
        actualWeight,
        actualLength,
        actualWidth,
        actualHeight,
      })
    );
  }, [country, origin, currency, actualWeight, actualLength, actualWidth, actualHeight]);

  useEffect(() => {
    const saved = localStorage.getItem("kurasi:last");
    if (saved) {
      const j = JSON.parse(saved);
      setCountry(j.country ?? "Albania");
      setActualWeight(j.actualWeight ?? "100");
      setActualLength(j.actualLength ?? "0");
      setActualWidth(j.actualWidth ?? "0");
      setActualHeight(j.actualHeight ?? "0");
    }
  }, []);

  // Login UI moved to /kurasi

  // Logout handled on /kurasi

  async function loadCountries(): Promise<boolean> {
    if (isAuthenticated) {
      try {
        const r = await fetch("/api/kurasi/countries");
        const j = await r.json();
        if (r.ok && j.status === "SUCCESS" && Array.isArray(j.data)) {
          setCountries(j.data);
          // Set default if current selection invalid/missing
          if (!j.data.find((c: CountryItem) => c.country === country) && j.data.length > 0) {
            // Keep current if meaningful, else first
            // safe to leave as is if we want to trust localstorage
          }
          return true;
        }
      } catch (e) {
        console.error("Failed to load dynamic countries", e);
      }
    }

    // Fallback / Offline: build list from static countryMapping.ts
    const list: CountryItem[] = Object.entries(countryMap)
      .map(([shortName, name]) => ({
        country: name,
        shortName,
        zone: 0,
        iossCode: "",
      }))
      .sort((a, b) => a.country.localeCompare(b.country));

    setCountries(list);
    if (!list.find((c) => c.country === country) && list.length > 0) {
      // only reset if absolutely not found and no local state
      // setCountry(list[0].country);
    }
    return true;
  }

  async function fetchQuote() {
    setErrMsg(null);
    if (!country.trim()) return setErrMsg("Please select a destination country.");
    if (!origin.trim()) return setErrMsg("Please enter origin (supportedCountryCode).");
    const nums = [actualWeight, actualLength, actualWidth, actualHeight];
    if (nums.some((n) => !n.trim() || Number.isNaN(Number(n)))) {
      return setErrMsg("All numeric fields (weight/length/width/height) must be numbers.");
    }

    setLoading(true);
    try {
      const res = await fetch("/api/kurasi/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8", Accept: "application/json" },
        body: JSON.stringify({
          actualHeight,
          actualLength,
          actualWeight,
          actualWidth,
          country,
          currencyType: currency,
          supportedCountryCode: origin,
        }),
      });
      const j: QuoteResponse = await res.json();
      if (!res.ok || j.status !== "SUCCESS") {
        setErrMsg(j?.errorMessage || `Failed to get quote (HTTP ${res.status})`);
        setData(null);
      } else setData(j);
    } catch (e: any) {
      setErrMsg(e?.message || "Network error");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  // Build a fixed catalog of 4 services from raw blocks; mark availability by doubleAmount
  const catalog = useMemo(() => {
    const raw = (data?.raw ?? {}) as any;
    const defs = [
      { key: "esr" as const, code: "ES" as const, title: "Economy Standard" },
      { key: "epr" as const, code: "EP" as const, title: "Economy Plus" },
      { key: "err" as const, code: "EX" as const, title: "Express" },
      { key: "ppr" as const, code: "PP" as const, title: "Packet Premium" },
    ];
    return defs.map((d) => {
      const block = raw?.[d.key] ?? null;
      const amount = block?.doubleAmount ?? null;
      const displayAmount =
        (block?.amount as string | null | undefined) ??
        (typeof amount === "number" ? amount.toLocaleString() : null);
      return {
        ...d,
        available: amount !== null,
        amount: amount as number | null,
        displayAmount,
        maxWeight: (block?.maxWeight as string | null | undefined) ?? null,
      };
    });
  }, [data]);

  const cheapestCode = useMemo(() => {
    const avail = catalog.filter((c) => c.available) as { code: string; amount: number }[];
    if (avail.length === 0) return null;
    return avail.sort((a, b) => a.amount - b.amount)[0].code;
  }, [catalog]);

  const currencyForFmt = data?.meta?.currencyType || "IDR";

  return (
    <AuthGuard>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-main)]">Shipping Quote Calculator</h1>
          <p className="text-[var(--text-muted)]">Get shipping quotes for international deliveries</p>
        </div>

        {/* Kurasi Auth Status */}
        {!isAuthenticated && (
          <section className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Log in to load the full country list from Kurasi. Providing correct inputs works without login.
              </p>
              {/* The global sidebar has the login button, but we can add a trigger here if we expose it from context, 
                however context only exposes login function, not the UI state of the sidebar modal. 
                For now, just directing them to the sidebar is simplest, or we can add a local login form. 
                Given the sidebar is always visible, pointing to it is fine. 
                Or even better, we check session on mount (which AuthContext does).
            */}
            </div>
          </section>
        )}
        {/* Quote Form */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-[var(--text-main)]">Destination Country</span>
            <ComboBox
              items={countries}
              value={country}
              onChange={(key) => setCountry(key)}
              getKey={(c) => c.country}
              getLabel={(c) => c.country}
              ariaLabel="Destination Country"
            />
          </label>

          {/* Dimensions + weight */}
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-sm text-[var(--text-main)]">Actual Weight (g)</span>
              <input
                className="input"
                value={actualWeight}
                inputMode="numeric"
                onChange={(e) => setActualWeight(normalizeNum(e.target.value))}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-[var(--text-main)]">Length</span>
              <input
                className="input"
                value={actualLength}
                inputMode="numeric"
                onChange={(e) => setActualLength(normalizeNum(e.target.value))}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-[var(--text-main)]">Width</span>
              <input
                className="input"
                value={actualWidth}
                inputMode="numeric"
                onChange={(e) => setActualWidth(normalizeNum(e.target.value))}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm text-[var(--text-main)]">Height</span>
              <input
                className="input"
                value={actualHeight}
                inputMode="numeric"
                onChange={(e) => setActualHeight(normalizeNum(e.target.value))}
              />
            </label>
          </div>
        </section>

        <div className="flex gap-3">
          <button onClick={fetchQuote} disabled={loading} className="btn btn-primary">
            {loading ? "Loading..." : "Get Quote"}
          </button>
        </div>

        {errMsg && <p className="text-red-600 text-sm">{errMsg}</p>}

        {/* Results: always show all 4 services, dim "Not available" ones */}
        {data && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-[var(--text-main)]">Available Services</h2>
            <table className="w-full text-sm border border-[var(--border-color)] rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-[rgba(55,53,47,0.08)] text-[var(--text-main)]">
                  <th className="p-2 text-left">Code</th>
                  <th className="p-2 text-left">Title</th>
                  <th className="p-2 text-right">Kurasi Fee</th>
                  <th className="p-2 text-right">Local Fee</th>
                  <th className="p-2 text-right">Total</th>
                  <th className="p-2 text-right">Max Weight</th>
                </tr>
              </thead>
              <tbody>
                {catalog.map((s) => {
                  const unavailable = !s.available;
                  const isCheapest = !unavailable && s.code === cheapestCode;
                  // Get country ISO code for fee calculation
                  const countryItem = countries.find((c) => c.country === country);
                  const countryCode = countryItem?.shortName || "";
                  const weightGrams = Number(actualWeight) || 0;
                  const localFee = calculateFee(weightGrams, countryCode);
                  const total = s.amount != null ? s.amount + localFee : null;
                  return (
                    <tr key={s.code} className={`border-t border-[var(--border-color)] ${unavailable ? "opacity-50" : ""}`}>
                      <td className="p-2">
                        <span
                          className={`inline-block rounded px-2 py-0.5 ${isCheapest ? "bg-[var(--color-primary-light)] text-[var(--color-primary)]" : "bg-[rgba(55,53,47,0.08)] text-[var(--text-main)]"
                            }`}
                        >
                          {s.code}
                          {isCheapest ? " • cheapest" : ""}
                        </span>
                      </td>
                      <td className="p-2">{s.title}</td>
                      <td className="p-2 text-right">
                        {unavailable ? (
                          <span className="text-[var(--text-muted)] italic">Not available</span>
                        ) : (
                          s.displayAmount || (typeof s.amount === "number" ? formatCurrency(s.amount, currencyForFmt) : "-")
                        )}
                      </td>
                      <td className="p-2 text-right text-green-600 dark:text-green-400 font-medium">
                        {unavailable ? "-" : formatFee(localFee)}
                      </td>
                      <td className="p-2 text-right font-semibold">
                        {unavailable || total == null ? "-" : formatCurrency(total, currencyForFmt)}
                      </td>
                      <td className="p-2 text-right">{s.maxWeight ?? "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {data?.meta && (
              <p className="text-xs text-[var(--text-muted)]">
                Chargeable: {data.meta.chargeableWeight ?? "-"} | Volumetric: {data.meta.volumetricWeight ?? "-"} | Currency:{" "}
                {(data.meta.currencySymbol ?? "") + (data.meta.currencyType ?? "")}
              </p>
            )}

            {catalog.every((s) => !s.available) && (
              <p className="text-sm text-[var(--text-muted)]">
                No services available for this input. Try adjusting weight/dimensions or country.
              </p>
            )}
          </section>
        )}
      </div>
    </AuthGuard>
  );
}