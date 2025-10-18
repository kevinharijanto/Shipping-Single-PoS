"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Buyer {
  id: number;
  saleRecordNumber: string;
  buyerFullName: string;
  buyerAddress1: string;
  buyerCity: string;
  buyerState: string;
  buyerZip: string;
  buyerCountry: string;
  buyerPhone: string;
  phoneCode: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    orders: number;
  };
}

export default function BuyersPage() {
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchBuyers();
  }, []);

  async function fetchBuyers() {
    try {
      const response = await fetch("/api/buyers");
      if (!response.ok) {
        throw new Error("Failed to fetch recipients");
      }
      const data = await response.json();
      setBuyers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function deleteBuyer(id: number) {
    if (!confirm("Are you sure you want to delete this recipient?")) {
      return;
    }

    try {
      const response = await fetch(`/api/buyers/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete recipient");
      }

      await fetchBuyers(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  }

  const filteredBuyers = buyers.filter(
    (buyer) =>
      buyer.buyerFullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      buyer.saleRecordNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      buyer.buyerCountry.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading recipients...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Recipients</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage international recipients</p>
        </div>
        <Link
          href="/buyers/new"
          className="btn btn-primary w-full sm:w-auto"
        >
          Add Recipient
        </Link>
      </div>

      {/* Search */}
      <div className="card p-4">
        <div className="w-full sm:max-w-md">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Search Recipients
          </label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input w-full"
            placeholder="Search by name, record number, or country..."
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg dark:bg-red-900 dark:border-red-700 dark:text-red-200">
          {error}
        </div>
      )}

      {/* Buyers Table - Desktop View */}
      <div className="card overflow-hidden hidden lg:block">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Record Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Country
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  City
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Orders
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
              {filteredBuyers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    {searchTerm ? "No recipients found matching your search" : "No recipients yet"}
                  </td>
                </tr>
              ) : (
                filteredBuyers.map((buyer) => (
                  <tr key={buyer.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {buyer.saleRecordNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        <Link
                          href={`/buyers/${buyer.id}`}
                          className="text-primary hover:text-primary-hover"
                        >
                          {buyer.buyerFullName}
                        </Link>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {buyer.buyerCountry}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {buyer.buyerCity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {buyer.phoneCode}{buyer.buyerPhone}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {buyer._count.orders} orders
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        href={`/buyers/${buyer.id}`}
                        className="text-primary hover:text-primary-hover mr-3"
                      >
                        View
                      </Link>
                      <Link
                        href={`/buyers/${buyer.id}/edit`}
                        className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-3"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => deleteBuyer(buyer.id)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        disabled={buyer._count.orders > 0}
                        title={buyer._count.orders > 0 ? "Cannot delete recipient with orders" : "Delete recipient"}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-4">
        {filteredBuyers.length === 0 ? (
          <div className="card p-6 text-center text-gray-500 dark:text-gray-400">
            {searchTerm ? "No recipients found matching your search" : "No recipients yet"}
          </div>
        ) : (
          filteredBuyers.map((buyer) => (
            <div key={buyer.id} className="card p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    <Link
                      href={`/buyers/${buyer.id}`}
                      className="text-primary hover:text-primary-hover"
                    >
                      {buyer.buyerFullName}
                    </Link>
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Record: {buyer.saleRecordNumber}
                  </p>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  {buyer._count.orders} orders
                </span>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center text-gray-600 dark:text-gray-400">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {buyer.buyerCity}, {buyer.buyerCountry}
                </div>
                
                <div className="flex items-center text-gray-600 dark:text-gray-400">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {buyer.phoneCode}{buyer.buyerPhone}
                </div>
                
                {buyer.buyerAddress1 && (
                  <div className="flex items-start text-gray-600 dark:text-gray-400">
                    <svg className="w-4 h-4 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    <span className="line-clamp-2">{buyer.buyerAddress1}</span>
                  </div>
                )}
              </div>
              
              <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                <Link
                  href={`/buyers/${buyer.id}`}
                  className="btn btn-sm btn-outline flex-1 sm:flex-none"
                >
                  View
                </Link>
                <Link
                  href={`/buyers/${buyer.id}/edit`}
                  className="btn btn-sm btn-secondary flex-1 sm:flex-none"
                >
                  Edit
                </Link>
                <button
                  onClick={() => deleteBuyer(buyer.id)}
                  className="btn btn-sm btn-danger flex-1 sm:flex-none"
                  disabled={buyer._count.orders > 0}
                  title={buyer._count.orders > 0 ? "Cannot delete recipient with orders" : "Delete recipient"}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}