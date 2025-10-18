"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Customer {
  id: string;
  name: string;
  phone: string;
  shopeeName: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function EditCustomerPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    phoneCode: "+62",
    shopeeName: "",
  });

  useEffect(() => {
    fetchCustomer();
  }, [params.id]);

  async function fetchCustomer() {
    try {
      const response = await fetch(`/api/customers/${params.id}`);
      if (!response.ok) {
        if (response.status === 404) {
          setError("Customer not found");
        } else {
          throw new Error("Failed to fetch customer");
        }
        return;
      }
      const data = await response.json();
      setCustomer(data);
      setFormData({
        name: data.name,
        phone: data.phone,
        phoneCode: data.phoneCode || "+62",
        shopeeName: data.shopeeName || "",
      });
    } catch (err) {
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

    try {
      const response = await fetch(`/api/customers/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          phoneCode: formData.phoneCode || "+62",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update customer");
      }

      router.push(`/customers/${params.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading customer...</div>
      </div>
    );
  }

  if (error && !customer) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg dark:bg-red-900 dark:border-red-700 dark:text-red-200">
          {error}
        </div>
        <Link href={`/customers/${params.id}`} className="btn">
          Back to Customer
        </Link>
      </div>
    );
  }

  if (!customer) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Edit Customer</h1>
          <p className="text-gray-600 dark:text-gray-400">Customer ID: {customer.id.substring(0, 8)}...</p>
        </div>
        <Link href={`/customers/${params.id}`} className="btn">
          Cancel
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg dark:bg-red-900 dark:border-red-700 dark:text-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Information */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Customer Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="input w-full dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                placeholder="Customer name"
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
                  placeholder="Phone number"
                  required
                />
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Shopee Name
              </label>
              <input
                type="text"
                name="shopeeName"
                value={formData.shopeeName}
                onChange={handleInputChange}
                className="input w-full dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                placeholder="Shopee username (optional)"
              />
            </div>
          </div>
        </div>

        {/* Customer History (Read-only) */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Customer History</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Created At
              </label>
              <p className="text-gray-900 dark:text-white">
                {new Date(customer.createdAt).toLocaleDateString()} {new Date(customer.createdAt).toLocaleTimeString()}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Last Updated
              </label>
              <p className="text-gray-900 dark:text-white">
                {new Date(customer.updatedAt).toLocaleDateString()} {new Date(customer.updatedAt).toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <Link href={`/customers/${params.id}`} className="btn">
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