"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import NewOrderModal from "@/components/NewOrderModal";

interface Order {
  id: string;
  placedAt: string;
  notes: string | null;
  quotedAmountMinor: number | null;
  currency: string | null;
  localStatus: string;
  deliveryStatus: string;
  paymentMethod: string;
  customer: {
    id: string;
    name: string;
    phone: string;
  };
  buyer: {
    id: number;
    buyerFullName: string;
    buyerCountry: string;
  };
  package: {
    id: string;
    weightGrams: number | null;
    service: string;
  };
}

interface OrdersResponse {
  orders: Order[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, [currentPage, statusFilter]);

  async function fetchOrders() {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "10",
      });
      
      if (statusFilter) {
        params.append("status", statusFilter);
      }

      const response = await fetch(`/api/orders?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch orders");
      }

      const data: OrdersResponse = await response.json();
      setOrders(data.orders);
      setTotalPages(data.pagination.pages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function updateOrderStatus(orderId: string, status: string, type: 'local' | 'delivery') {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          [type === 'local' ? 'localStatus' : 'deliveryStatus']: status,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update order status");
      }

      await fetchOrders(); // Refresh the orders list
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  }

  async function handleDelete(orderId: string) {
    if (!confirm("Are you sure you want to delete this order? This action cannot be undone.")) {
      return;
    }
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({} as any));
        throw new Error(errorData.error || "Failed to delete order");
      }
      await fetchOrders();
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
    }).format(amount / 100); // Convert from minor units
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

  if (loading && orders.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading orders...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Orders</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your shipping orders</p>
        </div>
        <button
          onClick={() => setShowNewOrderModal(true)}
          className="btn btn-primary"
        >
          Create New Order
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Filter by Status
            </label>
            <select
              className="input"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Orders</option>
              <optgroup label="Local Status">
                <option value="in_progress">In Progress</option>
                <option value="on_the_way">On The Way</option>
                <option value="pending_payment">Pending Payment</option>
                <option value="paid">Paid</option>
              </optgroup>
              <optgroup label="Delivery Status">
                <option value="not_yet_create_label">Not Yet Create Label</option>
                <option value="label_confirmed">Label Confirmed</option>
                <option value="ready_to_send">Ready to Send</option>
                <option value="tracking_received">Tracking Received</option>
              </optgroup>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg dark:bg-red-900 dark:border-red-700 dark:text-red-200">
          {error}
        </div>
      )}

      {/* Mobile list (cards) */}
      <div className="md:hidden space-y-4">
        {orders.length === 0 ? (
          <div className="card p-4 text-center text-gray-500 dark:text-gray-400">
            No orders found
          </div>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Date</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {new Date(order.placedAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Amount</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatCurrency(order.quotedAmountMinor, order.currency)}
                  </div>
                </div>
              </div>
  
              <div className="mt-3">
                <div className="text-xs text-gray-500 dark:text-gray-400">Customer</div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {order.customer.name}
                </div>
              </div>
  
              <div className="mt-2">
                <div className="text-xs text-gray-500 dark:text-gray-400">Recipient</div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {order.buyer.buyerFullName}
                </div>
              </div>
  
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center">
                  <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(order.localStatus)}`}>
                    {order.localStatus.replaceAll("_", " ")}
                  </span>
                  <span className={`ml-2 text-xs px-2 py-1 rounded-full ${getStatusColor(order.deliveryStatus)}`}>
                    {order.deliveryStatus.replaceAll("_", " ")}
                  </span>
                </div>
                <div className="text-xs font-medium text-gray-900 dark:text-white capitalize">
                  {order.package.service}
                </div>
              </div>
  
              {/* Inline status controls for quick updates on mobile */}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Local Status
                  </label>
                  <select
                    className={`input w-full text-xs ${getStatusColor(order.localStatus)}`}
                    value={order.localStatus}
                    onChange={(e) => updateOrderStatus(order.id, e.target.value, "local")}
                  >
                    <option value="in_progress">In Progress</option>
                    <option value="on_the_way">On The Way</option>
                    <option value="pending_payment">Pending Payment</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Delivery Status
                  </label>
                  <select
                    className={`input w-full text-xs ${getStatusColor(order.deliveryStatus)}`}
                    value={order.deliveryStatus}
                    onChange={(e) => updateOrderStatus(order.id, e.target.value, "delivery")}
                  >
                    <option value="not_yet_create_label">Not Yet Create Label</option>
                    <option value="label_confirmed">Label Confirmed</option>
                    <option value="ready_to_send">Ready to Send</option>
                    <option value="tracking_received">Tracking Received</option>
                  </select>
                </div>
              </div>
  
              {/* Actions */}
              <div className="mt-3 flex flex-wrap justify-end gap-2">
                <Link href={`/orders/${order.id}`} className="btn">
                  View
                </Link>
                <Link href={`/orders/${order.id}/edit`} className="btn btn-primary">
                  Edit
                </Link>
                <button onClick={() => handleDelete(order.id)} className="btn btn-danger">
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
  
      {/* Mobile pagination */}
      {totalPages > 1 && (
        <div className="md:hidden bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
          <div className="flex-1 flex justify-between">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
  
      {/* Desktop table */}
      <div className="card overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Recipient
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Service
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Local Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Delivery Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    No orders found
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(order.placedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {order.customer.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {order.buyer.buyerFullName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {order.package.service}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatCurrency(order.quotedAmountMinor, order.currency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        className={`text-xs px-2 py-1 rounded-full border-0 ${getStatusColor(
                          order.localStatus
                        )}`}
                        value={order.localStatus}
                        onChange={(e) =>
                          updateOrderStatus(order.id, e.target.value, "local")
                        }
                      >
                        <option value="in_progress">In Progress</option>
                        <option value="on_the_way">On The Way</option>
                        <option value="pending_payment">Pending Payment</option>
                        <option value="paid">Paid</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        className={`text-xs px-2 py-1 rounded-full border-0 ${getStatusColor(
                          order.deliveryStatus
                        )}`}
                        value={order.deliveryStatus}
                        onChange={(e) =>
                          updateOrderStatus(order.id, e.target.value, "delivery")
                        }
                      >
                        <option value="not_yet_create_label">Not Yet Create Label</option>
                        <option value="label_confirmed">Label Confirmed</option>
                        <option value="ready_to_send">Ready to Send</option>
                        <option value="tracking_received">Tracking Received</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        href={`/orders/${order.id}`}
                        className="text-primary hover:text-primary-hover mr-3"
                      >
                        View
                      </Link>
                      <Link
                        href={`/orders/${order.id}/edit`}
                        className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(order.id)}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 ml-3"
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
  
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing page <span className="font-medium">{currentPage}</span> of{" "}
                  <span className="font-medium">{totalPages}</span>
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        currentPage === i + 1
                          ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                          : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      <NewOrderModal
        isOpen={showNewOrderModal}
        onClose={() => setShowNewOrderModal(false)}
        onSuccess={() => {
          fetchOrders(); // Refresh the orders list
        }}
      />
    </div>
  );
}