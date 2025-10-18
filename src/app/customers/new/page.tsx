"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewCustomerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    phoneCode: "+62",
    shopeeName: "",
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
      if (!formData.name.trim() || !formData.phone.trim()) {
        throw new Error("Name and phone are required");
      }

      const response = await fetch("/api/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          phoneCode: formData.phoneCode.trim(),
          shopeeName: formData.shopeeName.trim() || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create customer");
      }

      router.push("/customers");
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Add New Customer</h1>
          <p className="text-gray-600 dark:text-gray-400">Create a new local customer record</p>
        </div>
        <Link href="/customers" className="btn">
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
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Customer Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Customer Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="input w-full dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                placeholder="Enter customer name"
                required
              />
            </div>

            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone Code *
                </label>
                <input
                  type="text"
                  name="phoneCode"
                  value={formData.phoneCode}
                  onChange={handleInputChange}
                  className="input w-full dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  placeholder="e.g. +62"
                  required
                />
              </div>
              <div className="col-span-8">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="input w-full dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  placeholder="Enter phone number"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Shopee Name (Optional)
              </label>
              <input
                type="text"
                name="shopeeName"
                value={formData.shopeeName}
                onChange={handleInputChange}
                className="input w-full dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                placeholder="Enter Shopee username if applicable"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <Link href="/customers" className="btn">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Customer"}
          </button>
        </div>
      </form>
    </div>
  );
}