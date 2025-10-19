// src/app/customers/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import CustomerModal from "@/components/CustomerModal";
import { displayPhone } from "@/components/displayPhone";

type Customer = {
  id: string;
  name: string;
  phone: string;
  phoneCode: string;
  shopeeName: string | null;
  createdAt?: string;
  updatedAt?: string;
  _count: { orders: number };
};

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  async function fetchCustomer() {
    if (!id) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/customers/${id}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to fetch customer");
      }
      const data: Customer = await res.json();
      setCustomer(data);
    } catch (e: any) {
      setErr(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCustomer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fmtDate = (iso?: string) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return isNaN(d.getTime()) ? "—" : d.toLocaleString();
  };

  if (loading) return <div className="p-6">Loading…</div>;
  if (err) return <div className="p-6 text-red-600">{err}</div>;
  if (!customer) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{customer.name}</h1>
          <div className="text-gray-500 text-sm">#{customer.id}</div>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={() => setEditOpen(true)}>Edit</button>
          <Link href="/customers" className="btn">Back</Link>
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
                <code>{displayPhone(customer.phone, customer.phoneCode)}</code>
              </div>
              <div>
                <span className="font-medium">Shopee:</span>{" "}
                {customer.shopeeName ? <span className="font-mono">{customer.shopeeName}</span> : <span className="text-gray-400">—</span>}
              </div>
            </div>
          </div>

          {/* You can add a Orders panel here if you fetch withOrders later */}
        </div>

        {/* Right */}
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-semibold mb-3">Stats</h2>
            <div className="flex items-center gap-4">
              <div className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                <div className="text-xs text-gray-500">Orders</div>
                <div className="font-semibold">{customer._count.orders}</div>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-semibold mb-3">Timestamps</h2>
            <div className="text-sm">
              <div>Created: {fmtDate(customer.createdAt)}</div>
              <div>Updated: {fmtDate(customer.updatedAt)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* EDIT MODAL */}
      <CustomerModal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        onSuccess={() => {
          setEditOpen(false);
          fetchCustomer();
        }}
        mode="edit"
        initial={{
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          phoneCode: customer.phoneCode,
          shopeeName: customer.shopeeName ?? "",
        }}
      />
    </div>
  );
}
