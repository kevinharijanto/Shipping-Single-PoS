"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewBuyerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    saleRecordNumber: "",
    buyerFullName: "",
    buyerAddress1: "",
    buyerAddress2: "",
    buyerCity: "",
    buyerState: "",
    buyerZip: "",
    buyerCountry: "",
    buyerPhone: "",
    phoneCode: "",
  });



  function handleInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const requiredFields = [
        "saleRecordNumber",
        "buyerFullName",
        "buyerAddress1",
        "buyerCity",
        "buyerZip",
        "buyerCountry",
        "buyerPhone",
      ];

      for (const field of requiredFields) {
        if (!formData[field as keyof typeof formData].trim()) {
          throw new Error("All required fields must be filled");
        }
      }

      const response = await fetch("/api/buyers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          saleRecordNumber: formData.saleRecordNumber.trim(),
          buyerFullName: formData.buyerFullName.trim(),
          buyerAddress1: formData.buyerAddress1.trim(),
          buyerAddress2: formData.buyerAddress2.trim(),
          buyerCity: formData.buyerCity.trim(),
          buyerState: formData.buyerState.trim(),
          buyerZip: formData.buyerZip.trim(),
          buyerCountry: formData.buyerCountry.trim(),
          buyerPhone: formData.buyerPhone.trim(),
          phoneCode: formData.phoneCode.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create recipient");
      }

      router.push("/buyers");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Add New Recipient</h1>
          <p className="text-gray-600 dark:text-gray-400">Create a new international recipient record</p>
        </div>
        <Link href="/buyers" className="btn">
          Cancel
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg dark:bg-red-900 dark:border-red-700 dark:text-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Recipient Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sale Record Number *
              </label>
              <input
                type="text"
                name="saleRecordNumber"
                value={formData.saleRecordNumber}
                onChange={handleInputChange}
                className="input w-full dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                placeholder="Enter sale record number"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                name="buyerFullName"
                value={formData.buyerFullName}
                onChange={handleInputChange}
                className="input w-full dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                placeholder="Enter recipient full name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Phone Code
              </label>
              <input
                type="text"
                name="phoneCode"
                value={formData.phoneCode}
                onChange={handleInputChange}
                className="input w-full dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                placeholder="e.g. +62"
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
                className="input w-full dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                placeholder="Enter phone number"
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
                className="input w-full dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                placeholder="Enter country"
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
                className="input w-full dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                placeholder="Enter city"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                State/Province
              </label>
              <input
                type="text"
                name="buyerState"
                value={formData.buyerState}
                onChange={handleInputChange}
                className="input w-full dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                placeholder="Enter state or province"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                ZIP/Postal Code *
              </label>
              <input
                type="text"
                name="buyerZip"
                value={formData.buyerZip}
                onChange={handleInputChange}
                className="input w-full dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                placeholder="Enter ZIP/Postal code"
                required
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Address Line 1 *
            </label>
            <input
              type="text"
              name="buyerAddress1"
              value={formData.buyerAddress1}
              onChange={handleInputChange}
              className="input w-full dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              placeholder="Enter address line 1"
              required
            />
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Address Line 2
            </label>
            <input
              type="text"
              name="buyerAddress2"
              value={formData.buyerAddress2}
              onChange={handleInputChange}
              className="input w-full dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              placeholder="Enter address line 2 (optional)"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <Link href="/buyers" className="btn">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Recipient"}
          </button>
        </div>
      </form>
    </div>
  );
}