// src/app/shipments/temp/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface TempShipment {
    shipmentId: string;
    pickupId: string | null;
    saleRecordNumber: string;
    buyerFullName: string;
    buyerAddress1: string;
    buyerAddress2: string;
    buyerCity: string;
    buyerState: string;
    buyerZip: string;
    buyerCountry: string;
    buyerPhone: string;
    buyerEmail: string;
    phoneCode: string;
    countryShortName: string;
    serviceName: string;
    packageDesc: string;
    totalWeight: number;
    totalValue: string;
    currency: string;
    shipmentStatus: string;
    labelCreated: number;
    hsCode: string;
    customsDescription: string;
    branchName: string;
    requestType: string;
    requestPickupDate: string | null;
    createdDate: string;
    updatedDate: string;
}

export default function TempShipmentsPage() {
    const { isAuthenticated } = useAuth();
    const [shipments, setShipments] = useState<TempShipment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        if (isAuthenticated) {
            fetchTempShipments();
        } else {
            setLoading(false);
        }
    }, [isAuthenticated]);

    async function fetchTempShipments() {
        try {
            setLoading(true);
            setError(null);
            const res = await fetch("/api/kurasi/shipments-temp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({}),
            });
            const data = await res.json();
            if (data.status === "SUCCESS" && Array.isArray(data.data)) {
                setShipments(data.data);
            } else {
                setError(data.errorMessage || "Failed to fetch temp shipments");
            }
        } catch (e) {
            setError("Network error");
        } finally {
            setLoading(false);
        }
    }

    function toggleExpand(id: string) {
        setExpandedId(expandedId === id ? null : id);
    }

    if (!isAuthenticated) {
        return (
            <div className="space-y-6">
                <h1 className="text-3xl font-bold text-[var(--text-main)]">Pending Shipments</h1>
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200">
                    Please log in to view pending shipments from Kurasi
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="text-lg text-[var(--text-muted)]">Loading pending shipments...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-[var(--text-main)]">Pending Shipments</h1>
                    <p className="text-[var(--text-muted)]">
                        {shipments.length} shipment(s) awaiting handover
                    </p>
                </div>
                <button onClick={fetchTempShipments} disabled={loading} className="btn btn-default">
                    Refresh
                </button>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg dark:bg-red-900/20 dark:border-red-800 dark:text-red-200">
                    {error}
                </div>
            )}

            {shipments.length === 0 ? (
                <div className="card p-8 text-center text-[var(--text-muted)]">
                    No pending shipments found
                </div>
            ) : (
                <div className="space-y-3">
                    {[...shipments].sort((a, b) => a.labelCreated - b.labelCreated).map((s) => (
                        <div key={s.shipmentId} className="card overflow-hidden">
                            {/* Header - clickable */}
                            <div
                                className="p-4 cursor-pointer hover:bg-[var(--bg-secondary)] transition-colors"
                                onClick={() => toggleExpand(s.shipmentId)}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-medium text-[var(--text-main)]">{s.buyerFullName}</span>
                                            <span className="text-xs text-[var(--text-muted)]">→ {s.countryShortName}</span>
                                            <span className={`px-2 py-0.5 text-xs rounded border ${s.labelCreated ? "border-green-500 text-green-600 dark:text-green-400" : "border-yellow-500 text-yellow-600 dark:text-yellow-400"}`}>
                                                {s.labelCreated ? s.shipmentStatus : "Pending"}
                                            </span>
                                        </div>
                                        <div className="text-sm text-[var(--text-muted)] mt-1">
                                            SRN: {s.saleRecordNumber} • {s.serviceName} • {s.totalWeight}g
                                        </div>
                                        <div className="text-xs text-[var(--text-muted)] mt-1">
                                            Created: {s.createdDate}
                                        </div>
                                    </div>
                                    <div className="text-right flex items-center gap-3">
                                        <div>
                                            <div className="text-sm font-mono text-[var(--text-main)]">{s.shipmentId}</div>
                                            <div className="text-sm text-[var(--text-muted)]">${s.totalValue}</div>
                                        </div>
                                        <svg
                                            className={`w-5 h-5 text-[var(--text-muted)] transition-transform ${expandedId === s.shipmentId ? 'rotate-180' : ''}`}
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {/* Expanded Details */}
                            {expandedId === s.shipmentId && (
                                <div className="border-t border-[var(--border-main)] bg-[var(--bg-secondary)] p-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Buyer Info */}
                                        <div>
                                            <h4 className="font-semibold text-[var(--text-main)] mb-2">Buyer Information</h4>
                                            <div className="space-y-1 text-sm">
                                                <p><span className="text-[var(--text-muted)]">Name:</span> {s.buyerFullName}</p>
                                                <p><span className="text-[var(--text-muted)]">Phone:</span> {s.phoneCode}{s.buyerPhone}</p>
                                                {s.buyerEmail && <p><span className="text-[var(--text-muted)]">Email:</span> {s.buyerEmail}</p>}
                                                <p className="text-[var(--text-muted)] mt-2">Address:</p>
                                                <p>{s.buyerAddress1}</p>
                                                {s.buyerAddress2 && <p>{s.buyerAddress2}</p>}
                                                <p>{s.buyerCity}, {s.buyerState} {s.buyerZip}</p>
                                                <p>{s.buyerCountry}</p>
                                            </div>
                                        </div>

                                        {/* Shipment Info */}
                                        <div>
                                            <h4 className="font-semibold text-[var(--text-main)] mb-2">Shipment Details</h4>
                                            <div className="space-y-1 text-sm">
                                                <p><span className="text-[var(--text-muted)]">Shipment ID:</span> {s.shipmentId}</p>
                                                {s.pickupId && <p><span className="text-[var(--text-muted)]">Pickup ID:</span> {s.pickupId}</p>}
                                                <p><span className="text-[var(--text-muted)]">SRN:</span> {s.saleRecordNumber}</p>
                                                <p><span className="text-[var(--text-muted)]">Service:</span> {s.serviceName}</p>
                                                <p><span className="text-[var(--text-muted)]">Weight:</span> {s.totalWeight}g</p>
                                                <p><span className="text-[var(--text-muted)]">Value:</span> {s.currency} {s.totalValue}</p>
                                                <p><span className="text-[var(--text-muted)]">Contents:</span> {s.packageDesc}</p>
                                                {s.hsCode && <p><span className="text-[var(--text-muted)]">HS Code:</span> {s.hsCode}</p>}
                                                {s.customsDescription && <p><span className="text-[var(--text-muted)]">Customs:</span> {s.customsDescription}</p>}
                                            </div>
                                        </div>

                                        {/* Status Info */}
                                        <div className="md:col-span-2">
                                            <h4 className="font-semibold text-[var(--text-main)] mb-2">Status & Dates</h4>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                <div>
                                                    <p className="text-[var(--text-muted)]">Status</p>
                                                    <p className="font-medium">{s.labelCreated ? s.shipmentStatus : "Pending"}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[var(--text-muted)]">Created</p>
                                                    <p>{s.createdDate}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[var(--text-muted)]">Updated</p>
                                                    <p>{s.updatedDate}</p>
                                                </div>
                                                {s.requestPickupDate && (
                                                    <div>
                                                        <p className="text-[var(--text-muted)]">Pickup Date</p>
                                                        <p>{s.requestPickupDate}</p>
                                                    </div>
                                                )}
                                                {s.requestType && (
                                                    <div>
                                                        <p className="text-[var(--text-muted)]">Request Type</p>
                                                        <p>{s.requestType}</p>
                                                    </div>
                                                )}
                                                {s.branchName && (
                                                    <div>
                                                        <p className="text-[var(--text-muted)]">Branch</p>
                                                        <p>{s.branchName}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
