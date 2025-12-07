"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { countryMap, normalizeCountryCode, getPhoneCodeForCountry } from "@/lib/countryMapping";
import {
    getRegionsForCountry,
    isRegionRequired,
    normalizeRegionValue,
} from "@/lib/regions";
import Combobox from "@/components/Combobox";

interface Order {
    id: string;
    placedAt: string;
    notes: string | null;
    quotedAmountMinor: number | null;
    shippingPriceMinor: number | null;
    currency: string | null;
    localStatus: string;
    deliveryStatus: string;
    paymentMethod: string;
    externalRef: string | null;
    labelId: string | null;
    trackingLink: string | null;
    krsTrackingNumber: string | null;
    srnId: number | null;
    customer: {
        id: string;
        name: string;
        phone: string;
        shopeeName: string | null;
    };
    buyer: {
        id: number;
        buyerFullName: string;
        buyerAddress1: string;
        buyerAddress2?: string;
        buyerEmail?: string;
        buyerCity: string;
        buyerState: string;
        buyerZip: string;
        buyerCountry: string;
        buyerPhone: string;
        phoneCode: string;
    };
    package: {
        id: string;
        weightGrams: number | null;
        totalValue: number | null;
        packageDescription: string | null;
        lengthCm: number | null;
        widthCm: number | null;
        heightCm: number | null;
        service: string;
        currency: string | null;
        sku: string | null;
        hsCode: string | null;
        countryOfOrigin: string | null;
    };
}

const SERVICES = [
    { code: "EP", name: "Economy Plus" },
    { code: "ES", name: "Economy Standard" },
    { code: "EX", name: "Express" },
    { code: "PP", name: "Parcel Post" },
];

const PAYMENT_METHODS = [
    { code: "unpaid", name: "Unpaid" },
    { code: "bca_transfer", name: "BCA Transfer" },
    { code: "bni_transfer", name: "BNI Transfer" },
    { code: "mandiri_transfer", name: "Mandiri Transfer" },
    { code: "cash", name: "Cash" },
    { code: "qris", name: "QRIS" },
    { code: "other", name: "Other" },
];

const LOCAL_STATUSES = [
    { code: "in_progress", name: "In Progress" },
    { code: "pending_payment", name: "Pending Payment" },
    { code: "paid", name: "Paid" },
    { code: "on_the_way", name: "On The Way" },
];

const DELIVERY_STATUSES = [
    { code: "not_yet_submit_to_kurasi", name: "Not Yet Submit to Kurasi" },
    { code: "submitted_to_Kurasi", name: "Submitted to Kurasi" },
    { code: "label_confirmed", name: "Label Confirmed" },
    { code: "ready_to_send", name: "Ready to Send" },
    { code: "tracking_received", name: "Tracking Received" },
];

