// src/app/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

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
export default function Page() {
  // Login state
  const [username, setUsername] = useState("jgoei169@gmail.com");
  const [password, setPassword] = useState("dhegenesis");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Quote inputs
  const [country, setCountry] = useState("Albania");
  const [origin, setOrigin] = useState("ID");
  const [currency, setCurrency] = useState("IDR");

  const [actualWeight, setActualWeight] = useState("100");
  const [actualLength, setActualLength] = useState("100");
  const [actualWidth, setActualWidth] = useState("100");
  const [actualHeight, setActualHeight] = useState("100");

  // Data
  const [countries, setCountries] = useState<CountryItem[]>([]);
  const [data, setData] = useState<QuoteResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  // Try to load countries on mount — if cookie exists, it will work and we infer "logged in"
  useEffect(() => {
    loadCountries().then((ok) => setIsLoggedIn(ok));
  }, []);

  // Persist non-sensitive inputs
  useEffect(() => {
    localStorage.setItem(
      "kurasi:last",
      JSON.stringify({
        country,
        origin,
        currency,
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
      setOrigin(j.origin ?? "ID");
      setCurrency(j.currency ?? "IDR");
      setActualWeight(j.actualWeight ?? "100");
      setActualLength(j.actualLength ?? "100");
      setActualWidth(j.actualWidth ?? "100");
      setActualHeight(j.actualHeight ?? "100");
    }
  }, []);

  async function login() {
    setLoginError(null);
    try {
      const res = await fetch("/api/kurasi/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const j = await res.json();
      if (!res.ok || j.status !== "SUCCESS") {
        setIsLoggedIn(false);
        setLoginError(j?.errorMessage || `Login failed (HTTP ${res.status})`);
        return;
      }
      const ok = await loadCountries();
      setIsLoggedIn(ok);
    } catch (e: any) {
      setIsLoggedIn(false);
      setLoginError(e?.message || "Network error");
    }
  }

  async function logout() {
    await fetch("/api/kurasi/logout", { method: "POST" });
    setIsLoggedIn(false);
    setCountries([]);
  }

  async function loadCountries(): Promise<boolean> {
    try {
      const res = await fetch("/api/kurasi/countries", { cache: "no-store" });
      const j = await res.json();
      if (!res.ok || j.status !== "SUCCESS") return false;
      setCountries(j.data || []);
      if (!(j.data || []).find((c: CountryItem) => c.country === country) && (j.data || []).length > 0) {
        setCountry(j.data[0].country);
      }
      return true;
    } catch {
      return false;
    }
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
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Kurasi — Single API Quote</h1>
        <p className="text-sm text-gray-600">
          Login once → token cookie (httpOnly) → load countries → quote with volumetric.
        </p>
      </header>

      {/* Login */}
      <section className="card p-4 space-y-3">
        <h2 className="font-semibold">Login</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-700">Email</span>
            <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-700">Password</span>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
        </div>
        <div className="flex gap-3">
          <button className="btn" onClick={login} disabled={isLoggedIn}>
            Login
          </button>
          <button className="btn" onClick={logout} disabled={!isLoggedIn}>
            Logout
          </button>
          <button className="btn" onClick={loadCountries} disabled={!isLoggedIn}>
            Reload Countries
          </button>
        </div>
        {loginError && <p className="text-red-600 text-sm">{loginError}</p>}
        {isLoggedIn && <p className="text-green-700 text-sm">Logged in ✓ (token saved in cookie)</p>}
      </section>

      {/* Quote Form */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-700">Destination Country</span>
          <select className="input" value={country} onChange={(e) => setCountry(e.target.value)}>
            {countries.length > 0 ? (
              countries.map((c) => (
                <option key={c.shortName} value={c.country}>
                  {c.country}
                </option>
              ))
            ) : (
              <option value={country}>{country}</option>
            )}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-700">Origin (supportedCountryCode)</span>
          <input className="input" value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="ID" />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-700">Currency</span>
          <select className="input" value={currency} onChange={(e) => setCurrency(e.target.value)}>
            <option value="IDR">IDR</option>
            <option value="USD">USD</option>
          </select>
        </label>

        {/* Dimensions + weight */}
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-700">Actual Weight (g)</span>
            <input
              className="input"
              value={actualWeight}
              inputMode="numeric"
              onChange={(e) => setActualWeight(normalizeNum(e.target.value))}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-700">Length</span>
            <input
              className="input"
              value={actualLength}
              inputMode="numeric"
              onChange={(e) => setActualLength(normalizeNum(e.target.value))}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-700">Width</span>
            <input
              className="input"
              value={actualWidth}
              inputMode="numeric"
              onChange={(e) => setActualWidth(normalizeNum(e.target.value))}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-gray-700">Height</span>
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
        <button onClick={fetchQuote} disabled={loading} className="btn">
          {loading ? "Loading..." : "Get Quote"}
        </button>
      </div>

      {errMsg && <p className="text-red-600 text-sm">{errMsg}</p>}

      {/* Results: always show all 4 services, dim "Not available" ones */}
      {data && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Services</h2>
          <table className="w-full text-sm border rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-gray-100 text-gray-700">
                <th className="p-2 text-left">Code</th>
                <th className="p-2 text-left">Title</th>
                <th className="p-2 text-right">Amount</th>
                <th className="p-2 text-right">Max Weight</th>
              </tr>
            </thead>
            <tbody>
              {catalog.map((s) => {
                const unavailable = !s.available;
                const isCheapest = !unavailable && s.code === cheapestCode;
                return (
                  <tr key={s.code} className={`border-t ${unavailable ? "opacity-50" : ""}`}>
                    <td className="p-2">
                      <span
                        className={`inline-block rounded px-2 py-0.5 ${
                          isCheapest ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {s.code}
                        {isCheapest ? " • cheapest" : ""}
                      </span>
                    </td>
                    <td className="p-2">{s.title}</td>
                    <td className="p-2 text-right">
                      {unavailable ? (
                        <span className="text-gray-400 italic">Not available</span>
                      ) : (
                        s.displayAmount || (typeof s.amount === "number" ? formatCurrency(s.amount, currencyForFmt) : "-")
                      )}
                    </td>
                    <td className="p-2 text-right">{s.maxWeight ?? "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {data?.meta && (
            <p className="text-xs text-gray-600">
              Chargeable: {data.meta.chargeableWeight ?? "-"} | Volumetric: {data.meta.volumetricWeight ?? "-"} | Currency:{" "}
              {(data.meta.currencySymbol ?? "") + (data.meta.currencyType ?? "")}
            </p>
          )}

          {catalog.every((s) => !s.available) && (
            <p className="text-sm text-gray-600">
              No services available for this input. Try adjusting weight/dimensions or country.
            </p>
          )}
        </section>
      )}
    </main>
  );
}
