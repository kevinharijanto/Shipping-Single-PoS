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
  saleRecordNumber: string;
  srn: string;
  phoneCode: string;
  createdAt: string;
  updatedAt: string;
  orders: {
    id: string;
    placedAt: string;
    localStatus: string;
    deliveryStatus: string;
    quotedAmountMinor: number | null;
    currency: string | null;
    customer: {
      id: string;
      name: string;
    };
  }[];
}

export default function BuyerPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [buyer, setBuyer] = useState<Buyer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBuyer();
  }, [params.id]);

  async function fetchBuyer() {
    try {
      const response = await fetch(`/api/buyers/${params.id}`);
      if (!response.ok) {
        if (response.status === 404) {
          setError("Recipient not found");
        } else {
          throw new Error("Failed to fetch recipient");
        }
        return;
      }
      const data = await response.json();
      setBuyer(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this recipient? This action cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch(`/api/buyers/${params.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete recipient");
      }

      router.push("/buyers");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  }

  function formatCurrency(amount: number | null, currency: string | null) {
    if (!amount) return "-";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: currency || "IDR",
      maximumFractionDigits: 0,
    }).format(amount / 100);
  }

  function getStatusColor(status: string) {
    switch (status) {
      case "in_progress":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "on_the_way":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "pending_payment":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "paid":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "not_yet_create_label":
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
      case "label_confirmed":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "ready_to_send":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "tracking_received":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
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
        <Link href="/buyers" className="btn">
          Back to Recipients
        </Link>
      </div>
    );
  }

  if (!buyer) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Recipient Details</h1>
          <p className="text-gray-600 dark:text-gray-400">Recipient ID: #{buyer.id}</p>
        </div>
        <div className="flex space-x-4">
          <Link href={`/buyers/${buyer.id}/edit`} className="btn btn-primary">
            Edit Recipient
          </Link>
          <button
            onClick={handleDelete}
            className="btn btn-danger"
          >
            Delete Recipient
          </button>
          <Link href="/buyers" className="btn">
            Back to Recipients
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg dark:bg-red-900 dark:border-red-700 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recipient Information */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Recipient Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Full Name
                </label>
                <p className="text-gray-900 dark:text-white">{buyer.buyerFullName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone
                </label>
                <p className="text-gray-900 dark:text-white">
                  {buyer.phoneCode}{buyer.buyerPhone}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  SRN
                </label>
                <p className="text-gray-900 dark:text-white">{buyer.srn}</p>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Address
                </label>
                <p className="text-gray-900 dark:text-white">
                  {buyer.buyerAddress1}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  City
                </label>
                <p className="text-gray-900 dark:text-white">{buyer.buyerCity}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  State
                </label>
                <p className="text-gray-900 dark:text-white">{buyer.buyerState}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  ZIP Code
                </label>
                <p className="text-gray-900 dark:text-white">{buyer.buyerZip}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Country
                </label>
                <p className="text-gray-900 dark:text-white">{buyer.buyerCountry}</p>
              </div>
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

          {/* Recipient Orders */}
          <div className="card p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Order History</h2>
            {buyer.orders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Order ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Local Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Delivery Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                    {buyer.orders.map((order) => (
                      <tr key={order.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {order.id.substring(0, 8)}...
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {new Date(order.placedAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {order.customer.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.localStatus)}`}>
                            {order.localStatus.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.deliveryStatus)}`}>
                            {order.deliveryStatus.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {formatCurrency(order.quotedAmountMinor, order.currency)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Link
                            href={`/orders/${order.id}`}
                            className="text-primary hover:text-primary-hover"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">No orders found for this recipient.</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Recipient Summary */}
          <div className="card p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Recipient Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Total Orders:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {buyer.orders.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Total Value:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatCurrency(
                    buyer.orders.reduce((sum, order) => sum + (order.quotedAmountMinor || 0), 0),
                    buyer.orders[0]?.currency || "IDR"
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Recipient Since:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {new Date(buyer.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Quick Actions</h2>
            <div className="space-y-3">
              <Link
                href={`/orders/new?buyerId=${buyer.id}`}
                className="btn btn-primary w-full text-center"
              >
                Create New Order
              </Link>
              <Link
                href={`/buyers/${buyer.id}/edit`}
                className="btn w-full text-center"
              >
                Edit Recipient
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}