export default function EditOrderPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = React.use(params as Promise<{ id: string }>);

    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Form state
    const [form, setForm] = useState({
        notes: "",
        paymentMethod: "unpaid",
        localStatus: "in_progress",
        externalRef: "",
        srn: "", // Sale Record Number
        // Package
        weightGrams: "",
        totalValue: "",
        packageDescription: "",
        lengthCm: "",
        widthCm: "",
        heightCm: "",
        service: "EX",
        packageCurrency: "USD",
        sku: "",
        hsCode: "",
        countryOfOrigin: "ID",
        // Buyer
        buyerFullName: "",
        buyerPhone: "",
        buyerEmail: "",
        buyerAddress1: "",
        buyerAddress2: "",
        buyerCity: "",
        buyerState: "",
        buyerZip: "",
        buyerCountry: "",
    });

    const countries = Object.entries(countryMap)
        .map(([code, name]) => ({ code, name }))
        .sort((a, b) => a.name.localeCompare(b.name));

    const regionList = getRegionsForCountry(form.buyerCountry);
    const regionRequired = isRegionRequired(form.buyerCountry);

    useEffect(() => {
        fetchOrder();
    }, [id]);

    async function fetchOrder() {
        try {
            const response = await fetch(`/api/orders/${id}`);
            if (!response.ok) {
                if (response.status === 404) {
                    setError("Order not found");
                } else {
                    throw new Error("Failed to fetch order");
                }
                return;
            }
            const data: Order = await response.json();
            setOrder(data);

            // Populate form with order data
            setForm({
                notes: data.notes || "",
                paymentMethod: data.paymentMethod || "unpaid",
                localStatus: data.localStatus || "in_progress",
                externalRef: data.externalRef || "",
                srn: data.srnId ? String(data.srnId) : "",
                // Package
                weightGrams: String(data.package?.weightGrams || ""),
                totalValue: String(data.package?.totalValue || ""),
                packageDescription: data.package?.packageDescription || "",
                lengthCm: String(data.package?.lengthCm || ""),
                widthCm: String(data.package?.widthCm || ""),
                heightCm: String(data.package?.heightCm || ""),
                service: data.package?.service || "EX",
                packageCurrency: data.package?.currency || "USD",
                sku: data.package?.sku || "",
                hsCode: data.package?.hsCode || "",
                countryOfOrigin: data.package?.countryOfOrigin || "ID",
                // Buyer
                buyerFullName: data.buyer?.buyerFullName || "",
                buyerPhone: data.buyer?.buyerPhone || "",
                buyerEmail: data.buyer?.buyerEmail || "",
                buyerAddress1: data.buyer?.buyerAddress1 || "",
                buyerAddress2: data.buyer?.buyerAddress2 || "",
                buyerCity: data.buyer?.buyerCity || "",
                buyerState: data.buyer?.buyerState || "",
                buyerZip: data.buyer?.buyerZip || "",
                buyerCountry: data.buyer?.buyerCountry || "",
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setLoading(false);
        }
    }

    function onChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    }

    function onCountryChange(code: string) {
        setForm((prev) => ({ ...prev, buyerCountry: code, buyerState: "" }));
    }

    function onRegionChange(code: string) {
        setForm((prev) => ({ ...prev, buyerState: code }));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            // Determine if SRN changed from original
            const originalSrn = order?.srnId ? String(order.srnId) : "";
            const srnChanged = form.srn !== originalSrn;

            // Update order (includes package details via the orders API)
            const orderRes = await fetch(`/api/orders/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    // Order fields
                    notes: form.notes || null,
                    paymentMethod: form.paymentMethod,
                    localStatus: form.localStatus,
                    externalRef: form.externalRef || null,
                    // Only send SRN if it changed
                    ...(srnChanged && { srn: form.srn ? parseInt(form.srn) : null }),
                    // Package fields (handled by the orders API)
                    weightGrams: form.weightGrams ? parseInt(form.weightGrams) : null,
                    totalValue: form.totalValue ? parseInt(form.totalValue) : null,
                    packageDescription: form.packageDescription || null,
                    lengthCm: form.lengthCm ? parseInt(form.lengthCm) : null,
                    widthCm: form.widthCm ? parseInt(form.widthCm) : null,
                    heightCm: form.heightCm ? parseInt(form.heightCm) : null,
                    service: form.service,
                    currency: form.packageCurrency,
                    sku: form.sku || null,
                    hsCode: form.hsCode || null,
                    countryOfOrigin: form.countryOfOrigin || null,
                }),
            });

            if (!orderRes.ok) {
                const err = await orderRes.json();
                throw new Error(err.error || "Failed to update order");
            }

            // Update buyer separately
            if (order?.buyer?.id) {
                // Strip + prefix and any country code prefix for phone validation
                // The API will normalize it based on the country
                let phoneToSend = form.buyerPhone;
                if (phoneToSend.startsWith("+")) {
                    // Remove leading + for the API to normalize properly
                    phoneToSend = phoneToSend.substring(1);
                }

                const buyerRes = await fetch(`/api/buyers/${order.buyer.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        buyerFullName: form.buyerFullName,
                        buyerPhone: phoneToSend,
                        buyerEmail: form.buyerEmail || null,
                        buyerAddress1: form.buyerAddress1,
                        buyerAddress2: form.buyerAddress2 || null,
                        buyerCity: form.buyerCity,
                        buyerState: form.buyerState ? normalizeRegionValue(form.buyerCountry, form.buyerState) : null,
                        buyerZip: form.buyerZip,
                        buyerCountry: form.buyerCountry,
                    }),
                });

                if (!buyerRes.ok) {
                    const err = await buyerRes.json();
                    throw new Error(err.error || "Failed to update buyer");
                }
            }

            setSuccess("Order updated successfully!");
            // Redirect after short delay
            setTimeout(() => {
                router.push(`/orders/${id}`);
            }, 1000);
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="text-lg">Loading order...</div>
            </div>
        );
    }

    if (error && !order) {
        return (
            <div className="space-y-6">
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg dark:bg-red-900 dark:border-red-700 dark:text-red-200">
                    {error}
                </div>
                <Link href="/orders" className="btn">
                    Back to Orders
                </Link>
            </div>
        );
    }

    if (!order) return null;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Edit Order</h1>
                <div className="flex gap-2">
                    <Link href={`/orders/${id}`} className="btn">
                        Cancel
                    </Link>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg dark:bg-red-900 dark:border-red-700 dark:text-red-200">
                    {error}
                </div>
            )}

            {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg dark:bg-green-900 dark:border-green-700 dark:text-green-200">
                    {success}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Order Information */}
                <div className="card p-6">
                    <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Order Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Payment Method</label>
                            <select
                                name="paymentMethod"
                                value={form.paymentMethod}
                                onChange={onChange}
                                className="input w-full dark:bg-gray-800 dark:border-gray-700"
                            >
                                {PAYMENT_METHODS.map((pm) => (
                                    <option key={pm.code} value={pm.code}>{pm.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Local Status</label>
                            <select
                                name="localStatus"
                                value={form.localStatus}
                                onChange={onChange}
                                className="input w-full dark:bg-gray-800 dark:border-gray-700"
                            >
                                {LOCAL_STATUSES.map((s) => (
                                    <option key={s.code} value={s.code}>{s.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">External Reference</label>
                            <input
                                type="text"
                                name="externalRef"
                                value={form.externalRef}
                                onChange={onChange}
                                className="input w-full dark:bg-gray-800 dark:border-gray-700"
                                placeholder="e.g., Shopee order ID"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">SRN (Sale Record Number)</label>
                            <input
                                type="number"
                                name="srn"
                                value={form.srn}
                                onChange={onChange}
                                className="input w-full dark:bg-gray-800 dark:border-gray-700"
                                placeholder="e.g., 12345"
                            />
                        </div>

                        <div className="md:col-span-2 lg:col-span-3">
                            <label className="block text-sm font-medium mb-1">Notes</label>
                            <textarea
                                name="notes"
                                value={form.notes}
                                onChange={onChange}
                                className="input w-full dark:bg-gray-800 dark:border-gray-700"
                                rows={2}
                                placeholder="Order notes..."
                            />
                        </div>
                    </div>
                </div>

                {/* Package Details */}
                <div className="card p-6">
                    <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Package Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Weight (grams) *</label>
                            <input
                                type="number"
                                name="weightGrams"
                                value={form.weightGrams}
                                onChange={onChange}
                                className="input w-full dark:bg-gray-800 dark:border-gray-700"
                                placeholder="100"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Declared Value</label>
                            <input
                                type="number"
                                name="totalValue"
                                value={form.totalValue}
                                onChange={onChange}
                                className="input w-full dark:bg-gray-800 dark:border-gray-700"
                                placeholder="10"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Currency</label>
                            <select
                                name="packageCurrency"
                                value={form.packageCurrency}
                                onChange={onChange}
                                className="input w-full dark:bg-gray-800 dark:border-gray-700"
                            >
                                <option value="USD">USD</option>
                                <option value="IDR">IDR</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Service *</label>
                            <select
                                name="service"
                                value={form.service}
                                onChange={onChange}
                                className="input w-full dark:bg-gray-800 dark:border-gray-700"
                                required
                            >
                                {SERVICES.map((s) => (
                                    <option key={s.code} value={s.code}>{s.name} ({s.code})</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Length (cm)</label>
                            <input
                                type="number"
                                name="lengthCm"
                                value={form.lengthCm}
                                onChange={onChange}
                                className="input w-full dark:bg-gray-800 dark:border-gray-700"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Width (cm)</label>
                            <input
                                type="number"
                                name="widthCm"
                                value={form.widthCm}
                                onChange={onChange}
                                className="input w-full dark:bg-gray-800 dark:border-gray-700"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Height (cm)</label>
                            <input
                                type="number"
                                name="heightCm"
                                value={form.heightCm}
                                onChange={onChange}
                                className="input w-full dark:bg-gray-800 dark:border-gray-700"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">HS Code</label>
                            <input
                                type="text"
                                name="hsCode"
                                value={form.hsCode}
                                onChange={onChange}
                                className="input w-full dark:bg-gray-800 dark:border-gray-700"
                                placeholder="490900"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">SKU</label>
                            <input
                                type="text"
                                name="sku"
                                value={form.sku}
                                onChange={onChange}
                                className="input w-full dark:bg-gray-800 dark:border-gray-700"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Country of Origin</label>
                            <input
                                type="text"
                                name="countryOfOrigin"
                                value={form.countryOfOrigin}
                                onChange={onChange}
                                className="input w-full dark:bg-gray-800 dark:border-gray-700"
                                placeholder="ID"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium mb-1">Description *</label>
                            <input
                                type="text"
                                name="packageDescription"
                                value={form.packageDescription}
                                onChange={onChange}
                                className="input w-full dark:bg-gray-800 dark:border-gray-700"
                                placeholder="Package contents"
                                required
                            />
                        </div>
                    </div>
                </div>

                {/* Recipient Details */}
                <div className="card p-6">
                    <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Recipient Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium mb-1">Full Name *</label>
                            <input
                                type="text"
                                name="buyerFullName"
                                value={form.buyerFullName}
                                onChange={onChange}
                                className="input w-full dark:bg-gray-800 dark:border-gray-700"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Phone *</label>
                            <input
                                type="text"
                                name="buyerPhone"
                                value={form.buyerPhone}
                                onChange={onChange}
                                className="input w-full dark:bg-gray-800 dark:border-gray-700"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Email</label>
                            <input
                                type="email"
                                name="buyerEmail"
                                value={form.buyerEmail}
                                onChange={onChange}
                                className="input w-full dark:bg-gray-800 dark:border-gray-700"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium mb-1">Address 1 *</label>
                            <input
                                type="text"
                                name="buyerAddress1"
                                value={form.buyerAddress1}
                                onChange={onChange}
                                className="input w-full dark:bg-gray-800 dark:border-gray-700"
                                required
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium mb-1">Address 2</label>
                            <input
                                type="text"
                                name="buyerAddress2"
                                value={form.buyerAddress2}
                                onChange={onChange}
                                className="input w-full dark:bg-gray-800 dark:border-gray-700"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Country *</label>
                            <Combobox
                                items={countries}
                                value={form.buyerCountry}
                                onChange={onCountryChange}
                                getKey={(c) => c.code}
                                getLabel={(c) => c.name}
                                placeholder="Select country..."
                                ariaLabel="Country"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">
                                State/Province{regionRequired ? " *" : ""}
                            </label>
                            {regionList ? (
                                <Combobox
                                    items={regionList}
                                    value={form.buyerState}
                                    onChange={onRegionChange}
                                    getKey={(r) => r.code}
                                    getLabel={(r) => r.name}
                                    placeholder="Select state..."
                                    ariaLabel="State"
                                />
                            ) : (
                                <input
                                    type="text"
                                    name="buyerState"
                                    value={form.buyerState}
                                    onChange={onChange}
                                    className="input w-full dark:bg-gray-800 dark:border-gray-700"
                                    required={regionRequired}
                                />
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">City *</label>
                            <input
                                type="text"
                                name="buyerCity"
                                value={form.buyerCity}
                                onChange={onChange}
                                className="input w-full dark:bg-gray-800 dark:border-gray-700"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">ZIP/Postal Code *</label>
                            <input
                                type="text"
                                name="buyerZip"
                                value={form.buyerZip}
                                onChange={onChange}
                                className="input w-full dark:bg-gray-800 dark:border-gray-700"
                                required
                            />
                        </div>
                    </div>
                </div>

                {/* Submit */}
                <div className="flex justify-end gap-2">
                    <Link href={`/orders/${id}`} className="btn">
                        Cancel
                    </Link>
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={saving}
                    >
                        {saving ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </form>
        </div>
    );
}
