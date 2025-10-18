"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";


interface Order {
  id: string;
  placedAt: string;
  notes: string | null;
  quotedAmountMinor: number | null;
  currency: string | null;
  localStatus: string;
  deliveryStatus: string;
  paymentMethod: string;
  externalRef: string | null;
  labelId: string | null;
  trackingLink: string | null;
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

export default function EditOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  // Unwrap Next.js App Router params Promise
  const { id } = React.use(params as Promise<{ id: string }>);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    notes: "",
    localStatus: "",
    deliveryStatus: "",
    paymentMethod: "",
    externalRef: "",
    labelId: "",
    trackingLink: "",
    weightGrams: "",
    lengthCm: "",
    widthCm: "",
    heightCm: "",
    service: "",
    currency: "",
    sku: "",
    hsCode: "",
    countryOfOrigin: "",
  });

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
      const data = await response.json();
      setOrder(data);
      setFormData({
        notes: data.notes || "",
        localStatus: data.localStatus,
        deliveryStatus: data.deliveryStatus,
        paymentMethod: data.paymentMethod,
        externalRef: data.externalRef || "",
        labelId: data.labelId || "",
        trackingLink: data.trackingLink || "",
        weightGrams: data.package?.weightGrams?.toString() || "",
        lengthCm: data.package?.lengthCm?.toString() || "",
        widthCm: data.package?.widthCm?.toString() || "",
        heightCm: data.package?.heightCm?.toString() || "",
        service: data.package?.service || "",
        currency: data.package?.currency || "",
        sku: data.package?.sku || "",
        hsCode: data.package?.hsCode || "",
        countryOfOrigin: data.package?.countryOfOrigin || "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/orders/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          weightGrams: formData.weightGrams ? parseInt(formData.weightGrams) : null,
          lengthCm: formData.lengthCm ? parseFloat(formData.lengthCm) : null,
          widthCm: formData.widthCm ? parseFloat(formData.widthCm) : null,
          heightCm: formData.heightCm ? parseFloat(formData.heightCm) : null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update order");
      }

      router.push(`/orders/${id}`);
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
        <Link href={`/orders/${id}`} className="btn">
          Back to Order
        </Link>
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Edit Order</h1>
          <p className="text-gray-600 dark:text-gray-400">Order ID: {order.id.substring(0, 8)}...</p>
        </div>
        <Link href={`/orders/${id}`} className="btn">
          Cancel
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg dark:bg-red-900 dark:border-red-700 dark:text-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Order Information */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Order Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Local Status
              </label>
              <select
                name="localStatus"
                value={formData.localStatus}
                onChange={handleInputChange}
                className="input w-full"
              >
                <option value="in_progress">In Progress</option>
                <option value="on_the_way">On The Way</option>
                <option value="pending_payment">Pending Payment</option>
                <option value="paid">Paid</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Delivery Status
              </label>
              <select
                name="deliveryStatus"
                value={formData.deliveryStatus}
                onChange={handleInputChange}
                className="input w-full"
              >
                <option value="not_yet_create_label">Not Yet Create Label</option>
                <option value="label_confirmed">Label Confirmed</option>
                <option value="ready_to_send">Ready to Send</option>
                <option value="tracking_received">Tracking Received</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                External Reference
              </label>
              <input
                type="text"
                name="externalRef"
                value={formData.externalRef}
                onChange={handleInputChange}
                className="input w-full"
                placeholder="External reference"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Label ID
              </label>
              <input
                type="text"
                name="labelId"
                value={formData.labelId}
                onChange={handleInputChange}
                className="input w-full"
                placeholder="Label ID"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tracking Link
              </label>
              <input
                type="text"
                name="trackingLink"
                value={formData.trackingLink}
                onChange={handleInputChange}
                className="input w-full"
                placeholder="Tracking link"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={3}
                className="input w-full"
                placeholder="Order notes..."
              />
            </div>
          </div>
        </div>

        {/* Package Details */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Package Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Weight (grams)
              </label>
              <input
                type="number"
                name="weightGrams"
                value={formData.weightGrams}
                onChange={handleInputChange}
                className="input w-full"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Length (cm)
              </label>
              <input
                type="number"
                name="lengthCm"
                value={formData.lengthCm}
                onChange={handleInputChange}
                className="input w-full"
                placeholder="0"
                step="0.1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Width (cm)
              </label>
              <input
                type="number"
                name="widthCm"
                value={formData.widthCm}
                onChange={handleInputChange}
                className="input w-full"
                placeholder="0"
                step="0.1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Height (cm)
              </label>
              <input
                type="number"
                name="heightCm"
                value={formData.heightCm}
                onChange={handleInputChange}
                className="input w-full"
                placeholder="0"
                step="0.1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Service
              </label>
              <select
                name="service"
                value={formData.service}
                onChange={handleInputChange}
                className="input w-full"
              >
                <option value="economy">Economy</option>
                <option value="express">Express</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Currency
              </label>
              <select
                name="currency"
                value={formData.currency}
                onChange={handleInputChange}
                className="input w-full"
              >
                <option value="IDR">IDR</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                SKU
              </label>
              <input
                type="text"
                name="sku"
                value={formData.sku}
                onChange={handleInputChange}
                className="input w-full"
                placeholder="SKU"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                HS Code
              </label>
              <input
                type="text"
                name="hsCode"
                value={formData.hsCode}
                onChange={handleInputChange}
                className="input w-full"
                placeholder="HS Code"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Country of Origin
              </label>
              <input
                type="text"
                name="countryOfOrigin"
                value={formData.countryOfOrigin}
                onChange={handleInputChange}
                className="input w-full"
                placeholder="Country code"
              />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Payment Method</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Payment Method
            </label>
            <select
              name="paymentMethod"
              value={formData.paymentMethod}
              onChange={handleInputChange}
              className="input w-full"
            >
              <option value="qris">QRIS</option>
              <option value="bank_transfer">Bank Transfer</option>
            </select>
          </div>
        </div>

        {/* Customer and Recipient Info (Read-only) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Customer Information</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Name</p>
                <p className="text-gray-900 dark:text-white">{order.customer.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</p>
                <p className="text-gray-900 dark:text-white">{order.customer.phone}</p>
              </div>
              {order.customer.shopeeName && (
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Shopee Name</p>
                  <p className="text-gray-900 dark:text-white">{order.customer.shopeeName}</p>
                </div>
              )}
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Recipient Information</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Name</p>
                <p className="text-gray-900 dark:text-white">{order.buyer.buyerFullName}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</p>
                <p className="text-gray-900 dark:text-white">
                  {order.buyer.phoneCode}{order.buyer.buyerPhone}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Address</p>
                <p className="text-gray-900 dark:text-white text-sm">
                  {order.buyer.buyerAddress1}
                  <br />
                  {order.buyer.buyerCity}, {order.buyer.buyerState} {order.buyer.buyerZip}
                  <br />
                  {order.buyer.buyerCountry}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <Link href={`/orders/${id}`} className="btn">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="btn btn-primary disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}