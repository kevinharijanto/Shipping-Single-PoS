"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Modal from "@/components/Modal";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import type { CountryCode } from "libphonenumber-js";


interface Order {
  id: string;
  placedAt: string;
  notes: string | null;
  quotedAmountMinor: number | null;
  shippingPriceMinor: number | null;
  currency: string | null;
  localStatus: string;
  deliveryStatus: string;
  paymentMethod: string;
  externalRef: string | null;
  labelId: string | null;
  trackingLink: string | null;
  krsTrackingNumber: string | null;
  srnId: number | null;
  customer: {
    id: string;
    name: string;
    phone: string;
    shopeeName: string | null;
  };
  buyer: {
    id: number;
    buyerFullName: string;
    buyerAddress1: string;
    buyerCity: string;
    buyerState: string;
    buyerZip: string;
    buyerCountry: string;
    buyerPhone: string;
    phoneCode: string;
  };
  package: {
    id: string;
    weightGrams: number | null;
    totalValue: number | null;
    packageDescription: string | null;
    lengthCm: number | null;
    widthCm: number | null;
    heightCm: number | null;
    service: string;
    currency: string | null;
    sku: string | null;
    hsCode: string | null;
    countryOfOrigin: string | null;
  };
}

export default function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  // Unwrap Next.js App Router params Promise in Client Component (Next.js 15)
  const { id } = React.use(params as Promise<{ id: string }>);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingShipment, setIsCreatingShipment] = useState(false);
  const [isCreatingLabel, setIsCreatingLabel] = useState(false);
  const [showShipPreview, setShowShipPreview] = useState(false);
  const [previewPayload, setPreviewPayload] = useState<any | null>(null);

  useEffect(() => {
    fetchOrder();
  }, [id]);

  async function fetchOrder() {
    try {
      const response = await fetch(`/api/orders/${id}`);
      if (!response.ok) {
        if (response.status === 404) {
          setError("Order not found");
        } else {
          throw new Error("Failed to fetch order");
        }
        return;
      }
      const data = await response.json();
      setOrder(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  // Build the exact Kurasi payload (preview) using the same rules as the API route
  function buildShipmentPayload(order: Order) {
    const rawService = (order.package?.service || "").toUpperCase();
    const ALLOWED_SERVICES = ["EP", "ES", "EX", "PP"] as const;
    const serviceName = ALLOWED_SERVICES.find(code => rawService.startsWith(code)) ?? "EX";
    const isExpress = serviceName === "EX";

    const countryHintRaw = (order.buyer?.buyerCountry || "").toUpperCase();
    const defaultCountry: CountryCode | undefined = /^[A-Z]{2}$/.test(countryHintRaw) ? (countryHintRaw as CountryCode) : undefined;

    const parsedPhone = order.buyer?.buyerPhone
      ? parsePhoneNumberFromString(order.buyer.buyerPhone, defaultCountry ? { defaultCountry } : undefined)
      : null;

    const buyerPhoneNational = parsedPhone && parsedPhone.isValid()
      ? parsedPhone.nationalNumber
      : (order.buyer?.buyerPhone || "").replace(/\D/g, "");

    const phoneCodeDigits = String(
      order.buyer?.phoneCode ||
      (parsedPhone && parsedPhone.isValid() ? String(parsedPhone.countryCallingCode) : "")
    ).replace(/^\+/, "").replace(/\D/g, "") || "1";

    return {
      buyerFullName: order.buyer.buyerFullName,
      buyerAddress1: order.buyer.buyerAddress1,
      buyerAddress2: "",
      buyerCity: order.buyer.buyerCity,
      buyerState: order.buyer.buyerState,
      buyerZip: order.buyer.buyerZip,
      buyerCountry: order.buyer.buyerCountry,
      buyerPhone: buyerPhoneNational,
      serviceName,
      packageDesc: order.package?.packageDescription || "Package",
      saleRecordNumber: order.srnId != null ? String(order.srnId) : "",
      totalWeight: order.package?.weightGrams != null ? String(order.package.weightGrams) : "100",
      // Keep other fields consistent; only toggle contentItem based on Express
      totalValue: Number(order.package?.totalValue ?? 7),
      currency: order.package?.currency || "USD",
      phoneCode: phoneCodeDigits,
      hsCode: order.package?.hsCode || "",
      shipmentRemark: order.notes || "",
      companyName: "",
      buyerEmail: "",
      isNoPhone: false,
      shipmentCategory: "M",
      collectTaxId: [],
      valueAddedServiceInsurance: [],
      valueAddedServiceSignature: [],
      // contentItem: one item for Express, empty array for non-Express
      contentItem: isExpress
        ? [
          {
            description: order.package?.packageDescription || "Package",
            quantity: "1",
            value: String(Number(order.package?.totalValue ?? 7)),
            itemWeight: order.package?.weightGrams != null ? String(order.package.weightGrams) : "100",
            currency: order.package?.currency || "USD",
            sku: order.package?.sku || "",
            hsCode: order.package?.hsCode || "490900",
            countryOfOrigin: order.package?.countryOfOrigin || "ID",
          }
        ]
        : [],
      saleChannel: "",
      ioss: "",
      iossCheck: false
    };
  }

  function openShipmentPreview() {
    if (!order) return;
    const payload = buildShipmentPayload(order);
    setPreviewPayload(payload);
    setShowShipPreview(true);
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this order? This action cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch(`/api/orders/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete order");
      }

      router.push("/orders");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  }

  async function handleCreateShipment() {
    if (!order) return;

    setIsCreatingShipment(true);
    setError(null);

    try {
      const response = await fetch("/api/kurasi/shipment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderId: order.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create shipment");
      }

      const data = await response.json();

      // Refresh order data to get the updated tracking number
      await fetchOrder();

      // Show success message
      alert(`Shipment created successfully! Tracking number: ${data.krsNumber}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred while creating shipment");
    } finally {
      setIsCreatingShipment(false);
    }
  }

  async function handleDeleteShipment() {
    if (!order) return;

    if (!confirm(`Are you sure you want to delete the shipment ${order.krsTrackingNumber} from Kurasi? This action cannot be undone.`)) {
      return;
    }

    setIsCreatingShipment(true);
    setError(null);

    try {
      const response = await fetch("/api/kurasi/delete-shipment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderId: order.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete shipment");
      }

      const data = await response.json();

      // Refresh order data to reflect the deletion
      await fetchOrder();

      // Show success message
      alert(`Shipment ${data.krsNumber} deleted successfully from Kurasi!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred while deleting shipment");
    } finally {
      setIsCreatingShipment(false);
    }
  }

  async function handleCreateLabel() {
    if (!order) return;

    setIsCreatingLabel(true);
    setError(null);

    try {
      const response = await fetch("/api/kurasi/create-label", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderId: order.id }),
      });

      if (!response.ok) {
        // Try to get error details
        let errorMessage = "Failed to create label";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // If we can't parse the error, use the status text
          errorMessage = `Failed to create label: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      // Check if the response is a PDF
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/pdf")) {
        // Handle PDF download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = `label-${order.krsTrackingNumber}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        // Show success message
        alert(`Label downloaded successfully! Status updated to: label_confirmed`);
      } else {
        // Handle JSON response (fallback)
        const data = await response.json();

        // Show success message
        alert(`Label created successfully! Status: ${data.deliveryStatus || "label_confirmed"}`);
      }

      // Refresh order data to get the updated status and tracking link
      await fetchOrder();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred while creating label");
    } finally {
      setIsCreatingLabel(false);
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

  function formatShippingPrice(amount: number | null, currency: string | null) {
    if (!amount) return "No shipping price";
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
      case "not_yet_submit_to_kurasi":
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
      case "submitted_to_Kurasi":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
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
        <div className="text-lg">Loading order...</div>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg dark:bg-red-900 dark:border-red-700 dark:text-red-200">
          {error}
        </div>
        <Link href="/orders" className="btn">
          Back to Orders
        </Link>
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Order Details</h1>
        </div>
        <div className="flex gap-2">
          <Link href={`/orders/${order.id}/edit`} className="btn btn-primary">
            Edit Order
          </Link>
          <button
            onClick={openShipmentPreview}
            disabled={isCreatingShipment || !!order.krsTrackingNumber}
            className="btn btn-success"
          >
            {isCreatingShipment ? "Creating..." : order.krsTrackingNumber ? "Shipment Created" : "Create Shipment"}
          </button>
          {order.krsTrackingNumber && (
            <button
              onClick={handleCreateLabel}
              disabled={isCreatingLabel || order.deliveryStatus === "label_confirmed" || order.deliveryStatus === "ready_to_send" || order.deliveryStatus === "tracking_received"}
              className="btn btn-primary"
            >
              {isCreatingLabel ? "Creating..." : order.deliveryStatus === "label_confirmed" || order.deliveryStatus === "ready_to_send" || order.deliveryStatus === "tracking_received" ? "Label Created" : "Create Label"}
            </button>
          )}
          {order.krsTrackingNumber && (
            <button
              onClick={handleDeleteShipment}
              disabled={isCreatingShipment}
              className="btn btn-warning"
            >
              {isCreatingShipment ? "Deleting..." : "Delete Shipment"}
            </button>
          )}
          <button
            onClick={handleDelete}
            className="btn btn-danger"
          >
            Delete Order
          </button>
          <Link href="/orders" className="btn">
            Back to Orders
          </Link>
        </div>
      </div>

      <Modal
        isOpen={showShipPreview}
        onClose={() => setShowShipPreview(false)}
        title="Review Kurasi Payload"
        size="xl"
      >
        <div className="p-4 space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            This is the payload that will be sent to Kurasi. Confirm to proceed.
          </p>
          <pre className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-3 rounded overflow-x-auto whitespace-pre-wrap break-words">{JSON.stringify(previewPayload, null, 2)}</pre>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn" onClick={() => setShowShipPreview(false)}>Cancel</button>
            <button
              type="button"
              className="btn btn-success"
              disabled={isCreatingShipment}
              onClick={async () => { setShowShipPreview(false); await handleCreateShipment(); }}
            >
              {isCreatingShipment ? "Creating..." : "Send to Kurasi"}
            </button>
          </div>
        </div>
      </Modal>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg dark:bg-red-900 dark:border-red-700 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Information */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Order Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Order Date
                </label>
                <p className="text-gray-900 dark:text-white">
                  {new Date(order.placedAt).toLocaleDateString()}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Payment Method
                </label>
                <p className="text-gray-900 dark:text-white capitalize">
                  {order.paymentMethod.replace("_", " ")}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Local Status
                </label>
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.localStatus)}`}>
                  {order.localStatus.replace("_", " ")}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Delivery Status
                </label>
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.deliveryStatus)}`}>
                  {order.deliveryStatus.replace("_", " ")}
                </span>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes
                </label>
                <p className="text-gray-900 dark:text-white">
                  {order.notes || "No notes"}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  External Reference
                </label>
                <p className="text-gray-900 dark:text-white">
                  {order.externalRef || "No external reference"}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Label ID
                </label>
                <p className="text-gray-900 dark:text-white">
                  {order.labelId || "No label ID"}
                </p>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tracking Link
                </label>
                <p className="text-gray-900 dark:text-white break-all">
                  {order.trackingLink ? (
                    <a
                      href={order.trackingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary-hover"
                    >
                      {order.trackingLink}
                    </a>
                  ) : (
                    "No tracking link"
                  )}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  KRS Tracking Number
                </label>
                <div className="flex items-center gap-2">
                  <p className="text-gray-900 dark:text-white font-mono">
                    {order.krsTrackingNumber || "No KRS tracking number"}
                  </p>
                  {order.krsTrackingNumber && (
                    <button
                      onClick={async () => {
                        try {
                          const res = await fetch("/api/kurasi/fetch-shipment-data", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ orderId: order.id }),
                          });
                          if (res.ok) {
                            alert("Refreshed successfully from Kurasi!");
                            await fetchOrder();
                          } else {
                            const j = await res.json().catch(() => ({}));
                            alert(`Refresh failed: ${j.error || "Unknown error"}`);
                          }
                        } catch (e: any) {
                          alert(`Refresh failed: ${e.message}`);
                        }
                      }}
                      className="px-2 py-1 text-xs bg-blue-50 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-600 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                      title="Refresh data from Kurasi"
                    >
                      ↻ Refresh
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Package Details */}
          <div className="card p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Package Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Weight (grams)
                </label>
                <p className="text-gray-900 dark:text-white">
                  {order.package?.weightGrams || "Not specified"}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Length (cm)
                </label>
                <p className="text-gray-900 dark:text-white">
                  {order.package?.lengthCm || "Not specified"}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Width (cm)
                </label>
                <p className="text-gray-900 dark:text-white">
                  {order.package?.widthCm || "Not specified"}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Height (cm)
                </label>
                <p className="text-gray-900 dark:text-white">
                  {order.package?.heightCm || "Not specified"}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Service
                </label>
                <p className="text-gray-900 dark:text-white capitalize">
                  {order.package?.service || "Not specified"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Currency
                </label>
                <p className="text-gray-900 dark:text-white">
                  {order.package?.currency || "Not specified"}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  SKU
                </label>
                <p className="text-gray-900 dark:text-white">
                  {order.package?.sku || "Not specified"}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  HS Code
                </label>
                <p className="text-gray-900 dark:text-white">
                  {order.package?.hsCode || "Not specified"}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Country of Origin
                </label>
                <p className="text-gray-900 dark:text-white">
                  {order.package?.countryOfOrigin || "Not specified"}
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Information */}
          <div className="card p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Customer</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Name</p>
                <p className="text-gray-900 dark:text-white">{order.customer.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</p>
                <p className="text-gray-900 dark:text-white">{order.customer.phone}</p>
              </div>
              {order.customer.shopeeName && (
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Shopee Name</p>
                  <p className="text-gray-900 dark:text-white">{order.customer.shopeeName}</p>
                </div>
              )}
              <Link
                href={`/customers/${order.customer.id}`}
                className="btn btn-default w-full text-center"
              >
                View Customer
              </Link>
            </div>
          </div>

          {/* Recipient Information */}
          <div className="card p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Recipient</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Name</p>
                <p className="text-gray-900 dark:text-white">{order.buyer.buyerFullName}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</p>
                <p className="text-gray-900 dark:text-white">
                  {order.buyer.buyerPhone}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Address</p>
                <p className="text-gray-900 dark:text-white text-sm">
                  {order.buyer.buyerAddress1}
                  <br />
                  {order.buyer.buyerCity}, {order.buyer.buyerState} {order.buyer.buyerZip}
                  <br />
                  {order.buyer.buyerCountry}
                </p>
              </div>
              <Link
                href={`/buyers/${order.buyer.id}`}
                className="btn btn-default w-full text-center"
              >
                View Recipient
              </Link>
            </div>
          </div>

          {/* Order Summary */}
          <div className="card p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Order Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Weight:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {order.package?.weightGrams ?? "-"} g
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Dimensions (L×W×H cm):</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {(order.package?.lengthCm ?? "-")} × {(order.package?.widthCm ?? "-")} × {(order.package?.heightCm ?? "-")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Service:</span>
                <span className="font-medium text-gray-900 dark:text-white capitalize">
                  {order.package?.service || "-"}
                </span>
              </div>
              {order.quotedAmountMinor && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Quoted Amount:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatCurrency(order.quotedAmountMinor, order.currency)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}