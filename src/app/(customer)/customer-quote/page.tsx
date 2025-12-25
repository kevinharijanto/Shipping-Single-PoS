"use client";

import { useEffect, useMemo, useState } from "react";
import ComboBox from "@/components/Combobox";
import { countryMap } from "@/lib/countryMapping";

/* ===== Types ===== */
type ServiceQuote = {
    code: "EX" | "EP" | "ES" | "PP";
    title: string;
    totalFee: number;
    maxWeight: string | null;
};

type QuoteResponse = {
    status: "SUCCESS" | "FAIL" | "ERROR";
    meta?: {
        currency?: string;
        chargeableWeight?: number;
        volumetricWeight?: number;
    };
    services?: ServiceQuote[];
    errorMessage?: string;
};

type CountryItem = { country: string; shortName: string };

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
export default function CustomerQuotePage() {
    const [country, setCountry] = useState("Albania");
    const [actualWeight, setActualWeight] = useState("100");
    const [actualLength, setActualLength] = useState("0");
    const [actualWidth, setActualWidth] = useState("0");
    const [actualHeight, setActualHeight] = useState("0");

    const [countries, setCountries] = useState<CountryItem[]>([]);
    const [data, setData] = useState<QuoteResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [errMsg, setErrMsg] = useState<string | null>(null);

    useEffect(() => {
        const list: CountryItem[] = Object.entries(countryMap)
            .map(([shortName, name]) => ({ country: name, shortName }))
            .sort((a, b) => a.country.localeCompare(b.country));
        setCountries(list);
    }, []);

    useEffect(() => {
        localStorage.setItem("customer-quote:last", JSON.stringify({ country, actualWeight, actualLength, actualWidth, actualHeight }));
    }, [country, actualWeight, actualLength, actualWidth, actualHeight]);

    useEffect(() => {
        const saved = localStorage.getItem("customer-quote:last");
        if (saved) {
            const j = JSON.parse(saved);
            setCountry(j.country ?? "Albania");
            setActualWeight(j.actualWeight ?? "100");
            setActualLength(j.actualLength ?? "0");
            setActualWidth(j.actualWidth ?? "0");
            setActualHeight(j.actualHeight ?? "0");
        }
    }, []);

    async function fetchQuote() {
        setErrMsg(null);
        if (!country.trim()) return setErrMsg("Please select a destination country.");
        const nums = [actualWeight, actualLength, actualWidth, actualHeight];
        if (nums.some((n) => !n.trim() || Number.isNaN(Number(n)))) {
            return setErrMsg("All numeric fields must be numbers.");
        }
        const countryItem = countries.find((c) => c.country === country);
        if (!countryItem) return setErrMsg("Invalid country selected.");

        setLoading(true);
        try {
            const res = await fetch("/api/shipping-quote", {
                method: "POST",
                headers: { "Content-Type": "application/json", Accept: "application/json" },
                body: JSON.stringify({
                    country,
                    countryCode: countryItem.shortName,
                    actualWeight: Number(actualWeight),
                    actualHeight: Number(actualHeight),
                    actualLength: Number(actualLength),
                    actualWidth: Number(actualWidth),
                }),
            });
            const j: QuoteResponse = await res.json();
            if (!res.ok || j.status !== "SUCCESS") {
                setErrMsg(j?.errorMessage || `Failed to get quote`);
                setData(null);
            } else {
                setData(j);
            }
        } catch (e: any) {
            setErrMsg(e?.message || "Network error");
            setData(null);
        } finally {
            setLoading(false);
        }
    }

    const cheapestCode = useMemo(() => {
        if (!data?.services?.length) return null;
        return data.services.reduce((min, s) => (s.totalFee < min.totalFee ? s : min), data.services[0]).code;
    }, [data]);

    const currencyForFmt = data?.meta?.currency || "IDR";

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-[var(--text-main)]">Shipping Quote Calculator</h1>
                <p className="text-[var(--text-muted)]">Get shipping quotes for international deliveries</p>
            </div>

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

                <div className="grid grid-cols-2 gap-3">
                    <label className="flex flex-col gap-1">
                        <span className="text-sm text-[var(--text-main)]">Actual Weight (g)</span>
                        <input className="input" value={actualWeight} inputMode="numeric" onChange={(e) => setActualWeight(normalizeNum(e.target.value))} />
                    </label>
                    <label className="flex flex-col gap-1">
                        <span className="text-sm text-[var(--text-main)]">Length</span>
                        <input className="input" value={actualLength} inputMode="numeric" onChange={(e) => setActualLength(normalizeNum(e.target.value))} />
                    </label>
                    <label className="flex flex-col gap-1">
                        <span className="text-sm text-[var(--text-main)]">Width</span>
                        <input className="input" value={actualWidth} inputMode="numeric" onChange={(e) => setActualWidth(normalizeNum(e.target.value))} />
                    </label>
                    <label className="flex flex-col gap-1">
                        <span className="text-sm text-[var(--text-main)]">Height</span>
                        <input className="input" value={actualHeight} inputMode="numeric" onChange={(e) => setActualHeight(normalizeNum(e.target.value))} />
                    </label>
                </div>
            </section>

            <div className="flex gap-3">
                <button onClick={fetchQuote} disabled={loading} className="btn btn-primary">
                    {loading ? "Loading..." : "Get Quote"}
                </button>
            </div>

            {errMsg && <p className="text-red-600 text-sm">{errMsg}</p>}

            {data && data.services && (
                <section className="space-y-3">
                    <h2 className="text-lg font-semibold text-[var(--text-main)]">Available Services</h2>
                    <table className="w-full text-sm border border-[var(--border-color)] rounded-lg overflow-hidden">
                        <thead>
                            <tr className="bg-[rgba(55,53,47,0.08)] text-[var(--text-main)]">
                                <th className="p-2 text-left">Code</th>
                                <th className="p-2 text-left">Title</th>
                                <th className="p-2 text-right">Price</th>
                                <th className="p-2 text-right">Max Weight</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.services.map((s) => {
                                const isCheapest = s.code === cheapestCode;
                                return (
                                    <tr key={s.code} className="border-t border-[var(--border-color)]">
                                        <td className="p-2">
                                            <span className={`inline-block rounded px-2 py-0.5 ${isCheapest ? "bg-[var(--color-primary-light)] text-[var(--color-primary)]" : "bg-[rgba(55,53,47,0.08)] text-[var(--text-main)]"}`}>
                                                {s.code}{isCheapest ? " • cheapest" : ""}
                                            </span>
                                        </td>
                                        <td className="p-2">{s.title}</td>
                                        <td className="p-2 text-right font-semibold">{formatCurrency(s.totalFee, currencyForFmt)}</td>
                                        <td className="p-2 text-right">{s.maxWeight ?? "-"}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {data?.meta && (
                        <p className="text-xs text-[var(--text-muted)]">
                            Chargeable: {data.meta.chargeableWeight ?? "-"} | Volumetric: {data.meta.volumetricWeight ?? "-"} | Currency: {data.meta.currency ?? "IDR"}
                        </p>
                    )}
                </section>
            )}
        </div>
    );
}
