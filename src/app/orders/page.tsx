// src/app/orders/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import NewOrderModal from "@/components/OrderModal";

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
function CustomerOrderGroup({ group }: { group: CustomerGroup }) {
  const [open, setOpen] = useState(true);

  // Calculate total for this customer
  const total = group.orders.reduce((sum, o) => sum + (o.shippingPriceMinor || 0), 0);

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
            <Link
              key={order.id}
              href={`/orders/${order.id}`}
              className="block px-4 py-3 hover:bg-[rgba(55,53,47,0.04)] transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="font-medium text-[var(--text-main)] truncate max-w-[180px] sm:max-w-none">
                      {order.buyer.buyerFullName}
                    </span>
                    <span className="text-xs text-[var(--text-muted)] shrink-0">
                      → {order.buyer.buyerCountry}
                    </span>
                    <span className="px-2 py-0.5 text-xs rounded border border-[var(--border-color)] text-[var(--text-muted)] shrink-0">
                      {order.localStatus.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="text-xs text-[var(--text-muted)] mt-0.5">
                    {new Date(order.placedAt).toLocaleDateString()} • {order.package.service} • {order.package.weightGrams}g
                  </div>
                </div>
                <div className="text-right font-medium text-[var(--text-main)] shrink-0">
                  {formatPrice(order.shippingPriceMinor)}
                </div>
              </div>
            </Link>
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
            <CustomerOrderGroup key={group.customer.id} group={group} />
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
  );
}
