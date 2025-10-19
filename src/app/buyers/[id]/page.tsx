"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import RecipientModal from "@/components/RecipientModal";
import { displayPhone } from "@/components/displayPhone";
import { getFullCountryName } from "@/lib/countryMapping";

type BuyerSRN = {
  saleRecordNumber: number;
  kurasiShipmentId: string | null;
  trackingNumber: string | null;
  trackingSlug: string | null;
};

type Buyer = {
  id: string;
  buyerFullName: string;
  buyerAddress1: string;
  buyerAddress2: string;
  buyerCity: string;
  buyerState: string;
  buyerZip: string;
  buyerCountry: string;      // 2-letter code
  buyerEmail: string | null;
  buyerPhone: string;
  phoneCode: string;
  createdAt: string;
  updatedAt: string;
  _count: { orders: number };
  srns: BuyerSRN[];
  orders?: { id: string; createdAt: string }[];
};

export default function BuyerDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  // --- state must be declared before any early returns ---
  const [buyer, setBuyer] = useState<Buyer | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  async function fetchBuyer() {
    if (!id) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/buyers/${id}?withOrders=1`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to fetch buyer");
      }
      const data: Buyer = await res.json();
      setBuyer(data);
    } catch (e: any) {
      setErr(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchBuyer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? "—" : d.toLocaleString();
  };

  // --- early returns AFTER state declarations ---
  if (loading) return <div className="p-6">Loading…</div>;
  if (err) return <div className="p-6 text-red-600">{err}</div>;
  if (!buyer) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{buyer.buyerFullName}</h1>
          <div className="text-gray-500 text-sm">#{buyer.id}</div>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={() => setEditOpen(true)}>
            Edit
          </button>
          <Link href="/buyers" className="btn">Back</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left */}
        <div className="xl:col-span-2 space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-semibold mb-3">Contact</h2>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Phone:</span>{" "}
                <code>{displayPhone(buyer.buyerPhone, buyer.phoneCode)}</code>
              </div>
              {buyer.buyerEmail ? (
                <div>
                  <span className="font-medium">Email:</span> {buyer.buyerEmail}
                </div>
              ) : null}
              <div>
                <span className="font-medium">Country:</span>{" "}
                {getFullCountryName(buyer.buyerCountry)}{" "}
                <span className="text-gray-500">({buyer.buyerCountry})</span>
              </div>
              <div><span className="font-medium">City:</span> {buyer.buyerCity}</div>
              {buyer.buyerState ? (
                <div><span className="font-medium">State:</span> {buyer.buyerState}</div>
              ) : null}
              <div><span className="font-medium">ZIP:</span> {buyer.buyerZip}</div>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-semibold mb-3">Address</h2>
            <div className="text-sm">
              <div>{buyer.buyerAddress1}</div>
              {buyer.buyerAddress2 ? <div>{buyer.buyerAddress2}</div> : null}
              <div className="text-gray-600 dark:text-gray-300 mt-1">
                {buyer.buyerCity}{buyer.buyerState ? `, ${buyer.buyerState}` : ""} {buyer.buyerZip}
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-semibold mb-3">SRNs / KRS / Tracking</h2>
            {!buyer.srns.length ? (
              <div className="text-gray-500 text-sm">No SRNs</div>
            ) : (
              <div className="space-y-3">
                {buyer.srns
                  .slice()
                  .sort((a, b) => a.saleRecordNumber - b.saleRecordNumber)
                  .map((s) => (
                    <div key={s.saleRecordNumber} className="border rounded-md p-3 dark:border-gray-700">
                      <div className="font-medium">SRN {s.saleRecordNumber}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">
                        {s.kurasiShipmentId && (
                          <div>
                            KRS:{" "}
                            <a
                              className="text-primary hover:underline"
                              target="_blank"
                              rel="noreferrer"
                              href={`https://parcelsapp.com/en/tracking/${encodeURIComponent(s.kurasiShipmentId)}`}
                            >
                              {s.kurasiShipmentId}
                            </a>
                          </div>
                        )}
                        {s.trackingNumber && (
                          <div>
                            Tracking:{" "}
                            <a
                              className="text-indigo-600 hover:underline"
                              target="_blank"
                              rel="noreferrer"
                              href={`https://parcelsapp.com/en/tracking/${encodeURIComponent(s.trackingNumber)}`}
                              title={s.trackingSlug ? `Carrier: ${s.trackingSlug}` : "Open on ParcelsApp"}
                            >
                              {s.trackingNumber}
                            </a>
                          </div>
                        )}
                        {!s.kurasiShipmentId && !s.trackingNumber && <span className="text-gray-400">—</span>}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Right */}
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-semibold mb-3">Stats</h2>
            <div className="flex items-center gap-4">
              <div className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                <div className="text-xs text-gray-500">Orders</div>
                <div className="font-semibold">{buyer._count.orders}</div>
              </div>
              <div className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                <div className="text-xs text-gray-500">SRNs</div>
                <div className="font-semibold">{buyer.srns.length}</div>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-semibold mb-3">Timestamps</h2>
            <div className="text-sm">
              <div>Created: {fmtDate(buyer.createdAt)}</div>
              <div>Updated: {fmtDate(buyer.updatedAt)}</div>
            </div>
          </div>

          {buyer.orders && buyer.orders.length > 0 && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold mb-3">Recent Orders</h2>
              <ul className="space-y-2 text-sm">
                {buyer.orders.slice(0, 5).map((o) => (
                  <li key={o.id} className="flex items-center justify-between">
                    <span className="font-mono">{o.id}</span>
                    <span className="text-gray-500">{new Date(o.createdAt).toLocaleDateString()}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* EDIT MODAL */}
      <RecipientModal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        onSuccess={() => {
          setEditOpen(false);
          fetchBuyer();
        }}
        mode="edit"
        initial={{
          id: buyer.id,
          buyerFullName: buyer.buyerFullName,
          buyerAddress1: buyer.buyerAddress1,
          buyerAddress2: buyer.buyerAddress2,
          buyerCity: buyer.buyerCity,
          buyerState: buyer.buyerState,
          buyerZip: buyer.buyerZip,
          buyerCountry: buyer.buyerCountry,
          buyerPhone: buyer.buyerPhone,
          buyerEmail: buyer.buyerEmail ?? "",
        }}
      />
    </div>
  );
}
