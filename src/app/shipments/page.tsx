// src/app/shipments/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface ShipmentStats {
    total: number;
    totalFees: number;
    byCountry: { country: string; count: number }[];
    byService: { service: string; count: number }[];
    recent: any[];
}

function formatPrice(n: number) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(n);
}

export default function ShipmentsPage() {
    const { isAuthenticated } = useAuth();
    const [stats, setStats] = useState<ShipmentStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState<any>(null);

    useEffect(() => {
        fetchStats();
    }, []);

    async function fetchStats() {
        try {
            setLoading(true);
            const res = await fetch("/api/kurasi/shipments-stats");
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }
        } catch (e) {
            console.error("Failed to fetch stats", e);
        } finally {
            setLoading(false);
        }
    }

    async function handleSync(fullSync = false, clearBuyers = false) {
        if (!isAuthenticated) {
            alert("Please log in first");
            return;
        }
        if (clearBuyers && !confirm("This will clear all existing Recipients and re-sync from Kurasi. Continue?")) {
            return;
        }
        setSyncing(true);
        setSyncResult(null);
        try {
            const res = await fetch("/api/kurasi/sync-shipments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fullSync, clearBuyers }),
            });
            const data = await res.json();
            setSyncResult(data);
            if (data.status === "SUCCESS") {
                fetchStats();
            }
        } catch (e) {
            setSyncResult({ status: "ERROR", errorMessage: "Sync failed" });
        } finally {
            setSyncing(false);
        }
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="text-lg text-[var(--text-muted)]">Loading shipments data...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-[var(--text-main)]">Kurasi Shipments</h1>
                    <p className="text-[var(--text-muted)]">
                        {stats?.total || 0} shipments synced • {formatPrice(stats?.totalFees || 0)} total fees
                    </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <button
                        onClick={() => handleSync(false)}
                        disabled={syncing || !isAuthenticated}
                        className="btn btn-default"
                    >
                        {syncing ? "Syncing..." : "Sync (7 days)"}
                    </button>
                    <button
                        onClick={() => handleSync(true)}
                        disabled={syncing || !isAuthenticated}
                        className="btn btn-primary"
                    >
                        {syncing ? "Syncing..." : "Full Sync (2022+)"}
                    </button>
                </div>
            </div>

            {!isAuthenticated && (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200">
                    Please log in to sync shipments from Kurasi
                </div>
            )}

            {syncResult && (
                <div className={`px-4 py-3 rounded-lg ${syncResult.status === "SUCCESS" ? "bg-green-50 border border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200" : "bg-red-50 border border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200"}`}>
                    {syncResult.status === "SUCCESS"
                        ? `Synced ${syncResult.synced} shipments (${syncResult.dateRange?.startDate} to ${syncResult.dateRange?.endDate})`
                        : syncResult.errorMessage || "Sync failed"}
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="card p-4">
                    <div className="text-sm text-[var(--text-muted)]">Total Shipments</div>
                    <div className="text-2xl font-bold text-[var(--text-main)]">{stats?.total || 0}</div>
                </div>
                <div className="card p-4">
                    <div className="text-sm text-[var(--text-muted)]">Total Fees</div>
                    <div className="text-2xl font-bold text-[var(--text-main)]">{formatPrice(stats?.totalFees || 0)}</div>
                </div>
                <div className="card p-4">
                    <div className="text-sm text-[var(--text-muted)]">Countries</div>
                    <div className="text-2xl font-bold text-[var(--text-main)]">{stats?.byCountry?.length || 0}</div>
                </div>
                <div className="card p-4">
                    <div className="text-sm text-[var(--text-muted)]">Top Service</div>
                    <div className="text-2xl font-bold text-[var(--text-main)]">{stats?.byService?.[0]?.service || "-"}</div>
                </div>
            </div>

            {/* By Country */}
            {stats?.byCountry && stats.byCountry.length > 0 && (
                <div className="card p-4">
                    <h2 className="text-lg font-semibold text-[var(--text-main)] mb-3">Shipments by Country</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                        {stats.byCountry.slice(0, 12).map((c) => (
                            <div key={c.country} className="flex justify-between items-center px-3 py-2 bg-[rgba(55,53,47,0.04)] rounded">
                                <span className="text-sm font-medium text-[var(--text-main)]">{c.country}</span>
                                <span className="text-sm text-[var(--text-muted)]">{c.count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* By Service */}
            {stats?.byService && stats.byService.length > 0 && (
                <div className="card p-4">
                    <h2 className="text-lg font-semibold text-[var(--text-main)] mb-3">Shipments by Service</h2>
                    <div className="flex flex-wrap gap-2">
                        {stats.byService.map((s) => (
                            <div key={s.service} className="px-4 py-2 bg-[rgba(55,53,47,0.04)] rounded">
                                <span className="font-medium text-[var(--text-main)]">{s.service || "Unknown"}</span>
                                <span className="ml-2 text-[var(--text-muted)]">{s.count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Recent Shipments */}
            {stats?.recent && stats.recent.length > 0 && (
                <div className="card p-4">
                    <h2 className="text-lg font-semibold text-[var(--text-main)] mb-3">Recent Shipments</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-[var(--border-color)]">
                                    <th className="text-left py-2 text-[var(--text-muted)]">ID</th>
                                    <th className="text-left py-2 text-[var(--text-muted)]">Recipient</th>
                                    <th className="text-left py-2 text-[var(--text-muted)]">Country</th>
                                    <th className="text-left py-2 text-[var(--text-muted)]">Service</th>
                                    <th className="text-right py-2 text-[var(--text-muted)]">Fee</th>
                                    <th className="text-left py-2 text-[var(--text-muted)]">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.recent.map((s: any) => (
                                    <tr key={s.kurasiShipmentId} className="border-b border-[var(--border-color)]">
                                        <td className="py-2 text-[var(--text-main)]">{s.kurasiShipmentId}</td>
                                        <td className="py-2 text-[var(--text-main)]">{s.buyerFullName}</td>
                                        <td className="py-2 text-[var(--text-muted)]">{s.buyerCountry}</td>
                                        <td className="py-2 text-[var(--text-muted)]">{s.serviceName}</td>
                                        <td className="py-2 text-right text-[var(--text-main)]">{formatPrice(s.shippingFeeMinor || 0)}</td>
                                        <td className="py-2">
                                            <span className="px-2 py-0.5 text-xs rounded border border-[var(--border-color)] text-[var(--text-muted)]">
                                                {s.flagId || "Unknown"}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
