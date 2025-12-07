// src/app/orders/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import NewOrderModal from "@/components/OrderModal";
import AuthGuard from "@/components/AuthGuard";

/* ────────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────────── */
interface Order {
  id: string;
  placedAt: string;
  localStatus: string;
  deliveryStatus: string;
  shippingPriceMinor: number | null;
  notes: string | null;
  buyer: { id: string; buyerFullName: string; buyerCountry: string };
  package: { id: string; weightGrams: number | null; service: string };
}

interface CustomerGroup {
  customer: { id: string; name: string; phone: string };
  orders: Order[];
}

/* ────────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────────── */
function formatPrice(minor: number | null) {
  if (minor === null || minor === undefined) return "-";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(minor);
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`w-5 h-5 transition-transform ${open ? "rotate-90" : ""}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

/* ────────────────────────────────────────────────────────────────
   Customer Group Component
───────────────────────────────────────────────────────────────── */
const LOCAL_STATUSES = [
  { code: "in_progress", name: "In Progress" },
  { code: "pending_payment", name: "Pending Payment" },
  { code: "paid", name: "Paid" },
  { code: "on_the_way", name: "On The Way" },
];

const DELIVERY_STATUSES = [
  { code: "not_yet_submit_to_kurasi", name: "Not Submitted" },
  { code: "submitted_to_Kurasi", name: "Submitted" },
  { code: "label_confirmed", name: "Label Confirmed" },
  { code: "ready_to_send", name: "Ready to Send" },
  { code: "tracking_received", name: "Tracking Received" },
];

function CustomerOrderGroup({ group, onStatusChange }: { group: CustomerGroup; onStatusChange: () => void }) {
  const [open, setOpen] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // Calculate total for this customer
  const total = group.orders.reduce((sum, o) => sum + (o.shippingPriceMinor || 0), 0);

  async function handleStatusChange(orderId: string, field: "localStatus" | "deliveryStatus", newStatus: string) {
    setUpdatingOrderId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: newStatus }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to update status");
      } else {
        onStatusChange(); // Refresh the list
      }
    } catch (e) {
      alert("Error updating status");
    } finally {
      setUpdatingOrderId(null);
    }
  }

  return (
    <div className="card overflow-hidden">
      {/* Customer Header with Total */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[rgba(55,53,47,0.04)] hover:bg-[rgba(55,53,47,0.08)] transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <ChevronIcon open={open} />
          <div>
            <span className="font-semibold text-[var(--text-main)]">{group.customer.name}</span>
            <span className="ml-2 text-sm text-[var(--text-muted)]">{group.customer.phone}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="font-medium text-[var(--text-main)]">{formatPrice(total)}</div>
          <div className="text-xs text-[var(--text-muted)]">{group.orders.length} order(s)</div>
        </div>
      </button>

      {/* Stacked Order Rows */}
      {open && (
        <div className="divide-y divide-[var(--border-color)]">
          {group.orders.map((order) => (
            <div
              key={order.id}
              className="px-4 py-3 hover:bg-[rgba(55,53,47,0.04)] transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <Link href={`/orders/${order.id}`} className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="font-medium text-[var(--text-main)] truncate max-w-[180px] sm:max-w-none">
                      {order.buyer.buyerFullName}
                    </span>
                    <span className="text-xs text-[var(--text-muted)] shrink-0">
                      → {order.buyer.buyerCountry}
                    </span>
                  </div>
                  <div className="text-xs text-[var(--text-muted)] mt-0.5">
                    {new Date(order.placedAt).toLocaleDateString()} • {order.package.service} • {order.package.weightGrams}g
                  </div>
                </Link>
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={order.localStatus}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleStatusChange(order.id, "localStatus", e.target.value);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    disabled={updatingOrderId === order.id}
                    className="text-xs px-2 py-1 rounded border border-[var(--border-color)] bg-white dark:bg-gray-800 text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
                  >
                    {LOCAL_STATUSES.map((s) => (
                      <option key={s.code} value={s.code}>{s.name}</option>
                    ))}
                  </select>
                  <select
                    value={order.deliveryStatus}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleStatusChange(order.id, "deliveryStatus", e.target.value);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    disabled={updatingOrderId === order.id}
                    className="text-xs px-2 py-1 rounded border border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-blue-400/40 disabled:opacity-50"
                  >
                    {DELIVERY_STATUSES.map((s) => (
                      <option key={s.code} value={s.code}>{s.name}</option>
                    ))}
                  </select>
                  <span className="font-medium text-[var(--text-main)]">
                    {formatPrice(order.shippingPriceMinor)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   Main Page
───────────────────────────────────────────────────────────────── */
export default function OrdersPage() {
  const [groups, setGroups] = useState<CustomerGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create modal
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    try {
      setLoading(true);
      const response = await fetch("/api/orders?groupBy=customer");
      if (!response.ok) throw new Error("Failed to fetch orders");
      const data = await response.json();
      setGroups(data.groups || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  // Grand total
  const grandTotal = groups.reduce(
    (sum, g) => sum + g.orders.reduce((s, o) => s + (o.shippingPriceMinor || 0), 0),
    0
  );

  if (loading && groups.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg text-[var(--text-muted)]">Loading orders...</div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-[var(--text-main)]">Orders</h1>
            <p className="text-[var(--text-muted)]">
              {groups.length} customer(s) • Total: {formatPrice(grandTotal)}
            </p>
          </div>
          <button onClick={() => setShowNewOrderModal(true)} className="btn btn-primary">
            Create New Order
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg dark:bg-red-900/20 dark:border-red-800 dark:text-red-200">
            {error}
          </div>
        )}

        {/* Grouped by Customer */}
        {groups.length === 0 ? (
          <div className="card p-8 text-center text-[var(--text-muted)]">
            No orders found. Create your first order!
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => (
              <CustomerOrderGroup key={group.customer.id} group={group} onStatusChange={fetchOrders} />
            ))}
          </div>
        )}

        {/* Create Order Modal */}
        <NewOrderModal
          isOpen={showNewOrderModal}
          onClose={() => setShowNewOrderModal(false)}
          onSuccess={() => {
            setShowNewOrderModal(false);
            fetchOrders();
          }}
        />
      </div>
    </AuthGuard>
  );
}
