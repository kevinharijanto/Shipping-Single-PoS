"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";


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
      alert(`Shipment created successfully! Tracking number: ${data.trackingNumber}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred while creating shipment");
    } finally {
      setIsCreatingShipment(false);
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
            onClick={handleCreateShipment}
            disabled={isCreatingShipment || !!order.krsTrackingNumber}
            className="btn btn-success"
          >
            {isCreatingShipment ? "Creating..." : order.krsTrackingNumber ? "Shipment Created" : "Create Shipment"}
          </button>
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
                <p className="text-gray-900 dark:text-white font-mono">
                  {order.krsTrackingNumber || "No KRS tracking number"}
                </p>
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
                  {order.buyer.phoneCode}{order.buyer.buyerPhone}
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