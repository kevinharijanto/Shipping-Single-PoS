// src/app/orders/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import OrderModal from "@/components/OrderModal";

// --- tiny debounce ----------------------------------------------------------
function useDebounced<T>(value: T, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

function DotSpinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" role="status" aria-label="loading">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25" />
      <path d="M22 12a10 10 0 0 1-10 10" fill="currentColor" />
    </svg>
  );
}
// ---------------------------------------------------------------------------

interface Order {
  id: string;
  placedAt: string;
  notes: string | null;
  quotedAmountMinor: number | null;
  currency: string | null;
  localStatus: string;
  deliveryStatus: string;
  paymentMethod: string;
  customer: { id: string; name: string; phone: string };
  buyer: { id: string; buyerFullName: string; buyerCountry: string };
  package: { id: string; weightGrams: number | null; service: string };
}

interface OrdersResponse {
  orders: Order[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedQ = useDebounced(searchTerm, 300);

  const [showOrderModal, setShowOrderModal] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    fetchOrders(debouncedQ, statusFilter, page, pageSize);
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ, statusFilter, page, pageSize]);

  async function fetchOrders(q: string, status: string, p: number, ps: number) {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: String(p),
        limit: String(ps),
      });
      if (q.trim()) params.set("q", q.trim());
      if (status) params.set("status", status);

      const res = await fetch(`/api/orders?${params.toString()}`, { signal: ac.signal });
      if (!res.ok) throw new Error("Failed to fetch orders");

      const data: OrdersResponse = await res.json();
      setOrders(data.orders);
      setTotalPages(data.pagination.pages);
      setTotal(data.pagination.total);

      // if current page is out of range after filter
      if (p > data.pagination.pages) setPage(Math.max(1, data.pagination.pages));
    } catch (err: any) {
      if (err?.name !== "AbortError") setError(err?.message || "An error occurred");
    } finally {
      if (!ac.signal.aborted) setLoading(false);
    }
  }

  async function updateOrderStatus(orderId: string, status: string, type: "local" | "delivery") {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          [type === "local" ? "localStatus" : "deliveryStatus"]: status,
        }),
      });
      if (!res.ok) throw new Error("Failed to update order status");
      fetchOrders(debouncedQ, statusFilter, page, pageSize);
    } catch (err: any) {
      setError(err?.message || "An error occurred");
    }
  }

  async function deleteOrder(orderId: string) {
    if (!confirm("Delete this order? This action cannot be undone.")) return;
    try {
      const res = await fetch(`/api/orders/${orderId}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Failed to delete order");
      }
      fetchOrders(debouncedQ, statusFilter, page, pageSize);
    } catch (err: any) {
      setError(err?.message || "An error occurred");
    }
  }

  function formatCurrency(amount: number | null, currency: string | null) {
    if (!amount) return "—";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: currency || "IDR",
      maximumFractionDigits: 0,
    }).format(amount / 100);
  }

  function badge(status: string) {
    const cls =
      status === "in_progress" || status === "label_confirmed"
        ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
        : status === "on_the_way"
        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
        : status === "pending_payment"
        ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
        : status === "paid" || status === "tracking_received"
        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
        : status === "ready_to_send"
        ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
        : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    return `text-xs px-2 py-1 rounded-full ${cls}`;
  }

  const rows = useMemo(() => orders, [orders]);

  if (loading && orders.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading orders…</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Orders</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your shipping orders</p>
        </div>
        <button onClick={() => setShowOrderModal(true)} className="btn btn-primary">
          Create New Order
        </button>
      </div>

      {/* Search + Filters */}
      <div className="card p-4 space-y-4">
        <div className="w-full sm:max-w-xl relative">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Search (id / customer / recipient / service / phone)
          </label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setPage(1);
              setSearchTerm(e.target.value);
            }}
            className="input w-full pr-8"
            placeholder="e.g. 'Kevin', 'IFLYCAT', 'express', '+6281', 'ORD…'"
            aria-busy={loading}
          />
          {loading && (
            <span className="absolute right-2 top-9 text-gray-400 dark:text-gray-500">
              <DotSpinner />
            </span>
          )}
        </div>

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
                setPage(1);
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

      {/* Mobile list */}
      <div className="md:hidden space-y-4">
        {rows.length === 0 ? (
          <div className="card p-4 text-center text-gray-500 dark:text-gray-400">No orders found</div>
        ) : (
          rows.map((o) => (
            <div key={o.id} className="card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Date</div>
                  <div className="text-sm font-medium">{new Date(o.placedAt).toLocaleDateString()}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Amount</div>
                  <div className="text-sm font-medium">{formatCurrency(o.quotedAmountMinor, o.currency)}</div>
                </div>
              </div>

              <div className="mt-3">
                <div className="text-xs text-gray-500 dark:text-gray-400">Customer</div>
                <div className="text-sm font-medium">{o.customer.name}</div>
              </div>

              <div className="mt-2">
                <div className="text-xs text-gray-500 dark:text-gray-400">Recipient</div>
                <div className="text-sm font-medium">{o.buyer.buyerFullName}</div>
              </div>

              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center">
                  <span className={badge(o.localStatus)}>{o.localStatus.replaceAll("_", " ")}</span>
                  <span className={`ml-2 ${badge(o.deliveryStatus)}`}>{o.deliveryStatus.replaceAll("_", " ")}</span>
                </div>
                <div className="text-xs font-medium capitalize">{o.package.service}</div>
              </div>

              {/* Quick status updates */}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium mb-1">Local Status</label>
                  <select
                    className={`input w-full text-xs ${badge(o.localStatus)}`}
                    value={o.localStatus}
                    onChange={(e) => updateOrderStatus(o.id, e.target.value, "local")}
                  >
                    <option value="in_progress">In Progress</option>
                    <option value="on_the_way">On The Way</option>
                    <option value="pending_payment">Pending Payment</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Delivery Status</label>
                  <select
                    className={`input w-full text-xs ${badge(o.deliveryStatus)}`}
                    value={o.deliveryStatus}
                    onChange={(e) => updateOrderStatus(o.id, e.target.value, "delivery")}
                  >
                    <option value="not_yet_create_label">Not Yet Create Label</option>
                    <option value="label_confirmed">Label Confirmed</option>
                    <option value="ready_to_send">Ready to Send</option>
                    <option value="tracking_received">Tracking Received</option>
                  </select>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap justify-end gap-2">
                <Link href={`/orders/${o.id}`} className="btn">View</Link>
                <Link href={`/orders/${o.id}/edit`} className="btn btn-primary">Edit</Link>
                <button onClick={() => deleteOrder(o.id)} className="btn btn-danger">Delete</button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop table */}
      <div className="card overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <Th>Date</Th>
                <Th>Customer</Th>
                <Th>Recipient</Th>
                <Th>Service</Th>
                <Th>Amount</Th>
                <Th>Local Status</Th>
                <Th>Delivery Status</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    No orders found
                  </td>
                </tr>
              ) : (
                rows.map((o) => (
                  <tr key={o.id}>
                    <Td>{new Date(o.placedAt).toLocaleDateString()}</Td>
                    <Td>{o.customer.name}</Td>
                    <Td>{o.buyer.buyerFullName}</Td>
                    <Td className="capitalize">{o.package.service}</Td>
                    <Td>{formatCurrency(o.quotedAmountMinor, o.currency)}</Td>
                    <Td>
                      <select
                        className={`text-xs px-2 py-1 rounded-full border-0 ${badge(o.localStatus)}`}
                        value={o.localStatus}
                        onChange={(e) => updateOrderStatus(o.id, e.target.value, "local")}
                      >
                        <option value="in_progress">In Progress</option>
                        <option value="on_the_way">On The Way</option>
                        <option value="pending_payment">Pending Payment</option>
                        <option value="paid">Paid</option>
                      </select>
                    </Td>
                    <Td>
                      <select
                        className={`text-xs px-2 py-1 rounded-full border-0 ${badge(o.deliveryStatus)}`}
                        value={o.deliveryStatus}
                        onChange={(e) => updateOrderStatus(o.id, e.target.value, "delivery")}
                      >
                        <option value="not_yet_create_label">Not Yet Create Label</option>
                        <option value="label_confirmed">Label Confirmed</option>
                        <option value="ready_to_send">Ready to Send</option>
                        <option value="tracking_received">Tracking Received</option>
                      </select>
                    </Td>
                    <Td className="text-sm font-medium">
                      <Link href={`/orders/${o.id}`} className="text-primary hover:underline mr-3">View</Link>
                      <Link href={`/orders/${o.id}/edit`} className="text-indigo-600 hover:underline">Edit</Link>
                      <button onClick={() => deleteOrder(o.id)} className="text-red-600 hover:underline ml-3">
                        Delete
                      </button>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-gray-200 dark:border-gray-800">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Page <span className="font-semibold">{page}</span> of{" "}
            <span className="font-semibold">{totalPages}</span> ·{" "}
            <span className="font-semibold">{total}</span> result{total === 1 ? "" : "s"}
          </div>
          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(e) => {
                setPage(1);
                setPageSize(parseInt(e.target.value, 10));
              }}
              className="input !py-1 !px-2"
              title="Rows per page"
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>{n} / page</option>
              ))}
            </select>
            <button className="btn btn-outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
              ‹ Prev
            </button>
            <button className="btn btn-outline" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
              Next ›
            </button>
          </div>
        </div>
      </div>

      <OrderModal
        isOpen={showOrderModal}
        onClose={() => setShowOrderModal(false)}
        onSuccess={() => fetchOrders(debouncedQ, statusFilter, page, pageSize)}
      />
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
      {children}
    </th>
  );
}
function Td({ children, className = "" as string }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-200 ${className}`}>{children}</td>;
}
