// src/app/customers/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import CustomerModal from "@/components/CustomerModal";
import { displayPhone } from "@/components/displayPhone";

// tiny debounce
function useDebounced<T>(value: T, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

type Customer = {
  id: string;
  name: string;
  phone: string;         // E.164
  phoneCode: string;     // e.g. "+62"
  shopeeName: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { orders: number };
};

type CustomersResponse = {
  page: number;
  pageSize: number;
  totalPages: number;
  totalFiltered: number;
  totalCustomers: number;
  customers: Customer[];
};

function DotSpinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" role="status" aria-label="loading">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25" />
      <path d="M22 12a10 10 0 0 1-10 10" fill="currentColor" />
    </svg>
  );
}

export default function CustomersPage() {
  const [data, setData] = useState<CustomersResponse | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedQ = useDebounced(searchTerm, 300);
  const [loading, setLoading] = useState(true);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [modalInitial, setModalInitial] = useState<null | {
    id?: string;
    name?: string;
    phone?: string;
    phoneCode?: string;
    shopeeName?: string;
  }>(null);

  async function fetchCustomers(q: string, p: number, ps: number) {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setLoading(true);
    setError(null);

    try {
      const qs = new URLSearchParams({
        page: String(p),
        pageSize: String(ps),
        q: q.trim(),
      });
      const res = await fetch(`/api/customers?${qs.toString()}`, { signal: ac.signal });
      if (!res.ok) throw new Error("Failed to fetch customers");
      const payload: CustomersResponse = await res.json();
      setData(payload);
      setCustomers(payload.customers);
      setIsFirstLoad(false);
      if (p > payload.totalPages) setPage(payload.totalPages || 1);
    } catch (e: any) {
      if (e?.name !== "AbortError") setError(e?.message || "An error occurred");
    } finally {
      if (!ac.signal.aborted) setLoading(false);
    }
  }
  async function deleteCustomer(id: string, orders: number) {
  if (orders > 0) return; // guard in UI too
  if (!confirm("Delete this customer? (Only allowed if they have 0 orders)")) return;

  try {
    const res = await fetch(`/api/customers/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j?.error || "Failed to delete");
    }
    // refresh list
    fetchCustomers(debouncedQ, page, pageSize);
  } catch (e: any) {
    setError(e?.message || "An error occurred");
  }
}
  useEffect(() => {
    fetchCustomers(debouncedQ, page, pageSize);
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, debouncedQ]);

  const filtered = useMemo(() => customers, [customers]);

  if (isFirstLoad && loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading customers…</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* header + stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Customers</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage customers</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800">
            <div className="text-xs text-gray-500 dark:text-gray-400">Total Customers</div>
            <div className="font-semibold">{data?.totalCustomers ?? 0}</div>
          </div>
          <button
            onClick={() => {
              setModalMode("create");
              setModalInitial(null);
              setModalOpen(true);
            }}
            className="btn btn-primary"
          >
            Add Customer
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="card p-4">
        <div className="w-full sm:max-w-xl">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Search (name / phone / shopee)
          </label>
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setPage(1);
                setSearchTerm(e.target.value);
              }}
              className="input w-full pr-8"
              placeholder="e.g. 'Kevin', '+6281', 'kevinshop'"
              aria-busy={loading}
            />
            {loading && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
                <DotSpinner />
              </span>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg dark:bg-red-900 dark:border-red-700 dark:text-red-200">
          {error}
        </div>
      )}

      {/* Desktop table */}
      <div className="card overflow-hidden hidden xl:block">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <Th>Name</Th>
                <Th>Phone</Th>
                <Th>Shopee</Th>
                <Th>Orders</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody className={`bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700 transition-opacity ${loading ? "opacity-60" : "opacity-100"}`}>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-6 text-center text-gray-500 dark:text-gray-400">
                    {searchTerm ? "No customers match your search." : "No customers yet."}
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="align-top">
                    <Td>
                      <div className="font-medium">
                        <Link href={`/customers/${c.id}`} className="text-primary hover:underline">
                          {c.name}
                        </Link>
                      </div>
                    </Td>
                    <Td>
                      <code className="text-sm">{displayPhone(c.phone, c.phoneCode)}</code>
                    </Td>
                    <Td>
                      {c.shopeeName ? <span className="font-mono">{c.shopeeName}</span> : <span className="text-gray-400">—</span>}
                    </Td>
                    <Td>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {c._count.orders} orders
                      </span>
                    </Td>
                   <Td>
  <div className="flex gap-3">
    <Link href={`/customers/${c.id}`} className="text-primary hover:underline">View</Link>

    <button
      className="text-indigo-600 hover:underline"
      onClick={() => {
        setModalMode("edit");
        setModalInitial({
          id: c.id,
          name: c.name,
          phone: c.phone,
          phoneCode: c.phoneCode,
          shopeeName: c.shopeeName ?? "",
        });
        setModalOpen(true);
      }}
    >
      Edit
    </button>

    <button
      onClick={() => deleteCustomer(c.id, c._count.orders)}
      className={`text-red-600 hover:underline ${c._count.orders > 0 ? "opacity-40 cursor-not-allowed" : ""}`}
      title={c._count.orders > 0 ? "Cannot delete customer with orders" : "Delete customer"}
      disabled={c._count.orders > 0}
    >
      Delete
    </button>
  </div>
</Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="xl:hidden space-y-4">
        {filtered.length === 0 ? (
          <div className="card p-6 text-center text-gray-500 dark:text-gray-400">
            {searchTerm ? "No customers match your search." : "No customers yet."}
          </div>
        ) : (
          filtered.map((c) => (
            <div key={c.id} className="card p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <Link href={`/customers/${c.id}`} className="font-semibold text-primary hover:underline">
                    {c.name}
                  </Link>
                  <div className="text-sm text-gray-500">
                    <code>{displayPhone(c.phone, c.phoneCode)}</code>
                  </div>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  {c._count.orders} orders
                </span>
              </div>

              <div className="mt-2 text-sm">
                <div>Shopee: {c.shopeeName ? <span className="font-mono">{c.shopeeName}</span> : <span className="text-gray-400">—</span>}</div>
              </div>

              <div className="flex gap-2 mt-4">
  <Link href={`/customers/${c.id}`} className="btn btn-sm btn-outline flex-1">View</Link>
  <button
    className="btn btn-sm btn-secondary flex-1"
    onClick={() => {
      setModalMode("edit");
      setModalInitial({
        id: c.id,
        name: c.name,
        phone: c.phone,
        phoneCode: c.phoneCode,
        shopeeName: c.shopeeName ?? "",
      });
      setModalOpen(true);
    }}
  >
    Edit
  </button>
  <button
    onClick={() => deleteCustomer(c.id, c._count.orders)}
    className="btn btn-sm btn-danger flex-1 disabled:opacity-50"
    disabled={c._count.orders > 0}
    title={c._count.orders > 0 ? "Cannot delete customer with orders" : "Delete customer"}
  >
    Delete
  </button>
</div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {data && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Page <span className="font-semibold">{data.page}</span> of{" "}
            <span className="font-semibold">{data.totalPages}</span> ·{" "}
            <span className="font-semibold">{data.totalFiltered}</span>{" "}
            result{data.totalFiltered === 1 ? "" : "s"}
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

            <button className="btn btn-outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={data.page <= 1}>
              ‹ Prev
            </button>
            <button className="btn btn-outline" onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))} disabled={data.page >= data.totalPages}>
              Next ›
            </button>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      <CustomerModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          fetchCustomers(debouncedQ, page, pageSize);
          setModalOpen(false);
        }}
        mode={modalMode}
        initial={modalInitial || undefined}
      />
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-200">{children}</td>;
}
