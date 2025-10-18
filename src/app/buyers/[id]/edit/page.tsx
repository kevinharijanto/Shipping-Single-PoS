"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Buyer {
  id: number;
  buyerFullName: string;
  buyerPhone: string;
  buyerAddress1: string;
  buyerCity: string;
  buyerState: string;
  buyerZip: string;
  buyerCountry: string;
  srn: string;
  phoneCode: string;
  createdAt: string;
  updatedAt: string;
}

export default function EditBuyerPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [buyer, setBuyer] = useState<Buyer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    buyerFullName: "",
    buyerPhone: "",
    buyerAddress1: "",
    buyerCity: "",
    buyerState: "",
    buyerZip: "",
    buyerCountry: "",
    saleRecordNumber: "",
    phoneCode: "",
  });

  useEffect(() => {
    fetchBuyer();
  }, [params.id]);

  async function fetchBuyer() {
    console.log("[fetchBuyer]", "start", params.id);
    try {
      const response = await fetch(`/api/buyers/${params.id}`);
      if (!response.ok) {
        if (response.status === 404) {
          setError("Recipient not found");
          console.warn("[fetchBuyer]", "recipient not found", params.id);
        } else {
          throw new Error("Failed to fetch recipient");
        }
        return;
      }
      const data = await response.json();
      console.log("[fetchBuyer]", "loaded buyer", { id: data.id, phoneCode: data.phoneCode });
      setBuyer(data);
      setFormData({
        buyerFullName: data.buyerFullName,
        buyerPhone: data.buyerPhone,
        buyerAddress1: data.buyerAddress1,
        buyerCity: data.buyerCity,
        buyerState: data.buyerState,
        buyerZip: data.buyerZip,
        buyerCountry: data.buyerCountry,
        saleRecordNumber: data.saleRecordNumber || data.srn || "",
        phoneCode: data.phoneCode || "+62",
      });
    } catch (err) {
      console.error("[fetchBuyer]", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }


  function handleInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    console.log("[handleSubmit]", "payload", formData);

    try {
      const response = await fetch(`/api/buyers/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("[handleSubmit]", "update failed", errorData);
        throw new Error(errorData.error || "Failed to update recipient");
      }

      console.log("[handleSubmit]", "update success", params.id);
      router.push(`/buyers/${params.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading recipient...</div>
      </div>
    );
  }

  if (error && !buyer) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg dark:bg-red-900 dark:border-red-700 dark:text-red-200">
          {error}
        </div>
        <Link href={`/buyers/${params.id}`} className="btn">
          Back to Recipient
        </Link>
      </div>
    );
  }

  if (!buyer) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Edit Recipient</h1>
          <p className="text-gray-600 dark:text-gray-400">Recipient ID: #{buyer.id}</p>
        </div>
        <Link href={`/buyers/${params.id}`} className="btn">
          Cancel
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg dark:bg-red-900 dark:border-red-700 dark:text-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Recipient Information */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Recipient Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                name="buyerFullName"
                value={formData.buyerFullName}
                onChange={handleInputChange}
                className="input w-full"
                placeholder="Recipient full name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Phone Code *
              </label>
              <input
                type="text"
                name="phoneCode"
                value={formData.phoneCode}
                onChange={handleInputChange}
                className="input w-full"
                placeholder="e.g. +62"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Phone Number *
              </label>
              <input
                type="tel"
                name="buyerPhone"
                value={formData.buyerPhone}
                onChange={handleInputChange}
                className="input w-full"
                placeholder="Phone number"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Address *
              </label>
              <input
                type="text"
                name="buyerAddress1"
                value={formData.buyerAddress1}
                onChange={handleInputChange}
                className="input w-full"
                placeholder="Street address"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                City *
              </label>
              <input
                type="text"
                name="buyerCity"
                value={formData.buyerCity}
                onChange={handleInputChange}
                className="input w-full"
                placeholder="City"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                State *
              </label>
              <input
                type="text"
                name="buyerState"
                value={formData.buyerState}
                onChange={handleInputChange}
                className="input w-full"
                placeholder="State/Province"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                ZIP Code *
              </label>
              <input
                type="text"
                name="buyerZip"
                value={formData.buyerZip}
                onChange={handleInputChange}
                className="input w-full"
                placeholder="ZIP/Postal code"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Country *
              </label>
              <input
                type="text"
                name="buyerCountry"
                value={formData.buyerCountry}
                onChange={handleInputChange}
                className="input w-full"
                placeholder="Country"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                SRN
              </label>
              <input
                type="text"
                name="saleRecordNumber"
                value={formData.saleRecordNumber}
                onChange={handleInputChange}
                className="input w-full"
                placeholder="Sale Record Number"
                required
              />
            </div>
          </div>
        </div>

        {/* Recipient History (Read-only) */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Recipient History</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Created At
              </label>
              <p className="text-gray-900 dark:text-white">
                {new Date(buyer.createdAt).toLocaleDateString()} {new Date(buyer.createdAt).toLocaleTimeString()}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Last Updated
              </label>
              <p className="text-gray-900 dark:text-white">
                {new Date(buyer.updatedAt).toLocaleDateString()} {new Date(buyer.updatedAt).toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <Link href={`/buyers/${params.id}`} className="btn">
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