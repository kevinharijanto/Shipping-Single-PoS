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
  feeMinor: number | null;
  notes: string | null;
  srnId: number | null;
  krsTrackingNumber: string | null;
  buyer: { id: string; buyerFullName: string; buyerCountry: string };
  package: { id: string; weightGrams: number | null; service: string };
}

interface CustomerGroup {
  customer: { id: string; name: string; phone: string };
  date: string;
  orders: Order[];
}

function formatGroupDate(dateStr: string | undefined | null) {
  if (!dateStr) return "No Date";
  try {
    const date = new Date(dateStr + "T00:00:00");
    if (isNaN(date.getTime())) return dateStr; // fallback to raw string
    return date.toLocaleDateString("id-ID", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr || "No Date";
  }
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
  { code: "ready_to_send", name: "Ready to Send" },
  { code: "tracking_received", name: "Tracking Received" },
];

function CustomerOrderGroup({ group, onStatusChange }: { group: CustomerGroup; onStatusChange: () => void }) {
  const [open, setOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Calculate totals for this group
  const totalShipping = group.orders.reduce((sum, o) => sum + (o.shippingPriceMinor || 0), 0);
  const totalFee = group.orders.reduce((sum, o) => sum + (o.feeMinor || 0), 0);
  const total = totalShipping + totalFee;

  // Use first order's status as the group status (all should be same)
  const groupLocalStatus = group.orders[0]?.localStatus || "in_progress";
  const groupDeliveryStatus = group.orders[0]?.deliveryStatus || "not_yet_submit_to_kurasi";

  // Update all orders in this group
  async function handleGroupStatusChange(field: "localStatus" | "deliveryStatus", newStatus: string) {
    setUpdating(true);
    try {
      // Update all orders in this group
      const updates = group.orders.map((order) =>
        fetch(`/api/orders/${order.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [field]: newStatus }),
        })
      );
      const results = await Promise.all(updates);
      const failed = results.filter((r) => !r.ok);
      if (failed.length > 0) {
        alert(`Failed to update ${failed.length} order(s)`);
      }
      onStatusChange(); // Refresh the list
    } catch (e) {
      alert("Error updating status");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="card overflow-hidden">
      {/* Group Header with Status Controls - Responsive */}
      <div className="px-4 py-3 bg-[rgba(55,53,47,0.04)] space-y-2">
        {/* Row 1: Chevron + Customer name + Price */}
        <div className="flex items-start justify-between gap-2">
          <button
            onClick={() => setOpen(!open)}
            className="flex items-start gap-2 hover:opacity-80 transition-opacity min-w-0 text-left"
          >
            <ChevronIcon open={open} />
            <div className="min-w-0">
              <div className="font-semibold text-[var(--text-main)]">{group.customer.name}</div>
              <div className="text-xs text-[var(--text-muted)]">{formatGroupDate(group.date)}</div>
            </div>
          </button>
          <div className="text-right shrink-0">
            <div className="font-medium text-[var(--text-main)]">{formatPrice(total)}</div>
            <div className="text-xs text-[var(--text-muted)]">{group.orders.length} order(s)</div>
          </div>
        </div>

        {/* Row 2: Status dropdowns - full width on mobile */}
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={groupLocalStatus}
            onChange={(e) => {
              e.stopPropagation();
              handleGroupStatusChange("localStatus", e.target.value);
            }}
            onClick={(e) => e.stopPropagation()}
            disabled={updating}
            className="flex-1 text-xs px-2 py-1.5 rounded border border-[var(--border-color)] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
          >
            {LOCAL_STATUSES.map((s) => (
              <option key={s.code} value={s.code} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">{s.name}</option>
            ))}
          </select>
          <select
            value={groupDeliveryStatus}
            onChange={(e) => {
              e.stopPropagation();
              handleGroupStatusChange("deliveryStatus", e.target.value);
            }}
            onClick={(e) => e.stopPropagation()}
            disabled={updating}
            className="flex-1 text-xs px-2 py-1.5 rounded border border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400/40 disabled:opacity-50"
          >
            {DELIVERY_STATUSES.map((s) => (
              <option key={s.code} value={s.code} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Order Rows - Table-like layout */}
      {open && (
        <div className="divide-y divide-[var(--border-color)]">
          {/* Header row - hidden on mobile */}
          <div className="hidden sm:grid sm:grid-cols-[50px_1fr_60px_50px_60px_80px_80px] gap-2 px-4 py-2 text-xs font-medium text-[var(--text-muted)] bg-[rgba(55,53,47,0.02)]">
            <span>SRN</span>
            <span>Buyer Name / KRS</span>
            <span>Country</span>
            <span>Service</span>
            <span className="text-right">Weight</span>
            <span className="text-right">Fee</span>
            <span className="text-right">Price</span>
          </div>
          {group.orders.map((order) => (
            <div
              key={order.id}
              className="px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-150 border-l-2 border-transparent hover:border-blue-500 flex items-center gap-2"
            >
              <Link href={`/orders/${order.id}`} className="flex-1 min-w-0">
                {/* Desktop: Grid layout */}
                <div className="hidden sm:grid sm:grid-cols-[50px_1fr_60px_50px_60px_80px_80px] gap-2 items-center text-sm">
                  <span className="text-[var(--text-muted)]">{order.srnId || "-"}</span>
                  <div className="truncate">
                    <span className="font-medium text-[var(--text-main)]">{order.buyer.buyerFullName}</span>
                    {order.krsTrackingNumber && (
                      <span className="ml-2 font-bold text-blue-600 dark:text-blue-400">{order.krsTrackingNumber}</span>
                    )}
                  </div>
                  <span className="text-[var(--text-muted)]">{order.buyer.buyerCountry}</span>
                  <span className="text-[var(--text-muted)]">{order.package.service}</span>
                  <span className="text-right text-[var(--text-muted)]">{order.package.weightGrams}g</span>
                  <span className="text-right text-green-600 dark:text-green-400">{formatPrice(order.feeMinor)}</span>
                  <span className="text-right font-medium text-[var(--text-main)]">{formatPrice(order.shippingPriceMinor)}</span>
                </div>
                {/* Mobile: Compact layout */}
                <div className="sm:hidden flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium text-[var(--text-main)] truncate">
                      {order.buyer.buyerFullName}
                      {order.krsTrackingNumber && (
                        <span className="ml-2 font-bold text-blue-600 dark:text-blue-400">{order.krsTrackingNumber}</span>
                      )}
                    </div>
                    <div className="text-xs text-[var(--text-muted)]">
                      SRN {order.srnId || "-"} • {order.buyer.buyerCountry} • {order.package.service} • {order.package.weightGrams}g
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm text-green-600 dark:text-green-400">{formatPrice(order.feeMinor)}</div>
                    <div className="font-medium text-[var(--text-main)]">{formatPrice(order.shippingPriceMinor)}</div>
                  </div>
                </div>
              </Link>
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

        {/* Grouped by Customer + Date */}
        {groups.length === 0 ? (
          <div className="card p-8 text-center text-[var(--text-muted)]">
            No orders found. Create your first order!
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => (
              <CustomerOrderGroup key={`${group.customer.id}-${group.date}`} group={group} onStatusChange={fetchOrders} />
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
