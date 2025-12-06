// src/app/orders/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import NewOrderModal from "@/components/OrderModal";
import Combobox from "@/components/Combobox";

/* ────────────────────────────────────────────────────────────────
   Lightweight helpers (reused inside the Edit modal)
───────────────────────────────────────────────────────────────── */
function DetailRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 text-gray-700 dark:text-gray-300">
      <span className="shrink-0 text-gray-500 dark:text-gray-400">{label}:</span>
      <span className="break-words">{value}</span>
    </div>
  );
}

function useDebounced<T>(value: T, delay = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

function localHsCheck(code: string): string | null {
  const trimmed = code.trim();
  if (!/^\d+$/.test(trimmed)) return "HS Code must be numeric";
  if (!(trimmed.length === 6 || trimmed.length === 10)) return "Please enter either 10 or 6 characters HS Code.";
  return null;
}

/* ────────────────────────────────────────────────────────────────
   EDIT ORDER MODAL (inline for drop-in)
   - Fetches order/:id
   - Lets you edit: weight, service, description, HS code (+ validate),
     SRN (unique), total value + currency, statuses, payment, notes
   - Saves via PUT /api/orders/[id]
───────────────────────────────────────────────────────────────── */
function EditOrderModal({
  orderId,
  isOpen,
  onClose,
  onSuccess,
}: {
  orderId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Core loaded data
  const [loaded, setLoaded] = useState(false);
  const [order, setOrder] = useState<any | null>(null);

  // Form state
  const [weight, setWeight] = useState<string>("");
  const [service, setService] = useState<string>(""); // EP/ES/EX/PP or enum mapped on PUT
  const [packageDescription, setPackageDescription] = useState<string>("");
  const [hsCode, setHsCode] = useState<string>("");
  const [hsError, setHsError] = useState<string | null>(null);

  const [totalValue, setTotalValue] = useState<string>("");
  const [valueCurrency, setValueCurrency] = useState<string>("USD");

  const [srn, setSrn] = useState<string>("");
  const debouncedSrn = useDebounced(srn.trim(), 400);
  const [srnError, setSrnError] = useState<string | null>(null);

  const [localStatus, setLocalStatus] = useState("in_progress");
  const [deliveryStatus, setDeliveryStatus] = useState("not_yet_submit_to_kurasi");
  const [paymentMethod, setPaymentMethod] = useState("qris");
  const [notes, setNotes] = useState("");

  // Buyer detail (for context)
  const buyerDetail = order?.buyer || null;

  // Services to pick (simple view; if you want Kurasi re-quote here, you can wire it like your create modal)
  const [services, setServices] = useState<{ code: string; name: string }[]>([
    { code: "EX", name: "Express" },
    { code: "ES", name: "Economy Standard" },
    { code: "EP", name: "Economy Plus" },
    { code: "PP", name: "Packet Premium" },
  ]);

  // Load existing order when opened
  useEffect(() => {
    if (!isOpen || !orderId) return;
    let cancelled = false;

    async function run() {
      setErr(null);
      setLoading(true);
      try {
        const r = await fetch(`/api/orders/${orderId}`);
        if (!r.ok) throw new Error("Failed to fetch order");
        const o = await r.json();
        if (cancelled) return;
        setOrder(o);

        // hydrate form
        setWeight(o?.package?.weightGrams != null ? String(o.package.weightGrams) : "");
        setPackageDescription(o?.package?.packageDescription ?? "");
        setHsCode(o?.package?.hsCode ?? "");
        setTotalValue(o?.package?.totalValue != null ? String(o.package.totalValue) : "");
        setValueCurrency(o?.package?.currency ?? o?.currency ?? "USD");

        // service — do a light reverse map back to Kurasi-like code label
        // if you store enum in DB, we default map for edit UI
        const svcEnum = o?.package?.service ?? "economy";
        const guessCode =
          svcEnum === "express" ? "EX" :
          svcEnum === "economy_standard" ? "ES" :
          svcEnum === "economy_plus" ? "EP" :
          svcEnum === "packet_premium" ? "PP" : "ES";
        setService(guessCode);

        setLocalStatus(o?.localStatus ?? "in_progress");
        setDeliveryStatus(o?.deliveryStatus ?? "not_yet_submit_to_kurasi");
        setPaymentMethod(o?.paymentMethod ?? "qris");
        setNotes(o?.notes ?? "");

        setSrn(o?.srn ? String(o.srn) : "");
        setSrnError(null);
        setHsError(null);
        setLoaded(true);
      } catch (e: any) {
        if (!cancelled) {
          setErr(e?.message || "Failed to load order");
          setLoaded(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => { cancelled = true; };
  }, [isOpen, orderId]);

  // HS validation
  async function validateHsCode(code: string) {
    const basic = localHsCheck(code);
    if (basic) {
      setHsError(basic);
      return;
    }
    try {
      const r = await fetch(`/api/kurasi/validate-hscode?hsCode=${encodeURIComponent(code.trim())}`);
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        const msg =
          j?.returnCode === "007" ? "HSCode must be 6 or 10 digits."
          : j?.returnCode === "008" ? "Incorrect HSCode"
          : j?.error || "HS Code validation failed";
        setHsError(msg);
      } else {
        setHsError(null);
      }
    } catch {
      setHsError("Failed to validate HS Code");
    }
  }

  // SRN uniqueness
  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!debouncedSrn) {
        setSrnError(null);
        return;
      }
      try {
        const r = await fetch(`/api/srns/check?srn=${encodeURIComponent(debouncedSrn)}`);
        const j = await r.json().catch(() => ({}));
        // For edit: allow same SRN if it's this order's SRN; the server PUT already enforces buyer constraint.
        const current = order?.srn ? String(order.srn) : "";
        if (!cancelled) setSrnError(j?.exists && debouncedSrn !== current ? "This SRN already exists." : null);
      } catch {
        if (!cancelled) setSrnError(null);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [debouncedSrn, order?.srn]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!orderId) return;

    try {
      setLoading(true);
      setErr(null);

      if (!weight || Number(weight) <= 0) throw new Error("Total Weight is required.");
      if (!service) throw new Error("Please choose a service.");
      if (!packageDescription.trim()) throw new Error("Package Description is required.");
      if (hsCode.trim() && hsError) throw new Error(hsError);
      if (srnError) throw new Error(srnError);

      const payload: any = {
        notes,
        localStatus,
        deliveryStatus,
        paymentMethod,
        // package
        weightGrams: Number(weight),
        service, // server will map Kurasi code to enum
        packageDescription,
        hsCode: hsCode.trim() || null,
        totalValue: totalValue.trim() === "" ? null : Number(totalValue),
        currency: valueCurrency,
      };

      // If SRN is changed (including set to empty / null)
      if (srn.trim() === "") {
        payload.srn = null;
      } else {
        payload.srn = srn.trim();
      }

      const r = await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j?.error || "Failed to update order");
      }

      onSuccess();
      onClose();
    } catch (e: any) {
      setErr(e?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-3xl rounded-lg bg-white dark:bg-gray-900 shadow-xl">
          <div className="flex items-center justify-between px-5 py-3 border-b dark:border-gray-800">
            <h3 className="font-semibold">Edit Order</h3>
            <button className="btn" onClick={onClose}>Close</button>
          </div>

          <form onSubmit={onSubmit} className="max-h-[80vh] overflow-y-auto p-5 space-y-6">
            {err && (
              <div className="px-3 py-2 rounded border bg-red-50 border-red-200 text-red-700 dark:bg-red-900/30 dark:border-red-700 dark:text-red-200">
                {err}
              </div>
            )}

            {!loaded ? (
              <div className="text-sm text-gray-600">Loading order…</div>
            ) : (
              <>
                {/* Context: Customer / Recipient */}
                <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-md border p-3 text-sm bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
                    <div className="font-medium mb-1">Customer</div>
                    <DetailRow label="Name" value={order?.customer?.name} />
                    <DetailRow label="Phone" value={order?.customer?.phone} />
                  </div>
                  <div className="rounded-md border p-3 text-sm bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
                    <div className="font-medium mb-1">Recipient</div>
                    <DetailRow label="Name" value={buyerDetail?.buyerFullName} />
                    <DetailRow label="Phone" value={buyerDetail?.buyerPhone} />
                    <DetailRow label="Country" value={buyerDetail?.buyerCountry} />
                    <DetailRow label="City" value={buyerDetail?.buyerCity} />
                  </div>
                </section>

                {/* Package */}
                <section>
                  <h4 className="text-sm font-semibold mb-3">Package Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm mb-1">Total Weight (gram) *</label>
                      <input
                        className="input w-full"
                        type="number"
                        min={1}
                        required
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-1">Total Value</label>
                      <input
                        className="input w-full"
                        inputMode="decimal"
                        placeholder="e.g. 1 or 120.00"
                        value={totalValue}
                        onChange={(e) => setTotalValue(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-1">Currency</label>
                      <select
                        className="input w-full"
                        value={valueCurrency}
                        onChange={(e) => setValueCurrency(e.target.value)}
                      >
                        {["USD", "GBP", "AUD", "EUR", "IDR", "SGD"].map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm mb-1">Service *</label>
                    <Combobox
                      items={services}
                      value={service}
                      onChange={(code: string) => setService(code)}
                      getKey={(i) => i.code}
                      getLabel={(i) => i.name}
                      placeholder="Type to search service…"
                      showChevron={false}
                      ariaLabel="Service"
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm mb-1">Package Description *</label>
                      <input
                        className="input w-full"
                        required
                        value={packageDescription}
                        onChange={(e) => setPackageDescription(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-1">HS Code</label>
                      <div className="relative">
                        <input
                          className={`input w-full ${hsError ? "border-red-500" : ""}`}
                          placeholder="6 or 10 digits"
                          value={hsCode}
                          onChange={(e) => {
                            setHsCode(e.target.value);
                            setHsError(null);
                          }}
                          onBlur={() => hsCode.trim() && validateHsCode(hsCode)}
                        />
                        <button
                          type="button"
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-indigo-600"
                          title="Validate HS Code"
                          onClick={() => validateHsCode(hsCode)}
                        >
                          🔍
                        </button>
                      </div>
                      {hsError && <p className="mt-1 text-xs text-red-600">{hsError}</p>}
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm mb-1">SRN (Sale Record Number)</label>
                    <input
                      className={`input w-full ${srnError ? "border-red-500" : ""}`}
                      placeholder="Must be unique"
                      value={srn}
                      onChange={(e) => setSrn(e.target.value)}
                    />
                    {srnError && <p className="mt-1 text-xs text-red-600">{srnError}</p>}
                  </div>
                </section>

                {/* Delivery */}
                <section>
                  <h4 className="text-sm font-semibold mb-3">Delivery Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm mb-1">Local Status</label>
                      <select
                        className="input w-full text-xs"
                        value={localStatus}
                        onChange={(e) => setLocalStatus(e.target.value)}
                      >
                        <option value="in_progress">In Progress</option>
                        <option value="on_the_way">On The Way</option>
                        <option value="pending_payment">Pending Payment</option>
                        <option value="paid">Paid</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm mb-1">Delivery Status</label>
                      <select
                        className="input w-full text-xs"
                        value={deliveryStatus}
                        onChange={(e) => setDeliveryStatus(e.target.value)}
                      >
                        <option value="not_yet_submit_to_kurasi">Not Yet Submit to Kurasi</option>
                        <option value="submitted_to_Kurasi">Submitted to Kurasi</option>
                        <option value="label_confirmed">Label Confirmed</option>
                        <option value="ready_to_send">Ready to Send</option>
                        <option value="tracking_received">Tracking Received</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm mb-1">Payment Method</label>
                      <select
                        className="input w-full"
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                      >
                        <option value="qris">QRIS</option>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="cash">Cash</option>
                        <option value="card">Card</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm mb-1">Notes</label>
                      <textarea
                        className="input w-full min-h-[90px]"
                        placeholder="Optional notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </div>
                  </div>
                </section>
              </>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-800">
              <button type="button" onClick={onClose} className="btn">Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={loading || !loaded}>
                {loading ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
   ORIGINAL PAGE (with Edit modal wired)
───────────────────────────────────────────────────────────────── */

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
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");

  // Create modal
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editOrderId, setEditOrderId] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, [currentPage, statusFilter]);

  async function fetchOrders() {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(currentPage), limit: "10" });
      if (statusFilter) params.append("status", statusFilter);
      const response = await fetch(`/api/orders?${params}`);
      if (!response.ok) throw new Error("Failed to fetch orders");
      const data: OrdersResponse = await response.json();
      setOrders(data.orders);
      setTotalPages(data.pagination.pages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function updateOrderStatus(orderId: string, status: string, type: "local" | "delivery") {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [type === "local" ? "localStatus" : "deliveryStatus"]: status }),
      });
      if (!response.ok) throw new Error("Failed to update order status");
      await fetchOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  }

  async function handleDelete(orderId: string) {
    if (!confirm("Are you sure you want to delete this order? This action cannot be undone.")) return;
    try {
      const response = await fetch(`/api/orders/${orderId}`, { method: "DELETE" });
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
    }).format(amount / 100);
  }

  function getStatusColor(status: string) {
    switch (status) {
      case "in_progress": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "on_the_way": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "pending_payment": return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "paid": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "not_yet_submit_to_kurasi": return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
      case "submitted_to_Kurasi": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "label_confirmed": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "ready_to_send": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "tracking_received": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
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
        <button onClick={() => setShowNewOrderModal(true)} className="btn btn-primary">
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
                <option value="not_yet_submit_to_kurasi">Not Yet Submit to Kurasi</option>
                <option value="submitted_to_Kurasi">Submitted to Kurasi</option>
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

      {/* Mobile cards */}
      <div className="md:hidden space-y-4">
        {orders.length === 0 ? (
          <div className="card p-4 text-center text-gray-500 dark:text-gray-400">No orders found</div>
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
                    <option value="not_yet_submit_to_kurasi">Not Yet Submit to Kurasi</option>
                    <option value="submitted_to_Kurasi">Submitted to Kurasi</option>
                    <option value="label_confirmed">Label Confirmed</option>
                    <option value="ready_to_send">Ready to Send</option>
                    <option value="tracking_received">Tracking Received</option>
                  </select>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap justify-end gap-2">
                <Link href={`/orders/${order.id}`} className="btn">View</Link>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setEditOrderId(order.id);
                    setEditOpen(true);
                  }}
                >
                  Edit
                </button>
                <button onClick={() => handleDelete(order.id)} className="btn btn-danger">
                  Delete
                </button>
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
                        className={`text-xs px-2 py-1 rounded-full border-0 ${getStatusColor(order.localStatus)}`}
                        value={order.localStatus}
                        onChange={(e) => updateOrderStatus(order.id, e.target.value, "local")}
                      >
                        <option value="in_progress">In Progress</option>
                        <option value="on_the_way">On The Way</option>
                        <option value="pending_payment">Pending Payment</option>
                        <option value="paid">Paid</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        className={`text-xs px-2 py-1 rounded-full border-0 ${getStatusColor(order.deliveryStatus)}`}
                        value={order.deliveryStatus}
                        onChange={(e) => updateOrderStatus(order.id, e.target.value, "delivery")}
                      >
                        <option value="not_yet_submit_to_kurasi">Not Yet Submit to Kurasi</option>
                        <option value="submitted_to_Kurasi">Submitted to Kurasi</option>
                        <option value="label_confirmed">Label Confirmed</option>
                        <option value="ready_to_send">Ready to Send</option>
                        <option value="tracking_received">Tracking Received</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link href={`/orders/${order.id}`} className="text-primary hover:text-primary-hover mr-3">
                        View
                      </Link>
                      <button
                        className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                        onClick={() => {
                          setEditOrderId(order.id);
                          setEditOpen(true);
                        }}
                      >
                        Edit
                      </button>
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

      {/* Create modal */}
      <NewOrderModal
        isOpen={showNewOrderModal}
        onClose={() => setShowNewOrderModal(false)}
        onSuccess={() => {
          fetchOrders();
        }}
      />

      {/* Edit modal */}
      <EditOrderModal
        orderId={editOrderId}
        isOpen={editOpen}
        onClose={() => { setEditOpen(false); setEditOrderId(null); }}
        onSuccess={() => {
          setEditOpen(false);
          setEditOrderId(null);
          fetchOrders();
        }}
      />
    </div>
  );
}
